export interface ChatbotSettings {
    companyName: string;
    welcomeTitle: string;
    welcomeMessage: string;
    brandColor: string;
    brandLogo: string;
    headerLogo: string;
    headerLogoWidth: number;
    headerLogoHeight: number;
    headerBackgroundColor: string;
    headerTextColor: string;
    suggestedQuestions: string[];
    enableLeadCollection: boolean;
    enableInitialLeadCollection: boolean;
    enableInChatLeadCollection: boolean;
    leadFormConfig: {
        title?: string;
        subtitle?: string;
        nameLabel?: string;
        emailLabel?: string;
        phoneLabel?: string;
        submitButtonText?: string;
        nameEnabled?: boolean;
        emailEnabled?: boolean;
        phoneEnabled?: boolean;
        nameRequired?: boolean;
        emailRequired?: boolean;
        phoneRequired?: boolean;
        namePlaceholder?: string;
        emailPlaceholder?: string;
        phonePlaceholder?: string;
    } | null;
    industry: string;
    enableVoiceAssistant: boolean;
    voiceProvider: string;
    elevenLabsVoiceId: string;
    theme: string;
    enableIndustryGreeting: boolean;
    initialLanguage: "auto" | "en" | "tr" | "de" | "es";
    engagement: {
        enabled: boolean;
        bubble: {
            messages: any[];
        };
    };
    enableAppointments: boolean;
    appointmentTypes: string[];
    appointmentSuccessMessage: string;
    availableDays: string[];
    enableAutoSpeak: boolean;
    preferredVoice: string;
    enablePersonalShopper: boolean;
    enableVisualDiagnosis: boolean;
    leadCustomFields: {
        id: string;
        label: string;
        type: string;
        required: boolean;
        placeholder?: string;
        options?: string[];
    }[];
    salesOptimizationConfig: {
        enabled: boolean;
        autoOfferDelay: number;
        discountCode: string;
        discountAmount: number;
        discountType: "percent" | "amount";
        enableStockAlerts: boolean;
        enableCartRecovery: boolean;
        enableProductComparison: boolean;
        alertThreshold?: number;
        // New fields used in page.tsx
        discountCodes?: boolean;
        discountCodeConfig?: {
            autoOffer: boolean;
            offerAfterSeconds: number;
            codes: Array<{
                code: string;
                discount: number;
                type: "percent" | "amount";
                usageType?: "auto" | "code_only";
            }>;
        };
    };
    launcherIcon: "message" | "library" | "custom";
    // Error Handling
    errorMessage?: string;
    offlineMessage?: string;
    launcherIconUrl: string;
    launcherLibraryIcon: string;
    // Mobile Settings
    mobileBottomSpacing: number;
    mobileSideSpacing: number;
    mobileLauncherAnimation: string;
    interactionMode?: "launcher" | "always_open";
    chatDisplayMode?: "classic" | "ambient";
    position?: "bottom-right" | "bottom-left" | "bottom-center";
    ambientMaxHeight?: number;
    ambientOverlayOpacity?: number;
    ambientWidth?: number;
    ambientSideMargin?: number;
    ambientBottomMargin?: number;
    ambientInputSize?: "sm" | "md" | "lg" | "xl";
    showAmbientIcon?: boolean;
    ambientIconUrl?: string;
    ambientIconType?: "library" | "custom";
    ambientLibraryIcon?: string;
    ambientIconColor?: string;
    ambientBorderColorIdle?: string;
    ambientBorderColorFocused?: string;
    ambientClosedBgColor?: string;
    ambientClosedBorderColorIdle?: string;
    ambientClosedBorderColorFocused?: string;
    ambientAiBubbleColor?: string;
    widgetLoaderStyle?: 'skeleton' | 'spinner' | 'pulsing-icon';
    enableContextAwareness?: boolean;
}
