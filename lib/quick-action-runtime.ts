import type { ChatbotSettings, QuickActionButton } from "@/types/chatbot"

type QuickActionRuntimeInput = {
    button: Pick<QuickActionButton, "moduleId" | "triggerMessage">
    language: string
    settings: Pick<ChatbotSettings, "leadFormConfig" | "digitalWaiter" | "kvkkConsent" | "surveyWidgetConfig">
    requiresKvkkConsent: boolean
    isKvkkAccepted: boolean
}

export type QuickActionRuntimeResult =
    | { type: "blocked" }
    | { type: "open-kvkk-modal" }
    | { type: "open-survey" }
    | { type: "append-message"; content: string }
    | { type: "append-form-message"; form: "lead" | "handoff" | "booking"; content: string }
    | { type: "send-message"; message: string }

function isTurkish(language: string) {
    return language === "tr"
}

function hasDigitalWaiterContent(settings: QuickActionRuntimeInput["settings"]) {
    const config = settings.digitalWaiter
    if (!config || typeof config !== "object") return false

    const menuUrl = typeof config.menuUrl === "string" ? config.menuUrl.trim() : ""
    const menuPdfUrl = typeof config.menuPdfUrl === "string" ? config.menuPdfUrl.trim() : ""
    const signatureDishes = Array.isArray(config.signatureDishes)
        ? config.signatureDishes.filter((dish) => typeof dish === "string" && dish.trim() !== "")
        : []

    return Boolean(menuUrl || menuPdfUrl || signatureDishes.length > 0)
}

export function resolveQuickActionRuntimeAction(input: QuickActionRuntimeInput): QuickActionRuntimeResult {
    const { moduleId } = input.button
    const tr = isTurkish(input.language)

    if (input.requiresKvkkConsent && moduleId !== "kvkkConsent") {
        return { type: "blocked" }
    }

    if (moduleId === "humanHandoff") {
        return {
            type: "append-form-message",
            form: "handoff",
            content: tr
                ? "Temsilci ile görüşmek için iletişim bilgilerinizi paylaşın, ekibimiz size ulaşsın.\n[SHOW_HANDOFF_FORM]"
                : "Share your contact info so our agent can reach out to you.\n[SHOW_HANDOFF_FORM]",
        }
    }

    if (moduleId === "leadCollection") {
        return {
            type: "append-form-message",
            form: "lead",
            content: `${input.settings.leadFormConfig?.subtitle
                || (tr
                    ? "İletişim bilgilerinizi paylaşır mısınız? Ekibimiz en kısa sürede sizinle iletişime geçecektir."
                    : "Could you share your contact details? Our team will reach out shortly.")}\n[SHOW_LEAD_FORM]`,
        }
    }

    if (moduleId === "appointments") {
        return {
            type: "append-form-message",
            form: "booking",
            content: tr
                ? "Tabii ki! Lütfen aşağıdaki randevu formunu doldurun.\n[SHOW_BOOKING_FORM]"
                : "Of course! Please fill out the booking form below.\n[SHOW_BOOKING_FORM]",
        }
    }

    if (moduleId === "visualDiagnosis") {
        return {
            type: "append-message",
            content: tr
                ? "Gorsel tani modulu hazir. Lutfen mesaj alaninin yanindaki gorsel yukleme butonunu kullanarak fotograf ekleyin; ardindan analiz baslatilacaktir."
                : "Visual diagnosis is ready. Please use the image upload button next to the input to add a photo, then the analysis can start.",
        }
    }

    if (moduleId === "kvkkConsent") {
        if (!input.isKvkkAccepted) {
            return { type: "open-kvkk-modal" }
        }

        return {
            type: "append-message",
            content: tr
                ? "KVKK onayiniz zaten aktif. Dilerseniz sorunuza devam edebilir veya metni yeniden incelemek icin destek ekibimizle iletisime gecebilirsiniz."
                : "Your privacy consent is already active. You can continue with your request or contact support if you need to review the consent text again.",
        }
    }

    if (moduleId === "proactiveMessaging") {
        return {
            type: "send-message",
            message: tr
                ? "Ihtiyacimi anlamak icin bana kisa sorular sor ve beni en uygun cozumune yonlendir."
                : "Ask me a few concise questions to understand my need and guide me to the best next step.",
        }
    }

    if (moduleId === "digitalWaiter") {
        if (!hasDigitalWaiterContent(input.settings)) {
            return {
                type: "append-message",
                content: tr
                    ? "Menu verisi henuz tam tanimlanmamis. Yine de isletme hakkinda sorunuzu yazabilirsiniz; menu baglantisi eklendiginde urun onerileri de aktif olacaktir."
                    : "Menu data is not fully configured yet. You can still ask about the venue, and product recommendations will be available once a menu source is added.",
            }
        }

        return {
            type: "send-message",
            message: tr
                ? "Menuye gore bana uygun urunler oner ve siparis konusunda yardimci ol."
                : "Recommend suitable items from the menu and help me with my order.",
        }
    }

    if (moduleId === "surveyManager") {
        if (input.settings.surveyWidgetConfig?.activeSurvey) {
            return { type: "open-survey" }
        }

        return {
            type: "append-message",
            content: tr
                ? "Aktif bir anket bulunamadi. Lutfen daha sonra tekrar deneyin."
                : "There is no active survey right now. Please try again later.",
        }
    }

    return {
        type: "send-message",
        message: input.button.triggerMessage,
    }
}
