import { useState, useEffect } from "react"
import { ChatbotSettings } from "@/types/chatbot"

const SETTINGS_CACHE_TTL_MS = 15 * 60 * 1000

function getIframeSettingsCacheKey(chatbotId: string) {
    return `userex_iframe_widget_settings_v1:${chatbotId}`
}

function readCachedSettings(chatbotId: string): ChatbotSettings | null {
    if (typeof window === "undefined") return null

    try {
        const raw = window.localStorage.getItem(getIframeSettingsCacheKey(chatbotId))
        if (!raw) return null

        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== "object" || !parsed.settings || typeof parsed.settings !== "object") {
            return null
        }

        const savedAt = Number(parsed.savedAt || 0)
        if (!savedAt || (Date.now() - savedAt) > SETTINGS_CACHE_TTL_MS) {
            return null
        }

        return parsed.settings as ChatbotSettings
    } catch (error) {
        console.warn("Widget iframe: Failed to read cached settings", error)
        return null
    }
}

function writeCachedSettings(chatbotId: string, settings: ChatbotSettings) {
    if (typeof window === "undefined") return

    try {
        window.localStorage.setItem(getIframeSettingsCacheKey(chatbotId), JSON.stringify({
            savedAt: Date.now(),
            settings
        }))
    } catch (error) {
        console.warn("Widget iframe: Failed to persist settings cache", error)
    }
}

function readPreviewDraftSettings(previewDraftKey: string | null | undefined): Partial<ChatbotSettings> | null {
    if (typeof window === "undefined" || !previewDraftKey) return null

    try {
        const raw = window.localStorage.getItem(previewDraftKey)
        if (!raw) return null

        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== "object") return null
        return parsed as Partial<ChatbotSettings>
    } catch (error) {
        console.warn("Widget iframe: Failed to read preview draft settings", error)
        return null
    }
}

const DEFAULT_SETTINGS: ChatbotSettings = {
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
    enableGuided: false,
    kvkkConsent: {
        enabled: false,
        text: "",
        versionHash: "",
        rejectionContactText: "",
    },
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
    preferredVoice: "",
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
    enableClassicEntryOnboarding: true,
    ambientMaxHeight: 260,
    ambientOverlayOpacity: 0.55,
    sidecarWidth: 420,
    sidecarMinWidth: 360,
    sidecarMaxWidth: 560,
    sidecarGutter: 0,
    sidecarDesktopOnly: true,
    sidecarAlwaysOpen: false,
    ambientInputBgColorIdle: "",
    ambientInputBgColorFocused: "",
    ambientUserBubbleColor: "",
    ambientBorderGradientColor1: "",
    ambientBorderGradientColor2: "",
    ambientBorderGradientColor3: "",
    ambientBorderGradientColor4: "",
    ambientBorderGradientShowWhenCollapsed: false,
    ambientBorderGradientShowWhenOpen: true,
    ambientBorderGradientShowWhenThinking: true,
    ambientPerDeviceSettingsEnabled: false,
    classicPerDeviceSettingsEnabled: false,
    enableDynamicContext: false,
    dynamicContextMode: "nocode",
    dynamicContextSelectors: [],
    enableDynamicSiteContext: false,
    dynamicSiteContextCollectionMode: "dom_network",
    dynamicSiteContextCrawlTrigger: "manual",
    dynamicSiteContextRouteScope: "sidebar_safe",
    dynamicSiteContextAllowlist: [],
    dynamicSiteContextMaxRoutes: 30,
    dynamicSiteContextMaxDurationSec: 90,
    dynamicSiteContextHydrationWaitMs: 4000,
    dynamicSiteContextExcludeSelectorPrefixes: ["#userex-", ".userex-", "#vion-", ".vion-"],
    dynamicSiteContextCapturePII: false,
    dynamicSiteContextPresetMode: "none",
    dynamicSiteContextPresetId: "",
    dynamicSiteContextPresetApprovedAt: "",
    dynamicSiteContextPresetOverrides: {},
    dynamicSiteContextNetworkAllowlist: [],
    dynamicSiteContextGraphqlOperationAllowlist: [],
    dynamicSiteContextSuggestedPresetId: "generic-web-app",
    dynamicSiteContextResolvedPresetId: "generic-web-app",
    dynamicSiteContextRuntimePreset: null,
    guidedSkills: [],
}

export function useWidgetSettings(chatbotId: string, searchParams: any, setLanguage: any) {
    const previewDraftKey = searchParams?.get("previewDraftKey")
    const initialPreviewSettings = typeof window !== "undefined" ? readPreviewDraftSettings(previewDraftKey) : null
    const initialCachedSettings = typeof window !== "undefined" ? readCachedSettings(chatbotId) : null
    const initialSettings = initialPreviewSettings
        ? ({ ...(initialCachedSettings || DEFAULT_SETTINGS), ...initialPreviewSettings } as ChatbotSettings)
        : (initialCachedSettings || DEFAULT_SETTINGS)
    const [isLoading, setIsLoading] = useState(!(initialPreviewSettings || initialCachedSettings))
    const [settings, setSettings] = useState<ChatbotSettings>(initialSettings)

    useEffect(() => {
        let isMounted = true
        const previewSettings = readPreviewDraftSettings(previewDraftKey)
        const cachedSettings = readCachedSettings(chatbotId)

        if (previewSettings) {
            setSettings({ ...(cachedSettings || DEFAULT_SETTINGS), ...previewSettings } as ChatbotSettings)
            setIsLoading(false)
        } else if (cachedSettings) {
            setSettings(cachedSettings)
            setIsLoading(false)
        } else {
            setSettings(DEFAULT_SETTINGS)
            setIsLoading(true)
        }
        
        const loadSettings = async () => {
            try {
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 8000)
                const res = await fetch(`/api/widget-settings?chatbotId=${chatbotId}`, { signal: controller.signal, cache: "no-store" })
                clearTimeout(timeoutId)
                if (res.ok) {
                    const data = await res.json()
                    const nextSettings: ChatbotSettings = {
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
                        enableGuided: data.enableGuided === true,
                        kvkkConsent: typeof data.kvkkConsent === "object" && data.kvkkConsent
                            ? {
                                enabled: data.kvkkConsent.enabled === true,
                                text: typeof data.kvkkConsent.text === "string" ? data.kvkkConsent.text : "",
                                versionHash: typeof data.kvkkConsent.versionHash === "string" ? data.kvkkConsent.versionHash : "",
                                rejectionContactText: typeof data.kvkkConsent.rejectionContactText === "string" ? data.kvkkConsent.rejectionContactText : "",
                            }
                            : {
                                enabled: false,
                                text: "",
                                versionHash: "",
                                rejectionContactText: "",
                            },
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
                        preferredVoice: typeof data.preferredVoice === "string" ? data.preferredVoice : "",
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
                            data.chatDisplayMode === "ambient" || data.chatDisplayMode === "sidecar"
                                ? "always_open"
                                : (data.interactionMode === "always_open" ? "always_open" : "launcher"),
                        chatDisplayMode: ["ambient", "sidecar"].includes(data.chatDisplayMode) ? data.chatDisplayMode : "classic",
                        enableClassicEntryOnboarding:
                            typeof data.enableClassicEntryOnboarding === "boolean"
                                ? data.enableClassicEntryOnboarding
                                : true,
                        ambientMaxHeight: typeof data.ambientMaxHeight === "number" ? data.ambientMaxHeight : 260,
                        ambientOverlayOpacity: typeof data.ambientOverlayOpacity === "number" ? data.ambientOverlayOpacity : 0.55,
                        sidecarWidth: typeof data.sidecarWidth === "number" ? data.sidecarWidth : 420,
                        sidecarMinWidth: typeof data.sidecarMinWidth === "number" ? data.sidecarMinWidth : 360,
                        sidecarMaxWidth: typeof data.sidecarMaxWidth === "number" ? data.sidecarMaxWidth : 560,
                        sidecarGutter: typeof data.sidecarGutter === "number" ? data.sidecarGutter : 0,
                        sidecarDesktopOnly: typeof data.sidecarDesktopOnly === "boolean" ? data.sidecarDesktopOnly : true,
                        sidecarAlwaysOpen: typeof data.sidecarAlwaysOpen === "boolean" ? data.sidecarAlwaysOpen : false,
                        ambientWidth: typeof data.ambientWidth === "number" ? data.ambientWidth : 800,
                        ambientInputWidth: typeof data.ambientInputWidth === "number" ? data.ambientInputWidth : (typeof data.ambientWidth === "number" ? data.ambientWidth : 800),
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
                        ambientTheme: data.ambientTheme || "light",
                        enableAmbientRainbowBorder: data.enableAmbientRainbowBorder || false,
                        ambientClosedBgColor: data.ambientClosedBgColor || "",
                        ambientInputBgColorIdle: data.ambientInputBgColorIdle || "",
                        ambientInputBgColorFocused: data.ambientInputBgColorFocused || "",
                        ambientInputTextColor: data.ambientInputTextColor || "",
                        ambientPlaceholderText: data.ambientPlaceholderText || "",
                        ambientClosedBorderColorIdle: data.ambientClosedBorderColorIdle || "",
                        ambientClosedBorderColorFocused: data.ambientClosedBorderColorFocused || "",
                        ambientAiBubbleColor: data.ambientAiBubbleColor || "",
                        ambientUserBubbleColor: data.ambientUserBubbleColor || "",
                        ambientBorderGradientColor1: data.ambientBorderGradientColor1 || "",
                        ambientBorderGradientColor2: data.ambientBorderGradientColor2 || "",
                        ambientBorderGradientColor3: data.ambientBorderGradientColor3 || "",
                        ambientBorderGradientColor4: data.ambientBorderGradientColor4 || "",
                        ambientBorderGradientShowWhenCollapsed:
                            typeof data.ambientBorderGradientShowWhenCollapsed === "boolean"
                                ? data.ambientBorderGradientShowWhenCollapsed
                                : false,
                        ambientBorderGradientShowWhenOpen:
                            typeof data.ambientBorderGradientShowWhenOpen === "boolean"
                                ? data.ambientBorderGradientShowWhenOpen
                                : true,
                        ambientBorderGradientShowWhenThinking:
                            typeof data.ambientBorderGradientShowWhenThinking === "boolean"
                                ? data.ambientBorderGradientShowWhenThinking
                                : true,
                        ambientPerDeviceSettingsEnabled: data.ambientPerDeviceSettingsEnabled === true,
                        ambientDesktopSettings: typeof data.ambientDesktopSettings === "object" && data.ambientDesktopSettings ? data.ambientDesktopSettings : undefined,
                        ambientMobileSettings: typeof data.ambientMobileSettings === "object" && data.ambientMobileSettings ? data.ambientMobileSettings : undefined,
                        classicPerDeviceSettingsEnabled: data.classicPerDeviceSettingsEnabled === true,
                        classicDesktopSettings: typeof data.classicDesktopSettings === "object" && data.classicDesktopSettings ? data.classicDesktopSettings : undefined,
                        classicMobileSettings: typeof data.classicMobileSettings === "object" && data.classicMobileSettings ? data.classicMobileSettings : undefined,
                        position: data.position || "bottom-right",
                        enableDynamicContext: data.enableDynamicContext === true,
                        dynamicContextMode: data.dynamicContextMode === "enterprise_adapter" ? "enterprise_adapter" : "nocode",
                        dynamicContextSelectors: Array.isArray(data.dynamicContextSelectors) ? data.dynamicContextSelectors : [],
                        enableDynamicSiteContext: data.enableDynamicSiteContext === true,
                        dynamicSiteContextCollectionMode: data.dynamicSiteContextCollectionMode === "dom" ? "dom" : "dom_network",
                        dynamicSiteContextCrawlTrigger: ["manual", "hybrid", "auto"].includes(data.dynamicSiteContextCrawlTrigger) ? data.dynamicSiteContextCrawlTrigger : "manual",
                        dynamicSiteContextRouteScope: ["sidebar_safe", "same_origin_all", "allowlist"].includes(data.dynamicSiteContextRouteScope) ? data.dynamicSiteContextRouteScope : "sidebar_safe",
                        dynamicSiteContextAllowlist: Array.isArray(data.dynamicSiteContextAllowlist) ? data.dynamicSiteContextAllowlist : [],
                        dynamicSiteContextMaxRoutes: typeof data.dynamicSiteContextMaxRoutes === "number" ? data.dynamicSiteContextMaxRoutes : 30,
                        dynamicSiteContextMaxDurationSec: typeof data.dynamicSiteContextMaxDurationSec === "number" ? data.dynamicSiteContextMaxDurationSec : 90,
                        dynamicSiteContextHydrationWaitMs: typeof data.dynamicSiteContextHydrationWaitMs === "number" ? data.dynamicSiteContextHydrationWaitMs : 4000,
                        dynamicSiteContextExcludeSelectorPrefixes: Array.isArray(data.dynamicSiteContextExcludeSelectorPrefixes) ? data.dynamicSiteContextExcludeSelectorPrefixes : ["#userex-", ".userex-", "#vion-", ".vion-"],
                        dynamicSiteContextCapturePII: data.dynamicSiteContextCapturePII === true,
                        dynamicSiteContextPresetMode: ["none", "suggested", "approved"].includes(data.dynamicSiteContextPresetMode) ? data.dynamicSiteContextPresetMode : "none",
                        dynamicSiteContextPresetId: typeof data.dynamicSiteContextPresetId === "string" ? data.dynamicSiteContextPresetId : "",
                        dynamicSiteContextPresetApprovedAt: typeof data.dynamicSiteContextPresetApprovedAt === "string" ? data.dynamicSiteContextPresetApprovedAt : "",
                        dynamicSiteContextPresetOverrides: typeof data.dynamicSiteContextPresetOverrides === "object" && data.dynamicSiteContextPresetOverrides ? data.dynamicSiteContextPresetOverrides : {},
                        dynamicSiteContextNetworkAllowlist: Array.isArray(data.dynamicSiteContextNetworkAllowlist) ? data.dynamicSiteContextNetworkAllowlist : [],
                        dynamicSiteContextGraphqlOperationAllowlist: Array.isArray(data.dynamicSiteContextGraphqlOperationAllowlist) ? data.dynamicSiteContextGraphqlOperationAllowlist : [],
                        dynamicSiteContextSuggestedPresetId: typeof data.dynamicSiteContextSuggestedPresetId === "string" ? data.dynamicSiteContextSuggestedPresetId : "generic-web-app",
                        dynamicSiteContextResolvedPresetId: typeof data.dynamicSiteContextResolvedPresetId === "string" ? data.dynamicSiteContextResolvedPresetId : "generic-web-app",
                        dynamicSiteContextRuntimePreset: typeof data.dynamicSiteContextRuntimePreset === "object" && data.dynamicSiteContextRuntimePreset ? data.dynamicSiteContextRuntimePreset : null,
                        guidedSkills: Array.isArray(data.guidedSkills) ? data.guidedSkills : [],
                    }

                    if (!isMounted) return
                    const latestPreviewSettings = readPreviewDraftSettings(previewDraftKey)
                    const resolvedSettings = latestPreviewSettings
                        ? ({ ...nextSettings, ...latestPreviewSettings } as ChatbotSettings)
                        : nextSettings
                    writeCachedSettings(chatbotId, resolvedSettings)
                    setSettings(resolvedSettings)
                }
            } catch (error) {
                console.error("Error fetching settings:", error)
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }
        loadSettings()
        return () => {
            isMounted = false
        }
    }, [chatbotId, previewDraftKey])

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
