import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { authorizeTargetAccess } from "@/lib/api-auth"
import {
    normalizeAssistantTrainingEntryInput,
    serializeAssistantTrainingEntry,
} from "@/lib/assistant-training"

export const dynamic = "force-dynamic"

async function loadTrainingEntry(adminDb: any, id: string) {
    const ref = adminDb.collection("assistant_training_entries").doc(id)
    const snapshot = await ref.get()
    if (!snapshot.exists) return null
    return {
        ref,
        entry: serializeAssistantTrainingEntry(snapshot.id, snapshot.data() || {}),
    }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) {
            return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 })
        }

        const current = await loadTrainingEntry(adminDb, params.id)
        if (!current) {
            return NextResponse.json({ error: "Training entry not found" }, { status: 404 })
        }

        const authz = await authorizeTargetAccess(req, current.entry.chatbotId)
        if (!authz.ok) return authz.response

        const body = await req.json()
        const input = normalizeAssistantTrainingEntryInput({
            ...body,
            chatbotId: current.entry.chatbotId,
        }, current.entry)
        const payload = {
            ...input,
            updatedAt: new Date(),
        }

        await current.ref.set(payload, { merge: true })

        return NextResponse.json({
            success: true,
            entry: serializeAssistantTrainingEntry(params.id, {
                ...current.entry,
                ...payload,
            }),
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid request"
        const status = /required|chatbotId/.test(message) ? 400 : 500
        console.error("[assistant-training] PATCH failed:", error)
        return NextResponse.json({ error: message }, { status })
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) {
            return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 })
        }

        const current = await loadTrainingEntry(adminDb, params.id)
        if (!current) {
            return NextResponse.json({ error: "Training entry not found" }, { status: 404 })
        }

        const authz = await authorizeTargetAccess(req, current.entry.chatbotId)
        if (!authz.ok) return authz.response

        await current.ref.delete()

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("[assistant-training] DELETE failed:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
