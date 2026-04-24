import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { buildPublicSurvey, fetchSurveyBySlug } from "@/lib/surveys/service"

export const dynamic = "force-dynamic"

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
    const adminDb = getAdminDb()
    if (!adminDb) {
        return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const survey = await fetchSurveyBySlug(adminDb, params.slug)
    if (!survey || survey.status !== "published") {
        return NextResponse.json({ error: "Survey not found" }, { status: 404 })
    }

    return NextResponse.json({ survey: buildPublicSurvey(survey) })
}
