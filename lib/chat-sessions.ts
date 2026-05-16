import { getAdminDb } from "@/lib/firebase-admin"
import {
    appendChatSessionMessage,
    normalizeChatSessionMessage,
    type ChatSessionMessageRecord,
} from "@/lib/chat-session-messages"
import type { GuidedSkillState } from "@/lib/guided-skills/types"

export async function upsertChatSessionRecord(params: {
    sessionId: string
    chatbotId: string
    message?: Partial<ChatSessionMessageRecord> | null
    guidedSkillState?: GuidedSkillState | null
    userId?: string
    channel?: string | null
}) {
    const adminDb = getAdminDb()
    if (!adminDb) return

    const sessionRef = adminDb.collection("chat_sessions").doc(params.sessionId)
    const snapshot = await sessionRef.get()
    const existing = snapshot.exists ? snapshot.data() || {} : {}
    const existingMessages = Array.isArray(existing.messages) ? existing.messages : []
    const normalizedMessage = params.message ? normalizeChatSessionMessage(params.message) : null
    const nextMessages = normalizedMessage
        ? appendChatSessionMessage(existingMessages, normalizedMessage as unknown as Record<string, unknown>)
        : existingMessages

    await sessionRef.set(
        {
            chatbotId: params.chatbotId,
            ...(params.userId ? { userId: params.userId } : existing.userId ? { userId: existing.userId } : {}),
            ...(params.channel ? { channel: params.channel } : existing.channel ? { channel: existing.channel } : {}),
            createdAt: existing.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: nextMessages,
            guidedSkillState:
                params.guidedSkillState === undefined
                    ? existing.guidedSkillState ?? null
                    : params.guidedSkillState,
        },
        { merge: true }
    )
}
