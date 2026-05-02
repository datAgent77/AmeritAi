import { NextResponse } from "next/server"
import { authorizeTargetAccess } from "@/lib/api-auth"
import { shouldUseFirebaseOfflineFallback } from "@/lib/firebase-errors"
import { getAdminDb } from "@/lib/firebase-admin"
import {
    SURVEY_COLLECTION,
    buildDefaultSurveyWidgetConfig,
    buildSurveyDefinition,
    fetchSurveyList,
    generateUniqueSurveySlug,
} from "@/lib/surveys/service"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) {
            return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
        }

        const { searchParams } = new URL(req.url)
        const chatbotId = searchParams.get("chatbotId")

        if (!chatbotId) {
            return NextResponse.json({ error: "chatbotId is required" }, { status: 400 })
        }

        const authz = await authorizeTargetAccess(req, chatbotId)
        if (!authz.ok) {
            return authz.response
        }

        const surveys = await fetchSurveyList(adminDb, chatbotId)
        return NextResponse.json({ surveys })
    } catch (error) {
        if (shouldUseFirebaseOfflineFallback(error)) {
            console.warn("[Surveys API] Firestore unavailable; returning development fallback.", error)
            return NextResponse.json({ surveys: [], offline: true })
        }

        console.error("[Surveys API] Internal Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const adminDb = getAdminDb()
    if (!adminDb) {
        return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const body = await req.json()
    const chatbotId = typeof body?.chatbotId === "string" ? body.chatbotId : ""

    if (!chatbotId) {
        return NextResponse.json({ error: "chatbotId is required" }, { status: 400 })
    }

    const authz = await authorizeTargetAccess(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }

    const chatbotSnapshot = await adminDb.collection("chatbots").doc(chatbotId).get()
    const widgetDefaults = buildDefaultSurveyWidgetConfig(chatbotSnapshot.data()?.surveyModuleConfig || null)
    const docRef = adminDb.collection(SURVEY_COLLECTION).doc()
    const slug = await generateUniqueSurveySlug(
        adminDb,
        chatbotId,
        typeof body?.slug === "string" && body.slug.trim() ? body.slug : (typeof body?.title === "string" ? body.title : "survey")
    )
    const survey = buildSurveyDefinition({
        ...body,
        id: docRef.id,
        chatbotId,
    }, {
        widgetDefaults,
        slug,
    })

    await docRef.set(survey)

    return NextResponse.json({ survey }, { status: 201 })
}
