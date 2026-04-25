import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { authorizeTargetAccess } from "@/lib/api-auth"
import {
    fetchAssistantTrainingEntries,
    normalizeAssistantTrainingEntryInput,
    serializeAssistantTrainingEntry,
} from "@/lib/assistant-training"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) {
            return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 })
        }

        const { searchParams } = new URL(req.url)
        const chatbotId = searchParams.get("chatbotId") || ""
        if (!chatbotId) {
            return NextResponse.json({ error: "chatbotId is required" }, { status: 400 })
        }

        const authz = await authorizeTargetAccess(req, chatbotId)
        if (!authz.ok) return authz.response

        const entries = await fetchAssistantTrainingEntries(adminDb, chatbotId)
        return NextResponse.json({ entries }, {
            headers: { "Cache-Control": "no-store, max-age=0" },
        })
    } catch (error) {
        console.error("[assistant-training] GET failed:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) {
            return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 })
        }

        const body = await req.json()
        const input = normalizeAssistantTrainingEntryInput(body || {})

        const authz = await authorizeTargetAccess(req, input.chatbotId)
        if (!authz.ok) return authz.response

        const now = new Date()
        const docRef = adminDb.collection("assistant_training_entries").doc()
        const payload = {
            ...input,
            createdBy: authz.callerUid,
            createdAt: now,
            updatedAt: now,
        }

        await docRef.set(payload)

        return NextResponse.json({
            success: true,
            entry: serializeAssistantTrainingEntry(docRef.id, payload),
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid request"
        const status = /required|chatbotId/.test(message) ? 400 : 500
        console.error("[assistant-training] POST failed:", error)
        return NextResponse.json({ error: message }, { status })
    }
}
