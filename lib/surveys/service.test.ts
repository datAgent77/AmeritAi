import { describe, expect, test } from "vitest"
import {
    applyResponseToAggregate,
    buildPublicSurvey,
    buildSurveyFromTemplate,
    validateSurveySubmission,
} from "@/lib/surveys/service"
import { SURVEY_OTHER_CHOICE_VALUE } from "@/lib/surveys/types"

describe("survey service", () => {
    test("does not emit undefined question fields for Firestore writes", () => {
        const survey = buildSurveyFromTemplate({
            chatbotId: "tenant-1",
            templateType: "satisfaction",
            widgetDefaults: null,
        })

        expect(survey.questions.some((question) => Object.values(question).some((value) => value === undefined))).toBe(false)
        expect(survey.questions.find((question) => question.type === "number")).not.toHaveProperty("options")
    })

    test("creates political poll template with demographic question set", () => {
        const survey = buildSurveyFromTemplate({
            chatbotId: "tenant-1",
            templateType: "political_poll",
            widgetDefaults: null,
        })

        expect(survey.title).toBe("Siyasi Egilim Anketi")
        expect(survey.questions.map((question) => question.id)).toEqual([
            "party_preference",
            "confidence",
            "age_range",
            "gender",
            "city",
            "district",
        ])
    })

    test("requires consent and validates other choice payloads", () => {
        const survey = buildSurveyFromTemplate({
            chatbotId: "tenant-1",
            templateType: "market_research",
            widgetDefaults: null,
        })

        expect(() => validateSurveySubmission(buildPublicSurvey(survey), {
            consentAccepted: false,
            answers: {},
            contact: {},
        })).toThrow("Consent is required")

        const normalized = validateSurveySubmission(buildPublicSurvey(survey), {
            consentAccepted: true,
            answers: {
                usage_frequency: { value: "Her gun" },
                decision_factors: { value: ["Fiyat", SURVEY_OTHER_CHOICE_VALUE], otherText: "Taksit" },
                budget: { value: "2500" },
            },
            contact: {},
        })

        const decisionFactors = normalized.answers.find((answer) => answer.questionId === "decision_factors")
        expect(decisionFactors?.value).toEqual(["Fiyat", SURVEY_OTHER_CHOICE_VALUE])
        expect(decisionFactors?.otherText).toBe("Taksit")
    })

    test("aggregates choice and numeric survey answers", () => {
        const survey = buildSurveyFromTemplate({
            chatbotId: "tenant-1",
            templateType: "satisfaction",
            widgetDefaults: null,
        })

        const aggregate = applyResponseToAggregate(survey, null, [
            {
                questionId: "overall_score",
                questionTitle: "Genel memnuniyet puaniniz nedir? (1-10)",
                questionType: "number",
                value: 9,
            },
            {
                questionId: "recommendation",
                questionTitle: "Bizi tavsiye etme olasiliginiz nedir?",
                questionType: "singleChoice",
                value: "Cok yuksek",
            },
        ])

        expect(aggregate.totalResponses).toBe(1)
        expect(aggregate.questionStats.recommendation.optionCounts?.["Cok yuksek"]).toBe(1)
        expect(aggregate.questionStats.overall_score.numericSummary?.average).toBe(9)
    })
})
