import { NextResponse } from "next/server"
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin"
import { authorizeTargetAccess } from "@/lib/api-auth"
import { createNotification } from "@/lib/notification-service"
import { sendAppointmentTenantAlertEmail } from "@/lib/email-service"
import {
    buildAppointmentDateTime,
    getDayCode,
    isAppointmentSlotAvailable,
    normalizeAppointmentSchedulingSettings,
    parseTimeToMinutes,
} from "@/lib/appointment-scheduling"

interface RateLimitEntry {
    count: number
    resetAt: number
}

const appointmentIpRateLimits = new Map<string, RateLimitEntry>()
const appointmentIdentityRateLimits = new Map<string, RateLimitEntry>()

const APPOINTMENT_IP_LIMIT = 10
const APPOINTMENT_IP_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const APPOINTMENT_IDENTITY_LIMIT = 4
const APPOINTMENT_IDENTITY_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const APPOINTMENT_MAX_DAYS_AHEAD = 365
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL?.trim()
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
const REDIS_RATE_LIMIT_ENABLED = Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN)

interface ConsumeRateLimitResult {
    allowed: boolean
    remaining: number
    resetInMs: number
}

function getRequesterIp(req: Request): string {
    return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || req.headers.get("x-real-ip")
        || "unknown"
}

function parseNumericResult(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value
    }

    if (typeof value === "string" && value.trim().length > 0) {
        const parsed = Number(value)
        if (Number.isFinite(parsed)) {
            return parsed
        }
    }

    return null
}

async function runRedisCommand(args: Array<string | number>): Promise<unknown | null> {
    if (!REDIS_RATE_LIMIT_ENABLED || !UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
        return null
    }

    try {
        const response = await fetch(UPSTASH_REDIS_REST_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(args),
            cache: "no-store"
        })

        if (!response.ok) {
            return null
        }

        const payload = await response.json() as { result?: unknown; error?: string }
        if (payload?.error) {
            return null
        }

        return payload?.result ?? null
    } catch (error) {
        console.error("Appointments Redis rate limit command failed:", error)
        return null
    }
}

async function consumeRedisRateLimit(
    key: string,
    limit: number,
    windowMs: number
): Promise<ConsumeRateLimitResult | null> {
    const incrementResult = await runRedisCommand(["INCR", key])
    const count = parseNumericResult(incrementResult)
    if (count === null) {
        return null
    }

    const ttlResult = await runRedisCommand(["PTTL", key])
    let resetInMs = parseNumericResult(ttlResult)
    if (resetInMs === null) {
        return null
    }

    if (resetInMs < 0) {
        await runRedisCommand(["PEXPIRE", key, windowMs])
        resetInMs = windowMs
    }

    return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        resetInMs: Math.max(0, resetInMs)
    }
}

async function consumeRateLimit(
    map: Map<string, RateLimitEntry>,
    key: string,
    limit: number,
    windowMs: number,
    bucket: "ip" | "identity"
): Promise<ConsumeRateLimitResult> {
    const redisResult = await consumeRedisRateLimit(
        `ratelimit:appointments:${bucket}:${key}`,
        limit,
        windowMs
    )
    if (redisResult) {
        return redisResult
    }

    const now = Date.now()
    const current = map.get(key)

    if (!current || now > current.resetAt) {
        const next = {
            count: 1,
            resetAt: now + windowMs
        }
        map.set(key, next)
        return {
            allowed: true,
            remaining: limit - 1,
            resetInMs: windowMs
        }
    }

    current.count += 1
    map.set(key, current)

    const remaining = Math.max(0, limit - current.count)
    return {
        allowed: current.count <= limit,
        remaining,
        resetInMs: Math.max(0, current.resetAt - now)
    }
}

function getRateLimitHeaders(result: { remaining: number; resetInMs: number }) {
    return {
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": Math.ceil(result.resetInMs / 1000).toString()
    }
}

// POST: Create a new appointment
export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
        }

        const body = await req.json()
        const {
            chatbotId,
            customerName,
            customerEmail,
            customerPhone,
            date,
            time,
            type,
            notes,
            sessionId,
            source,
            status,
        } = body

        if (!chatbotId || !date || !time) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const normalizedEmail = String(customerEmail || "").trim().toLowerCase()
        const normalizedPhone = String(customerPhone || "").trim()
        const authorizationHeader = req.headers.get("authorization")?.trim()
        const isAuthorizedRequest = Boolean(authorizationHeader)

        if (isAuthorizedRequest) {
            const authz = await authorizeTargetAccess(req, chatbotId)
            if (!authz.ok) {
                return authz.response
            }
        }

        if (!normalizedEmail && !isAuthorizedRequest) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        if (isAuthorizedRequest && !normalizedEmail && !normalizedPhone) {
            return NextResponse.json({ error: "Email or phone is required" }, { status: 400 })
        }

        if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
        }

        if (normalizedPhone && !/^[0-9+\-() ]{6,20}$/.test(normalizedPhone)) {
            return NextResponse.json({ error: "Invalid phone number" }, { status: 400 })
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !/^\d{2}:\d{2}$/.test(String(time))) {
            return NextResponse.json({ error: "Invalid date or time format" }, { status: 400 })
        }

        const appointmentDateTime = buildAppointmentDateTime(String(date), String(time))
        if (!appointmentDateTime) {
            return NextResponse.json({ error: "Invalid appointment date or time" }, { status: 400 })
        }

        const now = Date.now()
        if (appointmentDateTime.getTime() < now - 5 * 60 * 1000) {
            return NextResponse.json({ error: "Appointment must be in the future" }, { status: 400 })
        }

        if (appointmentDateTime.getTime() > now + APPOINTMENT_MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000) {
            return NextResponse.json({ error: "Appointment date is too far in the future" }, { status: 400 })
        }

        let identityRateHeaders: Record<string, string> | undefined

        if (!isAuthorizedRequest) {
            const ip = getRequesterIp(req)
            const ipRate = await consumeRateLimit(
                appointmentIpRateLimits,
                `${chatbotId}:${ip}`,
                APPOINTMENT_IP_LIMIT,
                APPOINTMENT_IP_WINDOW_MS,
                "ip"
            )
            if (!ipRate.allowed) {
                return NextResponse.json(
                    { error: "Too many appointment requests. Please try again later." },
                    { status: 429, headers: getRateLimitHeaders(ipRate) }
                )
            }

            const identityKey = `${chatbotId}:${normalizedEmail || normalizedPhone || "unknown"}`
            const identityRate = await consumeRateLimit(
                appointmentIdentityRateLimits,
                identityKey,
                APPOINTMENT_IDENTITY_LIMIT,
                APPOINTMENT_IDENTITY_WINDOW_MS,
                "identity"
            )
            if (!identityRate.allowed) {
                return NextResponse.json(
                    { error: "Too many booking attempts for this contact. Please try again later." },
                    { status: 429, headers: getRateLimitHeaders(identityRate) }
                )
            }

            identityRateHeaders = getRateLimitHeaders(identityRate)
        }

        const chatbotRef = adminDb.collection("chatbots").doc(chatbotId)
        const userRef = adminDb.collection("users").doc(chatbotId)
        const settingsRef = adminDb.collection("appointments_settings").doc(chatbotId)

        const [chatbotSnap, userSnap, settingsSnap] = await Promise.all([
            chatbotRef.get(),
            userRef.get(),
            settingsRef.get()
        ])

        if (!chatbotSnap.exists) {
            return NextResponse.json({ error: "Chatbot not found" }, { status: 404 })
        }

        const userData = userSnap.data()
        if (userData?.isActive === false) {
            return NextResponse.json({ error: "Account is inactive" }, { status: 403 })
        }

        const chatbotData = chatbotSnap.data()
        const isAppointmentsEnabled =
            chatbotData?.enableAppointments === true ||
            userData?.enableAppointments === true

        if (!isAppointmentsEnabled) {
            return NextResponse.json({ error: "Appointments are disabled for this chatbot" }, { status: 403 })
        }

        const settings = normalizeAppointmentSchedulingSettings(settingsSnap.exists ? settingsSnap.data() : null)

        if (!settings.workingDays.includes(getDayCode(appointmentDateTime))) {
            return NextResponse.json({ error: "Selected day is outside working days" }, { status: 400 })
        }

        const appointmentMinutes = parseTimeToMinutes(String(time))
        const startMinutes = parseTimeToMinutes(settings.workingHoursStart)
        const endMinutes = parseTimeToMinutes(settings.workingHoursEnd)
        if (
            appointmentMinutes === null ||
            startMinutes === null ||
            endMinutes === null ||
            appointmentMinutes < startMinutes ||
            appointmentMinutes + settings.appointmentDuration > endMinutes
        ) {
            return NextResponse.json({ error: "Selected time is outside working hours" }, { status: 400 })
        }

        if (sessionId) {
            const sessionSnap = await adminDb.collection("chat_sessions").doc(String(sessionId)).get()
            if (!sessionSnap.exists || sessionSnap.data()?.chatbotId !== chatbotId) {
                return NextResponse.json({ error: "Invalid session for chatbot" }, { status: 403 })
            }
        }

        const existingSameDay = await adminDb.collection("appointments")
            .where("chatbotId", "==", chatbotId)
            .where("date", "==", String(date))
            .limit(200)
            .get()

        const existingAppointments = existingSameDay.docs.map((doc) => {
            const data = doc.data() || {}
            return {
                id: doc.id,
                date: String(data.date || ""),
                time: String(data.time || ""),
                status: typeof data.status === "string" ? data.status : null,
            }
        })

        if (!isAppointmentSlotAvailable({
            date: String(date),
            time: String(time),
            settings,
            appointments: existingAppointments,
            now: new Date(),
        })) {
            return NextResponse.json({ error: "Selected time is not available" }, { status: 409 })
        }

        const allowedAuthorizedStatuses = new Set(["pending", "confirmed"])
        const appointmentStatus =
            isAuthorizedRequest && typeof status === "string" && allowedAuthorizedStatuses.has(status)
                ? status
                : "pending"
        const appointmentSource =
            isAuthorizedRequest && source === "manual"
                ? "manual"
                : "chatbot"
        const createdAt = new Date().toISOString()

        const appointmentData = {
            chatbotId,
            customerName: String(customerName || "").trim().slice(0, 120) || "Guest",
            customerEmail: normalizedEmail,
            customerPhone: normalizedPhone,
            date,
            time,
            type: String(type || "Consultation").trim().slice(0, 120),
            notes: String(notes || "").trim().slice(0, 1000),
            sessionId: String(sessionId || ""),
            status: appointmentStatus,
            source: appointmentSource,
            createdAt,
            updatedAt: createdAt,
            confirmedAt: appointmentStatus === "confirmed" ? createdAt : null,
        }

        const docRef = await adminDb.collection("appointments").add(appointmentData)

        // Notify tenant: in-app notification + email
        if (!isAuthorizedRequest) {
            try {
                const companyName: string = chatbotData?.companyName || chatbotData?.businessName || chatbotData?.name || "Vion AI"

                // Resolve tenant notification email
                let tenantEmail: string | null =
                    typeof chatbotData?.leadNotificationEmail === "string" && chatbotData.leadNotificationEmail.trim()
                        ? chatbotData.leadNotificationEmail.trim()
                        : typeof userData?.email === "string" && userData.email.trim()
                            ? userData.email.trim()
                            : null

                if (!tenantEmail) {
                    const adminAuth = getAdminAuth()
                    if (adminAuth) {
                        const userRecord = await adminAuth.getUser(chatbotId).catch(() => null)
                        if (userRecord?.email) tenantEmail = userRecord.email
                    }
                }

                // In-app notification
                await createNotification({
                    userId: chatbotId,
                    type: "appointment_created",
                    title: "Yeni Randevu Talebi",
                    message: `${appointmentData.customerName} — ${appointmentData.date} ${appointmentData.time}`,
                    metadata: {
                        customerEmail: appointmentData.customerEmail,
                        source: "appointments",
                    }
                })

                // Tenant alert email
                if (tenantEmail) {
                    await sendAppointmentTenantAlertEmail({
                        tenantEmail,
                        companyName,
                        customerName: appointmentData.customerName,
                        customerEmail: appointmentData.customerEmail,
                        customerPhone: appointmentData.customerPhone || undefined,
                        date: appointmentData.date,
                        time: appointmentData.time,
                        type: appointmentData.type || undefined,
                        notes: appointmentData.notes || undefined,
                    })
                }
            } catch (notifyErr) {
                console.error("Appointments POST: notification error:", notifyErr)
            }
        }

        return NextResponse.json({
            success: true,
            appointmentId: docRef.id,
            status: appointmentStatus,
        }, identityRateHeaders ? { status: 201, headers: identityRateHeaders } : { status: 201 })

    } catch (error: any) {
        console.error("Error creating appointment:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// GET: List appointments for a chatbot/tenant
export async function GET(req: Request) {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            console.error("Appointments GET: Firebase Admin not initialized")
            return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
        }

        const { searchParams } = new URL(req.url)
        const chatbotId = searchParams.get("chatbotId")

        if (!chatbotId) {
            return NextResponse.json({ error: "chatbotId is required" }, { status: 400 })
        }

        const authz = await authorizeTargetAccess(req, chatbotId)
        if (!authz.ok) {
            return authz.response
        }

        const snapshot = await adminDb.collection("appointments")
            .where("chatbotId", "==", chatbotId)
            .get()

        const appointments = snapshot.docs.map((doc: any) => {
            const data = doc.data()
            let createdAt = data.createdAt
            // Handle different createdAt formats
            if (createdAt?.toDate) {
                createdAt = createdAt.toDate().toISOString()
            } else if (typeof createdAt !== 'string') {
                createdAt = new Date().toISOString()
            }
            return {
                id: doc.id,
                ...data,
                createdAt
            }
        })

        // Sort by date AND time descending (client-side to avoid index requirement)
        appointments.sort((a: any, b: any) => {
            // Construct full ISO string for accurate comparison
            const dateStrA = a.date && a.time ? `${a.date}T${a.time}` : (a.date || a.createdAt);
            const dateStrB = b.date && b.time ? `${b.date}T${b.time}` : (b.date || b.createdAt);

            const dateA = new Date(dateStrA);
            const dateB = new Date(dateStrB);

            // Fallback for invalid dates
            const timeA = !isNaN(dateA.getTime()) ? dateA.getTime() : new Date(a.createdAt).getTime();
            const timeB = !isNaN(dateB.getTime()) ? dateB.getTime() : new Date(b.createdAt).getTime();

            return timeB - timeA;
        })

        return NextResponse.json({ appointments }, { status: 200 })

    } catch (error: any) {
        console.error("Error fetching appointments:", error)
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
    }
}
