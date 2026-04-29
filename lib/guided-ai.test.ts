import { describe, expect, test } from "vitest"
import {
    AI_GUIDED_SKILL_ID,
    GUIDED_OPTIONS_END_MARKER,
    GUIDED_OPTIONS_START_MARKER,
    buildAiGeneratedGuidedUi,
    extractGuidedOptionsFromContent,
    getGuidedOptionsSystemInstruction,
} from "./guided-ai"

describe("guided AI option helpers", () => {
    test("strips guided option marker and returns unique sanitized options", () => {
        const parsed = extractGuidedOptionsFromContent(`Kısa cevap.

${GUIDED_OPTIONS_START_MARKER}
{"options":["1. Fiyatları göster","Fiyatları göster","Randevu al","Temsilciyle görüş","Ekstra seçenek"]}
${GUIDED_OPTIONS_END_MARKER}`)

        expect(parsed.content).toBe("Kısa cevap.")
        expect(parsed.options).toEqual(["Fiyatları göster", "Randevu al", "Temsilciyle görüş", "Ekstra seçenek"])
    })

    test("builds a clickable guided UI payload for generated options", () => {
        const ui = buildAiGeneratedGuidedUi({
            assistantMessageId: "assistant-1",
            content: "Nasıl devam edelim?",
            options: ["Fiyatları göster", "Randevu al"],
            language: "tr",
        })

        expect(ui).toMatchObject({
            type: "guided-step",
            skillId: AI_GUIDED_SKILL_ID,
            stepId: "assistant-1",
            presentation: "chips",
            options: [
                { id: "ai-option-1", label: "Fiyatları göster" },
                { id: "ai-option-2", label: "Randevu al" },
            ],
        })
    })

    test("adds explicit conversation-language rules to the guided prompt", () => {
        const instruction = getGuidedOptionsSystemInstruction("es")

        expect(instruction).toContain("Spanish")
        expect(instruction).toContain("Ver precios")
        expect(instruction).toContain("MUST be in the user's conversation language")
    })

    test("derives options from numbered answers when the model omits the marker block", () => {
        const parsed = extractGuidedOptionsFromContent(`Bu asistanla aşağıdaki işlemleri yapabilirsiniz:

1. **Üretim Süreçleri Hakkında Bilgi Alın**: Üretim yöntemleri ve süreçleriyle ilgili detaylı bilgiye ulaşabilirsiniz.
2. **Ürün Grupları ve Kapasiteleri**: Sunulan ürün grubunu ve yıllık üretim kapasitelerini öğrenebilirsiniz.
3. **Sipariş ve Teklif Süreçleri**: Sipariş verme veya özel teklif alma süreçleri hakkında bilgi talep edebilirsiniz.
4. **Kalite Standartları ve Sertifikalar**: Kalite standartları ve alınmış sertifikalar hakkında bilgi alabilirsiniz.

Herhangi bir konu hakkında daha fazla bilgi belirtin.`)

        expect(parsed.options).toEqual([
            "Üretim Süreçleri Hakkında Bilgi Alın",
            "Ürün Grupları ve Kapasiteleri",
            "Sipariş ve Teklif Süreçleri",
            "Kalite Standartları ve Sertifikalar",
        ])
    })

    test("localizes internal guided UI labels by conversation language", () => {
        const ui = buildAiGeneratedGuidedUi({
            assistantMessageId: "assistant-2",
            content: "¿Cómo seguimos?",
            options: ["Ver precios"],
            language: "es",
        })

        expect(ui?.skillTitle).toBe("Opciones de IA")
    })
})
