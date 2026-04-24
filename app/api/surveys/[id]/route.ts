import { NextResponse } from "next/server"
import { authorizeTargetAccess } from "@/lib/api-auth"
import { getAdminDb } from "@/lib/firebase-admin"
import {
    SURVEY_AGGREGATE_COLLECTION,
    SURVEY_COLLECTION,
    SURVEY_RESPONSE_COLLECTION,
    buildDefaultSurveyWidgetConfig,
    buildSurveyDefinition,
    buildSurveyModuleConfig,
    fetchSurveyById,
    generateUniqueSurveySlug,
} from "@/lib/surveys/service"

export const dynamic = "force-dynamic"

async function clearActiveWidgetSurveyIfNeeded(adminDb: any, chatbotId: string, surveyId: string) {
    const chatbotRef = adminDb.collection("chatbots").doc(chatbotId)
    const snapshot = await chatbotRef.get()
    const currentConfig = buildDefaultSurveyWidgetConfig(snapshot.data()?.surveyModuleConfig || null)

    if (currentConfig.widgetActiveSurveyId !== surveyId) return

    await chatbotRef.set({
        surveyModuleConfig: buildSurveyModuleConfig({
            ...currentConfig,
            widgetActiveSurveyId: null,
        }),
    }, { merge: true })
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
    const adminDb = getAdminDb()
    if (!adminDb) {
        return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const survey = await fetchSurveyById(adminDb, params.id)
    if (!survey) {
        return NextResponse.json({ error: "Survey not found" }, { status: 404 })
    }

    const authz = await authorizeTargetAccess(req, survey.chatbotId)
    if (!authz.ok) {
        return authz.response
    }

    return NextResponse.json({ survey })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    const adminDb = getAdminDb()
    if (!adminDb) {
        return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const existing = await fetchSurveyById(adminDb, params.id)
    if (!existing) {
        return NextResponse.json({ error: "Survey not found" }, { status: 404 })
    }

    const authz = await authorizeTargetAccess(req, existing.chatbotId)
    if (!authz.ok) {
        return authz.response
    }

    const body = await req.json()
    const chatbotSnapshot = await adminDb.collection("chatbots").doc(existing.chatbotId).get()
    const widgetDefaults = buildDefaultSurveyWidgetConfig(chatbotSnapshot.data()?.surveyModuleConfig || null)
    const slugInput = typeof body?.slug === "string" && body.slug.trim()
        ? body.slug
        : (typeof body?.title === "string" && body.title.trim() ? body.title : existing.slug)
    const slug = await generateUniqueSurveySlug(adminDb, existing.chatbotId, slugInput, existing.id)
    const survey = buildSurveyDefinition({
        ...existing,
        ...body,
        id: existing.id,
        chatbotId: existing.chatbotId,
    }, {
        existing,
        widgetDefaults,
        slug,
        status: existing.status,
    })

    await adminDb.collection(SURVEY_COLLECTION).doc(existing.id).set(survey, { merge: true })

    if (!survey.channels.includes("widget") || survey.status !== "published") {
        await clearActiveWidgetSurveyIfNeeded(adminDb, existing.chatbotId, existing.id)
    }

    return NextResponse.json({ survey })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    const adminDb = getAdminDb()
    if (!adminDb) {
        return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const survey = await fetchSurveyById(adminDb, params.id)
    if (!survey) {
        return NextResponse.json({ error: "Survey not found" }, { status: 404 })
    }

    const authz = await authorizeTargetAccess(req, survey.chatbotId)
    if (!authz.ok) {
        return authz.response
    }

    const responsesSnapshot = await adminDb.collection(SURVEY_RESPONSE_COLLECTION).where("surveyId", "==", survey.id).get()
    const batch = adminDb.batch()

    batch.delete(adminDb.collection(SURVEY_COLLECTION).doc(survey.id))
    batch.delete(adminDb.collection(SURVEY_AGGREGATE_COLLECTION).doc(survey.id))

    for (const docSnapshot of responsesSnapshot.docs) {
        batch.delete(docSnapshot.ref)
    }

    await batch.commit()
    await clearActiveWidgetSurveyIfNeeded(adminDb, survey.chatbotId, survey.id)

    return NextResponse.json({ success: true })
}
