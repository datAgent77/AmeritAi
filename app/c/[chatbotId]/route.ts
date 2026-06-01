import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

export async function GET(req: Request, { params }: { params: { chatbotId: string } }) {
    const url = new URL(req.url)
    const target = new URL("/chatbot-view", url.origin)
    const codeOrChatbotId = params.chatbotId

    let chatbotId = codeOrChatbotId
    if (codeOrChatbotId.length <= 12) {
        const adminDb = getAdminDb()
        const shortLink = adminDb
            ? await adminDb.collection("short_links").doc(codeOrChatbotId).get().catch(() => null)
            : null
        const data = shortLink?.exists ? shortLink.data() : null
        if (data?.type === "direct_chat" && typeof data.chatbotId === "string" && data.chatbotId.trim()) {
            chatbotId = data.chatbotId.trim()
        }
    }

    target.searchParams.set("id", chatbotId)
    url.searchParams.forEach((value, key) => {
        if (key !== "id") {
            target.searchParams.set(key, value)
        }
    })

    return NextResponse.redirect(target)
}
