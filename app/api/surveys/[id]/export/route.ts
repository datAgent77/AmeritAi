import { NextResponse } from "next/server"
import { authorizeTargetAccess } from "@/lib/api-auth"
import { getAdminDb } from "@/lib/firebase-admin"
import { buildSurveyAnalytics, createSurveyExportBuffer, fetchSurveyById } from "@/lib/surveys/service"

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

    const { searchParams } = new URL(req.url)
    const format = searchParams.get("format") === "xlsx" ? "xlsx" : "csv"
    const analytics = await buildSurveyAnalytics(adminDb, survey)
    const buffer = createSurveyExportBuffer(analytics, format)
    const filename = `${survey.slug || survey.id}-responses.${format}`

    return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
            "Content-Type": format === "xlsx"
                ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                : "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    })
}
