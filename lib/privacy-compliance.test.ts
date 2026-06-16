import { describe, expect, test } from "vitest"
import { resolvePrivacyCompliancePayload, resolvePrivacyLanguage } from "@/lib/privacy-compliance"

describe("privacy compliance payload", () => {
    test("is enabled only when KVKK module is active and generates language fallbacks", () => {
        const payload = resolvePrivacyCompliancePayload({
            mergedData: {
                enableKvkkConsent: true,
                companyName: "Fara Dental",
                email: "info@faradental.test",
                initialLanguage: "tr",
            },
        })

        expect(payload.enabled).toBe(true)
        expect(payload.mode).toBe("hybrid")
        // US-first default: CCPA/CPRA + GDPR (KVKK removed from default frameworks for the US launch).
        expect(payload.frameworks).toEqual(["ccpa", "gdpr"])
        expect(payload.shortNoticeByLanguage.tr).toContain("Sohbete devam ederek")
        expect(payload.documentsByLanguage.tr.kvkkNotice.text).toContain("Fara Dental")
        expect(payload.requiredConsents.find((item) => item.purpose === "lead_capture")?.checkboxLabelByLanguage.tr).toContain("lead")
    })

    test("tenant overrides change version hashes", () => {
        const first = resolvePrivacyCompliancePayload({
            mergedData: {
                enableKvkkConsent: true,
                privacyComplianceSettings: {
                    documentsByLanguage: {
                        tr: {
                            kvkkNotice: { text: "Metin v1" },
                        },
                    },
                },
            },
        })
        const second = resolvePrivacyCompliancePayload({
            mergedData: {
                enableKvkkConsent: true,
                privacyComplianceSettings: {
                    documentsByLanguage: {
                        tr: {
                            kvkkNotice: { text: "Metin v2" },
                        },
                    },
                },
            },
        })

        expect(first.documentsByLanguage.tr.kvkkNotice.versionHash).not.toBe(second.documentsByLanguage.tr.kvkkNotice.versionHash)
    })

    test("language resolver falls back to English", () => {
        expect(resolvePrivacyLanguage("de-DE")).toBe("de")
        expect(resolvePrivacyLanguage("fr-FR")).toBe("en")
    })
})
