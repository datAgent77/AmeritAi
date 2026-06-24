import { notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { getAdminDb } from "@/lib/firebase-admin"
import { buildPublicSurvey, fetchSurveyBySlug } from "@/lib/surveys/service"
import { PublicSurveyRuntime } from "@/components/surveys/public-survey-runtime"

export const dynamic = "force-dynamic"

export default async function PublicSurveyPage({ params }: { params: { slug: string } }) {
    const adminDb = getAdminDb()
    if (!adminDb) {
        return (
            <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-12">
                <Card className="w-full">
                    <CardContent className="p-8 text-center text-sm text-muted-foreground">
                        Survey runtime is not available right now.
                    </CardContent>
                </Card>
            </div>
        )
    }

    const survey = await fetchSurveyBySlug(adminDb, params.slug)
    if (!survey || survey.status !== "published" || !survey.channels.includes("publicPage")) {
        notFound()
    }

    return (
        <div className="min-h-screen bg-zinc-50 px-4 py-12">
            <div className="mx-auto max-w-3xl space-y-6">
                <div className="space-y-2 text-center">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">AmeritAI Surveys</p>
                    <h1 className="text-4xl font-semibold tracking-tight text-zinc-950">{survey.title}</h1>
                </div>
                <PublicSurveyRuntime survey={buildPublicSurvey(survey)} />
            </div>
        </div>
    )
}
