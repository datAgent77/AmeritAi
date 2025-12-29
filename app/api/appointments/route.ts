import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

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
            sessionId
        } = body

        if (!chatbotId || !customerEmail || !date || !time) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const appointmentData = {
            chatbotId,
            customerName,
            customerEmail,
            customerPhone: customerPhone || "",
            date,
            time,
            type: type || "Consultation",
            notes: notes || "",
            sessionId: sessionId || "",
            status: "pending",
            source: "chatbot",
            createdAt: new Date().toISOString()
        }

        const docRef = await adminDb.collection("appointments").add(appointmentData)

        return NextResponse.json({
            success: true,
            appointmentId: docRef.id
        }, { status: 201 })

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
