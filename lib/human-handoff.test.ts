import { describe, expect, test } from "vitest"
import { isExplicitHumanHandoffRequest } from "@/lib/human-handoff"

describe("isExplicitHumanHandoffRequest", () => {
    test("detects Turkish live support and customer service requests", () => {
        expect(isExplicitHumanHandoffRequest("Müşteri hizmetlerine bağlanmak istiyorum")).toBe(true)
        expect(isExplicitHumanHandoffRequest("Canlı desteğe bağlan")).toBe(true)
        expect(isExplicitHumanHandoffRequest("Canlı temsilci ile görüşmek istiyorum")).toBe(true)
    })

    test("returns false for normal lead or faq questions", () => {
        expect(isExplicitHumanHandoffRequest("Fiyat bilgisi alabilir miyim?")).toBe(false)
        expect(isExplicitHumanHandoffRequest("Ürün kaydı yapmak istiyorum")).toBe(false)
    })
})
