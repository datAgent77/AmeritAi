"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Loader2, Save, MessageSquare, Sparkles, X, Send, Palette, Eye, Clock } from "lucide-react"
import { icons } from "lucide-react"
import * as LucideIcons from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { useWidgetSettings } from "@/hooks/use-widget-settings"
import { uploadLogo } from "@/lib/widget-settings-utils"
import { BrandingTab } from "./tabs/branding-tab"
import { AppearanceTab } from "./tabs/appearance-tab"
import { AvailabilityTab } from "./tabs/availability-tab"
import Lottie from "lottie-react"

interface WidgetSettingsProps {
    userId?: string
}

export default function WidgetSettings({ userId: propUserId }: WidgetSettingsProps) {
    const { user } = useAuth()
    const userId = propUserId || user?.uid
    const { toast } = useToast()
    const { t } = useLanguage()
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    const { settings, setSettings, isLoading, isSaving, saveSettings } = useWidgetSettings(userId)
    const [isUploading, setIsUploading] = useState(false)
    const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile')
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [activeTab, setActiveTab] = useState("branding")
    const [lottieData, setLottieData] = useState<any>(null)

    // Sync active tab with URL parameter
    useEffect(() => {
        const tabParam = searchParams.get('tab')
        if (tabParam && ['branding', 'appearance', 'availability'].includes(tabParam)) {
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

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !userId || !user) return

        setIsUploading(true)
        try {
            const token = await user.getIdToken()
            if (!token) throw new Error('Not authenticated')

            await uploadLogo(
                file,
                userId,
                token,
                (url) => {
                    setSettings(prev => ({ ...prev, brandLogo: url }))
                    toast({
                        title: "Success",
                        description: "Logo uploaded successfully.",
                    })
                },
                (error) => {
                    toast({
                        title: "Error",
                        description: `Failed to upload logo: ${error.message}`,
                        variant: "destructive",
                    })
                }
            )
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

    const handleSave = async () => {
        try {
            await saveSettings()
            toast({
                title: "Success",
                description: "Settings saved successfully.",
            })
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to save settings.",
                variant: "destructive",
            })
        }
    }

    const getHeaderInfo = (tab: string) => {
        switch (tab) {
            case 'branding':
                return { title: t('brandingTitle'), desc: t('brandingDesc') }
            case 'appearance':
                return { title: t('appearanceTitle'), desc: t('appearanceDesc') }
            case 'availability':
                return { title: t('availabilityTitle'), desc: t('availabilityDesc') }
            default:
                return { title: t('chatbotConfiguration'), desc: t('configureChatbotDesc') }
        }
    }

    const { title: headerTitle, desc: headerDesc } = getHeaderInfo(activeTab)

    const menuItems = [
        { id: 'branding', label: t('branding') || 'Marka Ayarları', icon: <Palette className="w-4 h-4" /> },
        { id: 'appearance', label: t('appearance') || 'Görünüm', icon: <Eye className="w-4 h-4" /> },
        { id: 'availability', label: t('availabilityTitle') || 'Müsaitlik', icon: <Clock className="w-4 h-4" /> },
    ]

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
                        <TabsContent value="branding" className="space-y-8 mt-6">
                            <BrandingTab settings={settings} setSettings={setSettings} />
                        </TabsContent>

                        <TabsContent value="appearance" className="space-y-8 mt-6">
                            <AppearanceTab
                                settings={settings}
                                setSettings={setSettings}
                                userId={userId || ''}
                                isUploading={isUploading}
                                setIsUploading={setIsUploading}
                            />
                        </TabsContent>

                        <TabsContent value="availability" className="space-y-8 mt-6">
                            <AvailabilityTab settings={settings} setSettings={setSettings} />
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
                                                        width: `${settings.launcherType === 'fullImage' ? settings.fullImageLauncherWidth : settings.launcherWidth}px`,
                                                        height: `${settings.launcherType === 'fullImage' ? settings.fullImageLauncherHeight : settings.launcherHeight}px`,
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
                                                                <span className="text-sm whitespace-nowrap overflow-hidden" style={{ color: settings.launcherIconColor }}>{settings.launcherText}</span>
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
                                                ...(settings.position.includes('bottom') ? { bottom: `${settings.bottomSpacing + (settings.launcherType === 'fullImage' ? settings.fullImageLauncherHeight : settings.launcherHeight) + 20}px` } : {}),
                                                ...(settings.position.includes('top') ? { top: `${settings.bottomSpacing + (settings.launcherType === 'fullImage' ? settings.fullImageLauncherHeight : settings.launcherHeight) + 20}px` } : {}),
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
                                                color: settings.launcherIconColor,
                                            }}
                                            className={`flex items-center justify-center gap-2 font-medium transition-transform hover:scale-105 ${settings.launcherAnimation === 'pulse' ? 'animate-pulse' :
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
                                                        <span className="text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">{settings.launcherText}</span>
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
