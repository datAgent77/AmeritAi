import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { getAdminDb } from "@/lib/firebase-admin"
import { authorizeTargetAccess } from "@/lib/api-auth"
import {
    fetchAssistantTrainingEntries,
    sanitizeTrainingPromptText,
} from "@/lib/assistant-training"
import { DEFAULT_INDUSTRY, INDUSTRY_CONFIG, type IndustryType } from "@/lib/industry-config"

export const dynamic = "force-dynamic"

type RuleSuggestion = {
    rule: string
    rationale?: string
    source: "ai" | "fallback"
}

const BASE_RULES = {
    tr: [
        "Cevapları kısa, net ve kullanıcının sorusuna doğrudan bağlı ver.",
        "Fiyat, kampanya, stok, süre veya müsaitlik bilgisi uydurma; kesin veri yoksa temsilciye yönlendir.",
        "Şirketin AI eğitim kaynaklarında veya canlı modül verilerinde olmayan şirket dışı bilgi üretme.",
        "Emin olmadığın konularda kesin konuşma; doğrulama gerektiğini belirt ve iletişim/randevu kanalına yönlendir.",
        "Sağlık, hukuk veya finans konularında kesin hüküm, teşhis, yatırım tavsiyesi veya bağlayıcı yorum yapma.",
    ],
    en: [
        "Keep answers short, clear, and directly tied to the user's question.",
        "Do not invent prices, campaigns, stock, timelines, or availability; route to a representative when verified data is missing.",
        "Do not generate information outside the company's AI training resources or live module data.",
        "When unsure, do not sound certain; say verification is needed and route to contact or booking.",
        "Do not give definitive medical, legal, or financial judgments, diagnoses, investment advice, or binding interpretations.",
    ],
}

const SECTOR_RULES: Partial<Record<IndustryType, { tr: string[]; en: string[] }>> = {
    healthcare: {
        tr: [
            "Tıbbi teşhis, tedavi planı veya ilaç önerisi verme; sağlık sorularında uzman hekime veya kliniğe yönlendir.",
            "Randevu, doktor, branş ve hazırlık bilgilerini sadece kayıtlı bilgi veya canlı müsaitlik verisine dayanarak paylaş.",
        ],
        en: [
            "Do not provide medical diagnosis, treatment plans, or medication advice; route health questions to a qualified clinician or clinic.",
            "Share appointment, doctor, department, and preparation details only from stored knowledge or live availability data.",
        ],
    },
    legal: {
        tr: [
            "Hukuki danışmanlık veya kesin sonuç vaadi verme; mevzuat ve süreç sorularında avukat/uzman görüşüne yönlendir.",
            "Sözleşme, dava veya başvuru konularında yalnızca genel bilgilendirme yap, bağlayıcı yorumdan kaçın.",
        ],
        en: [
            "Do not provide legal advice or guaranteed outcomes; route legal process questions to a lawyer or qualified expert.",
            "For contracts, disputes, or applications, provide general information only and avoid binding interpretations.",
        ],
    },
    finance: {
        tr: [
            "Yatırım, kredi, vergi veya finansal kararlar için kişisel tavsiye verme; lisanslı uzmana yönlendir.",
            "Getiri, faiz, ödeme planı veya ücret bilgisini yalnızca doğrulanmış kaynakta varsa paylaş.",
        ],
        en: [
            "Do not give personal investment, credit, tax, or financial decision advice; route to a licensed expert.",
            "Share returns, rates, payment plans, or fee information only when it exists in a verified source.",
        ],
    },
    ecommerce: {
        tr: [
            "Stok, teslimat, iade ve kargo bilgisini uydurma; ürün veya sipariş verisi yoksa temsilciye yönlendir.",
            "Ürün önerirken kullanıcının ihtiyacını sor ve yalnızca bilinen ürün özelliklerini karşılaştır.",
        ],
        en: [
            "Do not invent stock, delivery, return, or shipping details; route to a representative when product or order data is missing.",
            "Ask the user's need before recommending products and compare only known product attributes.",
        ],
    },
    booking: {
        tr: [
            "Rezervasyon, randevu veya müsaitlik bilgisini sadece canlı takvim/modül verisine göre paylaş.",
            "İptal, değişiklik ve ücret koşullarını kesin kaynak yoksa netleştirmek için temsilciye yönlendir.",
        ],
        en: [
            "Share reservation, appointment, or availability details only from live calendar or module data.",
            "Route cancellation, change, and fee conditions to a representative when verified policy data is unavailable.",
        ],
    },
    real_estate: {
        tr: [
            "Portföyde olmayan ilan, fiyat, metrekare veya lokasyon avantajı uydurma.",
            "Yatırım getirisi veya değer artışı için garanti verme; ilan inceleme/randevu adımına yönlendir.",
        ],
        en: [
            "Do not invent listings, prices, square meters, or location advantages that are not in the portfolio.",
            "Do not guarantee investment return or appreciation; route to listing review or viewing appointment.",
        ],
    },
    saas: {
        tr: [
            "Özellik, entegrasyon, limit ve fiyat bilgilerini yalnızca güncel plan veya AI eğitim kaynağı verisine göre açıkla.",
            "Teknik sorunlarda kesin çözüm vaadi verme; gerekirse destek ekibine aktar.",
        ],
        en: [
            "Explain features, integrations, limits, and pricing only from current plan or AI training resource data.",
            "Do not promise a definite fix for technical issues; escalate to support when needed.",
        ],
    },
    restaurant: {
        tr: [
            "Menü, alerjen, fiyat ve müsaitlik bilgilerini uydurma; doğrulanmış bilgi yoksa işletmeye yönlendir.",
            "Rezervasyon saatlerini canlı müsaitlik veya kayıtlı çalışma saatlerine göre paylaş.",
        ],
        en: [
            "Do not invent menu, allergen, price, or availability details; route to the business when verified data is missing.",
            "Share reservation times only from live availability or stored business hours.",
        ],
    },
    service: {
        tr: [
            "Hizmet kapsamı, süre ve fiyat bilgilerini kayıtlı bilgi yoksa kesin ifadeyle paylaşma.",
            "Kullanıcının ihtiyacını netleştir, sonra uygun hizmet veya görüşme/randevu adımı öner.",
        ],
        en: [
            "Do not state service scope, timeline, or price as definite when it is not in stored knowledge.",
            "Clarify the user's need first, then suggest a suitable service or consultation/booking step.",
        ],
    },
}

function normalizeLanguage(value: unknown): "tr" | "en" {
    return typeof value === "string" && value.toLowerCase().startsWith("tr") ? "tr" : "en"
}

function normalizeSector(value: unknown): IndustryType {
    const raw = typeof value === "string" ? value.trim() : ""
    return raw && raw in INDUSTRY_CONFIG ? raw as IndustryType : DEFAULT_INDUSTRY
}

function normalizeRule(value: unknown): string {
    return sanitizeTrainingPromptText(value, 280)
        .replace(/^[-*\d.)\s]+/, "")
        .trim()
}

function buildFallbackRules(sector: IndustryType, language: "tr" | "en"): RuleSuggestion[] {
    const sectorRules = SECTOR_RULES[sector]?.[language] || []
    return [...BASE_RULES[language], ...sectorRules].map((rule) => ({
        rule,
        source: "fallback" as const,
    }))
}

function getSectorName(sector: IndustryType, language: "tr" | "en") {
    return INDUSTRY_CONFIG[sector]?.names?.[language] || INDUSTRY_CONFIG[sector]?.label || sector
}

function parseAiRules(text: string): string[] {
    const trimmed = text.trim()
    const jsonStart = trimmed.indexOf("{")
    const jsonEnd = trimmed.lastIndexOf("}")
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
        try {
            const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1))
            if (Array.isArray(parsed?.rules)) {
                return parsed.rules.map((item: unknown) => typeof item === "string" ? item : item?.toString?.() || "")
            }
        } catch {
            // Fall through to line parsing.
        }
    }

    return trimmed
        .split("\n")
        .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
}

function removeDuplicateRules(rules: RuleSuggestion[], existingRules: string[]) {
    const seen = new Set(existingRules.map((rule) => normalizeRule(rule).toLocaleLowerCase("tr")).filter(Boolean))
    const unique: RuleSuggestion[] = []

    for (const item of rules) {
        const rule = normalizeRule(item.rule)
        const key = rule.toLocaleLowerCase("tr")
        if (!rule || seen.has(key)) continue
        seen.add(key)
        unique.push({ ...item, rule })
    }

    return unique.slice(0, 8)
}

async function generateAiRules(params: {
    sector: IndustryType
    sectorName: string
    companyName: string
    language: "tr" | "en"
    existingRules: string[]
}): Promise<RuleSuggestion[]> {
    const apiKey = process.env.GEMINI_API_KEY?.trim()
    if (!apiKey) return []

    const langName = params.language === "tr" ? "Turkish" : "English"
    const existingBlock = params.existingRules.length
        ? params.existingRules.map((rule) => `- ${rule}`).join("\n")
        : "None"
    const prompt = `You generate tenant-specific behavior rules for a customer-facing AI assistant.

Context:
- Company: ${params.companyName || "Unknown"}
- Sector: ${params.sectorName} (${params.sector})
- Output language: ${langName}

Existing rules to avoid duplicating:
${existingBlock}

Generate 6 concise behavior rules. The rules must:
- Be practical instructions the assistant can follow during every conversation.
- Include guardrails about not inventing prices, availability, company facts, or unsupported claims.
- Include sector-specific safety guidance where relevant.
- Respect live data and system actions; do not override booking availability, module rules, safety, privacy, or compliance.
- Be one sentence each.

Return ONLY valid JSON in this exact shape:
{"rules":["rule 1","rule 2","rule 3"]}`

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
    const result = await model.generateContent(prompt)
    const response = await result.response

    return parseAiRules(response.text()).map((rule) => ({
        rule,
        source: "ai" as const,
    }))
}

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) {
            return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 })
        }

        const body = await req.json()
        const chatbotId = typeof body?.chatbotId === "string" ? body.chatbotId.trim() : ""
        const language = normalizeLanguage(body?.language)
        if (!chatbotId) {
            return NextResponse.json({ error: "chatbotId is required" }, { status: 400 })
        }

        const authz = await authorizeTargetAccess(req, chatbotId)
        if (!authz.ok) return authz.response

        const [chatbotDoc, userDoc, entries] = await Promise.all([
            adminDb.collection("chatbots").doc(chatbotId).get(),
            adminDb.collection("users").doc(chatbotId).get(),
            fetchAssistantTrainingEntries(adminDb, chatbotId),
        ])

        const chatbotData = chatbotDoc.data() || {}
        const userData = userDoc.data() || {}
        const sector = normalizeSector(chatbotData.sector || chatbotData.sectorId || chatbotData.industry || userData.sector || userData.sectorId || userData.industry)
        const sectorName = getSectorName(sector, language)
        const companyName = chatbotData.companyName || userData.companyName || userData.displayName || ""
        const existingRules = entries
            .filter((entry) => entry.status === "active" && entry.type === "rule" && entry.rule)
            .map((entry) => entry.rule || "")

        let rules: RuleSuggestion[] = []
        try {
            rules = await generateAiRules({ sector, sectorName, companyName, language, existingRules })
        } catch (error) {
            console.error("[assistant-training] AI rule generation failed, using fallback:", error)
        }

        const source = rules.length > 0 ? "ai" : "fallback"
        const suggestions = removeDuplicateRules(
            rules.length > 0 ? rules : buildFallbackRules(sector, language),
            existingRules
        )

        return NextResponse.json({
            sector,
            sectorName,
            source,
            rules: suggestions,
        }, {
            headers: { "Cache-Control": "no-store, max-age=0" },
        })
    } catch (error) {
        console.error("[assistant-training] generate rules failed:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
