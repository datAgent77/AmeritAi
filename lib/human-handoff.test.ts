import { describe, expect, test } from "vitest"
import {
    formatHumanHandoffBusinessHours,
    getHumanHandoffContactPromptMessage,
    isExplicitHumanHandoffRequest,
    isHumanHandoffWithinBusinessHours,
} from "@/lib/human-handoff"
import type { HumanHandoffBusinessDayCode } from "@/lib/human-handoff"

describe("isExplicitHumanHandoffRequest", () => {
    test("detects Turkish live support and customer service requests", () => {
        expect(isExplicitHumanHandoffRequest("Müşteri hizmetlerine bağlanmak istiyorum")).toBe(true)
        expect(isExplicitHumanHandoffRequest("Canlı desteğe bağlan")).toBe(true)
        expect(isExplicitHumanHandoffRequest("Canlı temsilci ile görüşmek istiyorum")).toBe(true)
        expect(isExplicitHumanHandoffRequest("Müşteri temsilcisine aktar")).toBe(true)
        expect(isExplicitHumanHandoffRequest("Beni temsilciye yönlendir")).toBe(true)
        expect(isExplicitHumanHandoffRequest("Canlı desteğe aktar")).toBe(true)
    })

    test("returns false for normal lead or faq questions", () => {
        expect(isExplicitHumanHandoffRequest("Fiyat bilgisi alabilir miyim?")).toBe(false)
        expect(isExplicitHumanHandoffRequest("Ürün kaydı yapmak istiyorum")).toBe(false)
    })

    test("checks business hours using configured timezone and weekdays", () => {
        const businessDays: HumanHandoffBusinessDayCode[] = ["Mon", "Tue", "Wed", "Thu", "Fri"]
        const settings = {
            enabled: true,
            businessHoursEnabled: true,
            businessDays,
            businessHoursStart: "09:00",
            businessHoursEnd: "18:00",
            businessHoursTimezone: "Europe/Istanbul",
        }

        expect(isHumanHandoffWithinBusinessHours(settings, new Date("2026-04-22T09:00:00.000Z"))).toBe(true)
        expect(isHumanHandoffWithinBusinessHours(settings, new Date("2026-04-22T18:30:00.000Z"))).toBe(false)
        expect(isHumanHandoffWithinBusinessHours(settings, new Date("2026-04-25T09:00:00.000Z"))).toBe(false)
    })

    test("builds outside-hours handoff prompt with schedule summary", () => {
        const businessDays: HumanHandoffBusinessDayCode[] = ["Mon", "Tue", "Wed", "Thu", "Fri"]
        const settings = {
            enabled: true,
            notifyEmail: true,
            notifyInApp: true,
            triggerOnUserRequest: true,
            triggerOnAssistantHandoff: true,
            customWaitMessage: "",
            notifyWhatsApp: false,
            whatsappNumber: "",
            notifyInstagram: false,
            instagramAccountId: "",
            businessHoursEnabled: true,
            businessDays,
            businessHoursStart: "09:00",
            businessHoursEnd: "18:00",
            businessHoursTimezone: "Europe/Istanbul",
        }

        expect(formatHumanHandoffBusinessHours("tr", settings)).toContain("Hafta içi")
        expect(getHumanHandoffContactPromptMessage("tr", settings)).toContain("[SHOW_HANDOFF_FORM]")
    })
})
