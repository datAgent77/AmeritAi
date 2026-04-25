import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { authorizeTargetAccess } from "@/lib/api-auth"
import {
    buildTenantTrainingPrompt,
    fetchAssistantTrainingEntries,
    scoreAssistantTrainingEntry,
    selectRelevantAssistantTrainingEntries,
} from "@/lib/assistant-training"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) {
            return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 })
        }

        const body = await req.json()
        const chatbotId = typeof body?.chatbotId === "string" ? body.chatbotId.trim() : ""
        const question = typeof body?.question === "string" ? body.question.trim() : ""
        const language = typeof body?.language === "string" ? body.language.trim() : "auto"

        if (!chatbotId) {
            return NextResponse.json({ error: "chatbotId is required" }, { status: 400 })
        }

        const authz = await authorizeTargetAccess(req, chatbotId)
        if (!authz.ok) return authz.response

        const entries = await fetchAssistantTrainingEntries(adminDb, chatbotId)
        const promptResult = question
            ? buildTenantTrainingPrompt({ entries, userText: question, language })
            : { prompt: "", rules: [], matches: [] }

        const testCases = entries
            .filter((entry) => entry.status === "active" && entry.type === "test_case" && entry.question)
            .map((entry) => ({
                id: entry.id,
                question: entry.question,
                expected: entry.answer || "",
                score: question ? scoreAssistantTrainingEntry(entry, question, language) : 0,
                matches: selectRelevantAssistantTrainingEntries(entries, entry.question || "", { language, limit: 3 })
                    .filter((match) => match.entry.type !== "test_case")
                    .map((match) => ({
                        id: match.entry.id,
                        type: match.entry.type,
                        question: match.entry.question,
                        answer: match.entry.answer,
                        score: match.score,
                    })),
            }))

        return NextResponse.json({
            prompt: promptResult.prompt,
            rules: promptResult.rules,
            matches: promptResult.matches.map((match) => ({
                id: match.entry.id,
                type: match.entry.type,
                question: match.entry.question,
                answer: match.entry.answer,
                wrongAnswer: match.entry.wrongAnswer,
                priority: match.entry.priority,
                score: match.score,
            })),
            testCases,
        })
    } catch (error) {
        console.error("[assistant-training] evaluate failed:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
