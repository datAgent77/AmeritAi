import { NextResponse } from "next/server"
import { authorizeTargetAccess } from "@/lib/api-auth"
import { getAdminDb } from "@/lib/firebase-admin"
import { SURVEY_COLLECTION, buildDefaultSurveyWidgetConfig, buildSurveyModuleConfig, fetchSurveyById } from "@/lib/surveys/service"

export const dynamic = "force-dynamic"

export async function POST(req: Request, { params }: { params: { id: string } }) {
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

    const closedAt = new Date().toISOString()
    const nextSurvey = {
        ...survey,
        status: "closed" as const,
        closedAt,
        updatedAt: closedAt,
    }

    await adminDb.collection(SURVEY_COLLECTION).doc(survey.id).set(nextSurvey, { merge: true })

    const chatbotRef = adminDb.collection("chatbots").doc(survey.chatbotId)
    const chatbotSnapshot = await chatbotRef.get()
    const currentConfig = buildDefaultSurveyWidgetConfig(chatbotSnapshot.data()?.surveyModuleConfig || null)

    if (currentConfig.widgetActiveSurveyId === survey.id) {
        await chatbotRef.set({
            surveyModuleConfig: buildSurveyModuleConfig({
                ...currentConfig,
                widgetActiveSurveyId: null,
            }),
        }, { merge: true })
    }

    return NextResponse.json({ survey: nextSurvey })
}
