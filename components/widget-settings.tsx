"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, MessageSquare, Save, Globe, Trash2, Send, Bot, LogOut, Sparkles, X, Palette, Eye, Settings2, Clock } from "lucide-react"
import { Image as ImageIcon } from "lucide-react"
import { icons } from "lucide-react"
import * as LucideIcons from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore"
import { db, storage } from "@/lib/firebase"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { INDUSTRY_CONFIG, IndustryType } from "@/lib/industry-config"
import Lottie from "lottie-react"

interface EngagementMessage {
    text: string;
    delay: number; // Seconds
    isActive: boolean;
}


interface WidgetSettingsProps {
    userId?: string
}

export default function WidgetSettings({ userId: propUserId }: WidgetSettingsProps) {
    const { user } = useAuth()
    const userId = propUserId || user?.uid
    const { toast } = useToast()
    const { t, language } = useLanguage()
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    // Combined settings state (branding + widget)
    const [settings, setSettings] = useState({
        // Branding settings
        companyName: "Acme Corp",
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
        customPrompts: "", // Custom additional prompts for the chatbot
        // Theme
        theme: "classic" as "classic" | "modern",
        // Widget settings
        position: "bottom-right",
        viewMode: "classic",
        modalSize: "half",
        launcherStyle: "circle",
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
        // Full Image / Lottie Mode
        launcherType: "standard" as "standard" | "fullImage",
        launcherImageMode: "image" as "image" | "lottie",
        launcherFullImageUrl: "",
        launcherLottieUrl: "",
        launcherHoverEffect: "scale" as "scale" | "opacity" | "none",
        // Triggers
        autoOpenDelay: 0,
        openOnExitIntent: false,
        openOnScroll: 0,
        // Engagement (Proactive Bubbles)
        engagement: {
            enabled: false,
            triggers: {
                timeOnPage: null as number | null,
                scrollDepth: null as number | null,
                exitIntent: false,
                pageRevisit: null as number | null,
                inactivity: null as number | null,
            },
            bubble: {
                messages: [
                    { text: "Yardıma ihtiyacınız var mı? 👋", delay: 0, isActive: true },
                    { text: "Size özel tekliflerimizi gördünüz mü?", delay: 5, isActive: true }
                ] as EngagementMessage[],
                position: "top" as "top" | "left" | "right",
                style: {
                    backgroundColor: "#000000",
                    textColor: "#FFFFFF",
                    borderRadius: 12,
                    shadow: "medium" as "none" | "small" | "medium" | "large"
                },
                animation: "bounce" as "bounce" | "pulse" | "shake" | "none",
                autoDismiss: true,
                autoDismissDelay: 10,
                showCloseButton: true,
                maxShowCount: 3
            }
        },

        // Availability
        enableBusinessHours: false,
        timezone: "UTC",
        businessHoursStart: "09:00",
        businessHoursEnd: "17:00",
        offlineMessage: "Şu anda çevrimdışıyız.",
    })

    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile')
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [activeTab, setActiveTab] = useState("branding")
    const [lottieData, setLottieData] = useState<any>(null)

    // Sync active tab with URL parameter
    useEffect(() => {
        const tabParam = searchParams.get('tab')
        if (tabParam && ['branding', 'appearance', 'behavior', 'engagement', 'availability'].includes(tabParam)) {
            setActiveTab(tabParam)
        }
    }, [searchParams])

    // Fetch Lottie animation data for preview
    useEffect(() => {
        if (settings.launcherLottieUrl && settings.launcherLottieUrl.trim()) {
            fetch(settings.launcherLottieUrl)
                .then(res => res.json())
                .then(data => setLottieData(data))
                .catch(err => {
                    console.error('Failed to load Lottie:', err)
                    setLottieData(null)
                })
        } else {
            setLottieData(null)
        }
    }, [settings.launcherLottieUrl])

    const handleTabChange = (value: string) => {
        setActiveTab(value)
        const params = new URLSearchParams(searchParams)
        params.set('tab', value)
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }

    useEffect(() => {
        if (!userId) return

        setIsLoading(true)
        const chatbotDocRef = doc(db, "chatbots", userId)

        const unsubscribe = onSnapshot(chatbotDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data()

                // Update state with real-time data
                setSettings(prev => {
                    // Only update if data actually changed to avoid unnecessary re-renders or overwriting user input too aggressively
                    // For now, we'll do a shallow merge of the fields we care about ensuring are synced

                    return {
                        ...prev,
                        // Branding
                        companyName: data.companyName || prev.companyName,
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
                        industry: data.industry || prev.industry, // CRITICAL: This ensures sector sync works
                        customPrompts: data.customPrompts || prev.customPrompts,
                        // Theme
                        theme: data.theme || prev.theme,
                        // Widget
                        position: data.position || prev.position,
                        viewMode: data.viewMode || prev.viewMode,
                        modalSize: data.modalSize || prev.modalSize,
                        launcherStyle: data.launcherStyle || prev.launcherStyle,
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
                        // Full Image / Lottie Mode
                        launcherType: data.launcherType || prev.launcherType,
                        launcherImageMode: data.launcherImageMode || prev.launcherImageMode,
                        launcherFullImageUrl: data.launcherFullImageUrl || prev.launcherFullImageUrl,
                        launcherLottieUrl: data.launcherLottieUrl || prev.launcherLottieUrl,
                        launcherHoverEffect: data.launcherHoverEffect || prev.launcherHoverEffect,
                        // Triggers
                        autoOpenDelay: data.autoOpenDelay !== undefined ? data.autoOpenDelay : prev.autoOpenDelay,
                        openOnExitIntent: data.openOnExitIntent !== undefined ? data.openOnExitIntent : prev.openOnExitIntent,
                        openOnScroll: data.openOnScroll !== undefined ? data.openOnScroll : prev.openOnScroll,
                        // Engagement
                        engagement: data.engagement || prev.engagement,
                        // Availability
                        enableBusinessHours: data.enableBusinessHours !== undefined ? data.enableBusinessHours : prev.enableBusinessHours,
                        timezone: data.timezone || prev.timezone,
                        businessHoursStart: data.businessHoursStart || prev.businessHoursStart,
                        businessHoursEnd: data.businessHoursEnd || prev.businessHoursEnd,
                        offlineMessage: data.offlineMessage || prev.offlineMessage,
                    }
                })

                // Set correct launcher icon mode if explicit
                /* 
                   Note: The original logic had setSettings calls here which would cause loops or overridden by the main setSettings above.
                   Since we merged above, it should be fine.
                */

            } else {
                console.log("No chatbot settings found, using defaults")
            }
            setIsLoading(false)
        }, (error) => {
            console.error("Error listening to settings:", error)
            setIsLoading(false)
        })

        return () => unsubscribe()
    }, [userId])

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !userId) return

        if (file.size > 2 * 1024 * 1024) {
            toast({
                title: "Error",
                description: "File size exceeds 2MB limit.",
                variant: "destructive",
            })
            return
        }

        setIsUploading(true)
        try {
            // Use server-side upload to bypass client-side rules
            const timestamp = Date.now()
            const path = `users/${userId}/logos/${timestamp}-${file.name}` // We can use userId here safely via admin sdk

            const formData = new FormData()
            formData.append('file', file)
            formData.append('path', path)

            const token = await user?.getIdToken()
            if (!token) throw new Error('Not authenticated')
            const response = await fetch('/api/upload/image', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Upload failed')
            }

            const data = await response.json()
            setSettings(prev => ({ ...prev, brandLogo: data.url }))
            toast({
                title: "Success",
                description: "Logo uploaded successfully.",
            })
        } catch (error: any) {
            toast({
                title: "Error",
                description: `Failed to upload logo: ${error.message}`,
                variant: "destructive",
            })
        } finally {
            setIsUploading(false)
        }
    }

    const handleHeaderLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !userId) return

        if (file.size > 2 * 1024 * 1024) {
            toast({
                title: "Error",
                description: "File size exceeds 2MB limit.",
                variant: "destructive",
            })
            return
        }

        setIsUploading(true)
        try {
            const timestamp = Date.now()
            const path = `users/${userId}/header_logos/${timestamp}-${file.name}`

            const formData = new FormData()
            formData.append('file', file)
            formData.append('path', path)

            const token = await user?.getIdToken()
            if (!token) throw new Error('Not authenticated')
            const response = await fetch('/api/upload/image', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Upload failed')
            }

            const data = await response.json()
            setSettings(prev => ({ ...prev, headerLogo: data.url }))
            toast({
                title: "Success",
                description: "Header logo uploaded successfully.",
            })
        } catch (error: any) {
            toast({
                title: "Error",
                description: `Failed to upload header logo: ${error.message}`,
                variant: "destructive",
            })
        } finally {
            setIsUploading(false)
        }
    }

    const handleLauncherIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !userId) return

        if (file.size > 2 * 1024 * 1024) {
            toast({
                title: "Error",
                description: "File size exceeds 2MB limit.",
                variant: "destructive",
            })
            return
        }

        setIsUploading(true)
        try {
            const timestamp = Date.now()
            const path = `users/${userId}/launcher_icons/${timestamp}-${file.name}`

            const formData = new FormData()
            formData.append('file', file)
            formData.append('path', path)

            const token = await user?.getIdToken()
            if (!token) throw new Error('Not authenticated')
            const response = await fetch('/api/upload/image', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Upload failed')
            }

            const data = await response.json()
            setSettings(prev => ({ ...prev, launcherIcon: "custom", launcherIconUrl: data.url }))
            toast({
                title: "Success",
                description: "Icon uploaded successfully.",
            })
        } catch (error: any) {
            toast({
                title: "Error",
                description: `Failed to upload icon: ${error.message}`,
                variant: "destructive",
            })
        } finally {
            setIsUploading(false)
        }
    }

    const handleSave = async () => {
        if (!userId) return
        setIsSaving(true)
        try {
            const token = await user?.getIdToken()
            if (!token) throw new Error('Not authenticated')

            const response = await fetch('/api/widget-settings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...settings,
                    chatbotId: userId
                })
            })

            if (!response.ok) {
                throw new Error('Failed to save settings')
            }

            toast({
                title: "Success",
                description: "Settings saved successfully.",
            })
        } catch (error) {
            console.error("Error saving settings:", error)
            toast({
                title: "Error",
                description: "Failed to save settings.",
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    const addSuggestedQuestion = () => {
        if (settings.suggestedQuestions.length >= 4) {
            toast({
                title: "Limit Reached",
                description: "You can add up to 4 suggested questions.",
                variant: "destructive",
            })
            return
        }
        setSettings(prev => ({
            ...prev,
            suggestedQuestions: [...prev.suggestedQuestions, ""]
        }))
    }

    const updateSuggestedQuestion = (index: number, value: string) => {
        const newQuestions = [...settings.suggestedQuestions]
        newQuestions[index] = value
        setSettings(prev => ({ ...prev, suggestedQuestions: newQuestions }))
    }

    const removeSuggestedQuestion = (index: number) => {
        const newQuestions = settings.suggestedQuestions.filter((_, i) => i !== index)
        setSettings(prev => ({ ...prev, suggestedQuestions: newQuestions }))
    }

    // Engagement Message Helpers
    const addEngagementMessage = () => {
        if (settings.engagement.bubble.messages.length >= 5) {
            toast({
                title: "Limit Reached",
                description: "You can add up to 5 bubble messages.",
                variant: "destructive",
            })
            return
        }
        setSettings(prev => ({
            ...prev,
            engagement: {
                ...prev.engagement,
                bubble: {
                    ...prev.engagement.bubble,
                    messages: [...prev.engagement.bubble.messages, { text: "", delay: 0, isActive: true }]
                }
            }
        }))
    }


    const updateEngagementMessage = (index: number, field: keyof EngagementMessage, value: any) => {
        const newMessages = [...settings.engagement.bubble.messages]
        newMessages[index] = { ...newMessages[index], [field]: value }
        setSettings(prev => ({
            ...prev,
            engagement: {
                ...prev.engagement,
                bubble: {
                    ...prev.engagement.bubble,
                    messages: newMessages
                }
            }
        }))
    }


    const removeEngagementMessage = (index: number) => {
        const newMessages = settings.engagement.bubble.messages.filter((_, i) => i !== index)
        setSettings(prev => ({
            ...prev,
            engagement: {
                ...prev.engagement,
                bubble: {
                    ...prev.engagement.bubble,
                    messages: newMessages
                }
            }
        }))
    }

    const renderIcon = (iconName: string, className?: string) => {
        const IconComponent = (icons as any)[iconName] || (LucideIcons as any)[iconName]
        const finalClass = (className || "") + " flex-shrink-0"
        return IconComponent ? <IconComponent className={finalClass} /> : <MessageSquare className={finalClass} />
    }

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }


    const getHeaderInfo = (tab: string) => {
        switch (tab) {
            case 'branding':
                return { title: t('brandingTitle'), desc: t('brandingDesc') }
            case 'appearance':
                return { title: t('appearanceTitle'), desc: t('appearanceDesc') }
            case 'behavior':
                return { title: t('behaviorTitle'), desc: t('behaviorDesc') }
            case 'engagement':
                return { title: t('engagementTitle'), desc: t('engagementDesc') }
            case 'availability':
                return { title: t('availabilityTitle'), desc: t('availabilityDesc') }
            default:
                return { title: t('chatbotConfiguration'), desc: t('configureChatbotDesc') }
        }
    }

    const { title: headerTitle, desc: headerDesc } = getHeaderInfo(activeTab)

    // Sidebar menu items
    const menuItems = [
        { id: 'branding', label: t('branding') || 'Marka Ayarları', icon: <Palette className="w-4 h-4" /> },
        { id: 'appearance', label: t('appearance') || 'Görünüm', icon: <Eye className="w-4 h-4" /> },
        { id: 'behavior', label: t('behaviorTitle') || 'Davranış', icon: <Settings2 className="w-4 h-4" /> },
        { id: 'engagement', label: t('engagementTitle') || 'Etkileşim', icon: <MessageSquare className="w-4 h-4" /> },
        { id: 'availability', label: t('availabilityTitle') || 'Müsaitlik', icon: <Clock className="w-4 h-4" /> },
    ]

    return (
        <div className="flex h-full bg-white">
            {/* Sidebar Menu */}
            <div className="w-56 border-r bg-muted/30 p-4 flex-shrink-0">
                <h2 className="font-semibold mb-4 px-2">{t('widgetSettings')}</h2>
                <nav className="space-y-1">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleTabChange(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${activeTab === item.id
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                        >
                            <span>{item.icon}</span>
                            <span className="truncate overflow-hidden text-ellipsis whitespace-nowrap">{item.label}</span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 flex-col lg:flex-row gap-6 py-6 px-6 bg-white overflow-auto">
                {/* Settings Panel */}
                <div className="flex-1 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold tracking-tight">{headerTitle}</h3>
                            <p className="text-sm text-muted-foreground">{headerDesc}</p>
                        </div>
                        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {t('save')}
                        </Button>
                    </div>

                    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">


                        {/* Branding Tab */}
                        <TabsContent value="branding" className="space-y-8 mt-6">
                            <div className="space-y-6">
                                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('branding')}</h4>
                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="company-name">{t('companyName')}</Label>
                                        <Input
                                            id="company-name"
                                            placeholder="Enter your company name"
                                            value={settings.companyName}
                                            onChange={(e) => setSettings(prev => ({ ...prev, companyName: e.target.value }))}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="welcome-message">{t('welcomeMessage')}</Label>
                                        <Textarea
                                            id="welcome-message"
                                            placeholder="Enter the first message the user sees..."
                                            value={settings.welcomeMessage}
                                            onChange={(e) => setSettings(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                                            className="resize-none min-h-[100px]"
                                        />
                                    </div>
                                </div>
                            </div>


                            <div className="space-y-6">
                                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('suggestedQuestions')}</h4>
                                <div className="space-y-4">
                                    {settings.suggestedQuestions.map((question, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <Input
                                                value={question}
                                                onChange={(e) => updateSuggestedQuestion(index, e.target.value)}
                                                placeholder={`Question ${index + 1}`}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeSuggestedQuestion(index)}
                                                className="shrink-0"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {settings.suggestedQuestions.length < 4 && (
                                        <Button variant="outline" size="sm" onClick={addSuggestedQuestion}>
                                            + {t('addQuestion')}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        {/* Appearance Tab (Consolidated Display & Launcher) */}
                        <TabsContent value="appearance" className="space-y-8 mt-6">

                            {/* Position & View */}
                            <div className="space-y-6">
                                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('positionLayout')}</h4>
                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label>{t('widgetPosition')}</Label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['bottom-left', 'bottom-center', 'bottom-right'].map((pos) => (
                                                <Button
                                                    key={pos}
                                                    variant={settings.position === pos ? "secondary" : "outline"}
                                                    onClick={() => setSettings(prev => ({ ...prev, position: pos }))}
                                                    className="w-full justify-center text-xs"
                                                >
                                                    {pos === 'bottom-left' && t('bottomLeft')}
                                                    {pos === 'bottom-center' && t('bottomCenter')}
                                                    {pos === 'bottom-right' && t('bottomRight')}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    {settings.theme === 'classic' && (
                                        <div className="grid gap-2">
                                            <Label>{t('viewMode')}</Label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button
                                                    variant={settings.viewMode === "classic" ? "secondary" : "outline"}
                                                    onClick={() => setSettings(prev => ({ ...prev, viewMode: "classic" }))}
                                                >
                                                    {t('classicSmall')}
                                                </Button>
                                                <Button
                                                    variant={settings.viewMode === "wide" ? "secondary" : "outline"}
                                                    onClick={() => setSettings(prev => ({ ...prev, viewMode: "wide" }))}
                                                >
                                                    {t('wideModal')}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Header Customization */}
                            <div className="space-y-6">
                                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('headerCustomization') || 'Header Özelleştirme'}</h4>
                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label>{t('headerLogo') || 'Header Logo'}</Label>
                                        <div className="flex items-center gap-4">
                                            <div className="relative w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden group">
                                                {isUploading ? (
                                                    <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                                                ) : settings.headerLogo ? (
                                                    <Image src={settings.headerLogo} alt="Header Logo" fill className="object-cover" unoptimized />
                                                ) : (
                                                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleHeaderLogoUpload}
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    disabled={isUploading}
                                                />
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                <p>{t('headerLogoDesc') || 'Widget başlığındaki marka logosunu değiştirir.'}</p>
                                                <p>{t('recommendedSize')}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>{t('logoWidth') || 'Logo Genişliği'} (px)</Label>
                                            <Input
                                                type="number"
                                                value={settings.headerLogoWidth}
                                                onChange={(e) => setSettings(prev => ({ ...prev, headerLogoWidth: Number(e.target.value) }))}
                                                min={20}
                                                max={200}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>{t('logoHeight') || 'Logo Yüksekliği'} (px)</Label>
                                            <Input
                                                type="number"
                                                value={settings.headerLogoHeight}
                                                onChange={(e) => setSettings(prev => ({ ...prev, headerLogoHeight: Number(e.target.value) }))}
                                                min={20}
                                                max={200}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>{t('headerBackgroundColor') || 'Header Arkaplan Rengi'}</Label>
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="h-10 w-10 rounded-full border shadow-sm"
                                                    style={{ backgroundColor: settings.headerBackgroundColor || settings.brandColor }}
                                                />
                                                <Input
                                                    type="color"
                                                    value={settings.headerBackgroundColor || settings.brandColor}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, headerBackgroundColor: e.target.value, brandColor: e.target.value }))}
                                                    className="w-14 h-10 p-1 cursor-pointer"
                                                />
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">{t('defaultsToBrandColor') || 'Marka rengini de belirler'}</p>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label>{t('headerTextColor') || 'Header Yazı Rengi'}</Label>
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="h-10 w-10 rounded-full border shadow-sm"
                                                    style={{ backgroundColor: settings.headerTextColor }}
                                                />
                                                <Input
                                                    type="color"
                                                    value={settings.headerTextColor}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, headerTextColor: e.target.value }))}
                                                    className="w-14 h-10 p-1 cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Launcher Settings */}
                            <div className="space-y-6">
                                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('launcherAppearance')}</h4>

                                {/* Launcher Type Selection */}
                                <div className="grid gap-2">
                                    <Label>{t('launcherType') || 'Launcher Type'}</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            variant={settings.launcherType === "standard" ? "secondary" : "outline"}
                                            onClick={() => setSettings(prev => ({ ...prev, launcherType: "standard" }))}
                                        >
                                            {t('standard') || 'Standard'}
                                        </Button>
                                        <Button
                                            variant={settings.launcherType === "fullImage" ? "secondary" : "outline"}
                                            onClick={() => setSettings(prev => ({ ...prev, launcherType: "fullImage" }))}
                                        >
                                            {t('fullImage') || 'Full Image'}
                                        </Button>
                                    </div>
                                </div>

                                {/* Full Image Mode */}
                                {settings.launcherType === "fullImage" && (
                                    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                                        <div className="grid gap-2">
                                            <Label>{t('imageSource') || 'Image Source'}</Label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button size="sm" variant={settings.launcherImageMode === "image" ? "secondary" : "outline"} onClick={() => setSettings(prev => ({ ...prev, launcherImageMode: "image" }))}>PNG/JPG</Button>
                                                <Button size="sm" variant={settings.launcherImageMode === "lottie" ? "secondary" : "outline"} onClick={() => setSettings(prev => ({ ...prev, launcherImageMode: "lottie" }))}>Lottie</Button>
                                            </div>
                                        </div>
                                        {settings.launcherImageMode === "image" ? (
                                            <div className="grid gap-2">
                                                <Label>{t('uploadImage') || 'Upload Image'}</Label>
                                                <div className="flex items-center gap-4">
                                                    <div className="relative w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden">
                                                        {settings.launcherFullImageUrl ? (<Image src={settings.launcherFullImageUrl} alt="Launcher" fill className="object-contain" unoptimized />) : (<ImageIcon className="w-6 h-6 text-muted-foreground" />)}
                                                        <input type="file" accept="image/*" onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file || !user) return;
                                                            try {
                                                                const timestamp = Date.now();
                                                                const path = `users/${userId}/launcher_full/${timestamp}-${file.name}`;
                                                                const formData = new FormData();
                                                                formData.append('file', file);
                                                                formData.append('path', path);
                                                                const token = await user?.getIdToken()
                                                                if (!token) throw new Error('Not authenticated');
                                                                const response = await fetch('/api/upload/image', {
                                                                    method: 'POST',
                                                                    headers: { 'Authorization': `Bearer ${token}` },
                                                                    body: formData
                                                                });
                                                                if (!response.ok) throw new Error('Upload failed');
                                                                const data = await response.json();
                                                                setSettings(prev => ({ ...prev, launcherFullImageUrl: data.url }));
                                                            } catch (err) { console.error('Upload error:', err); }
                                                        }} className="absolute inset-0 opacity-0 cursor-pointer" />
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">PNG, JPG, GIF</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid gap-3">
                                                <Label>{t('lottieAnimation') || 'Lottie Animation'}</Label>
                                                <Input
                                                    placeholder="https://lottie.host/... veya https://assets.lottiefiles.com/..."
                                                    value={settings.launcherLottieUrl}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, launcherLottieUrl: e.target.value }))}
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    <a href="https://lottiefiles.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">LottieFiles.com</a>&apos;dan JSON URL yapıştırın
                                                </p>
                                                {settings.launcherLottieUrl && settings.launcherLottieUrl.trim() !== '' && (
                                                    <Button size="sm" variant="outline" className="w-fit" onClick={() => setSettings(prev => ({ ...prev, launcherLottieUrl: '' }))}>
                                                        {t('remove') || 'Kaldır'}
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label>{t('width') || 'Width'} (px)</Label>
                                                <Input type="number" value={settings.launcherWidth} onChange={(e) => setSettings(prev => ({ ...prev, launcherWidth: parseInt(e.target.value) || 60 }))} />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>{t('height') || 'Height'} (px)</Label>
                                                <Input type="number" value={settings.launcherHeight} onChange={(e) => setSettings(prev => ({ ...prev, launcherHeight: parseInt(e.target.value) || 60 }))} />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>{t('hoverEffect') || 'Hover Effect'}</Label>
                                            <div className="grid grid-cols-3 gap-2">
                                                <Button size="sm" variant={settings.launcherHoverEffect === "scale" ? "secondary" : "outline"} onClick={() => setSettings(prev => ({ ...prev, launcherHoverEffect: "scale" }))}>{t('scale') || 'Scale'}</Button>
                                                <Button size="sm" variant={settings.launcherHoverEffect === "opacity" ? "secondary" : "outline"} onClick={() => setSettings(prev => ({ ...prev, launcherHoverEffect: "opacity" }))}>{t('opacity') || 'Opacity'}</Button>
                                                <Button size="sm" variant={settings.launcherHoverEffect === "none" ? "secondary" : "outline"} onClick={() => setSettings(prev => ({ ...prev, launcherHoverEffect: "none" }))}>{t('none') || 'None'}</Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Standard Mode Settings */}
                                {settings.launcherType === "standard" && (<div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label>{t('launcherStyle')}</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                variant={settings.launcherStyle === "circle" ? "secondary" : "outline"}
                                                onClick={() => setSettings(prev => ({ ...prev, launcherStyle: "circle", launcherRadius: 50, launcherWidth: 60, launcherHeight: 60 }))}
                                            >
                                                {t('circleIcon')}
                                            </Button>
                                            <Button
                                                variant={settings.launcherStyle === "square" ? "secondary" : "outline"}
                                                onClick={() => setSettings(prev => ({ ...prev, launcherStyle: "square", launcherRadius: 12, launcherWidth: 60, launcherHeight: 60 }))}
                                            >
                                                {t('squareIcon')}
                                            </Button>
                                            <Button
                                                variant={settings.launcherStyle === "text" ? "secondary" : "outline"}
                                                onClick={() => setSettings(prev => ({ ...prev, launcherStyle: "text", launcherRadius: 30, launcherWidth: 100, launcherHeight: 50 }))}
                                            >
                                                {t('textOnly')}
                                            </Button>
                                            <Button
                                                variant={settings.launcherStyle === "icon_text" ? "secondary" : "outline"}
                                                onClick={() => setSettings(prev => ({ ...prev, launcherStyle: "icon_text", launcherRadius: 30, launcherWidth: 140, launcherHeight: 50 }))}
                                            >
                                                {t('iconText')}
                                            </Button>
                                        </div>
                                    </div>

                                    {(settings.launcherStyle === "text" || settings.launcherStyle === "icon_text") && (
                                        <div className="grid gap-2">
                                            <Label>{t('buttonText')}</Label>
                                            <Input
                                                value={settings.launcherText}
                                                onChange={(e) => setSettings(prev => ({ ...prev, launcherText: e.target.value }))}
                                                placeholder="e.g. Chat with us"
                                            />
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label className="text-xs">{t('backgroundColor')}</Label>
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="h-8 w-8 rounded-full border shadow-sm"
                                                    style={{ backgroundColor: settings.launcherBackgroundColor || settings.brandColor }}
                                                />
                                                <Input
                                                    type="color"
                                                    value={settings.launcherBackgroundColor || settings.brandColor}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, launcherBackgroundColor: e.target.value }))}
                                                    className="h-8 w-16 p-0.5 cursor-pointer border-0"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="text-xs">{t('iconColor')}</Label>
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="h-8 w-8 rounded-full border shadow-sm"
                                                    style={{ backgroundColor: settings.launcherIconColor }}
                                                />
                                                <Input
                                                    type="color"
                                                    value={settings.launcherIconColor}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, launcherIconColor: e.target.value }))}
                                                    className="h-8 w-16 p-0.5 cursor-pointer border-0"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>{t('width') || 'Width'} (px)</Label>
                                            <Input type="number" value={settings.fullImageLauncherWidth} onChange={(e) => setSettings(prev => ({ ...prev, fullImageLauncherWidth: parseInt(e.target.value) || 60 }))} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>{t('height') || 'Height'} (px)</Label>
                                            <Input type="number" value={settings.fullImageLauncherHeight} onChange={(e) => setSettings(prev => ({ ...prev, fullImageLauncherHeight: parseInt(e.target.value) || 60 }))} />
                                        </div>
                                    </div>

                                    {(settings.launcherStyle === "circle" || settings.launcherStyle === "square" || settings.launcherStyle === "icon_text") && (
                                        <div className="grid gap-2">
                                            <Label>{t('launcherIcon')}</Label>
                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                <Button
                                                    size="sm"
                                                    variant={settings.launcherIcon === "library" ? "secondary" : "outline"}
                                                    onClick={() => setSettings(prev => ({ ...prev, launcherIcon: "library" }))}
                                                >
                                                    {t('library')}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={settings.launcherIcon === "custom" ? "secondary" : "outline"}
                                                    onClick={() => setSettings(prev => ({ ...prev, launcherIcon: "custom" }))}
                                                >
                                                    {t('custom')}
                                                </Button>
                                            </div>

                                            {settings.launcherIcon === "library" ? (
                                                <div className="space-y-2">
                                                    <Input
                                                        placeholder={t('searchIcons')}
                                                        className="h-8 text-xs"
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                    />
                                                    <div className="border rounded-md p-2 h-32 overflow-y-auto grid grid-cols-6 gap-2">
                                                        {Object.keys(icons)
                                                            .filter(key => {
                                                                if (searchTerm && !key.toLowerCase().includes(searchTerm.toLowerCase())) return false
                                                                return true
                                                            })
                                                            .slice(0, 100)
                                                            .map((iconName) => {
                                                                const Icon = (icons as any)[iconName]
                                                                if (typeof Icon !== 'function' && typeof Icon !== 'object') return null
                                                                return (
                                                                    <button
                                                                        key={iconName}
                                                                        onClick={() => setSettings(prev => ({ ...prev, launcherIcon: "library", launcherLibraryIcon: iconName }))}
                                                                        className={`p-2 rounded hover:bg-muted flex items-center justify-center ${settings.launcherLibraryIcon === iconName ? 'bg-primary/10 text-primary' : ''}`}
                                                                        title={iconName}
                                                                    >
                                                                        <Icon className="w-5 h-5" />
                                                                    </button>
                                                                )
                                                            })}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-4">
                                                    <div className="relative w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden">
                                                        {settings.launcherIconUrl ? (
                                                            <Image src={settings.launcherIconUrl} alt="Icon" fill className="object-cover" unoptimized />
                                                        ) : (
                                                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                                                        )}
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={handleLauncherIconUpload}
                                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                )}
                            </div>

                            {/* Effects & Spacing */}
                            <div className="space-y-6">
                                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('effectsSpacing')}</h4>
                                <div className="grid gap-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label className="text-xs">{t('verticalSpacing')}</Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={settings.bottomSpacing}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, bottomSpacing: parseInt(e.target.value) }))}
                                                    className="flex-1"
                                                />
                                                <span className="text-xs w-8 text-right">{settings.bottomSpacing}</span>
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="text-xs">{t('sideSpacing')}</Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={settings.sideSpacing}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, sideSpacing: parseInt(e.target.value) }))}
                                                    className="flex-1"
                                                />
                                                <span className="text-xs w-8 text-right">{settings.sideSpacing}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>{t('animationLoop') || 'Animasyon Döngüsü'}</Label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['none', 'pulse', 'bounce', 'wiggle', 'float', 'spin'].map((anim) => (
                                                <button
                                                    key={anim}
                                                    onClick={() => setSettings(prev => ({ ...prev, launcherAnimation: anim }))}
                                                    className={`p-2 rounded-md border text-xs capitalize transition-all ${settings.launcherAnimation === anim ? 'border-primary bg-primary/5 font-medium' : 'border-muted hover:bg-muted'}`}
                                                >
                                                    {anim}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>


                        {/* Behavior Tab */}
                        <TabsContent value="behavior" className="space-y-8 mt-6">
                            <div className="space-y-6">
                                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('chatBehavior')}</h4>

                                <div className="grid gap-6">

                                    {/* Industry Settings Group */}
                                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                                        <div className="p-4 space-y-4">
                                            <div className="flex items-center justify-between space-x-2">
                                                <div className="space-y-0.5">
                                                    <Label className="text-base font-medium">{t('enableIndustryGreeting') || "Industry Greeting"}</Label>
                                                    <p className="text-sm text-muted-foreground">
                                                        {t('enableIndustryGreetingDesc') || "Show industry-specific welcome message"}
                                                    </p>
                                                </div>
                                                <Switch
                                                    checked={settings.enableIndustryGreeting ?? false}
                                                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableIndustryGreeting: checked }))}
                                                />
                                            </div>

                                            <div className={`grid gap-2 transition-opacity ${!settings.enableIndustryGreeting ? 'opacity-50' : ''}`}>
                                                <Label>{t('industry')}</Label>
                                                <Select
                                                    disabled={!settings.enableIndustryGreeting}
                                                    value={settings.industry}
                                                    onValueChange={(value) => setSettings(prev => ({ ...prev, industry: value as IndustryType }))}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder={t('selectIndustry')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(INDUSTRY_CONFIG).map(([key, config]) => {
                                                            const translationKey = 'industry' + key.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
                                                            return (
                                                                <SelectItem key={key} value={key}>
                                                                    {t(translationKey) || config.label}
                                                                </SelectItem>
                                                            );
                                                        })}
                                                    </SelectContent>
                                                </Select>
                                                <p className="text-xs text-muted-foreground">{t('industryDesc')}</p>

                                                {/* Industry Behavior Display */}
                                                {settings.enableIndustryGreeting && settings.industry && (
                                                    <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium">{t('chatbotRole') || 'Rol'}:</span>
                                                            <span className="text-sm text-primary font-semibold">
                                                                {INDUSTRY_CONFIG[settings.industry]?.role || 'AI Assistant'}
                                                            </span>
                                                        </div>

                                                        <div>
                                                            <span className="text-sm font-medium">{t('behaviorSummary') || 'Davranış'}:</span>
                                                            <p className="text-sm text-muted-foreground mt-1">
                                                                {(INDUSTRY_CONFIG[settings.industry] as any)?.behaviorSummary?.[language] ||
                                                                    (INDUSTRY_CONFIG[settings.industry]?.systemPrompt?.split('\n').slice(0, 3).join(' ').substring(0, 150) + '...')}
                                                            </p>
                                                        </div>

                                                        <details className="group">
                                                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                                                {t('showFullPrompt') || 'Tam prompt\'u göster'}
                                                            </summary>
                                                            <pre className="mt-2 p-2 bg-background rounded text-xs whitespace-pre-wrap overflow-auto max-h-48 border">
                                                                {INDUSTRY_CONFIG[settings.industry]?.systemPrompt}
                                                            </pre>
                                                        </details>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Custom Prompts */}
                                            <div className="grid gap-2 pt-4 border-t">
                                                <Label>{t('customPrompts') || 'Özel Talimatlar'}</Label>
                                                <textarea
                                                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                    placeholder={t('customPromptsPlaceholder') || 'Chatbot\'a vermek istediğiniz ek talimatları yazın...'}
                                                    value={settings.customPrompts || ''}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, customPrompts: e.target.value }))}
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    {t('customPromptsDesc') || 'Bu talimatlar sektör promptuna ek olarak chatbota verilecektir.'}
                                                </p>
                                                <Button
                                                    onClick={handleSave}
                                                    className="mt-2"
                                                    disabled={isSaving}
                                                >
                                                    {isSaving ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            {t('saving') || 'Kaydediliyor...'}
                                                        </>
                                                    ) : (
                                                        t('applyCustomPrompts') || 'Özel Talimatları Uygula'
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Lead Collection moved to Lead Collection module settings */}

                                    <div className="grid gap-2">
                                        <Label>{t('chatbotLanguage')}</Label>
                                        <Select
                                            value={settings.initialLanguage}
                                            onValueChange={(value) => setSettings(prev => ({ ...prev, initialLanguage: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('selectLanguage')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="auto">{t('langAuto')}</SelectItem>
                                                <SelectItem value="en">English</SelectItem>
                                                <SelectItem value="es">Spanish</SelectItem>
                                                <SelectItem value="fr">French</SelectItem>
                                                <SelectItem value="de">German</SelectItem>
                                                <SelectItem value="tr">Turkish</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">{t('langDesc')}</p>
                                    </div>


                                </div>
                            </div>
                        </TabsContent>



                        {/* Engagement Tab */}
                        <TabsContent value="engagement" className="space-y-8 mt-6">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('proactiveEngagement')}</h4>
                                        <p className="text-sm text-muted-foreground mt-1">{t('proactiveEngagementDescription')}</p>
                                    </div>
                                    <Switch
                                        checked={settings.engagement.enabled}
                                        onCheckedChange={(checked) => setSettings(prev => ({
                                            ...prev,
                                            engagement: { ...prev.engagement, enabled: checked }
                                        }))}
                                    />
                                </div>



                                {settings.engagement.enabled && (
                                    <>
                                        {/* Trigger Conditions */}
                                        <div className="space-y-4 border-t pt-4">
                                            <h5 className="text-sm font-medium">{t('triggerConditions')}</h5>
                                            <p className="text-xs text-muted-foreground">{t('triggerConditionsDescription')}</p>

                                            <div className="grid gap-4">
                                                {/* Time on Page */}
                                                <div className="space-y-2">
                                                    <Label>{t('showAfterTimeOnPage')}</Label>
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            className="w-24"
                                                            placeholder="0"
                                                            value={settings.engagement.triggers.timeOnPage || ""}
                                                            onChange={(e) => setSettings(prev => ({
                                                                ...prev,
                                                                engagement: {
                                                                    ...prev.engagement,
                                                                    triggers: {
                                                                        ...prev.engagement.triggers,
                                                                        timeOnPage: e.target.value ? parseInt(e.target.value) : null
                                                                    }
                                                                }
                                                            }))}
                                                        />
                                                        <span className="text-sm">seconds</span>
                                                    </div>
                                                </div>

                                                {/* Scroll Depth */}
                                                <div className="space-y-2">
                                                    <Label>{t('showAtScrollDepth')}</Label>
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            className="w-24"
                                                            placeholder="0"
                                                            value={settings.engagement.triggers.scrollDepth || ""}
                                                            onChange={(e) => setSettings(prev => ({
                                                                ...prev,
                                                                engagement: {
                                                                    ...prev.engagement,
                                                                    triggers: {
                                                                        ...prev.engagement.triggers,
                                                                        scrollDepth: e.target.value ? parseInt(e.target.value) : null
                                                                    }
                                                                }
                                                            }))}
                                                        />
                                                        <span className="text-sm">{t('percent')}</span>
                                                    </div>
                                                </div>

                                                {/* Exit Intent */}
                                                <div className="flex items-center justify-between space-x-2 border p-3 rounded-lg">
                                                    <div className="space-y-0.5">
                                                        <Label className="text-sm">{t('exitIntent')}</Label>
                                                        <p className="text-xs text-muted-foreground">{t('exitIntentDescription')}</p>
                                                    </div>
                                                    <Switch
                                                        checked={settings.engagement.triggers.exitIntent}
                                                        onCheckedChange={(checked) => setSettings(prev => ({
                                                            ...prev,
                                                            engagement: {
                                                                ...prev.engagement,
                                                                triggers: {
                                                                    ...prev.engagement.triggers,
                                                                    exitIntent: checked
                                                                }
                                                            }
                                                        }))}
                                                    />
                                                </div>

                                                {/* Page Revisit */}
                                                <div className="space-y-2">
                                                    <Label>{t('showOnPageVisit')}</Label>
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            className="w-24"
                                                            placeholder="0"
                                                            value={settings.engagement.triggers.pageRevisit || ""}
                                                            onChange={(e) => setSettings(prev => ({
                                                                ...prev,
                                                                engagement: {
                                                                    ...prev.engagement,
                                                                    triggers: {
                                                                        ...prev.engagement.triggers,
                                                                        pageRevisit: e.target.value ? parseInt(e.target.value) : null
                                                                    }
                                                                }
                                                            }))}
                                                        />
                                                        <span className="text-sm">{t('visits')}</span>
                                                    </div>
                                                </div>

                                                {/* Inactivity */}
                                                <div className="space-y-2">
                                                    <Label>{t('showAfterInactivity')}</Label>
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            className="w-24"
                                                            placeholder="0"
                                                            value={settings.engagement.triggers.inactivity || ""}
                                                            onChange={(e) => setSettings(prev => ({
                                                                ...prev,
                                                                engagement: {
                                                                    ...prev.engagement,
                                                                    triggers: {
                                                                        ...prev.engagement.triggers,
                                                                        inactivity: e.target.value ? parseInt(e.target.value) : null
                                                                    }
                                                                }
                                                            }))}
                                                        />
                                                        <span className="text-sm">seconds</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bubble Messages */}
                                        <div className="space-y-4 border-t pt-4">
                                            <h5 className="text-sm font-medium">{t('bubbleMessages')}</h5>
                                            <p className="text-xs text-muted-foreground">{t('bubbleMessagesDescription')}</p>

                                            <div className="space-y-4">
                                                {settings.engagement.bubble.messages.map((message, index) => (
                                                    <div key={index} className="flex flex-col gap-3 p-4 border rounded-lg bg-gray-50/50">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <Label className="text-sm font-medium">{t('message')} {index + 1}</Label>
                                                                <Switch
                                                                    checked={message.isActive}
                                                                    onCheckedChange={(checked) => updateEngagementMessage(index, 'isActive', checked)}
                                                                    className="scale-75"
                                                                />
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => removeEngagementMessage(index)}
                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>

                                                        <div className="grid gap-3">
                                                            <div className="grid gap-1.5">
                                                                <Label className="text-xs text-muted-foreground">{t('messageText')}</Label>
                                                                <Input
                                                                    value={message.text}
                                                                    onChange={(e) => updateEngagementMessage(index, 'text', e.target.value)}
                                                                    placeholder={t('enterMessage')}
                                                                    className="bg-white"
                                                                />
                                                            </div>

                                                            <div className="grid gap-1.5">
                                                                <Label className="text-xs text-muted-foreground">{t('triggerDelay')}</Label>
                                                                <div className="flex items-center gap-2">
                                                                    <Input
                                                                        type="number"
                                                                        min="0"
                                                                        value={message.delay}
                                                                        onChange={(e) => updateEngagementMessage(index, 'delay', parseInt(e.target.value) || 0)}
                                                                        className="w-24 bg-white"
                                                                    />
                                                                    <span className="text-xs text-muted-foreground">{t('waitBeforeShowing')}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {settings.engagement.bubble.messages.length < 5 && (
                                                    <Button variant="outline" size="sm" onClick={addEngagementMessage} className="w-full border-dashed">
                                                        {t('addMessage') || "+ Add Message"}
                                                    </Button>
                                                )}
                                            </div>

                                        </div>

                                        {/* Bubble Appearance */}
                                        <div className="space-y-4 border-t pt-4">
                                            <h5 className="text-sm font-medium">{t('bubbleAppearance')}</h5>

                                            {/* Position */}
                                            <div className="space-y-2">
                                                <Label>{t('position')}</Label>
                                                <Select
                                                    value={settings.engagement.bubble.position}
                                                    onValueChange={(value: "top" | "left" | "right") => setSettings(prev => ({
                                                        ...prev,
                                                        engagement: {
                                                            ...prev.engagement,
                                                            bubble: {
                                                                ...prev.engagement.bubble,
                                                                position: value
                                                            }
                                                        }
                                                    }))}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="top">{t('aboveLauncher')}</SelectItem>
                                                        <SelectItem value="left">{t('leftOfLauncher')}</SelectItem>
                                                        <SelectItem value="right">{t('rightOfLauncher')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Colors */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>{t('backgroundColor')}</Label>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            type="color"
                                                            value={settings.engagement.bubble.style.backgroundColor}
                                                            onChange={(e) => setSettings(prev => ({
                                                                ...prev,
                                                                engagement: {
                                                                    ...prev.engagement,
                                                                    bubble: {
                                                                        ...prev.engagement.bubble,
                                                                        style: {
                                                                            ...prev.engagement.bubble.style,
                                                                            backgroundColor: e.target.value
                                                                        }
                                                                    }
                                                                }
                                                            }))}
                                                            className="h-10 w-20 p-1 cursor-pointer"
                                                        />
                                                        <Input
                                                            type="text"
                                                            value={settings.engagement.bubble.style.backgroundColor}
                                                            onChange={(e) => setSettings(prev => ({
                                                                ...prev,
                                                                engagement: {
                                                                    ...prev.engagement,
                                                                    bubble: {
                                                                        ...prev.engagement.bubble,
                                                                        style: {
                                                                            ...prev.engagement.bubble.style,
                                                                            backgroundColor: e.target.value
                                                                        }
                                                                    }
                                                                }
                                                            }))}
                                                            className="flex-1"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>{t('textColor')}</Label>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            type="color"
                                                            value={settings.engagement.bubble.style.textColor}
                                                            onChange={(e) => setSettings(prev => ({
                                                                ...prev,
                                                                engagement: {
                                                                    ...prev.engagement,
                                                                    bubble: {
                                                                        ...prev.engagement.bubble,
                                                                        style: {
                                                                            ...prev.engagement.bubble.style,
                                                                            textColor: e.target.value
                                                                        }
                                                                    }
                                                                }
                                                            }))}
                                                            className="h-10 w-20 p-1 cursor-pointer"
                                                        />
                                                        <Input
                                                            type="text"
                                                            value={settings.engagement.bubble.style.textColor}
                                                            onChange={(e) => setSettings(prev => ({
                                                                ...prev,
                                                                engagement: {
                                                                    ...prev.engagement,
                                                                    bubble: {
                                                                        ...prev.engagement.bubble,
                                                                        style: {
                                                                            ...prev.engagement.bubble.style,
                                                                            textColor: e.target.value
                                                                        }
                                                                    }
                                                                }
                                                            }))}
                                                            className="flex-1"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Border Radius */}
                                            <div className="space-y-2">
                                                <Label>{t('borderRadius')}</Label>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="range"
                                                        min="0"
                                                        max="24"
                                                        value={settings.engagement.bubble.style.borderRadius}
                                                        onChange={(e) => setSettings(prev => ({
                                                            ...prev,
                                                            engagement: {
                                                                ...prev.engagement,
                                                                bubble: {
                                                                    ...prev.engagement.bubble,
                                                                    style: {
                                                                        ...prev.engagement.bubble.style,
                                                                        borderRadius: parseInt(e.target.value)
                                                                    }
                                                                }
                                                            }
                                                        }))}
                                                        className="flex-1"
                                                    />
                                                    <span className="text-sm w-12">{settings.engagement.bubble.style.borderRadius}px</span>
                                                </div>
                                            </div>

                                            {/* Shadow */}
                                            <div className="space-y-2">
                                                <Label>{t('shadow')}</Label>
                                                <Select
                                                    value={settings.engagement.bubble.style.shadow}
                                                    onValueChange={(value: "none" | "small" | "medium" | "large") => setSettings(prev => ({
                                                        ...prev,
                                                        engagement: {
                                                            ...prev.engagement,
                                                            bubble: {
                                                                ...prev.engagement.bubble,
                                                                style: {
                                                                    ...prev.engagement.bubble.style,
                                                                    shadow: value
                                                                }
                                                            }
                                                        }
                                                    }))}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">{t('shadowNone')}</SelectItem>
                                                        <SelectItem value="small">{t('shadowSmall')}</SelectItem>
                                                        <SelectItem value="medium">{t('shadowMedium')}</SelectItem>
                                                        <SelectItem value="large">{t('shadowLarge')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Animation */}
                                            <div className="space-y-2">
                                                <Label>{t('animation')}</Label>
                                                <Select
                                                    value={settings.engagement.bubble.animation}
                                                    onValueChange={(value: "bounce" | "pulse" | "shake" | "none") => setSettings(prev => ({
                                                        ...prev,
                                                        engagement: {
                                                            ...prev.engagement,
                                                            bubble: {
                                                                ...prev.engagement.bubble,
                                                                animation: value
                                                            }
                                                        }
                                                    }))}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="bounce">{t('animationBounce')}</SelectItem>
                                                        <SelectItem value="pulse">{t('animationPulse')}</SelectItem>
                                                        <SelectItem value="shake">{t('animationShake')}</SelectItem>
                                                        <SelectItem value="none">{t('animationNone')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {/* Behavior Settings */}
                                        <div className="space-y-4 border-t pt-4">
                                            <h5 className="text-sm font-medium">{t('behavior')}</h5>

                                            <div className="flex items-center justify-between space-x-2 border p-3 rounded-lg">
                                                <div className="space-y-0.5">
                                                    <Label className="text-sm">{t('autoDismiss')}</Label>
                                                    <p className="text- xs text-muted-foreground">{t('autoDismissDescription')}</p>
                                                </div>
                                                <Switch
                                                    checked={settings.engagement.bubble.autoDismiss}
                                                    onCheckedChange={(checked) => setSettings(prev => ({
                                                        ...prev,
                                                        engagement: {
                                                            ...prev.engagement,
                                                            bubble: {
                                                                ...prev.engagement.bubble,
                                                                autoDismiss: checked
                                                            }
                                                        }
                                                    }))}
                                                />
                                            </div>

                                            {settings.engagement.bubble.autoDismiss && (
                                                <div className="space-y-2">
                                                    <Label>{t('autoDismissDelay')}</Label>
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            type="number"
                                                            min="3"
                                                            max="60"
                                                            className="w-24"
                                                            value={settings.engagement.bubble.autoDismissDelay}
                                                            onChange={(e) => setSettings(prev => ({
                                                                ...prev,
                                                                engagement: {
                                                                    ...prev.engagement,
                                                                    bubble: {
                                                                        ...prev.engagement.bubble,
                                                                        autoDismissDelay: parseInt(e.target.value) || 10
                                                                    }
                                                                }
                                                            }))}
                                                        />
                                                        <span className="text-sm">seconds</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between space-x-2 border p-3 rounded-lg">
                                                <div className="space-y-0.5">
                                                    <Label className="text-sm">{t('showCloseButton')}</Label>
                                                    <p className="text-xs text-muted-foreground">{t('showCloseButtonDescription')}</p>
                                                </div>
                                                <Switch
                                                    checked={settings.engagement.bubble.showCloseButton}
                                                    onCheckedChange={(checked) => setSettings(prev => ({
                                                        ...prev,
                                                        engagement: {
                                                            ...prev.engagement,
                                                            bubble: {
                                                                ...prev.engagement.bubble,
                                                                showCloseButton: checked
                                                            }
                                                        }
                                                    }))}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>{t('maxShowsPerSession')}</Label>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        max="10"
                                                        className="w-24"
                                                        value={settings.engagement.bubble.maxShowCount}
                                                        onChange={(e) => setSettings(prev => ({
                                                            ...prev,
                                                            engagement: {
                                                                ...prev.engagement,
                                                                bubble: {
                                                                    ...prev.engagement.bubble,
                                                                    maxShowCount: parseInt(e.target.value) || 3
                                                                }
                                                            }
                                                        }))}
                                                    />
                                                    <span className="text-sm">{t('times')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </TabsContent>

                        {/* Availability Tab */}
                        <TabsContent value="availability" className="space-y-8 mt-6">
                            <div className="space-y-6">
                                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('availability')}</h4>

                                <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">{t('enableBusinessHours')}</Label>
                                        <p className="text-sm text-muted-foreground">
                                            {t('enableBusinessHoursDesc')}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={settings.enableBusinessHours}
                                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableBusinessHours: checked }))}
                                    />
                                </div>

                                {settings.enableBusinessHours && (
                                    <div className="grid gap-4 pl-4 border-l-2 ml-2 animate-in slide-in-from-left-2">
                                        <div className="grid gap-2">
                                            <Label>{t('timezone')}</Label>
                                            <Select
                                                value={settings.timezone}
                                                onValueChange={(value) => setSettings(prev => ({ ...prev, timezone: value }))}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('selectTimezone')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="UTC">UTC</SelectItem>
                                                    <SelectItem value="America/New_York">New York (EST)</SelectItem>
                                                    <SelectItem value="Europe/London">London (GMT)</SelectItem>
                                                    <SelectItem value="Europe/Istanbul">Istanbul (TRT)</SelectItem>
                                                    <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                                                    {/* Add more common timezones here */}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label>{t('startTime')}</Label>
                                                <Input
                                                    type="time"
                                                    value={settings.businessHoursStart}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, businessHoursStart: e.target.value }))}
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>{t('endTime')}</Label>
                                                <Input
                                                    type="time"
                                                    value={settings.businessHoursEnd}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, businessHoursEnd: e.target.value }))}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label>{t('offlineMessage')}</Label>
                                            <Textarea
                                                placeholder={t('offlineMessagePlaceholder')}
                                                value={settings.offlineMessage}
                                                onChange={(e) => setSettings(prev => ({ ...prev, offlineMessage: e.target.value }))}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                {t('offlineMessageDesc')}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>

                    <div className="flex items-center gap-3 pt-4 border-t">
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Save className="mr-2 h-4 w-4" />
                            {t('save')}
                        </Button>
                        <Button variant="outline" onClick={() => window.open(`/widget-test?id=${userId}`, '_blank')}>
                            {t('testWidget')}
                        </Button>
                    </div>
                </div>

                {/* Right Panel: Live Preview */}
                <div className="flex-1 flex flex-col items-center bg-muted/30 rounded-xl border border-dashed border-border/50 p-6 min-h-[600px]">
                    <div className="flex gap-2 mb-4">
                        <Button
                            variant={previewMode === 'mobile' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPreviewMode('mobile')}
                        >
                            {t('mobile')}
                        </Button>
                        <Button
                            variant={previewMode === 'desktop' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPreviewMode('desktop')}
                        >
                            {t('desktop')}
                        </Button>
                    </div>

                    <div className="sticky top-8">
                        {previewMode === 'mobile' ? (
                            <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-xl">
                                <div className="w-[148px] h-[18px] bg-gray-800 top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute"></div>
                                <div className="h-[32px] w-[3px] bg-gray-800 absolute -start-[17px] top-[72px] rounded-s-lg"></div>
                                <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[124px] rounded-s-lg"></div>
                                <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[178px] rounded-s-lg"></div>
                                <div className="h-[64px] w-[3px] bg-gray-800 absolute -end-[17px] top-[142px] rounded-e-lg"></div>

                                <div className="rounded-[2rem] overflow-hidden w-full h-full bg-white dark:bg-gray-950 flex flex-col relative">
                                    {isPreviewOpen ? (
                                        settings.theme === 'modern' ? (
                                            // MODERN THEME PREVIEW
                                            <div className="flex flex-col h-full bg-[#F8F9FC] animate-in zoom-in-95 duration-300 relative overflow-hidden font-sans">
                                                {/* Header */}
                                                <div className="p-5 flex items-center justify-between z-20 relative">
                                                    <div className="flex items-center gap-2">
                                                        {settings.brandLogo ? (
                                                            <Image src={settings.brandLogo} alt="Logo" fill className="object-cover rounded-full" unoptimized />
                                                        ) : (
                                                            <Sparkles className="w-5 h-5 text-blue-500 fill-blue-500" />
                                                        )}
                                                        <span className="font-semibold text-gray-800 text-base">{settings.companyName || "AI Assist"}</span>
                                                    </div>
                                                    <button onClick={() => setIsPreviewOpen(false)}>
                                                        <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                                                    </button>
                                                </div>

                                                {/* Glowing Orb Animation Container */}
                                                <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-full flex justify-center z-0 pointer-events-none">
                                                    <div className="relative w-64 h-64">
                                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/30 to-purple-400/30 rounded-full blur-[60px] animate-pulse"></div>
                                                        <div className="absolute inset-10 bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-full blur-[40px]"></div>
                                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white/40 blur-[50px] rounded-full mix-blend-overlay"></div>
                                                    </div>
                                                </div>

                                                {/* Main Content Area */}
                                                <div className="flex-1 flex flex-col relative z-10 px-6 pt-32 pb-4">

                                                    {/* Welcome Text */}
                                                    <div className="text-center mb-auto">
                                                        <h3 className="text-xl md:text-2xl font-medium text-slate-700 leading-tight">
                                                            {settings.welcomeMessage || "What do you want to know about AI?"}
                                                        </h3>
                                                    </div>

                                                    {/* Suggested Questions (Right Aligned Chips) */}
                                                    <div className="flex flex-col items-end gap-3 mb-6">
                                                        {settings.suggestedQuestions.slice(0, 3).map((q, i) => (
                                                            <button
                                                                key={i}
                                                                className="bg-white hover:bg-gray-50 text-gray-700 text-sm py-2.5 px-4 rounded-2xl shadow-sm border border-gray-100 transition-all hover:scale-105 active:scale-95 max-w-[90%] text-left"
                                                            >
                                                                {q}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {/* Show More Link */}
                                                    <div className="w-full text-right mb-4 pr-1">
                                                        <button className="text-xs text-gray-500 hover:text-gray-800 font-medium transition-colors">
                                                            Show more
                                                        </button>
                                                    </div>

                                                    {/* Input Area */}
                                                    <div className="bg-white rounded-full shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 p-1.5 flex items-center">
                                                        <input
                                                            placeholder="Ask me anything..."
                                                            className="flex-1 bg-transparent border-0 focus:ring-0 text-sm px-4 py-2 text-gray-700 placeholder:text-gray-400"
                                                            disabled
                                                        />
                                                        <button
                                                            className="p-2 rounded-full hover:bg-gray-50 transition-colors"
                                                            style={{ color: settings.headerBackgroundColor || settings.brandColor }}
                                                        >
                                                            <Send className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            // CLASSIC THEME PREVIEW
                                            <div className="flex flex-col h-full animate-in slide-in-from-bottom-5 duration-300">
                                                <div
                                                    className="p-4 pt-8 text-white flex items-center justify-between shadow-sm"
                                                    style={{ backgroundColor: settings.headerBackgroundColor || settings.brandColor }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="relative flex items-center justify-center"
                                                            style={{ width: settings.headerLogoWidth || 32, height: settings.headerLogoHeight || 32 }}
                                                        >
                                                            {settings.headerLogo || settings.brandLogo ? (
                                                                <Image src={settings.headerLogo || settings.brandLogo} alt="Logo" fill className="object-contain" unoptimized />
                                                            ) : (
                                                                <div className="w-full h-full rounded-full bg-white/20 flex items-center justify-center">
                                                                    <MessageSquare className="w-5 h-5 text-white" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold text-sm">{settings.companyName}</h3>
                                                            <p className="text-xs text-white/80">Online</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setIsPreviewOpen(false)} className="text-white/80 hover:text-white">
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M18 6L6 18M6 6L18 18" />
                                                        </svg>
                                                    </button>
                                                </div>

                                                <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
                                                    <div className="flex gap-2 max-w-[85%]">
                                                        <div
                                                            className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] text-white"
                                                            style={{ backgroundColor: settings.headerBackgroundColor || settings.brandColor }}
                                                        >
                                                            AI
                                                        </div>
                                                        <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-tl-none shadow-sm text-sm border">
                                                            {settings.welcomeMessage}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-2 w-full max-w-xs ml-8">
                                                        {settings.suggestedQuestions?.filter(q => q && q.trim() !== "").map((q, i) => (
                                                            <button
                                                                key={i}
                                                                className="text-xs text-left px-4 py-3 bg-white hover:bg-gray-50 border rounded-xl transition-all shadow-sm truncate"
                                                                style={{ borderColor: `${settings.headerBackgroundColor || settings.brandColor}40`, color: settings.headerBackgroundColor || settings.brandColor }}
                                                            >
                                                                {q}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="p-3 border-t bg-white dark:bg-gray-950">
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Type a message..."
                                                            className="flex-1 text-xs bg-gray-100 dark:bg-gray-900 rounded-full px-3 py-2 focus:outline-none"
                                                            disabled
                                                        />
                                                        <button
                                                            className="p-2 rounded-full text-white"
                                                            style={{ backgroundColor: settings.headerBackgroundColor || settings.brandColor }}
                                                        >
                                                            <Send className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    ) : (
                                        <div className="absolute inset-0 bg-gray-100/50 dark:bg-gray-900/50 flex items-end justify-end p-4">
                                            <div
                                                className="absolute"
                                                style={{
                                                    ...(settings.position.includes('bottom') ? { bottom: `${settings.bottomSpacing}px` } : {}),
                                                    ...(settings.position.includes('top') ? { top: `${settings.bottomSpacing + 30}px` } : {}),
                                                    ...(settings.position.includes('right') ? { right: `${settings.sideSpacing}px` } : {}),
                                                    ...(settings.position.includes('left') ? { left: `${settings.sideSpacing}px` } : {}),
                                                    ...(settings.position.includes('center') ? { left: '50%', transform: 'translateX(-50%)' } : {}),
                                                }}
                                            >
                                                <button
                                                    onClick={() => setIsPreviewOpen(true)}
                                                    style={{
                                                        position: 'relative',
                                                        width: `${settings.launcherWidth}px`,
                                                        height: `${settings.launcherHeight}px`,
                                                        borderRadius: settings.launcherType === 'fullImage' ? '0' : `${settings.launcherRadius}px`,
                                                        backgroundColor: settings.launcherType === 'fullImage' ? 'transparent' : (settings.launcherBackgroundColor || settings.brandColor),
                                                        boxShadow: settings.launcherType === 'fullImage' ? 'none' : (
                                                            settings.launcherShadow === 'none' ? 'none' :
                                                                settings.launcherShadow === 'light' ? '0 2px 8px rgba(0,0,0,0.1)' :
                                                                    settings.launcherShadow === 'medium' ? '0 4px 16px rgba(0,0,0,0.2)' : '0 8px 32px rgba(0,0,0,0.3)'
                                                        ),
                                                        padding: (settings.launcherStyle === 'text' || settings.launcherStyle === 'icon_text') ? '0 12px' : 0,
                                                        overflow: 'hidden',
                                                    }}
                                                    className={`flex items-center justify-center gap-2 text-white font-medium transition-transform hover:scale-105 ${settings.launcherAnimation === 'pulse' ? 'animate-pulse' :
                                                        settings.launcherAnimation === 'bounce' ? 'animate-bounce' : ''
                                                        }`}
                                                >
                                                    {settings.launcherType === 'fullImage' ? (
                                                        settings.launcherImageMode === 'lottie' && settings.launcherLottieUrl ? (
                                                            lottieData ? (
                                                                <Lottie
                                                                    animationData={lottieData}
                                                                    loop={true}
                                                                    autoplay={true}
                                                                    style={{ width: '100%', height: '100%' }}
                                                                />
                                                            ) : (
                                                                <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 text-white text-center p-1">
                                                                    <span className="text-lg">🎬</span>
                                                                    <span className="text-[8px]">Lottie</span>
                                                                </div>
                                                            )
                                                        ) : settings.launcherFullImageUrl ? (
                                                            <Image src={settings.launcherFullImageUrl} alt="Launcher" fill className="object-contain" unoptimized />
                                                        ) : (
                                                            renderIcon(settings.launcherLibraryIcon || "MessageSquare", "w-6 h-6")
                                                        )
                                                    ) : (
                                                        <>
                                                            {(settings.launcherStyle === 'circle' || settings.launcherStyle === 'square' || settings.launcherStyle === 'icon_text') && (
                                                                settings.launcherIcon === "custom" && settings.launcherIconUrl ? (
                                                                    <Image src={settings.launcherIconUrl} alt="Icon" width={Math.min(settings.launcherWidth, settings.launcherHeight) - 24} height={Math.min(settings.launcherWidth, settings.launcherHeight) - 24} className="object-contain rounded-sm flex-shrink-0" unoptimized />
                                                                ) : (
                                                                    renderIcon(settings.launcherLibraryIcon || "MessageSquare", "w-6 h-6")
                                                                )
                                                            )}
                                                            {(settings.launcherStyle === 'text' || settings.launcherStyle === 'icon_text') && (
                                                                <span className="text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]" style={{ color: settings.launcherIconColor }}>{settings.launcherText}</span>
                                                            )}
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="w-[500px] bg-white dark:bg-gray-950 rounded-lg shadow-2xl border overflow-hidden">
                                <div className="bg-gray-100 dark:bg-gray-800 p-3 flex items-center gap-2 border-b">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    </div>
                                    <div className="flex-1 bg-white dark:bg-gray-700 rounded px-3 py-1 text-xs text-gray-500 text-center">
                                        yourwebsite.com
                                    </div>
                                </div>

                                <div className="h-[400px] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 relative p-6">
                                    <div className="space-y-4">
                                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded mt-4"></div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                        </div>
                                    </div>

                                    {/* Desktop Open Widget Preview */}
                                    {isPreviewOpen && (
                                        <div
                                            className="absolute bg-white dark:bg-gray-900 shadow-2xl rounded-2xl overflow-hidden flex flex-col border border-border"
                                            style={{
                                                width: '380px',
                                                height: '500px',
                                                ...(settings.position.includes('bottom') ? { bottom: `${settings.bottomSpacing + settings.launcherHeight + 20}px` } : {}),
                                                ...(settings.position.includes('top') ? { top: `${settings.bottomSpacing + settings.launcherHeight + 20}px` } : {}),
                                                ...(settings.position.includes('right') ? { right: `${settings.sideSpacing}px` } : {}),
                                                ...(settings.position.includes('left') ? { left: `${settings.sideSpacing}px` } : {}),
                                                ...(settings.position.includes('center') ? { left: '50%', transform: 'translateX(-50%)' } : {}),
                                                zIndex: 50
                                            }}
                                        >
                                            {settings.theme === 'modern' ? (
                                                // MODERN THEME PREVIEW CONTENT
                                                <div className="flex flex-col h-full bg-[#F8F9FC] relative overflow-hidden font-sans">
                                                    <div className="p-5 flex items-center justify-between z-20 relative border-b bg-white/50 backdrop-blur-sm">
                                                        <div className="flex items-center gap-2">
                                                            {settings.headerLogo || settings.brandLogo ? (
                                                                <Image src={settings.headerLogo || settings.brandLogo} alt="Logo" fill className="object-cover rounded-full" unoptimized />
                                                            ) : (
                                                                <Sparkles className="w-5 h-5 text-blue-500 fill-blue-500" />
                                                            )}
                                                            <span className="font-semibold text-gray-800 text-base">{settings.companyName || "AI Assist"}</span>
                                                        </div>
                                                        <button onClick={() => setIsPreviewOpen(false)}>
                                                            <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                                                        </button>
                                                    </div>

                                                    <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-full flex justify-center z-0 pointer-events-none">
                                                        <div className="relative w-64 h-64">
                                                            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/30 to-purple-400/30 rounded-full blur-[60px] animate-pulse"></div>
                                                            <div className="absolute inset-10 bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-full blur-[40px]"></div>
                                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white/40 blur-[50px] rounded-full mix-blend-overlay"></div>
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 flex flex-col relative z-10 px-6 pt-10 pb-4">
                                                        <div className="text-center mb-auto">
                                                            <h3 className="text-xl font-medium text-slate-700 leading-tight">
                                                                {settings.welcomeMessage || "What do you want to know about AI?"}
                                                            </h3>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-3 mb-6">
                                                            {settings.suggestedQuestions.slice(0, 3).map((q, i) => (
                                                                <button key={i}
                                                                    className="bg-white hover:bg-gray-50 text-sm py-2.5 px-4 rounded-2xl shadow-sm border transition-all text-left max-w-full"
                                                                    style={{ borderColor: `${settings.headerBackgroundColor || settings.brandColor}40`, color: settings.headerBackgroundColor || settings.brandColor }}>
                                                                    {q}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <div className="bg-white rounded-full shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 p-1.5 flex items-center">
                                                            <input placeholder="Ask me anything..." className="flex-1 bg-transparent border-0 focus:ring-0 text-sm px-4 py-2 text-gray-700 placeholder:text-gray-400" disabled />
                                                            <button className="p-2 rounded-full hover:bg-gray-50 transition-colors" style={{ color: settings.headerBackgroundColor || settings.brandColor }}><Send className="w-4 h-4" /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                // CLASSIC THEME PREVIEW CONTENT
                                                <div className="flex flex-col h-full">
                                                    <div className="p-4 pt-6 text-white flex items-center justify-between shadow-sm" style={{ backgroundColor: settings.headerBackgroundColor || settings.brandColor }}>
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className="relative flex items-center justify-center"
                                                                style={{ width: settings.headerLogoWidth || 32, height: settings.headerLogoHeight || 32 }}
                                                            >
                                                                {settings.headerLogo || settings.brandLogo ? (
                                                                    <Image src={settings.headerLogo || settings.brandLogo} alt="Logo" fill className="object-contain" unoptimized />
                                                                ) : (
                                                                    <div className="w-full h-full rounded-full bg-white/20 flex items-center justify-center">
                                                                        <MessageSquare className="w-5 h-5 text-white" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <h3 className="font-semibold text-sm">{settings.companyName}</h3>
                                                                <p className="text-xs text-white/80">Online</p>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => setIsPreviewOpen(false)} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
                                                    </div>
                                                    <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
                                                        <div className="flex gap-2 max-w-[85%]">
                                                            <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] text-white" style={{ backgroundColor: settings.headerBackgroundColor || settings.brandColor }}>AI</div>
                                                            <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-tl-none shadow-sm text-sm border">{settings.welcomeMessage}</div>
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-2 w-full max-w-xs ml-8">
                                                            {settings.suggestedQuestions?.filter(q => q && q.trim() !== "").map((q, i) => (
                                                                <button key={i} className="text-xs text-left px-4 py-3 bg-white hover:bg-gray-50 border rounded-xl transition-all shadow-sm truncate" style={{ borderColor: `${settings.headerBackgroundColor || settings.brandColor}40`, color: settings.headerBackgroundColor || settings.brandColor }}>{q}</button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="p-3 border-t bg-white dark:bg-gray-950">
                                                        <div className="flex gap-2">
                                                            <input type="text" placeholder="Type a message..." className="flex-1 text-xs bg-gray-100 dark:bg-gray-900 rounded-full px-3 py-2 focus:outline-none" disabled />
                                                            <button className="p-2 rounded-full text-white" style={{ backgroundColor: settings.headerBackgroundColor || settings.brandColor }}><Send className="w-3 h-3" /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div
                                        className="absolute"
                                        style={{
                                            ...(settings.position.includes('bottom') ? { bottom: `${settings.bottomSpacing}px` } : {}),
                                            ...(settings.position.includes('top') ? { top: `${settings.bottomSpacing}px` } : {}),
                                            ...(settings.position.includes('right') ? { right: `${settings.sideSpacing}px` } : {}),
                                            ...(settings.position.includes('left') ? { left: `${settings.sideSpacing}px` } : {}),
                                            ...(settings.position.includes('center') ? { left: '50%', transform: 'translateX(-50%)' } : {}),
                                        }}
                                    >
                                        <button
                                            style={{
                                                position: 'relative',
                                                width: `${settings.launcherWidth}px`,
                                                height: `${settings.launcherHeight}px`,
                                                borderRadius: settings.launcherType === 'fullImage' ? '0' : `${settings.launcherRadius}px`,
                                                backgroundColor: settings.launcherType === 'fullImage' ? 'transparent' : (settings.launcherBackgroundColor || settings.brandColor),
                                                boxShadow: settings.launcherType === 'fullImage' ? 'none' : (
                                                    settings.launcherShadow === 'none' ? 'none' :
                                                        settings.launcherShadow === 'light' ? '0 2px 8px rgba(0,0,0,0.1)' :
                                                            settings.launcherShadow === 'medium' ? '0 4px 16px rgba(0,0,0,0.2)' : '0 8px 32px rgba(0,0,0,0.3)'
                                                ),
                                                padding: (settings.launcherStyle === 'text' || settings.launcherStyle === 'icon_text') ? '0 12px' : 0,
                                                overflow: 'hidden',
                                            }}
                                            className={`flex items-center justify-center gap-2 text-white font-medium transition-transform hover:scale-105 ${settings.launcherAnimation === 'pulse' ? 'animate-pulse' :
                                                settings.launcherAnimation === 'bounce' ? 'animate-bounce' : ''
                                                }`}
                                        >
                                            {settings.launcherType === 'fullImage' ? (
                                                settings.launcherImageMode === 'lottie' && settings.launcherLottieUrl ? (
                                                    lottieData ? (
                                                        <Lottie
                                                            animationData={lottieData}
                                                            loop={true}
                                                            autoplay={true}
                                                            style={{ width: '100%', height: '100%' }}
                                                        />
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 text-white text-center p-1">
                                                            <span className="text-lg">🎬</span>
                                                            <span className="text-[8px]">Lottie</span>
                                                        </div>
                                                    )
                                                ) : settings.launcherFullImageUrl ? (
                                                    <Image src={settings.launcherFullImageUrl} alt="Launcher" fill className="object-contain" unoptimized />
                                                ) : (
                                                    renderIcon(settings.launcherLibraryIcon || "MessageSquare", "w-6 h-6")
                                                )
                                            ) : (
                                                <>
                                                    {(settings.launcherStyle === 'circle' || settings.launcherStyle === 'square' || settings.launcherStyle === 'icon_text') && (
                                                        settings.launcherIcon === "custom" && settings.launcherIconUrl ? (
                                                            <Image src={settings.launcherIconUrl} alt="Icon" width={Math.min(settings.launcherWidth, settings.launcherHeight) - 24} height={Math.min(settings.launcherWidth, settings.launcherHeight) - 24} className="object-contain rounded-sm flex-shrink-0" unoptimized />
                                                        ) : (
                                                            renderIcon(settings.launcherLibraryIcon || "MessageSquare", "w-6 h-6")
                                                        )
                                                    )}
                                                    {(settings.launcherStyle === 'text' || settings.launcherStyle === 'icon_text') && (
                                                        <span className="text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]" style={{ color: settings.launcherIconColor }}>{settings.launcherText}</span>
                                                    )}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

