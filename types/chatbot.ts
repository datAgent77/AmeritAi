export interface ChatbotSettings {
    companyName: string;
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
    enableUiUxAuditor: boolean;
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
    launcherIconUrl: string;
    launcherLibraryIcon: string;
}
