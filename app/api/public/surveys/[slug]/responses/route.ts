import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import {
    SURVEY_AGGREGATE_COLLECTION,
    SURVEY_COLLECTION,
    SURVEY_PID_COOKIE,
    SURVEY_RESPONSE_COLLECTION,
    applyResponseToAggregate,
    buildPublicSurvey,
    consumeSurveyRateLimit,
    createIpHash,
    createParticipantId,
    createSurveyFingerprint,
    fetchSurveyBySlug,
    getRequesterIp,
    getSurveyRateLimitHeaders,
    serializeSurveyAggregate,
    validateSurveySubmission,
} from "@/lib/surveys/service"
import type { SurveyChannel, SurveyResponseRecord } from "@/lib/surveys/types"

export const dynamic = "force-dynamic"

export async function POST(req: Request, { params }: { params: { slug: string } }) {
    const adminDb = getAdminDb()
    if (!adminDb) {
        return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const survey = await fetchSurveyBySlug(adminDb, params.slug)
    if (!survey || survey.status !== "published") {
        return NextResponse.json({ error: "Survey not found" }, { status: 404 })
    }

    const body = await req.json()
    const source = body?.source === "widget" ? "widget" : "publicPage"
    const requiredChannel: SurveyChannel = source === "widget" ? "widget" : "publicPage"

    if (!survey.channels.includes(requiredChannel)) {
        return NextResponse.json({ error: "Survey is not available on this channel" }, { status: 400 })
    }

    const cookieStore = cookies()
    const existingPid = cookieStore.get(SURVEY_PID_COOKIE)?.value
    const pid = existingPid || createParticipantId()
    const ip = getRequesterIp(req)
    const userAgent = req.headers.get("user-agent") || ""
    const fingerprintHash = createSurveyFingerprint(pid, survey.id, ip, userAgent)
    const rateLimitResult = await consumeSurveyRateLimit(ip, fingerprintHash)

    if (!rateLimitResult.allowed) {
        return NextResponse.json(
            { error: rateLimitResult.reason || "Rate limit exceeded" },
            {
                status: 429,
                headers: getSurveyRateLimitHeaders(rateLimitResult),
            }
        )
    }

    let normalizedSubmission
    try {
        normalizedSubmission = validateSurveySubmission(buildPublicSurvey(survey), body || {})
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Invalid survey submission" },
            {
                status: 400,
                headers: getSurveyRateLimitHeaders(rateLimitResult),
            }
        )
    }

    const createdAt = new Date().toISOString()
    const responseId = `${survey.id}_${fingerprintHash}`
    const responseRef = adminDb.collection(SURVEY_RESPONSE_COLLECTION).doc(responseId)
    const aggregateRef = adminDb.collection(SURVEY_AGGREGATE_COLLECTION).doc(survey.id)
    const surveyRef = adminDb.collection(SURVEY_COLLECTION).doc(survey.id)

    try {
        await adminDb.runTransaction(async (transaction: any) => {
            const [currentSurveySnapshot, existingResponseSnapshot, aggregateSnapshot] = await Promise.all([
                transaction.get(surveyRef),
                transaction.get(responseRef),
                transaction.get(aggregateRef),
            ])

            if (!currentSurveySnapshot.exists) {
                throw new Error("Survey not found")
            }

            if (existingResponseSnapshot.exists) {
                throw new Error("duplicate_response")
            }

            const aggregate = serializeSurveyAggregate(
                survey,
                aggregateSnapshot.exists ? aggregateSnapshot.data() || {} : {}
            )
            const nextAggregate = applyResponseToAggregate(survey, aggregate, normalizedSubmission.answers)
            const responseRecord: SurveyResponseRecord = {
                id: responseId,
                chatbotId: survey.chatbotId,
                surveyId: survey.id,
                fingerprintHash,
                answers: normalizedSubmission.answers,
                contact: normalizedSubmission.contact,
                consentSnapshot: survey.consent,
                metadata: {
                    source,
                    ipHash: createIpHash(ip),
                    pid,
                    userAgent,
                },
                createdAt,
                updatedAt: createdAt,
            }

            transaction.set(responseRef, responseRecord)
            transaction.set(aggregateRef, nextAggregate, { merge: true })
            transaction.set(surveyRef, {
                responseCount: (typeof survey.responseCount === "number" ? survey.responseCount : 0) + 1,
                lastResponseAt: createdAt,
                updatedAt: createdAt,
            }, { merge: true })
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to submit survey"
        if (message === "duplicate_response") {
            return NextResponse.json(
                { error: "This participant has already completed the survey." },
                {
                    status: 409,
                    headers: getSurveyRateLimitHeaders(rateLimitResult),
                }
            )
        }

        return NextResponse.json(
            { error: message },
            {
                status: 500,
                headers: getSurveyRateLimitHeaders(rateLimitResult),
            }
        )
    }

    const response = NextResponse.json(
        {
            ok: true,
            survey: {
                id: survey.id,
                thankYouTitle: survey.thankYouTitle,
                thankYouText: survey.thankYouText,
            },
        },
        {
            status: 201,
            headers: getSurveyRateLimitHeaders(rateLimitResult),
        }
    )

    if (!existingPid) {
        response.cookies.set(SURVEY_PID_COOKIE, pid, {
            httpOnly: false,
            sameSite: "lax",
            secure: new URL(req.url).protocol === "https:",
            path: "/",
            maxAge: 60 * 60 * 24 * 365,
        })
    }

    return response
}
