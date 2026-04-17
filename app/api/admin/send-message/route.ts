import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { authorizeTargetAccess } from "@/lib/api-auth"
import { dispatchOmniInstagramMessage, dispatchOmniMessengerMessage, dispatchOmniWhatsAppMessage } from "@/lib/omni/channel-dispatch"
import { FieldValue } from "firebase-admin/firestore"

function detectChannel(sessionId: string, explicitChannel?: string | null) {
    if (explicitChannel) return explicitChannel
    if (sessionId.startsWith("telegram-")) return "telegram"
    if (sessionId.startsWith("whatsapp-")) return "whatsapp"
    if (sessionId.startsWith("instagram-")) return "instagram"
    if (sessionId.startsWith("messenger-")) return "messenger"
    if (sessionId.startsWith("voice-")) return "voice"
    return "web"
}

async function dispatchTelegram(token: string, chatId: string, content: string) {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: chatId,
            text: content,
        }),
    })

    if (!response.ok) {
        throw new Error("Telegram delivery failed")
    }
}

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) {
            return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 })
        }

        const { sessionId, chatbotId, content } = await req.json()

        if (!sessionId || !chatbotId || !content) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const authz = await authorizeTargetAccess(req, chatbotId)
        if (!authz.ok) {
            return authz.response
        }

        const sessionRef = adminDb.collection("chat_sessions").doc(sessionId)
        const sessionSnap = await sessionRef.get()

        if (!sessionSnap.exists) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 })
        }

        const sessionData = sessionSnap.data() || {}
        if (sessionData.chatbotId !== chatbotId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const channel = detectChannel(sessionId, sessionData.channel || null)
        const omniConfigSnapshot =
            channel === "whatsapp" || channel === "instagram" || channel === "messenger"
                ? await adminDb.collection("omni_channel_configs").doc(chatbotId).get()
                : null
        const omniConfig = omniConfigSnapshot?.exists ? omniConfigSnapshot.data() || {} : {}

        if (channel === "whatsapp" && omniConfig.whatsapp?.enabled === false) {
            return NextResponse.json({ error: "WhatsApp channel is disabled" }, { status: 400 })
        }

        if (channel === "instagram" && omniConfig.instagram?.enabled === false) {
            return NextResponse.json({ error: "Instagram channel is disabled" }, { status: 400 })
        }

        if (channel === "messenger" && omniConfig.messenger?.enabled === false) {
            return NextResponse.json({ error: "Messenger channel is disabled" }, { status: 400 })
        }

        if (channel === "telegram") {
            const prefix = `telegram-${chatbotId}-`
            const chatId = sessionId.substring(prefix.length)
            const chatbotSnap = await adminDb.collection("chatbots").doc(chatbotId).get()
            const token = chatbotSnap.exists ? chatbotSnap.data()?.integrations?.telegram?.botToken : null

            if (!chatId || !token) {
                return NextResponse.json({ error: "Telegram configuration is incomplete" }, { status: 400 })
            }

            await dispatchTelegram(token, chatId, content)
        } else if (channel === "whatsapp") {
            await dispatchOmniWhatsAppMessage(adminDb, chatbotId, sessionData, content, {
                source: "api/admin/send-message",
                sessionId,
                metadata: {
                    humanReply: true,
                },
            })
        } else if (channel === "instagram") {
            await dispatchOmniInstagramMessage(adminDb, chatbotId, sessionData, content, {
                source: "api/admin/send-message",
                sessionId,
                metadata: {
                    humanReply: true,
                },
            })
        } else if (channel === "messenger") {
            await dispatchOmniMessengerMessage(adminDb, chatbotId, sessionData, content, {
                source: "api/admin/send-message",
                sessionId,
                metadata: {
                    humanReply: true,
                },
            })
        } else if (channel === "voice") {
            return NextResponse.json({ error: "Voice sessions cannot receive direct text replies. Use callback queue instead." }, { status: 400 })
        }

        const newMessage = {
            id: `human-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            role: "assistant",
            content,
            createdAt: new Date().toISOString(),
            isHuman: true,
        }

        await sessionRef.update({
            messages: FieldValue.arrayUnion(newMessage),
            updatedAt: new Date().toISOString(),
        })

        return NextResponse.json({ success: true, message: newMessage })
    } catch (error) {
        console.error("Admin Message Error:", error)
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 })
    }
}
