import { describe, expect, test } from "vitest"
import { resolveQuickActionRuntimeAction } from "@/lib/quick-action-runtime"

describe("resolveQuickActionRuntimeAction", () => {
    test("blocks non-kvkk actions while consent is required", () => {
        const result = resolveQuickActionRuntimeAction({
            button: {
                moduleId: "appointments",
                triggerMessage: "randevu almak istiyorum",
            },
            language: "tr",
            settings: {
                leadFormConfig: null,
                digitalWaiter: null,
                kvkkConsent: {
                    enabled: true,
                    text: "",
                    versionHash: "v1",
                },
            },
            requiresKvkkConsent: true,
            isKvkkAccepted: false,
        })

        expect(result).toEqual({ type: "blocked" })
    })

    test("opens kvkk modal when consent quick action is clicked before acceptance", () => {
        const result = resolveQuickActionRuntimeAction({
            button: {
                moduleId: "kvkkConsent",
                triggerMessage: "kvkk onay metnini görmek istiyorum",
            },
            language: "tr",
            settings: {
                leadFormConfig: null,
                digitalWaiter: null,
                kvkkConsent: {
                    enabled: true,
                    text: "",
                    versionHash: "v1",
                },
            },
            requiresKvkkConsent: true,
            isKvkkAccepted: false,
        })

        expect(result).toEqual({ type: "open-kvkk-modal" })
    })

    test("returns informative message after kvkk consent is already accepted", () => {
        const result = resolveQuickActionRuntimeAction({
            button: {
                moduleId: "kvkkConsent",
                triggerMessage: "kvkk onay metnini görmek istiyorum",
            },
            language: "tr",
            settings: {
                leadFormConfig: null,
                digitalWaiter: null,
                kvkkConsent: {
                    enabled: true,
                    text: "",
                    versionHash: "v1",
                },
            },
            requiresKvkkConsent: false,
            isKvkkAccepted: true,
        })

        expect(result.type).toBe("append-message")
        expect(result.type === "append-message" ? result.content : "").toContain("KVKK")
    })

    test("opens the correct inline forms for lead, handoff, and appointment actions", () => {
        const leadResult = resolveQuickActionRuntimeAction({
            button: {
                moduleId: "leadCollection",
                triggerMessage: "iletişim bilgilerimi bırakmak istiyorum",
            },
            language: "tr",
            settings: {
                leadFormConfig: {
                    subtitle: "Ozel form metni",
                },
                digitalWaiter: null,
                kvkkConsent: {
                    enabled: false,
                    text: "",
                    versionHash: "",
                },
            },
            requiresKvkkConsent: false,
            isKvkkAccepted: true,
        })

        const handoffResult = resolveQuickActionRuntimeAction({
            button: {
                moduleId: "humanHandoff",
                triggerMessage: "bir temsilciyle görüşmek istiyorum",
            },
            language: "tr",
            settings: {
                leadFormConfig: null,
                digitalWaiter: null,
                kvkkConsent: {
                    enabled: false,
                    text: "",
                    versionHash: "",
                },
            },
            requiresKvkkConsent: false,
            isKvkkAccepted: true,
        })

        const bookingResult = resolveQuickActionRuntimeAction({
            button: {
                moduleId: "appointments",
                triggerMessage: "randevu almak istiyorum",
            },
            language: "tr",
            settings: {
                leadFormConfig: null,
                digitalWaiter: null,
                kvkkConsent: {
                    enabled: false,
                    text: "",
                    versionHash: "",
                },
            },
            requiresKvkkConsent: false,
            isKvkkAccepted: true,
        })

        expect(leadResult).toMatchObject({ type: "append-form-message", form: "lead" })
        expect(leadResult.type === "append-form-message" ? leadResult.content : "").toContain("[SHOW_LEAD_FORM]")
        expect(handoffResult).toMatchObject({ type: "append-form-message", form: "handoff" })
        expect(bookingResult).toMatchObject({ type: "append-form-message", form: "booking" })
    })

    test("guides the user to upload an image for visual diagnosis", () => {
        const result = resolveQuickActionRuntimeAction({
            button: {
                moduleId: "visualDiagnosis",
                triggerMessage: "gorsel analizi baslatmak istiyorum",
            },
            language: "tr",
            settings: {
                leadFormConfig: null,
                digitalWaiter: null,
                kvkkConsent: {
                    enabled: false,
                    text: "",
                    versionHash: "",
                },
            },
            requiresKvkkConsent: false,
            isKvkkAccepted: true,
        })

        expect(result.type).toBe("append-message")
        expect(result.type === "append-message" ? result.content : "").toContain("gorsel yukleme")
    })

    test("sends deterministic starter prompts for proactive messaging and digital waiter", () => {
        const proactiveResult = resolveQuickActionRuntimeAction({
            button: {
                moduleId: "proactiveMessaging",
                triggerMessage: "ihtiyacima gore bana birkaç soru sorarak yardımcı ol",
            },
            language: "tr",
            settings: {
                leadFormConfig: null,
                digitalWaiter: null,
                kvkkConsent: {
                    enabled: false,
                    text: "",
                    versionHash: "",
                },
            },
            requiresKvkkConsent: false,
            isKvkkAccepted: true,
        })

        const digitalWaiterResult = resolveQuickActionRuntimeAction({
            button: {
                moduleId: "digitalWaiter",
                triggerMessage: "menuye gore bana oneriler ver",
            },
            language: "tr",
            settings: {
                leadFormConfig: null,
                digitalWaiter: {
                    menuUrl: "https://example.com/menu",
                },
                kvkkConsent: {
                    enabled: false,
                    text: "",
                    versionHash: "",
                },
            },
            requiresKvkkConsent: false,
            isKvkkAccepted: true,
        })

        expect(proactiveResult).toMatchObject({ type: "send-message" })
        expect(digitalWaiterResult).toMatchObject({ type: "send-message" })
    })

    test("falls back gracefully when digital waiter menu data is missing", () => {
        const result = resolveQuickActionRuntimeAction({
            button: {
                moduleId: "digitalWaiter",
                triggerMessage: "menuye gore bana oneriler ver",
            },
            language: "tr",
            settings: {
                leadFormConfig: null,
                digitalWaiter: {
                    menuUrl: "",
                    menuPdfUrl: "",
                    signatureDishes: [],
                },
                kvkkConsent: {
                    enabled: false,
                    text: "",
                    versionHash: "",
                },
            },
            requiresKvkkConsent: false,
            isKvkkAccepted: true,
        })

        expect(result.type).toBe("append-message")
        expect(result.type === "append-message" ? result.content : "").toContain("Menu verisi")
    })
})
