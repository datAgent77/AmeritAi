import { useState, useEffect } from "react"
import { ChatbotSettings } from "@/types/chatbot"

export function useWidgetSettings(chatbotId: string, searchParams: any, setLanguage: any) {
    const [isLoading, setIsLoading] = useState(true)
    const [settings, setSettings] = useState<ChatbotSettings>({
        companyName: "Vion AI",
        welcomeTitle: "",
        welcomeMessage: "Merhaba! Size nasıl yardımcı olabilirim?",
        brandColor: "#000000",
        brandLogo: "",
        headerLogo: "",
        headerLogoWidth: 32,
        headerLogoHeight: 32,
        headerBackgroundColor: "",
        headerTextColor: "",
        suggestedQuestions: ["Fiyatlarınız nedir?", "Nasıl başlarım?", "İletişim"],
        enableLeadCollection: false,
        enableInitialLeadCollection: false,
        enableInChatLeadCollection: false,
        leadFormConfig: null,
        industry: "ecommerce",
        enableVoiceAssistant: false,
        voiceProvider: "klassifier",
        elevenLabsVoiceId: "",
        theme: "classic",
        enableIndustryGreeting: false,
        initialLanguage: "auto",
        engagement: {
            enabled: false,
            bubble: {
                messages: []
            }
        },
        enableAppointments: false,
        appointmentTypes: [],
        appointmentSuccessMessage: "",
        availableDays: [],
        enableAutoSpeak: false,
        preferredVoice: "alloy",
        enablePersonalShopper: false,
        enableVisualDiagnosis: false,
        leadCustomFields: [],
        salesOptimizationConfig: {
            enabled: false,
            autoOfferDelay: 0,
            discountCode: "",
            discountAmount: 0,
            discountType: "percent",
            enableStockAlerts: false,
            enableCartRecovery: false,
            enableProductComparison: false
        },
        launcherIcon: "message",
        launcherIconUrl: "",
        launcherLibraryIcon: "",
        mobileBottomSpacing: 20,
        mobileSideSpacing: 20,
        mobileLauncherAnimation: "none",
        interactionMode: "launcher",
        ambientIconType: "library",
        ambientLibraryIcon: "MessageCircle",
        chatDisplayMode: "classic",
        ambientMaxHeight: 260,
        ambientOverlayOpacity: 0.55
    })

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await fetch(`/api/widget-settings?chatbotId=${chatbotId}`)
                if (res.ok) {
                    const data = await res.json()
                    setSettings({
                        companyName: data.companyName || "Acme Corp",
                        welcomeTitle: data.welcomeTitle || "",
                        welcomeMessage: data.welcomeMessage || "Hello! How can I help you today?",
                        brandColor: data.brandColor || "#000000",
                        brandLogo: data.brandLogo || "",
                        headerLogo: data.headerLogo || "",
                        headerLogoWidth: data.headerLogoWidth || 32,
                        headerLogoHeight: data.headerLogoHeight || 32,
                        headerBackgroundColor: data.headerBackgroundColor || "",
                        headerTextColor: data.headerTextColor || "#FFFFFF",
                        suggestedQuestions: data.suggestedQuestions || ["What are your pricing plans?", "How do I get started?", "Contact support"],
                        enableLeadCollection: data.enableLeadCollection || false,
                        enableInitialLeadCollection: (data.enableLeadCollection && data.enableInitialLeadCollection) ?? false,
                        enableInChatLeadCollection: data.enableInChatLeadCollection ?? false,
                        leadFormConfig: data.leadFormConfig || null,
                        industry: data.industry || "ecommerce",
                        enableVoiceAssistant: data.enableVoiceAssistant || false,
                        voiceProvider: data.voiceProvider || "klassifier",
                        elevenLabsVoiceId: data.elevenLabsVoiceId || "",
                        theme: data.theme || "classic",
                        enableIndustryGreeting: data.enableIndustryGreeting !== undefined ? data.enableIndustryGreeting : false,
                        initialLanguage: data.initialLanguage || "auto",
                        engagement: data.engagement || { enabled: false, bubble: { messages: [] } },
                        enableAppointments: data.enableAppointments || false,
                        appointmentTypes: data.appointmentTypes || ["Consultation", "Support", "Demo"],
                        appointmentSuccessMessage: data.appointmentSuccessMessage || "Randevunuz başarıyla oluşturuldu! Sizinle en kısa sürede iletişime geçeceğiz.",
                        availableDays: data.availableDays || ["monday", "tuesday", "wednesday", "thursday", "friday"],
                        enableAutoSpeak: data.enableAutoSpeak || false,
                        preferredVoice: data.preferredVoice || "",
                        enablePersonalShopper: data.enablePersonalShopper || false,
                        enableVisualDiagnosis: data.enableVisualDiagnosis || false,
                        leadCustomFields: data.leadCustomFields || [],
                        salesOptimizationConfig: data.salesOptimizationConfig || {},
                        launcherIcon: data.launcherIcon || "library",
                        launcherIconUrl: data.launcherIconUrl || "",
                        launcherLibraryIcon: data.launcherLibraryIcon || "",
                        mobileBottomSpacing: data.mobileBottomSpacing !== undefined ? data.mobileBottomSpacing : 20,
                        mobileSideSpacing: data.mobileSideSpacing !== undefined ? data.mobileSideSpacing : 20,
                        mobileLauncherAnimation: data.mobileLauncherAnimation || "none",
                        interactionMode:
                            data.chatDisplayMode === "ambient"
                                ? "always_open"
                                : (data.interactionMode === "always_open" ? "always_open" : "launcher"),
                        chatDisplayMode: data.chatDisplayMode === "ambient" ? "ambient" : "classic",
                        ambientMaxHeight: typeof data.ambientMaxHeight === "number" ? data.ambientMaxHeight : 260,
                        ambientOverlayOpacity: typeof data.ambientOverlayOpacity === "number" ? data.ambientOverlayOpacity : 0.55,
                        ambientWidth: typeof data.ambientWidth === "number" ? data.ambientWidth : 800,
                        ambientSideMargin: typeof data.ambientSideMargin === "number" ? data.ambientSideMargin : 0,
                        ambientBottomMargin: typeof data.ambientBottomMargin === "number" ? data.ambientBottomMargin : 20,
                        ambientInputSize: (["sm", "md", "lg", "xl"].includes(data.ambientInputSize) ? data.ambientInputSize : "lg") as "sm" | "md" | "lg" | "xl",
                        showAmbientIcon: typeof data.showAmbientIcon === "boolean" ? data.showAmbientIcon : true,
                        ambientIconUrl: data.ambientIconUrl || "",
                        ambientIconType: data.ambientIconType || "library",
                        ambientLibraryIcon: data.ambientLibraryIcon || "MessageCircle",
                        ambientIconColor: data.ambientIconColor || "",
                        ambientBorderColorIdle: data.ambientBorderColorIdle || "",
                        ambientBorderColorFocused: data.ambientBorderColorFocused || "",
                        ambientClosedBgColor: data.ambientClosedBgColor || "",
                        ambientClosedBorderColorIdle: data.ambientClosedBorderColorIdle || "",
                        ambientClosedBorderColorFocused: data.ambientClosedBorderColorFocused || "",
                        ambientAiBubbleColor: data.ambientAiBubbleColor || "",
                        position: data.position || "bottom-right",
                    })
                }
            } catch (error) {
                console.error("Error fetching settings:", error)
            } finally {
                setIsLoading(false)
            }
        }
        loadSettings()
    }, [chatbotId])

    // Sync language with browser language for widget UI
    useEffect(() => {
        if (settings.initialLanguage && settings.initialLanguage !== 'auto') {
            setLanguage(settings.initialLanguage)
        } else {
            // Widget UI always follows browser language if auto
            const browserLang = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'en'
            const supportedLang = ['en', 'tr', 'es', 'fr', 'de'].includes(browserLang) ? browserLang : 'en'
            setLanguage(supportedLang as any)
        }
    }, [setLanguage, settings.initialLanguage])

    return { settings, setSettings, isLoading }
}
