import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { buildGuidedSkillShortcut, listEnabledGuidedSkills } from "@/lib/guided-skills";
import { MODULES_REGISTRY } from "@/lib/modules-registry";
import { resolveDynamicContextPresetSelection } from "@/lib/dynamic-context-presets";

// Updated: 2026-01-01 - Added enableVisualDiagnosis support
export const dynamic = 'force-dynamic';

function normalizeWebChannelEnabled(config: any) {
    return config?.enabled !== false;
}

function hasConfiguredWebVoiceProvider(
    userData: Record<string, any> | null | undefined,
    mergedData: Record<string, any> | null | undefined
) {
    const apiKey = typeof userData?.elevenLabsApiKey === "string" ? userData.elevenLabsApiKey.trim() : "";
    const voiceId = typeof mergedData?.elevenLabsVoiceId === "string" ? mergedData.elevenLabsVoiceId.trim() : "";

    return apiKey.length > 0 && voiceId.length > 0;
}

export async function GET(req: Request) {
    try {
        const adminDb = getAdminDb();
        // REMOVED EARLY RETURN: if (!adminDb) { ... }
        // We will handle null adminDb gracefully inside


        const { searchParams } = new URL(req.url);
        const chatbotId = searchParams.get("chatbotId");

        if (!chatbotId) {
            return NextResponse.json({ error: "Missing chatbotId" }, { status: 400 });
        }

        try {
            if (adminDb) {
                // Fetch user doc as well for permissions

                const userDocSnap = await adminDb.collection("users").doc(chatbotId).get();
                const userData = userDocSnap.exists ? userDocSnap.data() : null;

                // === STRICT ACTIVE CHECK ===
                // If the user account is explicitly deactivated, force disable the widget immediately.
                if (userData?.isActive === false) {
                    return NextResponse.json({
                        isEnabled: false,
                        companyName: userData?.companyName || "Vion AI",
                        theme: "classic"
                    }, {
                        headers: {
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, Pragma',
                            'Cache-Control': 'no-store, max-age=0',
                        }
                    });
                }

                const isChatbotEnabled = userData?.enableChatbot !== false;
                const isAccountActive = userData?.isActive !== false;

                const channelConfigSnap = await adminDb.collection("omni_channel_configs").doc(chatbotId).get();
                const omniChannelConfig = channelConfigSnap.exists ? channelConfigSnap.data() || {} : {};
                const isWebChannelEnabled = normalizeWebChannelEnabled(omniChannelConfig?.web);

                const docSnap = await adminDb.collection("chatbots").doc(chatbotId).get();

                if (docSnap.exists) {
                    const data = docSnap.data() || {};

                    // Merge data: Chatbot settings should take precedence for widget configuration
                    // User settings provide account status and global overrides
                    const mergedData = {
                        ...userData, // Base: User account data
                        ...data,     // Override: Chatbot specific settings (including leadCustomFields)
                        // Keep isActive and enableChatbot from userData if critical
                        isActive: userData?.isActive,
                        enableChatbot: userData?.enableChatbot
                    } as any;

                    const isChatbotEnabled = mergedData.enableChatbot !== false; // Default true
                    const isAccountActive = mergedData.isActive !== false;
                    const shouldEnable = isChatbotEnabled && isAccountActive && isWebChannelEnabled;
                    const isProactiveModuleEnabled = mergedData.enableProactiveMessaging !== false;
                    const rawEngagement = mergedData.engagement && typeof mergedData.engagement === "object"
                        ? mergedData.engagement
                        : null;
                    const resolvedEngagement = (() => {
                        // Module toggle has highest priority for runtime behavior.
                        if (!isProactiveModuleEnabled) {
                            return rawEngagement ? { ...rawEngagement, enabled: false } : null;
                        }

                        // Legacy fallback for tenants that only have the module toggle flag.
                        if (!rawEngagement && mergedData.enableProactiveMessaging === true) {
                            return { enabled: true };
                        }

                        if (!rawEngagement) return null;
                        return {
                            ...rawEngagement,
                            enabled: rawEngagement.enabled === true
                        };
                    })();

                    // Only enable modules that are 'ready' in the registry
                    const isVoiceAssistantAvailable = MODULES_REGISTRY.voiceAssistant?.status === 'ready';
                    const isWebVoiceAssistantEnabled = isVoiceAssistantAvailable
                        && isWebChannelEnabled
                        && mergedData.enableVoiceAssistant === true
                        && hasConfiguredWebVoiceProvider(userData, mergedData);
                    const isGuidedEnabled = MODULES_REGISTRY.guided?.status === "ready" && mergedData.enableGuided === true;
                    const guidedSkills = isGuidedEnabled
                        ? await listEnabledGuidedSkills(adminDb, chatbotId, "web")
                            .then((skills) => skills.map(buildGuidedSkillShortcut))
                            .catch(() => [])
                        : [];
                    const dynamicContextPresetSelection = resolveDynamicContextPresetSelection({
                        sectorId: mergedData?.sector || mergedData?.sectorId || mergedData?.industry,
                        presetMode: mergedData?.dynamicSiteContextPresetMode,
                        presetId: mergedData?.dynamicSiteContextPresetId,
                        presetOverrides: (mergedData?.dynamicSiteContextPresetOverrides && typeof mergedData.dynamicSiteContextPresetOverrides === "object")
                            ? mergedData.dynamicSiteContextPresetOverrides
                            : null,
                        networkAllowlist: Array.isArray(mergedData?.dynamicSiteContextNetworkAllowlist) ? mergedData.dynamicSiteContextNetworkAllowlist : [],
                        graphqlOperationAllowlist: Array.isArray(mergedData?.dynamicSiteContextGraphqlOperationAllowlist) ? mergedData.dynamicSiteContextGraphqlOperationAllowlist : [],
                    });

                    // Return only public settings
                    return NextResponse.json({
                        isEnabled: shouldEnable,
                        companyName: mergedData.companyName || "Acme Corp",
                        welcomeTitle: mergedData.welcomeTitle || "",
                        welcomeMessage: mergedData.welcomeMessage || "Hello! How can I help you today?",
                        brandColor: mergedData.brandColor || "#000000",
                        brandLogo: mergedData.brandLogo || "",
                        headerLogo: mergedData.headerLogo || "",
                        headerLogoWidth: mergedData.headerLogoWidth || 32,
                        headerLogoHeight: mergedData.headerLogoHeight || 32,
                        headerBackgroundColor: mergedData.headerBackgroundColor || "",
                        headerTextColor: mergedData.headerTextColor || "#FFFFFF",
                        suggestedQuestions: mergedData.suggestedQuestions || ["What are your pricing plans?", "How do I get started?", "Contact support"],
                        enableLeadCollection: mergedData.enableLeadCollection || false,
                        enableGuided: isGuidedEnabled,
                        enableBusinessHours: mergedData.enableBusinessHours || false,
                        timezone: mergedData.timezone || "UTC",
                        businessHoursStart: mergedData.businessHoursStart || "09:00",
                        businessHoursEnd: mergedData.businessHoursEnd || "17:00",
                        offlineMessage: mergedData.offlineMessage || "",
                        enableInitialLeadCollection: mergedData.enableInitialLeadCollection ?? mergedData.enableLeadCollection ?? false,
                        enableInChatLeadCollection: mergedData.enableInChatLeadCollection ?? false,
                        leadFormConfig: mergedData.leadFormConfig || null,
                        leadCustomFields: mergedData.leadCustomFields || [],
                        position: mergedData.position || "bottom-right", // 'bottom-right' | 'bottom-left'
                        viewMode: mergedData.viewMode || "classic", // 'classic' | 'wide'
                        modalSize: mergedData.modalSize || "half", // 'half' | 'full'
                        launcherStyle: mergedData.launcherStyle || "circle",
                        launcherCollapse: mergedData.launcherCollapse || false,
                        launcherText: mergedData.launcherText || "Chat",
                        launcherRadius: mergedData.launcherRadius !== undefined ? mergedData.launcherRadius : 50,
                        launcherHeight: mergedData.launcherHeight || 60,
                        launcherWidth: mergedData.launcherWidth || 60,
                        fullImageLauncherWidth: mergedData.fullImageLauncherWidth || 60,
                        fullImageLauncherHeight: mergedData.fullImageLauncherHeight || 60,
                        launcherIcon: mergedData.launcherIcon || "message",
                        launcherIconUrl: mergedData.launcherIconUrl || "",
                        launcherLibraryIcon: mergedData.launcherLibraryIcon || "MessageSquare",
                        launcherIconColor: mergedData.launcherIconColor || "#FFFFFF",
                        launcherBackgroundColor: mergedData.launcherBackgroundColor || "",
                        bottomSpacing: mergedData.bottomSpacing !== undefined ? mergedData.bottomSpacing : 20,
                        sideSpacing: mergedData.sideSpacing !== undefined ? mergedData.sideSpacing : 20,
                        launcherShadow: mergedData.launcherShadow || "medium",
                        launcherAnimation: mergedData.launcherAnimation || "none",
                        mobileBottomSpacing: mergedData.mobileBottomSpacing !== undefined ? mergedData.mobileBottomSpacing : 20,
                        mobileSideSpacing: mergedData.mobileSideSpacing !== undefined ? mergedData.mobileSideSpacing : 20,
                        mobileLauncherAnimation: mergedData.mobileLauncherAnimation || "none",
                        interactionMode:
                            mergedData.chatDisplayMode === "ambient" || mergedData.chatDisplayMode === "sidecar"
                                ? "always_open"
                                : (mergedData.interactionMode === "always_open" ? "always_open" : "launcher"),
                        chatDisplayMode: ["ambient", "sidecar"].includes(mergedData.chatDisplayMode) ? mergedData.chatDisplayMode : "classic",
                        enableClassicEntryOnboarding:
                            typeof mergedData.enableClassicEntryOnboarding === "boolean"
                                ? mergedData.enableClassicEntryOnboarding
                                : true,
                        ambientMaxHeight: typeof mergedData.ambientMaxHeight === "number" ? mergedData.ambientMaxHeight : 260,
                        ambientOverlayOpacity: mergedData.ambientOverlayOpacity !== undefined ? mergedData.ambientOverlayOpacity : 0.55,
                        sidecarWidth: typeof mergedData.sidecarWidth === "number" ? mergedData.sidecarWidth : 420,
                        sidecarMinWidth: typeof mergedData.sidecarMinWidth === "number" ? mergedData.sidecarMinWidth : 360,
                        sidecarMaxWidth: typeof mergedData.sidecarMaxWidth === "number" ? mergedData.sidecarMaxWidth : 560,
                        sidecarGutter: typeof mergedData.sidecarGutter === "number" ? mergedData.sidecarGutter : 0,
                        sidecarDesktopOnly: typeof mergedData.sidecarDesktopOnly === "boolean" ? mergedData.sidecarDesktopOnly : true,
                        sidecarAlwaysOpen: typeof mergedData.sidecarAlwaysOpen === "boolean" ? mergedData.sidecarAlwaysOpen : false,
                        ambientWidth: mergedData.ambientWidth !== undefined ? mergedData.ambientWidth : 800,
                        ambientInputWidth: mergedData.ambientInputWidth !== undefined ? mergedData.ambientInputWidth : (mergedData.ambientWidth !== undefined ? mergedData.ambientWidth : 800),
                        ambientSideMargin: mergedData.ambientSideMargin !== undefined ? mergedData.ambientSideMargin : 0,
                        ambientBottomMargin: mergedData.ambientBottomMargin !== undefined ? mergedData.ambientBottomMargin : 20,
                        ambientInputSize: mergedData.ambientInputSize || "lg",
                        showAmbientIcon: mergedData.showAmbientIcon !== undefined ? mergedData.showAmbientIcon : true,
                        ambientIconUrl: mergedData.ambientIconUrl || "",
                        ambientIconType: mergedData.ambientIconType || "library",
                        ambientLibraryIcon: mergedData.ambientLibraryIcon || "MessageCircle",
                        ambientIconColor: mergedData.ambientIconColor || "",
                        ambientBorderColorIdle: mergedData.ambientBorderColorIdle || "",
                        ambientBorderColorFocused: mergedData.ambientBorderColorFocused || "",
                        ambientTheme: mergedData.ambientTheme || "light",
                        enableAmbientRainbowBorder: mergedData.enableAmbientRainbowBorder || false,
                        ambientClosedBgColor: mergedData.ambientClosedBgColor || "",
                        ambientInputBgColorIdle: mergedData.ambientInputBgColorIdle || "",
                        ambientInputBgColorFocused: mergedData.ambientInputBgColorFocused || "",
                        ambientInputTextColor: mergedData.ambientInputTextColor || "",
                        ambientPlaceholderText: mergedData.ambientPlaceholderText || "",
                        ambientClosedBorderColorIdle: mergedData.ambientClosedBorderColorIdle || "",
                        ambientClosedBorderColorFocused: mergedData.ambientClosedBorderColorFocused || "",
                        ambientAiBubbleColor: mergedData.ambientAiBubbleColor || "",
                        ambientUserBubbleColor: mergedData.ambientUserBubbleColor || "",
                        ambientBorderGradientColor1: mergedData.ambientBorderGradientColor1 || "",
                        ambientBorderGradientColor2: mergedData.ambientBorderGradientColor2 || "",
                        ambientBorderGradientColor3: mergedData.ambientBorderGradientColor3 || "",
                        ambientBorderGradientColor4: mergedData.ambientBorderGradientColor4 || "",
                        ambientBorderGradientShowWhenCollapsed:
                            typeof mergedData.ambientBorderGradientShowWhenCollapsed === "boolean"
                                ? mergedData.ambientBorderGradientShowWhenCollapsed
                                : false,
                        ambientBorderGradientShowWhenOpen:
                            typeof mergedData.ambientBorderGradientShowWhenOpen === "boolean"
                                ? mergedData.ambientBorderGradientShowWhenOpen
                                : true,
                        ambientBorderGradientShowWhenThinking:
                            typeof mergedData.ambientBorderGradientShowWhenThinking === "boolean"
                                ? mergedData.ambientBorderGradientShowWhenThinking
                                : true,
                        ambientPerDeviceSettingsEnabled: mergedData.ambientPerDeviceSettingsEnabled === true,
                        ambientDesktopSettings: mergedData.ambientDesktopSettings || null,
                        ambientMobileSettings: mergedData.ambientMobileSettings || null,
                        classicPerDeviceSettingsEnabled: mergedData.classicPerDeviceSettingsEnabled === true,
                        classicDesktopSettings: mergedData.classicDesktopSettings || null,
                        classicMobileSettings: mergedData.classicMobileSettings || null,
                        widgetLoaderStyle: mergedData.widgetLoaderStyle || "skeleton",
                        enableContextAwareness: mergedData.enableContextAwareness || false,
                        // Full Image / Lottie Mode
                        launcherType: mergedData.launcherType || "standard",
                        launcherImageMode: mergedData.launcherImageMode || "image",
                        launcherFullImageUrl: mergedData.launcherFullImageUrl || "",
                        launcherLottieUrl: mergedData.launcherLottieUrl || "",
                        launcherHoverEffect: mergedData.launcherHoverEffect || "scale",
                        initialLanguage: mergedData.initialLanguage || "auto",
                        // Triggers
                        autoOpenDelay: mergedData.autoOpenDelay || 0,
                        openOnExitIntent: mergedData.openOnExitIntent || false,
                        openOnScroll: mergedData.openOnScroll || 0,
                        // Engagement
                        enableProactiveMessaging: isProactiveModuleEnabled,
                        engagement: resolvedEngagement,
                        // Digital Waiter (Restaurant)
                        digitalWaiter: mergedData.digitalWaiter || null,
                        // Web-only browser voice mode; no telephony/omni coupling here.
                        enableVoiceAssistant: isWebVoiceAssistantEnabled,
                        voiceProvider: mergedData.voiceProvider || "klassifier",
                        elevenLabsVoiceId: mergedData.elevenLabsVoiceId || "",
                        enablePersonalShopper: mergedData.enablePersonalShopper || false,
                        enableVisualDiagnosis: mergedData.enableVisualDiagnosis || false,
                        enableIndustryGreeting: mergedData.enableIndustryGreeting || false,
                        industry: data.industry || mergedData.industry || "ecommerce",
                        customPrompts: mergedData.customPrompts || "",
                        salesOptimizationConfig: mergedData.salesOptimizationConfig || null,
                        enableDynamicContext: mergedData.enableDynamicContext || false,
                        dynamicContextMode: mergedData.dynamicContextMode || "nocode",
                        dynamicContextSelectors: Array.isArray(mergedData.dynamicContextSelectors)
                            ? mergedData.dynamicContextSelectors
                            : [],
                        enableDynamicSiteContext: mergedData.enableDynamicSiteContext === true,
                        dynamicSiteContextCollectionMode: mergedData.dynamicSiteContextCollectionMode || "dom_network",
                        dynamicSiteContextCrawlTrigger: mergedData.dynamicSiteContextCrawlTrigger || "manual",
                        dynamicSiteContextRouteScope: mergedData.dynamicSiteContextRouteScope || "sidebar_safe",
                        dynamicSiteContextAllowlist: Array.isArray(mergedData.dynamicSiteContextAllowlist) ? mergedData.dynamicSiteContextAllowlist : [],
                        dynamicSiteContextMaxRoutes: typeof mergedData.dynamicSiteContextMaxRoutes === "number" ? mergedData.dynamicSiteContextMaxRoutes : 30,
                        dynamicSiteContextMaxDurationSec: typeof mergedData.dynamicSiteContextMaxDurationSec === "number" ? mergedData.dynamicSiteContextMaxDurationSec : 90,
                        dynamicSiteContextHydrationWaitMs: typeof mergedData.dynamicSiteContextHydrationWaitMs === "number" ? mergedData.dynamicSiteContextHydrationWaitMs : 4000,
                        dynamicSiteContextExcludeSelectorPrefixes: Array.isArray(mergedData.dynamicSiteContextExcludeSelectorPrefixes)
                            ? mergedData.dynamicSiteContextExcludeSelectorPrefixes
                            : ["#userex-", ".userex-", "#vion-", ".vion-"],
                        dynamicSiteContextCapturePII: mergedData.dynamicSiteContextCapturePII !== false,
                        dynamicSiteContextPresetMode: ["none", "suggested", "approved"].includes(mergedData.dynamicSiteContextPresetMode)
                            ? mergedData.dynamicSiteContextPresetMode
                            : "none",
                        dynamicSiteContextPresetId: typeof mergedData.dynamicSiteContextPresetId === "string" ? mergedData.dynamicSiteContextPresetId : "",
                        dynamicSiteContextPresetApprovedAt: typeof mergedData.dynamicSiteContextPresetApprovedAt === "string" ? mergedData.dynamicSiteContextPresetApprovedAt : "",
                        dynamicSiteContextPresetOverrides: (mergedData.dynamicSiteContextPresetOverrides && typeof mergedData.dynamicSiteContextPresetOverrides === "object")
                            ? mergedData.dynamicSiteContextPresetOverrides
                            : {},
                        dynamicSiteContextNetworkAllowlist: Array.isArray(mergedData.dynamicSiteContextNetworkAllowlist) ? mergedData.dynamicSiteContextNetworkAllowlist : [],
                        dynamicSiteContextGraphqlOperationAllowlist: Array.isArray(mergedData.dynamicSiteContextGraphqlOperationAllowlist) ? mergedData.dynamicSiteContextGraphqlOperationAllowlist : [],
                        dynamicSiteContextSuggestedPresetId: dynamicContextPresetSelection.suggestedPresetId,
                        dynamicSiteContextResolvedPresetId: dynamicContextPresetSelection.activePresetId,
                        dynamicSiteContextRuntimePreset: dynamicContextPresetSelection.runtimePreset,
                        guidedSkills,
                        theme: mergedData.theme || "classic",
                    }, {
                        headers: {
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, Pragma',
                            'Cache-Control': 'no-store, max-age=0',
                        }
                    });
                }
            } // Close adminDb

            const defaultSettings = {
                isEnabled: true,
                companyName: "Vion AI",
                welcomeMessage: "Merhaba! Size nasıl yardımcı olabilirim?",
                brandColor: "#000000",
                brandLogo: "", // Ensure this is a valid path if possible, or empty
                headerLogo: "",
                headerBackgroundColor: "#000000",
                headerTextColor: "#FFFFFF",
                suggestedQuestions: ["Fiyatlarınız nedir?", "Nasıl başlarım?", "İletişim"],
                enableLeadCollection: false,
                enableGuided: false,
                enableBusinessHours: false,
                timezone: "UTC",
                businessHoursStart: "09:00",
                businessHoursEnd: "17:00",
                offlineMessage: "",
                position: "bottom-right",
                viewMode: "classic",
                modalSize: "half",
                launcherStyle: "circle",
                launcherCollapse: false,
                launcherText: "Sohbet",
                launcherRadius: 50,
                launcherHeight: 60,
                launcherWidth: 60,
                fullImageLauncherWidth: 60,
                fullImageLauncherHeight: 60,
                launcherIcon: "message",
                launcherIconUrl: "",
                launcherLibraryIcon: "MessageSquare",
                launcherIconColor: "#FFFFFF",
                launcherBackgroundColor: "#000000",
                bottomSpacing: 20,
                sideSpacing: 20,
                launcherShadow: "medium",
                launcherAnimation: "none",
                interactionMode: "launcher",
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
                ambientWidth: 800,
                ambientInputWidth: 800,
                ambientSideMargin: 0,
                ambientBottomMargin: 20,
                ambientInputSize: "lg",
                showAmbientIcon: true,
                ambientIconUrl: "",
                ambientIconType: "library",
                ambientLibraryIcon: "MessageCircle",
                ambientIconColor: "",
                ambientBorderColorIdle: "",
                ambientBorderColorFocused: "",
                ambientTheme: "light",
                enableAmbientRainbowBorder: false,
                ambientClosedBgColor: "",
                ambientInputBgColorIdle: "",
                ambientInputBgColorFocused: "",
                ambientInputTextColor: "",
                ambientPlaceholderText: "",
                ambientClosedBorderColorIdle: "",
                ambientClosedBorderColorFocused: "",
                ambientAiBubbleColor: "",
                ambientUserBubbleColor: "",
                ambientBorderGradientColor1: "",
                ambientBorderGradientColor2: "",
                ambientBorderGradientColor3: "",
                ambientBorderGradientColor4: "",
                ambientBorderGradientShowWhenCollapsed: false,
                ambientBorderGradientShowWhenOpen: true,
                ambientBorderGradientShowWhenThinking: true,
                ambientPerDeviceSettingsEnabled: false,
                ambientDesktopSettings: null,
                ambientMobileSettings: null,
                classicPerDeviceSettingsEnabled: false,
                classicDesktopSettings: null,
                classicMobileSettings: null,
                widgetLoaderStyle: "skeleton",
                enableContextAwareness: false,
                initialLanguage: "tr",
                enableProactiveMessaging: false,
                engagement: null,
                digitalWaiter: null,
                enableVoiceAssistant: false,
                voiceProvider: "klassifier",
                elevenLabsVoiceId: "",
                enablePersonalShopper: false,
                enableIndustryGreeting: false,
                industry: "technology",
                customPrompts: "",
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
                dynamicSiteContextCapturePII: true,
                dynamicSiteContextPresetMode: "none",
                dynamicSiteContextPresetId: "",
                dynamicSiteContextPresetApprovedAt: "",
                dynamicSiteContextPresetOverrides: {},
                dynamicSiteContextNetworkAllowlist: [],
                dynamicSiteContextGraphqlOperationAllowlist: [],
                dynamicSiteContextSuggestedPresetId: "generic-web-app",
                dynamicSiteContextResolvedPresetId: "generic-web-app",
                dynamicSiteContextRuntimePreset: {
                    presetId: "generic-web-app",
                    routeHints: ["dashboard", "overview", "profile", "account", "settings", "projects", "tasks"],
                    entityTargets: ["dashboard", "tasks", "projects", "profile"],
                    confidenceBase: 0.55,
                    networkPolicy: {
                        allowGetJson: true,
                        allowGraphQLSummary: false,
                        allowedPostEndpoints: [],
                        allowedGraphQLOperations: [],
                    },
                },
                guidedSkills: [],
                theme: "classic",
            };

            return NextResponse.json(defaultSettings, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Cache-Control': 'no-store, max-age=0',
                }
            });
        }
        catch (error) {
            console.error("Error fetching settings:", error);
            // Return defaults on error instead of 500
            return NextResponse.json({
                isEnabled: true,
                companyName: "Vion AI",
                welcomeMessage: "Merhaba! Size nasıl yardımcı olabilirim?",
                brandColor: "#000000",
                suggestedQuestions: ["Fiyatlarınız nedir?", "Nasıl başlarım?", "İletişim"],
                enableGuided: false,
                enableBusinessHours: false,
                timezone: "UTC",
                businessHoursStart: "09:00",
                businessHoursEnd: "17:00",
                offlineMessage: "",
                position: "bottom-right",
                viewMode: "classic",
                initialLanguage: "tr",
                interactionMode: "launcher",
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
                ambientWidth: 800,
                ambientInputWidth: 800,
                ambientSideMargin: 0,
                ambientBottomMargin: 20,
                ambientInputSize: "lg",
                showAmbientIcon: true,
                ambientIconUrl: "",
                ambientIconType: "library",
                ambientLibraryIcon: "MessageCircle",
                ambientIconColor: "",
                ambientBorderColorIdle: "",
                ambientBorderColorFocused: "",
                ambientTheme: "light",
                enableAmbientRainbowBorder: false,
                ambientClosedBgColor: "",
                ambientInputBgColorIdle: "",
                ambientInputBgColorFocused: "",
                ambientInputTextColor: "",
                ambientPlaceholderText: "",
                ambientClosedBorderColorIdle: "",
                ambientClosedBorderColorFocused: "",
                ambientAiBubbleColor: "",
                ambientUserBubbleColor: "",
                ambientBorderGradientColor1: "",
                ambientBorderGradientColor2: "",
                ambientBorderGradientColor3: "",
                ambientBorderGradientColor4: "",
                ambientBorderGradientShowWhenCollapsed: false,
                ambientBorderGradientShowWhenOpen: true,
                ambientBorderGradientShowWhenThinking: true,
                ambientPerDeviceSettingsEnabled: false,
                ambientDesktopSettings: null,
                ambientMobileSettings: null,
                classicPerDeviceSettingsEnabled: false,
                classicDesktopSettings: null,
                classicMobileSettings: null,
                widgetLoaderStyle: "skeleton",
                enableContextAwareness: false,
                enableDynamicContext: false,

                dynamicContextMode: "nocode",
                dynamicContextSelectors: [],
                enableProactiveMessaging: false,
                theme: "classic"
            }, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, Pragma',
                    'Cache-Control': 'no-store, max-age=0',
                }
            });
        }
    } catch (error) {
        console.error("Error in GET /api/widget-settings:", error);
        // Return defaults on catastrophic error
        return NextResponse.json({
            isEnabled: true,
            companyName: "Vion AI",
            welcomeMessage: "Merhaba! Size nasıl yardımcı olabilirim?",
            brandColor: "#000000",
            suggestedQuestions: ["Fiyatlarınız nedir?", "Nasıl başlarım?", "İletişim"],
            enableGuided: false,
            enableBusinessHours: false,
            timezone: "UTC",
            businessHoursStart: "09:00",
            businessHoursEnd: "17:00",
            offlineMessage: "",
            position: "bottom-right",
            viewMode: "classic",
            initialLanguage: "tr",
            interactionMode: "launcher",
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
            ambientBorderColorFocused: "",
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
            ambientDesktopSettings: null,
            ambientMobileSettings: null,
            classicPerDeviceSettingsEnabled: false,
            classicDesktopSettings: null,
            classicMobileSettings: null,
            enableDynamicContext: false,
            dynamicContextMode: "nocode",
            dynamicContextSelectors: [],
            enableProactiveMessaging: false,
            theme: "classic"
        }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, Pragma',
                'Cache-Control': 'no-store, max-age=0',
            }
        });
    }
}

export async function POST(req: Request) {
    console.log("POST /api/widget-settings called");
    const adminDb = getAdminDb();
    const adminAuth = getAdminAuth();

    if (!adminDb || !adminAuth) {
        return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        if (!userId) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        const body = await req.json();
        const { chatbotId } = body;

        let targetChatbotId = userId;

        // If trying to edit another chatbot, check permissions properly
        if (chatbotId && chatbotId !== userId) {
            const userDoc = await adminDb.collection("users").doc(userId).get();
            const userData = userDoc.data();
            const callerRole = userData?.role;

            if (callerRole === 'SUPER_ADMIN') {
                // Super admin can edit any chatbot
                targetChatbotId = chatbotId;
            } else if (callerRole === 'AGENCY_ADMIN' || callerRole === 'PARTNER') {
                // Agency admin can only edit chatbots belonging to their managed customers
                const targetUserDoc = await adminDb.collection("users").doc(chatbotId).get();
                const targetUserData = targetUserDoc.data();
                const targetAgencyId = targetUserData?.agencyId || null;

                if (targetAgencyId !== userId) {
                    console.warn(`[widget-settings] AGENCY_ADMIN ${userId} tried to edit chatbot ${chatbotId} not assigned to them (agencyId=${targetAgencyId})`);
                    return NextResponse.json({ error: "Forbidden: This customer does not belong to your agency" }, { status: 403 });
                }
                targetChatbotId = chatbotId;
            } else {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        // Validation or sanitization could go here if needed

        // Remove chatbotId from body before saving
        const { chatbotId: _, ...settingsToSave } = body;

        // If industry is being set, also update sector and sectorId to ensure AI uses correct sector
        // AI service prioritizes sector > sectorId > industry, so we must sync all three
        const dataToSave = {
            ...settingsToSave,
            updatedAt: new Date().toISOString(),
        };

        if (settingsToSave.industry) {
            dataToSave.sector = settingsToSave.industry;
            dataToSave.sectorId = settingsToSave.industry;
        }

        await adminDb.collection("chatbots").doc(targetChatbotId).set(dataToSave, { merge: true });

        // Sync industry to users collection for Company Settings page
        if (settingsToSave.industry) {
            await adminDb.collection("users").doc(targetChatbotId).set({
                industry: settingsToSave.industry,
                updatedAt: new Date().toISOString(),
            }, { merge: true });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error saving settings:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function OPTIONS(req: Request) {
    return new NextResponse(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, Pragma',
        },
    });
}
