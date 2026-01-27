"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Loader2, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/AuthContext"
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { INDUSTRY_CONFIG, IndustryType } from "@/lib/industry-config"

interface KnowledgeBehaviorContentProps {
    userId: string
}

export function KnowledgeBehaviorContent({ userId }: KnowledgeBehaviorContentProps) {
    const { t, language } = useLanguage()
    const { toast } = useToast()
    const { user } = useAuth()

    const [settings, setSettings] = useState({
        initialLanguage: "auto",
        industry: "ecommerce" as IndustryType,
        enableIndustryGreeting: false,
        customPrompts: "",
    })

    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (!userId) return

        setIsLoading(true)
        const chatbotDocRef = doc(db, "chatbots", userId)

        const unsubscribe = onSnapshot(chatbotDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data()
                setSettings(prev => ({
                    ...prev,
                    initialLanguage: data.initialLanguage || prev.initialLanguage,
                    industry: data.industry || prev.industry,
                    enableIndustryGreeting: true, // Always force true
                    customPrompts: data.customPrompts || prev.customPrompts,
                }))
            }
            setIsLoading(false)
        })

        return () => unsubscribe()
    }, [userId])

    const handleSave = async () => {
        if (!userId) return

        setIsSaving(true)
        try {
            const chatbotDocRef = doc(db, "chatbots", userId)
            await setDoc(chatbotDocRef, {
                initialLanguage: settings.initialLanguage,
                industry: settings.industry,
                enableIndustryGreeting: true, // Always save as true
                customPrompts: settings.customPrompts,
            }, { merge: true })

            toast({
                title: t('success') || "Success",
                description: t('settingsSaved') || "Settings saved successfully",
            })
        } catch (error) {
            console.error("Error saving settings:", error)
            toast({
                title: t('error') || "Error",
                description: t('failedToSave') || "Failed to save settings",
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[200px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{t('behaviorTitle') || 'Sohbet Davranışı'}</h2>
                    <p className="text-sm text-muted-foreground">{t('behaviorDesc') || 'Chatbot davranışını ve dil ayarlarını yapılandırın'}</p>
                </div>
                <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {t('save')}
                </Button>
            </div>

            <div className="space-y-6">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('chatBehavior')}</h4>

                <div className="grid gap-6">
                    {/* Industry Settings Group */}
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                        <div className="p-4 space-y-4">
                            <div className="space-y-0.5">
                                <Label className="text-base font-medium">{t('industryWelcomeMessage') || "Endüstri Karşılama Mesajı"}</Label>
                                <p className="text-sm text-muted-foreground">
                                    {t('enableIndustryGreetingDesc') || "Show industry-specific welcome message"}
                                </p>
                            </div>
                            
                            {/* Toggle removed - Always active */}

                            <div className="grid gap-2">
                                <Label>{t('industry')}</Label>
                                <Select
                                    value={settings.industry}
                                    onValueChange={(value) => {
                                        const selectedIndustry = value as IndustryType;
                                        setSettings(prev => ({
                                            ...prev,
                                            industry: selectedIndustry,
                                        }));
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder={t('selectIndustry')} />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-80 overflow-y-auto">
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
                                {settings.industry && (
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
                            </div>

                            {/* Language Selector (Moved Inside Card) */}
                            <div className="grid gap-2 pt-4 border-t">
                                <Label>{t('chatbotLanguage') || 'Chatbot Dili'}</Label>
                                <Select
                                    value={settings.initialLanguage}
                                    onValueChange={(value) => setSettings(prev => ({ ...prev, initialLanguage: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto">{t('langAuto') || 'Otomatik (Tarayıcı Dili)'}</SelectItem>
                                        <SelectItem value="tr">Türkçe</SelectItem>
                                        <SelectItem value="en">English</SelectItem>
                                        <SelectItem value="es">Español</SelectItem>
                                        <SelectItem value="de">Deutsch</SelectItem>
                                        <SelectItem value="fr">Français</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">{t('langDesc') || 'Chatbot\'un varsayılan dilini belirleyin.'}</p>
                            </div>
                        </div>
                    </div>


                </div>
            </div>
        </div>
    )
}
