import { useState, useEffect } from "react"
import { doc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { IndustryType } from "@/lib/industry-config"
import { useAuth } from "@/context/AuthContext"

export interface WidgetSettings {
    // Branding settings
    companyName: string
    welcomeTitle: string
    welcomeMessage: string
    brandColor: string
    brandLogo: string
    headerLogo: string
    headerLogoWidth: number
    headerLogoHeight: number
    headerBackgroundColor: string
    headerTextColor: string
    suggestedQuestions: string[]
    enableLeadCollection: boolean
    enableVoiceAssistant: boolean
    enablePersonalShopper: boolean
    initialLanguage: string
    industry: IndustryType
    enableIndustryGreeting: boolean
    customPrompts: string
    // Theme
    theme: "classic" | "modern"
    // Widget settings
    position: string
    viewMode: string
    modalSize: string
    launcherStyle: string
    launcherCollapse: boolean
    launcherText: string
    launcherRadius: number
    launcherHeight: number
    launcherWidth: number
    fullImageLauncherWidth: number
    fullImageLauncherHeight: number
    launcherIcon: string
    launcherIconUrl: string
    launcherLibraryIcon: string
    launcherIconColor: string
    launcherBackgroundColor: string
    bottomSpacing: number
    sideSpacing: number
    launcherShadow: string
    launcherAnimation: string
    // Mobile Settings
    mobileBottomSpacing: number
    mobileSideSpacing: number
    mobileLauncherAnimation: string
    // Full Image / Lottie Mode
    launcherType: "standard" | "fullImage"
    launcherImageMode: "image" | "lottie"
    launcherFullImageUrl: string
    launcherLottieUrl: string
    launcherHoverEffect: "scale" | "opacity" | "none"
    // Triggers
    autoOpenDelay: number
    openOnExitIntent: boolean
    openOnScroll: number
    // Availability
    enableBusinessHours: boolean
    timezone: string
    businessHoursStart: string
    businessHoursEnd: string
    offlineMessage: string
}

const defaultSettings: WidgetSettings = {
    companyName: "Acme Corp",
    welcomeTitle: "",
    welcomeMessage: "Merhaba! Bugün size nasıl yardımcı olabilirim?",
    brandColor: "#000000",
    brandLogo: "",
    headerLogo: "",
    headerLogoWidth: 32,
    headerLogoHeight: 32,
    headerBackgroundColor: "",
    headerTextColor: "#FFFFFF",
    suggestedQuestions: ["Fiyatlandırma planlarınız neler?", "Nasıl başlayabilirim?", "Destek ile iletişime geç"],
    enableLeadCollection: false,
    enableVoiceAssistant: false,
    enablePersonalShopper: false,
    initialLanguage: "auto",
    industry: "ecommerce" as IndustryType,
    enableIndustryGreeting: false,
    customPrompts: "",
    theme: "classic",
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
    launcherIcon: "library",
    launcherIconUrl: "",
    launcherLibraryIcon: "MessageSquare",
    launcherIconColor: "#FFFFFF",
    launcherBackgroundColor: "",
    bottomSpacing: 20,
    sideSpacing: 20,
    launcherShadow: "medium",
    launcherAnimation: "none",
    mobileBottomSpacing: 20,
    mobileSideSpacing: 20,
    mobileLauncherAnimation: "none",
    launcherType: "standard",
    launcherImageMode: "image",
    launcherFullImageUrl: "",
    launcherLottieUrl: "",
    launcherHoverEffect: "scale",
    autoOpenDelay: 0,
    openOnExitIntent: false,
    openOnScroll: 0,
    enableBusinessHours: false,
    timezone: "UTC",
    businessHoursStart: "09:00",
    businessHoursEnd: "17:00",
    offlineMessage: "Şu anda çevrimdışıyız.",
}

export function useWidgetSettings(userId?: string) {
    const { user } = useAuth()
    const effectiveUserId = userId || user?.uid
    const [settings, setSettings] = useState<WidgetSettings>(defaultSettings)
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (!effectiveUserId) return

        setIsLoading(true)
        const chatbotDocRef = doc(db, "chatbots", effectiveUserId)

        const unsubscribe = onSnapshot(chatbotDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data()

                setSettings(prev => ({
                    ...prev,
                    companyName: data.companyName || prev.companyName,
                    welcomeTitle: data.welcomeTitle || prev.welcomeTitle,
                    welcomeMessage: data.welcomeMessage || prev.welcomeMessage,
                    brandColor: data.brandColor || prev.brandColor,
                    brandLogo: data.brandLogo || prev.brandLogo,
                    headerLogo: data.headerLogo || prev.headerLogo,
                    headerLogoWidth: data.headerLogoWidth || prev.headerLogoWidth,
                    headerLogoHeight: data.headerLogoHeight || prev.headerLogoHeight,
                    headerBackgroundColor: data.headerBackgroundColor || prev.headerBackgroundColor,
                    headerTextColor: data.headerTextColor || prev.headerTextColor,
                    suggestedQuestions: data.suggestedQuestions || prev.suggestedQuestions,
                    enableLeadCollection: data.enableLeadCollection !== undefined ? data.enableLeadCollection : prev.enableLeadCollection,
                    enableVoiceAssistant: data.enableVoiceAssistant !== undefined ? data.enableVoiceAssistant : prev.enableVoiceAssistant,
                    enablePersonalShopper: data.enablePersonalShopper !== undefined ? data.enablePersonalShopper : prev.enablePersonalShopper,
                    initialLanguage: data.initialLanguage || prev.initialLanguage,
                    enableIndustryGreeting: data.enableIndustryGreeting !== undefined ? data.enableIndustryGreeting : prev.enableIndustryGreeting,
                    industry: data.industry || prev.industry,
                    customPrompts: data.customPrompts || prev.customPrompts,
                    theme: data.theme || prev.theme,
                    position: data.position || prev.position,
                    viewMode: data.viewMode || prev.viewMode,
                    modalSize: data.modalSize || prev.modalSize,
                    launcherStyle: data.launcherStyle || prev.launcherStyle,
                    launcherCollapse: data.launcherCollapse !== undefined ? data.launcherCollapse : prev.launcherCollapse,
                    launcherText: data.launcherText || prev.launcherText,
                    launcherRadius: data.launcherRadius !== undefined ? data.launcherRadius : prev.launcherRadius,
                    launcherHeight: data.launcherHeight || prev.launcherHeight,
                    launcherWidth: data.launcherWidth || prev.launcherWidth,
                    fullImageLauncherWidth: data.fullImageLauncherWidth || prev.fullImageLauncherWidth,
                    fullImageLauncherHeight: data.fullImageLauncherHeight || prev.fullImageLauncherHeight,
                    launcherIcon: data.launcherIcon || prev.launcherIcon,
                    launcherIconUrl: data.launcherIconUrl || prev.launcherIconUrl,
                    launcherLibraryIcon: data.launcherLibraryIcon || prev.launcherLibraryIcon,
                    launcherIconColor: data.launcherIconColor || prev.launcherIconColor,
                    launcherBackgroundColor: data.launcherBackgroundColor || prev.launcherBackgroundColor,
                    bottomSpacing: data.bottomSpacing !== undefined ? data.bottomSpacing : prev.bottomSpacing,
                    sideSpacing: data.sideSpacing !== undefined ? data.sideSpacing : prev.sideSpacing,
                    launcherShadow: data.launcherShadow || prev.launcherShadow,
                    launcherAnimation: data.launcherAnimation || prev.launcherAnimation,
                    mobileBottomSpacing: data.mobileBottomSpacing !== undefined ? data.mobileBottomSpacing : prev.mobileBottomSpacing,
                    mobileSideSpacing: data.mobileSideSpacing !== undefined ? data.mobileSideSpacing : prev.mobileSideSpacing,
                    mobileLauncherAnimation: data.mobileLauncherAnimation || prev.mobileLauncherAnimation,
                    launcherType: data.launcherType || prev.launcherType,
                    launcherImageMode: data.launcherImageMode || prev.launcherImageMode,
                    launcherFullImageUrl: data.launcherFullImageUrl || prev.launcherFullImageUrl,
                    launcherLottieUrl: data.launcherLottieUrl || prev.launcherLottieUrl,
                    launcherHoverEffect: data.launcherHoverEffect || prev.launcherHoverEffect,
                    autoOpenDelay: data.autoOpenDelay !== undefined ? data.autoOpenDelay : prev.autoOpenDelay,
                    openOnExitIntent: data.openOnExitIntent !== undefined ? data.openOnExitIntent : prev.openOnExitIntent,
                    openOnScroll: data.openOnScroll !== undefined ? data.openOnScroll : prev.openOnScroll,
                    enableBusinessHours: data.enableBusinessHours !== undefined ? data.enableBusinessHours : prev.enableBusinessHours,
                    timezone: data.timezone || prev.timezone,
                    businessHoursStart: data.businessHoursStart || prev.businessHoursStart,
                    businessHoursEnd: data.businessHoursEnd || prev.businessHoursEnd,
                    offlineMessage: data.offlineMessage || prev.offlineMessage,
                }))
            } else {
                console.log("No chatbot settings found, using defaults")
            }
            setIsLoading(false)
        }, (error) => {
            console.error("Error listening to settings:", error)
            setIsLoading(false)
        })

        return () => unsubscribe()
    }, [effectiveUserId])

    const saveSettings = async () => {
        if (!effectiveUserId || !user) return

        setIsSaving(true)
        try {
            const token = await user.getIdToken()
            if (!token) throw new Error('Not authenticated')

            const response = await fetch('/api/widget-settings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...settings,
                    chatbotId: effectiveUserId
                })
            })

            if (!response.ok) {
                throw new Error('Failed to save settings')
            }

            return true
        } catch (error) {
            console.error("Error saving settings:", error)
            throw error
        } finally {
            setIsSaving(false)
        }
    }

    return {
        settings,
        setSettings,
        isLoading,
        isSaving,
        saveSettings,
    }
}
