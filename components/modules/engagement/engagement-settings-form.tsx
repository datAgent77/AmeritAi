"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Save, Loader2 } from "lucide-react"
import { recordAuthDebug } from "@/lib/auth-debug"

import { EngagementSettings, defaultSettings, BubbleMessage } from "./types"
import { EngagementDesignTab } from "./tabs/design-tab"
import { EngagementTriggersTab } from "./tabs/triggers-tab"
import { EngagementAITab } from "./tabs/ai-tab"
import { EngagementPreview } from "./components/preview-panel"

interface EngagementSettingsFormProps {
    targetUserId: string
    isSuperAdmin?: boolean
}

// Sector Templates
const sectorTemplates: Record<string, BubbleMessage[]> = {
    'e-commerce': [
        { id: 'ec1', text: '👀 People who viewed this product also checked out...', delay: 5, isActive: true },
        { id: 'ec2', text: '⚡️ Today only — here is your 10% discount code: VION10', delay: 30, isActive: true },
        { id: 'ec3', text: '📦 Don\'t miss out on free shipping!', delay: 60, isActive: true }
    ],
    'health': [
        { id: 'h1', text: '👋 Hi! Would you like to book an appointment?', delay: 3, isActive: true },
        { id: 'h2', text: '🩺 Our specialists are ready to answer your questions.', delay: 20, isActive: true },
        { id: 'h3', text: '🚑 Is it an emergency? Reach us right away.', delay: 45, isActive: true }
    ],
    'education': [
        { id: 'ed1', text: '🎓 Which program is right for you? Take the quiz.', delay: 5, isActive: true },
        { id: 'ed2', text: '📚 Click to get a free trial lesson.', delay: 25, isActive: true }
    ],
    'corporate': [
        { id: 'c1', text: '🤝 Would you like a quote for your project?', delay: 5, isActive: true },
        { id: 'c2', text: '💼 Have you seen our case studies?', delay: 20, isActive: true }
    ],
    'booking': [ // Travel/Tourism
        { id: 'b1', text: '🌴 Have you seen our early-booking deals?', delay: 5, isActive: true },
        { id: 'b2', text: '✈️ I can help you search for flights.', delay: 15, isActive: true }
    ]
}

const numericTriggerKeys = ['scrollDepth', 'inactivity', 'pageRevisit', 'timeOnPage', 'clickCount'] as const
const triggerIds = ['exitIntent', 'scrollDepth', 'inactivity', 'pageRevisit', 'timeOnPage', 'clickCount', 'copyTrigger'] as const
const numericTriggerDefaults: Record<(typeof numericTriggerKeys)[number], number> = {
    scrollDepth: 50,
    inactivity: 30,
    pageRevisit: 2,
    timeOnPage: 10,
    clickCount: 3,
}

function normalizeEngagementSettings(settings: EngagementSettings): EngagementSettings {
    const triggers = { ...settings.triggers }
    const triggerRecord = triggers as Record<string, unknown>

    numericTriggerKeys.forEach((key) => {
        const value = triggerRecord[key]
        triggers[key] = value === true
            ? numericTriggerDefaults[key]
            : (typeof value === 'number' && Number.isFinite(value) ? value : 0)
    })

    triggerIds.forEach((triggerId) => {
        const key = `${triggerId}Targeting`
        const value = triggerRecord[key]
        if (!value || typeof value !== 'object') {
            triggerRecord[key] = { mode: 'all', urls: [] }
            return
        }

        const targeting = value as { mode?: unknown; urls?: unknown }
        const mode = targeting.mode === 'homepage' || targeting.mode === 'custom' ? targeting.mode : 'all'
        const urls = Array.isArray(targeting.urls)
            ? targeting.urls.filter((url): url is string => typeof url === 'string').map((url) => url.trim()).filter(Boolean)
            : []

        triggerRecord[key] = { mode, urls }
    })

    return {
        ...settings,
        triggers,
    }
}

export function EngagementSettingsForm({ targetUserId, isSuperAdmin = false }: EngagementSettingsFormProps) {
    const { user, role } = useAuth()
    const isSysAdmin = role === 'SUPER_ADMIN' || role === 'AGENCY_ADMIN';
    const { t } = useLanguage()
    const { toast } = useToast()
    const effectiveUserId = targetUserId

    const [settings, setSettings] = useState<EngagementSettings>(defaultSettings)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [activeTab, setActiveTab] = useState("design")
    const [sector, setSector] = useState<string>("")
    const [chatDisplayMode, setChatDisplayMode] = useState<"classic" | "ambient">("classic")



    const loadSettings = useCallback(async () => {
        if (!effectiveUserId) return
        setIsLoading(true)
        try {
            // Fetch chatbot details for Sector
            const chatbotRef = doc(db, "chatbots", effectiveUserId);
            const chatbotSnap = await getDoc(chatbotRef);
            let currentSector = 'general';
            if (chatbotSnap.exists()) {
                currentSector = chatbotSnap.data().sector || 'general';
                setSector(currentSector);
            }

            const response = await fetch(`/api/widget-settings?chatbotId=${effectiveUserId}`)
            if (response.ok) {
                const data = await response.json()
                setChatDisplayMode(data.chatDisplayMode === "ambient" ? "ambient" : "classic")
                if (data.engagement) {
                    setSettings(prev => ({
                        ...prev,
                        ...data.engagement,
                        bubble: {
                            ...prev.bubble,
                            ...(data.engagement.bubble || {}),
                            messages: (data.engagement.bubble?.messages?.length > 0)
                                ? data.engagement.bubble.messages
                                : [], // Legacy Global Pool
                            style: {
                                ...prev.bubble.style,
                                ...(data.engagement.bubble?.style || {})
                            },
                            ambientVariant: {
                                ...(prev.bubble.ambientVariant || {}),
                                ...(data.engagement.bubble?.ambientVariant || {}),
                                style: {
                                    ...((prev.bubble.ambientVariant && prev.bubble.ambientVariant.style) || {}),
                                    ...((data.engagement.bubble?.ambientVariant && data.engagement.bubble.ambientVariant.style) || {})
                                },
                                typewriter: {
                                    ...((prev.bubble.ambientVariant && prev.bubble.ambientVariant.typewriter) || {}),
                                    ...((data.engagement.bubble?.ambientVariant && data.engagement.bubble.ambientVariant.typewriter) || {})
                                }
                            }
                        },
                        triggers: {
                            ...prev.triggers,
                            ...(data.engagement.triggers || {}),
                            // Auto-populate Sector Templates if empty
                            exitIntentMessages: (data.engagement.triggers?.exitIntentMessages?.length > 0)
                                ? data.engagement.triggers.exitIntentMessages
                                : (sectorTemplates[currentSector.toLowerCase()] || []).slice(0, 1),
                            timeOnPageMessages: (data.engagement.triggers?.timeOnPageMessages?.length > 0)
                                ? data.engagement.triggers.timeOnPageMessages
                                : (sectorTemplates[currentSector.toLowerCase()] || []).slice(1),
                        },
                        aiSmartBubbles: {
                            ...prev.aiSmartBubbles,
                            ...(data.engagement.aiSmartBubbles || {})
                        }
                    }))
                } else if (currentSector && sectorTemplates[currentSector.toLowerCase()]) {
                    // No previous settings, but we have a sector -> Preload templates
                    const defaultMsgs = sectorTemplates[currentSector.toLowerCase()];
                    setSettings(prev => ({
                        ...prev,
                        triggers: {
                            ...prev.triggers,
                            exitIntentMessages: defaultMsgs.slice(0, 1),
                            timeOnPageMessages: defaultMsgs.slice(1)
                        }
                    }))
                }
            }
        } catch (error) {
            console.error("Failed to load engagement settings:", error)
        } finally {
            setIsLoading(false)
        }
    }, [effectiveUserId])

    useEffect(() => {
        if (effectiveUserId) {
            loadSettings()
        }
    }, [effectiveUserId, loadSettings])

    const saveSettings = async () => {
        if (!user?.uid) return
        setIsSaving(true)
        try {
            const normalizedSettings = normalizeEngagementSettings(settings)
            if (normalizedSettings !== settings) {
                setSettings(normalizedSettings)
            }
            recordAuthDebug("engagement_save_start", {
                actorUid: user.uid,
                targetUserId: effectiveUserId
            })
            const idToken = await user.getIdToken()
            const response = await fetch('/api/widget-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    chatbotId: effectiveUserId,
                    engagement: normalizedSettings,
                    enableProactiveMessaging: normalizedSettings.enabled
                })
            })
            recordAuthDebug("engagement_save_response", {
                actorUid: user.uid,
                targetUserId: effectiveUserId,
                ok: response.ok,
                status: response.status
            })

            if (!response.ok) throw new Error('Save failed')

            toast({
                title: t('settingsSaved') || "Ayarlar Kaydedildi",
                description: t('engagementSavedDesc')
            })
        } catch (error) {
            console.error("Failed to save engagement settings:", error)
            recordAuthDebug("engagement_save_error", {
                actorUid: user.uid,
                targetUserId: effectiveUserId,
                error: error instanceof Error ? error.message : String(error)
            })
            toast({
                title: t('error') || "Hata",
                description: "Ayarlar kaydedilemedi.",
                variant: "destructive"
            })
        } finally {
            setIsSaving(false)
        }
    }

    const renderActionControls = () => {
        return (
            <div className="flex flex-wrap items-center gap-3">
                {(isSuperAdmin || isSysAdmin) && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full border">
                        <Switch
                            id="module-enabled"
                            className="scale-75"
                            checked={settings.enabled}
                            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
                        />
                        <Label
                            htmlFor="module-enabled"
                            className="text-xs font-medium cursor-pointer"
                        >
                            {settings.enabled ? 'Aktif' : 'Pasif'}
                        </Label>
                    </div>
                )}
                <Button onClick={saveSettings} disabled={isSaving} size="sm" className="h-8 shadow-sm">
                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Save className="w-3 h-3 mr-2" />}
                    {t('save') || 'Kaydet'}
                </Button>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="flex flex-col lg:flex-row gap-8 p-6 items-start">
            {/* Left Panel: Settings Controls */}
            <div className="flex-1 flex flex-col gap-6">
                <div className="flex-none flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 py-2 border-b">
                    <div>
                        <h1 className="text-xl font-semibold flex items-center gap-2">
                            {t('modules.proactiveMessaging') || 'Etkileşim Tasarımcısı'}
                        </h1>
                        <p className="text-muted-foreground text-xs mt-1">
                            {t('customizeBubbles')}
                        </p>
                    </div>
                    <div className="shrink-0 sm:pt-1">
                        {renderActionControls()}
                    </div>
                </div>

                <div className="space-y-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <div className="sticky top-0 z-20 pb-4 pt-1 bg-[#f4f6f8]/95 backdrop-blur supports-[backdrop-filter]:bg-[#f4f6f8]/60">
                            <TabsList className="grid grid-cols-3 w-full gap-3 bg-transparent p-0 h-auto">
                                <TabsTrigger
                                    value="design"
                                    className="h-auto flex items-center justify-center p-3 rounded-xl border border-muted data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary hover:border-primary/30 transition-all duration-200 shadow-none bg-background"
                                >
                                    <span className="font-medium text-sm">Tasarım</span>
                                </TabsTrigger>

                                <TabsTrigger
                                    value="triggers"
                                    className="h-auto flex items-center justify-center p-3 rounded-xl border border-muted data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary hover:border-primary/30 transition-all duration-200 shadow-none bg-background"
                                >
                                    <span className="font-medium text-sm">Tetikleyiciler</span>
                                </TabsTrigger>

                                <TabsTrigger
                                    value="ai"
                                    className="h-auto flex items-center justify-center p-3 rounded-xl border border-muted data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary hover:border-primary/30 transition-all duration-200 shadow-none bg-background relative overflow-visible"
                                >
                                    <span className="font-medium text-sm">AI Asistan</span>
                                    <Badge className="absolute -top-2 -right-1 px-1.5 py-0 text-[9px] bg-zinc-900 border-0 text-white shadow-sm ring-2 ring-background rounded-full">PRO</Badge>
                                </TabsTrigger>
                            </TabsList>

                        </div>

                        <TabsContent value="design" className="space-y-6 mt-0">
                            <EngagementDesignTab
                                settings={settings}
                                setSettings={setSettings}
                                chatDisplayMode={chatDisplayMode}
                            />
                        </TabsContent>

                        <TabsContent value="triggers" className="space-y-6">
                            <EngagementTriggersTab settings={settings} setSettings={setSettings} />
                        </TabsContent>

                        <TabsContent value="ai" className="space-y-6">
                            <EngagementAITab settings={settings} setSettings={setSettings} />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Right Panel: Live Preview */}
            <EngagementPreview
                settings={settings}
                chatDisplayMode={chatDisplayMode}
            />
        </div >
    )
}
