import { NextResponse } from "next/server";
import { OpenAI } from "openai";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { MODULES_REGISTRY } from "@/lib/modules-registry";
import { resolveDynamicContextPresetSelection } from "@/lib/dynamic-context-presets";
import { resolveKvkkConsentPayload } from "@/lib/kvkk-consent";
import { DEFAULT_HUMAN_HANDOFF_BUSINESS_DAYS, resolveHumanHandoffSettings } from "@/lib/human-handoff";
import { resolveQuickActionsConfig } from "@/lib/quick-actions";
import { getPublishedContract } from "@/lib/contracts";
import { buildDefaultSurveyWidgetConfig, buildPublicSurvey, buildSurveyModuleConfig, fetchSurveyById } from "@/lib/surveys/service";

// Updated: 2026-01-01 - Added enableVisualDiagnosis support
export const dynamic = 'force-dynamic';

const quickActionTranslator = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

type QuickActionLabelTranslation = {
    index: number;
    tr: string;
    en: string;
};

type LocalizedTextMap = {
    tr: string;
    en: string;
};

function stripUndefinedDeep<T>(value: T): T {
    if (Array.isArray(value)) {
        return value
            .map((item) => stripUndefinedDeep(item))
            .filter((item) => item !== undefined) as T;
    }

    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .filter(([, fieldValue]) => fieldValue !== undefined)
                .map(([key, fieldValue]) => [key, stripUndefinedDeep(fieldValue)])
        ) as T;
    }

    return value;
}

function normalizeLocalizedLabelValue(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function normalizeLocalizedTextMap(value: unknown) {
    const map = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    return {
        tr: normalizeLocalizedLabelValue(map.tr),
        en: normalizeLocalizedLabelValue(map.en),
    };
}

async function translateTextEntries(
    items: Array<{ key: string; text: string }>
): Promise<Map<string, LocalizedTextMap>> {
    if (!quickActionTranslator || items.length === 0) {
        return new Map();
    }

    try {
        const completion = await quickActionTranslator.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content:
                        "You translate short chatbot UI strings. Return concise, faithful Turkish (tr) and English (en) texts. Preserve punctuation and CTA tone when possible. Respond only with JSON.",
                },
                {
                    role: "user",
                    content: JSON.stringify({
                        task: "Translate each source text into tr and en.",
                        items,
                        outputSchema: {
                            translations: [{ key: "string", tr: "string", en: "string" }],
                        },
                    }),
                },
            ],
        });

        const rawContent = completion.choices?.[0]?.message?.content || "{}";
        const parsed = JSON.parse(rawContent) as {
            translations?: Array<{ key?: string; tr?: string; en?: string }>;
        };
        const translations = Array.isArray(parsed.translations) ? parsed.translations : [];
        const result = new Map<string, LocalizedTextMap>();

        for (const entry of translations) {
            const key = typeof entry?.key === "string" ? entry.key : "";
            if (!key) continue;
            result.set(key, {
                tr: normalizeLocalizedLabelValue(entry.tr),
                en: normalizeLocalizedLabelValue(entry.en),
            });
        }

        return result;
    } catch (error) {
        console.warn("[widget-settings] localization translation failed, falling back to source values", error);
        return new Map();
    }
}

async function enrichWidgetLocalizedCopy(settings: Record<string, any>) {
    const textFields = [
        "welcomeTitle",
        "welcomeMessage",
        "launcherText",
        "offlineMessage",
        "ambientPlaceholderText",
    ] as const;
    const items: Array<{ key: string; text: string }> = [];
    const existingMaps: Record<string, LocalizedTextMap> = {};

    for (const field of textFields) {
        const sourceValue = normalizeLocalizedLabelValue(settings[field]);
        const localizedFieldKey = `${field}Localized`;
        const existingMap = normalizeLocalizedTextMap(settings[localizedFieldKey]);
        existingMaps[localizedFieldKey] = existingMap;
        if (sourceValue && (!existingMap.tr || !existingMap.en)) {
            items.push({ key: field, text: sourceValue });
        }
    }

    const suggestedQuestions = Array.isArray(settings.suggestedQuestions)
        ? settings.suggestedQuestions.map((question: unknown) => normalizeLocalizedLabelValue(question)).filter(Boolean)
        : [];
    const suggestedLocalized = settings.suggestedQuestionsLocalized && typeof settings.suggestedQuestionsLocalized === "object"
        ? settings.suggestedQuestionsLocalized
        : {};
    const existingSuggestedTr = Array.isArray(suggestedLocalized.tr) ? suggestedLocalized.tr.map((q: unknown) => normalizeLocalizedLabelValue(q)) : [];
    const existingSuggestedEn = Array.isArray(suggestedLocalized.en) ? suggestedLocalized.en.map((q: unknown) => normalizeLocalizedLabelValue(q)) : [];

    for (let index = 0; index < suggestedQuestions.length; index += 1) {
        const source = suggestedQuestions[index];
        const hasTr = !!existingSuggestedTr[index];
        const hasEn = !!existingSuggestedEn[index];
        if (!source || (hasTr && hasEn)) continue;
        items.push({ key: `suggestedQuestions.${index}`, text: source });
    }

    const translations = await translateTextEntries(items);
    const nextSettings: Record<string, any> = { ...settings };

    for (const field of textFields) {
        const sourceValue = normalizeLocalizedLabelValue(settings[field]);
        const localizedFieldKey = `${field}Localized`;
        if (!sourceValue) {
            nextSettings[localizedFieldKey] = { tr: "", en: "" };
            continue;
        }

        const translated = translations.get(field);
        const existing = existingMaps[localizedFieldKey];
        nextSettings[localizedFieldKey] = {
            tr: existing.tr || translated?.tr || sourceValue,
            en: existing.en || translated?.en || sourceValue,
        };
    }

    if (suggestedQuestions.length > 0) {
        const nextSuggestedTr = [...existingSuggestedTr];
        const nextSuggestedEn = [...existingSuggestedEn];
        for (let index = 0; index < suggestedQuestions.length; index += 1) {
            const source = suggestedQuestions[index];
            const translated = translations.get(`suggestedQuestions.${index}`);
            nextSuggestedTr[index] = nextSuggestedTr[index] || translated?.tr || source;
            nextSuggestedEn[index] = nextSuggestedEn[index] || translated?.en || source;
        }

        nextSettings.suggestedQuestionsLocalized = {
            tr: nextSuggestedTr.slice(0, suggestedQuestions.length),
            en: nextSuggestedEn.slice(0, suggestedQuestions.length),
        };
    } else {
        nextSettings.suggestedQuestionsLocalized = { tr: [], en: [] };
    }

    return nextSettings;
}

async function enrichQuickActionLabels(rawQuickActions: any) {
    if (!rawQuickActions || typeof rawQuickActions !== "object" || !Array.isArray(rawQuickActions.buttons)) {
        return rawQuickActions;
    }

    const buttons = rawQuickActions.buttons.map((button: any) => ({ ...button }));
    const itemsToTranslate = buttons
        .map((button: any, index: number) => {
            const sourceLabel = normalizeLocalizedLabelValue(button?.label);
            const existingTr = normalizeLocalizedLabelValue(button?.localizedLabel?.tr);
            const existingEn = normalizeLocalizedLabelValue(button?.localizedLabel?.en);
            if (!sourceLabel || (existingTr && existingEn)) return null;
            return {
                index,
                sourceLabel,
                moduleId: typeof button?.moduleId === "string" ? button.moduleId : "unknown",
            };
        })
        .filter(Boolean) as Array<{ index: number; sourceLabel: string; moduleId: string }>;

    if (itemsToTranslate.length === 0) {
        return {
            ...rawQuickActions,
            buttons,
        };
    }

    let translated = new Map<number, QuickActionLabelTranslation>();

    if (quickActionTranslator) {
        try {
            const completion = await quickActionTranslator.chat.completions.create({
                model: "gpt-4o-mini",
                temperature: 0,
                response_format: { type: "json_object" },
                messages: [
                    {
                        role: "system",
                        content:
                            "You translate short chatbot quick action button labels. Return concise UI CTA text in Turkish and English. Keep intent and tone, avoid extra punctuation. Respond only with JSON.",
                    },
                    {
                        role: "user",
                        content: JSON.stringify({
                            task: "Translate each label to tr and en for chatbot quick action buttons.",
                            items: itemsToTranslate,
                            outputSchema: {
                                translations: [{ index: 0, tr: "string", en: "string" }],
                            },
                        }),
                    },
                ],
            });

            const rawContent = completion.choices?.[0]?.message?.content || "{}";
            const parsed = JSON.parse(rawContent) as { translations?: QuickActionLabelTranslation[] };
            const entries = Array.isArray(parsed.translations) ? parsed.translations : [];
            translated = new Map(
                entries
                    .filter((entry) => Number.isInteger(entry?.index))
                    .map((entry) => [
                        entry.index,
                        {
                            index: entry.index,
                            tr: normalizeLocalizedLabelValue(entry.tr),
                            en: normalizeLocalizedLabelValue(entry.en),
                        },
                    ])
            );
        } catch (error) {
            console.warn("[widget-settings] quick action label translation failed, falling back to source labels", error);
        }
    }

    for (const item of itemsToTranslate) {
        const current = buttons[item.index];
        if (!current) continue;
        const existingTr = normalizeLocalizedLabelValue(current?.localizedLabel?.tr);
        const existingEn = normalizeLocalizedLabelValue(current?.localizedLabel?.en);
        const translatedItem = translated.get(item.index);
        current.localizedLabel = {
            tr: existingTr || translatedItem?.tr || item.sourceLabel,
            en: existingEn || translatedItem?.en || item.sourceLabel,
        };
    }

    return {
        ...rawQuickActions,
        buttons,
    };
}

function normalizeWebChannelEnabled(config: any) {
    return config?.enabled !== false;
}

function isWidgetTestMode(searchParams: URLSearchParams) {
    return searchParams.get("testMode") === "1" || searchParams.get("runtimeMode") === "test";
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
        const widgetTestMode = isWidgetTestMode(searchParams);

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

                const channelConfigSnap = await adminDb.collection("omni_channel_configs").doc(chatbotId).get();
                const omniChannelConfig = channelConfigSnap.exists ? channelConfigSnap.data() || {} : {};
                const isWebChannelEnabled = widgetTestMode ? true : normalizeWebChannelEnabled(omniChannelConfig?.web);

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

                    const isChatbotEnabled = widgetTestMode ? true : mergedData.enableChatbot !== false; // Default true
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
                    const guidedSkills: [] = [];
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

                    const publishedKvkkContract = await getPublishedContract(adminDb, "kvkkDefault").catch(() => null);
                    const kvkkConsent = resolveKvkkConsentPayload({ mergedData, publishedKvkkContract });
                    const humanHandoffSettings = resolveHumanHandoffSettings(mergedData);
                    const baseSurveyWidgetConfig = buildDefaultSurveyWidgetConfig(mergedData.surveyModuleConfig);
                    const activeWidgetSurvey = mergedData.enableSurveyManager === true && baseSurveyWidgetConfig.widgetActiveSurveyId
                        ? await fetchSurveyById(adminDb, baseSurveyWidgetConfig.widgetActiveSurveyId).catch(() => null)
                        : null;
                    const surveyWidgetConfig = {
                        ...baseSurveyWidgetConfig,
                        activeSurvey:
                            activeWidgetSurvey
                                && activeWidgetSurvey.status === "published"
                                && activeWidgetSurvey.channels.includes("widget")
                                ? buildPublicSurvey(activeWidgetSurvey)
                                : null,
                    };
                    const quickActions = resolveQuickActionsConfig({
                        ...mergedData,
                        enableSurveyManager: mergedData.enableSurveyManager === true,
                        surveyWidgetConfig,
                    });

                    // Return only public settings
                    return NextResponse.json({
                        isEnabled: shouldEnable,
                        companyName: mergedData.companyName || "Acme Corp",
                        welcomeTitle: mergedData.welcomeTitle || "",
                        welcomeTitleLocalized: mergedData.welcomeTitleLocalized || { tr: "", en: "" },
                        welcomeMessage: mergedData.welcomeMessage || "Hello! How can I help you today?",
                        welcomeMessageLocalized: mergedData.welcomeMessageLocalized || { tr: "", en: "" },
                        brandColor: mergedData.brandColor || "#000000",
                        brandLogo: mergedData.brandLogo || "",
                        headerLogo: mergedData.headerLogo || "",
                        headerLogoWidth: mergedData.headerLogoWidth || 32,
                        headerLogoHeight: mergedData.headerLogoHeight || 32,
                        headerBackgroundColor: mergedData.headerBackgroundColor || "",
                        headerTextColor: mergedData.headerTextColor || "#FFFFFF",
                        suggestedQuestions: mergedData.suggestedQuestions || ["What are your pricing plans?", "How do I get started?", "Contact support"],
                        suggestedQuestionsLocalized: mergedData.suggestedQuestionsLocalized || { tr: [], en: [] },
                        enableLeadCollection: mergedData.enableLeadCollection || false,
                        enableSurveyManager: mergedData.enableSurveyManager === true,
                        enableHumanHandoff: mergedData.enableHumanHandoff || false,
                        humanHandoffSettings: {
                            triggerOnUserRequest: humanHandoffSettings.triggerOnUserRequest,
                            businessHoursEnabled: humanHandoffSettings.businessHoursEnabled,
                            businessHoursStart: humanHandoffSettings.businessHoursStart,
                            businessHoursEnd: humanHandoffSettings.businessHoursEnd,
                            businessHoursTimezone: humanHandoffSettings.businessHoursTimezone,
                            businessDays: humanHandoffSettings.businessDays,
                        },
                        enableAppointments: mergedData.enableAppointments || false,
                        enableKvkkConsent: mergedData.enableKvkkConsent === true,
                        enableGuided: isGuidedEnabled,
                        enableBusinessHours: mergedData.enableBusinessHours || false,
                        timezone: mergedData.timezone || "UTC",
                        businessHoursStart: mergedData.businessHoursStart || "09:00",
                        businessHoursEnd: mergedData.businessHoursEnd || "17:00",
                        offlineMessage: mergedData.offlineMessage || "",
                        offlineMessageLocalized: mergedData.offlineMessageLocalized || { tr: "", en: "" },
                        enableInitialLeadCollection: mergedData.enableInitialLeadCollection ?? mergedData.enableLeadCollection ?? false,
                        enableInChatLeadCollection: mergedData.enableInChatLeadCollection ?? false,
                        leadFormConfig: mergedData.leadFormConfig || null,
                        surveyModuleConfig: buildSurveyModuleConfig(baseSurveyWidgetConfig),
                        surveyWidgetConfig,
                        leadCustomFields: mergedData.leadCustomFields || [],
                        quickActions,
                        position: mergedData.position || "bottom-right", // 'bottom-right' | 'bottom-left'
                        viewMode: mergedData.viewMode || "classic", // 'classic' | 'wide'
                        modalSize: mergedData.modalSize || "half", // 'half' | 'full'
                        launcherStyle: mergedData.launcherStyle || "circle",
                        launcherCollapse: mergedData.launcherCollapse || false,
                        launcherText: mergedData.launcherText || "Chat",
                        launcherTextLocalized: mergedData.launcherTextLocalized || { tr: "", en: "" },
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
                        ambientPlaceholderTextLocalized: mergedData.ambientPlaceholderTextLocalized || { tr: "", en: "" },
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
                        enableDigitalWaiter: mergedData.enableDigitalWaiter === true || mergedData.digitalWaiter != null,
                        digitalWaiter: mergedData.digitalWaiter || null,
                        // Web-only browser voice mode; no telephony/omni coupling here.
                        enableVoiceAssistant: isWebVoiceAssistantEnabled,
                        enableAutoSpeak: mergedData.enableAutoSpeak === true,
                        voiceProvider: mergedData.voiceProvider || "klassifier",
                        elevenLabsVoiceId: mergedData.elevenLabsVoiceId || "",
                        preferredVoice: mergedData.preferredVoice || "",
                        enablePersonalShopper: mergedData.enablePersonalShopper || false,
                        enableVisualDiagnosis: mergedData.enableVisualDiagnosis || false,
                        enableIndustryGreeting: mergedData.enableIndustryGreeting || false,
                        industry: data.industry || mergedData.industry || "ecommerce",
                        customPrompts: mergedData.customPrompts || "",
                        salesOptimizationConfig: mergedData.salesOptimizationConfig || null,
                        enableDynamicContext: mergedData.enableDynamicContext || false,
                        dynamicContextMode: mergedData.dynamicContextMode === "enterprise_adapter" ? "enterprise_adapter" : "nocode",
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
                        dynamicSiteContextCapturePII: mergedData.dynamicSiteContextCapturePII === true,
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
                        kvkkConsent,
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
                enableHumanHandoff: false,
                humanHandoffSettings: {
                    triggerOnUserRequest: true,
                    businessHoursEnabled: false,
                    businessHoursStart: "09:00",
                    businessHoursEnd: "18:00",
                    businessHoursTimezone: "UTC",
                    businessDays: DEFAULT_HUMAN_HANDOFF_BUSINESS_DAYS,
                },
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
                enableDigitalWaiter: false,
                digitalWaiter: null,
                enableVoiceAssistant: false,
                enableAutoSpeak: false,
                voiceProvider: "klassifier",
                elevenLabsVoiceId: "",
                preferredVoice: "",
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
                dynamicSiteContextCapturePII: false,
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
                enableDigitalWaiter: false,
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
            enableHumanHandoff: false,
            humanHandoffSettings: {
                triggerOnUserRequest: true,
                businessHoursEnabled: false,
                businessHoursStart: "09:00",
                businessHoursEnd: "18:00",
                businessHoursTimezone: "UTC",
                businessDays: DEFAULT_HUMAN_HANDOFF_BUSINESS_DAYS,
            },
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
            enableDigitalWaiter: false,
            enableVoiceAssistant: false,
            enableAutoSpeak: false,
            voiceProvider: "klassifier",
            elevenLabsVoiceId: "",
            preferredVoice: "",
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

        // Remove chatbotId from body before saving
        const { chatbotId: _, ...settingsToSave } = body;

        const saveKeys = Object.keys(settingsToSave);
        const isEngagementOnlySave =
            settingsToSave.engagement &&
            typeof settingsToSave.engagement === "object" &&
            saveKeys.every((key) => key === "engagement" || key === "enableProactiveMessaging");

        if (isEngagementOnlySave) {
            const dataToSave = stripUndefinedDeep({
                engagement: settingsToSave.engagement,
                enableProactiveMessaging: settingsToSave.enableProactiveMessaging === true,
                updatedAt: new Date().toISOString(),
            });

            await adminDb.collection("chatbots").doc(targetChatbotId).set(dataToSave, { merge: true });
            return NextResponse.json({ success: true });
        }

        const normalizedQuickActions = await enrichQuickActionLabels(settingsToSave.quickActions);
        const localizedSettingsToSave = await enrichWidgetLocalizedCopy(settingsToSave);
        const normalizedSettingsToSave: Record<string, any> = {
            ...localizedSettingsToSave,
            quickActions: normalizedQuickActions,
        };

        // If industry is being set, also update sector and sectorId to ensure AI uses correct sector
        // AI service prioritizes sector > sectorId > industry, so we must sync all three
        const dataToSave: Record<string, any> = stripUndefinedDeep({
            ...normalizedSettingsToSave,
            updatedAt: new Date().toISOString(),
        });

        if (normalizedSettingsToSave.industry) {
            dataToSave.sector = normalizedSettingsToSave.industry;
            dataToSave.sectorId = normalizedSettingsToSave.industry;
        }

        await adminDb.collection("chatbots").doc(targetChatbotId).set(dataToSave, { merge: true });

        // Sync industry to users collection for Company Settings page
        if (normalizedSettingsToSave.industry) {
            await adminDb.collection("users").doc(targetChatbotId).set({
                industry: normalizedSettingsToSave.industry,
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
