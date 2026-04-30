import { NextResponse } from "next/server"
import crypto from "crypto"
import { getAdminDb } from "@/lib/firebase-admin"
import {
    buildMobileUserContext,
    generateMobileSessionToken,
    hashMobileClientToken,
    normalizeMobileAppIntegrationConfig,
} from "@/lib/integrations/mobile-support"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getClientToken(req: Request) {
    const auth = req.headers.get("authorization")
    if (auth?.startsWith("Bearer ")) return auth.slice("Bearer ".length).trim()
    return req.headers.get("x-vion-client-token")?.trim() || ""
}

function clampTtlMinutes(value: unknown) {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return 30
    return Math.min(Math.max(Math.floor(parsed), 5), 120)
}

function resolveOrigin(req: Request) {
    const url = new URL(req.url)
    const forwardedProto = req.headers.get("x-forwarded-proto")
    const forwardedHost = req.headers.get("x-forwarded-host")
    if (forwardedHost) return `${forwardedProto || url.protocol.replace(":", "")}://${forwardedHost}`
    return url.origin
}

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })

        const body = await req.json()
        const chatbotId = String(body.chatbotId || "").trim()
        if (!chatbotId) return NextResponse.json({ error: "Missing chatbotId" }, { status: 400 })

        const token = getClientToken(req)
        if (!token) return NextResponse.json({ error: "Missing mobile client token" }, { status: 401 })

        const chatbotSnap = await adminDb.collection("chatbots").doc(chatbotId).get()
        const chatbotData = chatbotSnap.exists ? chatbotSnap.data() || {} : {}
        const mobileConfig = normalizeMobileAppIntegrationConfig(chatbotData.integrations?.mobileApp)

        if (!mobileConfig.enabled || !mobileConfig.clientTokenHash) {
            return NextResponse.json({ error: "Mobile App integration is not enabled" }, { status: 403 })
        }

        if (hashMobileClientToken(token) !== mobileConfig.clientTokenHash) {
            return NextResponse.json({ error: "Invalid mobile client token" }, { status: 401 })
        }

        const appId = req.headers.get("x-vion-app-id")?.trim()
        if (mobileConfig.allowedAppIds.length > 0 && (!appId || !mobileConfig.allowedAppIds.includes(appId))) {
            return NextResponse.json({ error: "App id is not allowed" }, { status: 403 })
        }

        const now = new Date()
        const ttlMinutes = clampTtlMinutes(body.ttlMinutes)
        const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000)
        const mobileSession = generateMobileSessionToken()
        const sessionHash = hashMobileClientToken(mobileSession)
        const sessionId = String(body.sessionId || `mobile-webview-${crypto.randomUUID()}`).trim()
        const language = typeof body.language === "string" ? body.language : null
        const context = buildMobileUserContext({ ...body, sessionId })

        await adminDb.collection("mobile_app_sessions").doc(sessionHash).set({
            chatbotId,
            sessionId,
            customer: body.customer || null,
            context: body.context && typeof body.context === "object" ? body.context : {},
            language,
            pageContext: context,
            source: "mobile_app",
            createdAt: now,
            expiresAt,
            usedAt: null,
        })

        const origin = resolveOrigin(req)
        const hostedChatUrl = `${origin}/chatbot-view?id=${encodeURIComponent(chatbotId)}&source=mobile_app&mobileSession=${encodeURIComponent(mobileSession)}`

        return NextResponse.json({
            success: true,
            mobileSession,
            sessionId,
            expiresAt: expiresAt.toISOString(),
            hostedChatUrl,
        })
    } catch (error: any) {
        console.error("[mobile-assistant/session POST]", error)
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
    }
}
