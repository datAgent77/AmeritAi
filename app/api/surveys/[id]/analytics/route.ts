import { NextResponse } from "next/server"
import { authorizeTargetAccess } from "@/lib/api-auth"
import { getAdminDb } from "@/lib/firebase-admin"
import { buildSurveyAnalytics, fetchSurveyById } from "@/lib/surveys/service"

export const dynamic = "force-dynamic"

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

    const analytics = await buildSurveyAnalytics(adminDb, survey)
    return NextResponse.json(analytics)
}
