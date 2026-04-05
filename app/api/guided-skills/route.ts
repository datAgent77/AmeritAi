import { NextResponse } from "next/server"
import { authorizeTargetAccess } from "@/lib/api-auth"
import { getAdminDb } from "@/lib/firebase-admin"
import { listGuidedSkills, normalizeGuidedSkillRecord } from "@/lib/guided-skills"

export const dynamic = "force-dynamic"

function jsonError(message: string, status: number) {
    return NextResponse.json({ error: message }, { status })
}

export async function GET(req: Request) {
    const adminDb = getAdminDb()
    if (!adminDb) {
        return jsonError("Firebase Admin not initialized", 500)
    }

    const { searchParams } = new URL(req.url)
    const chatbotId = searchParams.get("chatbotId") || ""
    if (!chatbotId) {
        return jsonError("chatbotId is required", 400)
    }

    const authz = await authorizeTargetAccess(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }

    const skills = await listGuidedSkills(adminDb, chatbotId)
    return NextResponse.json({ skills })
}

export async function POST(req: Request) {
    const adminDb = getAdminDb()
    if (!adminDb) {
        return jsonError("Firebase Admin not initialized", 500)
    }

    const body = await req.json().catch(() => null)
    const chatbotId = typeof body?.chatbotId === "string" ? body.chatbotId : ""
    if (!chatbotId) {
        return jsonError("chatbotId is required", 400)
    }

    const authz = await authorizeTargetAccess(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }

    const normalized = normalizeGuidedSkillRecord(body?.skill, {
        id: typeof body?.skill?.id === "string" ? body.skill.id : undefined,
        chatbotId,
    })

    if (!normalized) {
        return jsonError("Invalid guided skill payload", 400)
    }

    const docRef = adminDb.collection("guided_skills").doc(normalized.id)
    const existing = await docRef.get()
    const now = new Date().toISOString()

    await docRef.set(
        {
            ...normalized,
            chatbotId,
            createdAt: existing.exists ? existing.data()?.createdAt || normalized.createdAt || now : normalized.createdAt || now,
            updatedAt: now,
        },
        { merge: true }
    )

    const skill = normalizeGuidedSkillRecord((await docRef.get()).data(), { id: normalized.id, chatbotId })
    return NextResponse.json({ skill })
}

export async function DELETE(req: Request) {
    const adminDb = getAdminDb()
    if (!adminDb) {
        return jsonError("Firebase Admin not initialized", 500)
    }

    const body = await req.json().catch(() => null)
    const chatbotId = typeof body?.chatbotId === "string" ? body.chatbotId : ""
    const id = typeof body?.id === "string" ? body.id : ""
    if (!chatbotId || !id) {
        return jsonError("chatbotId and id are required", 400)
    }

    const authz = await authorizeTargetAccess(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }

    const docRef = adminDb.collection("guided_skills").doc(id)
    const docSnap = await docRef.get()
    if (!docSnap.exists) {
        return jsonError("Guided skill not found", 404)
    }
    if (docSnap.data()?.chatbotId !== chatbotId) {
        return jsonError("Guided skill does not belong to this chatbot", 403)
    }

    await docRef.delete()
    return NextResponse.json({ ok: true })
}
