"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Loader2, Save, MessageSquare, Sparkles, X, Send, Eye } from "lucide-react"
import { icons } from "lucide-react"
import * as LucideIcons from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { useWidgetSettings } from "@/hooks/use-widget-settings"
import { uploadLogo } from "@/lib/widget-settings-utils"
import { AppearanceTab } from "./tabs/appearance-tab"
import { WidgetLivePreview } from "./preview/widget-live-preview"
import type { AmbientDockPreviewState } from "@/lib/ambient-dock-style"

interface WidgetSettingsProps {
    userId?: string
}

export default function WidgetSettings({ userId: propUserId }: WidgetSettingsProps) {
    const { user } = useAuth()
    const userId = propUserId || user?.uid
    const { toast } = useToast()
    const { t } = useLanguage()

    const { settings, setSettings, isLoading, isSaving, saveSettings } = useWidgetSettings(userId)
    const [isUploading, setIsUploading] = useState(false)
    const [ambientPreviewDockState, setAmbientPreviewDockState] = useState<AmbientDockPreviewState>("auto")
    const [ambientPreviewThinking, setAmbientPreviewThinking] = useState(false)

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
                title: t('success') || "Başarılı",
                description: t('settingsSaved') || "Ayarlar başarıyla kaydedildi.",
            })
        } catch (error) {
            toast({
                title: t('error') || "Hata",
                description: t('settingsSaveFailed') || "Ayarlar kaydedilemedi.",
                variant: "destructive",
            })
        }
    }

    const getHeaderInfo = (tab: string) => {
        return { title: t('appearanceTitle'), desc: t('appearanceDesc') }
    }

    const { title: headerTitle, desc: headerDesc } = getHeaderInfo('appearance')

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex h-full bg-muted/10 overflow-hidden rounded-tl-xl border-l border-t shadow-sm">
            {/* Main Content */}
            <div className="flex flex-1 flex-col lg:flex-row h-full">
                {/* Settings Panel */}
                <div className="w-full lg:w-[450px] xl:w-[500px] flex flex-col bg-background border-r shadow-sm z-10">
                    <div className="flex items-center justify-between p-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20">
                        <div>
                            <h3 className="text-lg font-semibold tracking-tight">{headerTitle}</h3>
                            <p className="text-sm text-muted-foreground">{headerDesc}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => window.open(`/widget-test?id=${userId}`, '_blank')} title={t('testWidget')}>
                                <Eye className="h-4 w-4" />
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving} className="gap-2 shadow-sm">
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                <span className="hidden sm:inline">{t('save')}</span>
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                        <AppearanceTab
                            settings={settings}
                            setSettings={setSettings}
                            userId={userId || ''}
                            isUploading={isUploading}
                            setIsUploading={setIsUploading}
                            ambientPreviewDockState={ambientPreviewDockState}
                            setAmbientPreviewDockState={setAmbientPreviewDockState}
                            ambientPreviewThinking={ambientPreviewThinking}
                            setAmbientPreviewThinking={setAmbientPreviewThinking}
                        />
                    </div>
                </div>

                {/* Right Panel: Live Preview */}
                <div className="flex-1 bg-muted/30 relative overflow-y-auto flex flex-col scrollbar-thin">
                    <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50" />
                    <div className="relative z-10 flex-1 p-6 flex justify-center min-h-max">
                        <div className="sticky top-0 w-full h-fit flex justify-center pb-6">
                            <WidgetLivePreview
                                userId={userId || ''}
                                settings={settings}
                                t={t}
                                ambientPreviewDockState={ambientPreviewDockState}
                                ambientPreviewThinking={ambientPreviewThinking}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
