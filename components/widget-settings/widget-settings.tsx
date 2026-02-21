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
        <div className="flex h-full bg-white">
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

                    <AppearanceTab
                        settings={settings}
                        setSettings={setSettings}
                        userId={userId || ''}
                        isUploading={isUploading}
                        setIsUploading={setIsUploading}
                    />

                    <div className="flex items-center gap-3 pt-4">
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
                <WidgetLivePreview settings={settings} t={t} />
            </div>
        </div>
    )
}
