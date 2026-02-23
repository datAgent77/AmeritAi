"use client"

import { useState } from "react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Image as ImageIcon, Loader2 } from "lucide-react"
import { icons } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { WidgetSettings } from "@/hooks/use-widget-settings"
import { uploadHeaderLogo, uploadLauncherIcon, uploadLauncherFullImage, uploadAmbientIcon } from "@/lib/widget-settings-utils"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Textarea } from "@/components/ui/textarea"
import { Trash2 } from "lucide-react"
import { INDUSTRY_CONFIG } from "@/lib/industry-config"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface AppearanceTabProps {
    settings: WidgetSettings
    setSettings: React.Dispatch<React.SetStateAction<WidgetSettings>>
    userId: string
    isUploading: boolean
    setIsUploading: React.Dispatch<React.SetStateAction<boolean>>
}

export function AppearanceTab({ settings, setSettings, userId, isUploading, setIsUploading }: AppearanceTabProps) {
    const { t, language } = useLanguage()
    const { user } = useAuth()
    const { toast } = useToast()
    const [searchTerm, setSearchTerm] = useState("")
    const [activeDevice, setActiveDevice] = useState<'desktop' | 'mobile'>('desktop')
    const isAmbientMode = settings.chatDisplayMode === "ambient"
    const isAlwaysOpenMode = settings.interactionMode === "always_open" || isAmbientMode

    const applyDisplayPreset = (preset: "classic_launcher" | "classic_always_open" | "ambient_always_open") => {
        if (preset === "classic_launcher") {
            setSettings(prev => ({
                ...prev,
                chatDisplayMode: "classic",
                interactionMode: "launcher"
            }))
            return
        }

        if (preset === "classic_always_open") {
            setSettings(prev => ({
                ...prev,
                chatDisplayMode: "classic",
                interactionMode: "always_open",
                viewMode: "classic",
                modalSize: "half"
            }))
            return
        }

        setSettings(prev => ({
            ...prev,
            chatDisplayMode: "ambient",
            interactionMode: "always_open",
            viewMode: "classic",
            modalSize: "half"
        }))
    }

    // Branding functions
    const addSuggestedQuestion = () => {
        if (settings.suggestedQuestions.length >= 4) {
            return
        }

        let nextQuestion = ""
        const industryConfig = settings.industry ? INDUSTRY_CONFIG[settings.industry] : INDUSTRY_CONFIG['other']
        const pool = (industryConfig as any).suggestedQuestions?.[language === 'tr' ? 'tr' : 'en'] || []

        const unusedQuestion = pool.find((q: string) => !settings.suggestedQuestions.includes(q))

        if (unusedQuestion) {
            nextQuestion = unusedQuestion
        } else {
            const otherPool = (INDUSTRY_CONFIG['other'] as any).suggestedQuestions?.[language === 'tr' ? 'tr' : 'en'] || []
            const otherUnused = otherPool.find((q: string) => !settings.suggestedQuestions.includes(q))
            if (otherUnused) nextQuestion = otherUnused
        }

        setSettings(prev => ({
            ...prev,
            suggestedQuestions: [...prev.suggestedQuestions, nextQuestion]
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

    const handleHeaderLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !userId || !user) return

        setIsUploading(true)
        try {
            const token = await user.getIdToken()
            if (!token) throw new Error('Not authenticated')

            await uploadHeaderLogo(
                file,
                userId,
                token,
                (url) => {
                    setSettings(prev => ({ ...prev, headerLogo: url }))
                    toast({
                        title: "Success",
                        description: "Header logo uploaded successfully.",
                    })
                },
                (error) => {
                    toast({
                        title: "Error",
                        description: `Failed to upload header logo: ${error.message}`,
                        variant: "destructive",
                    })
                }
            )
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
        if (!file || !userId || !user) return

        setIsUploading(true)
        try {
            const token = await user.getIdToken()
            if (!token) throw new Error('Not authenticated')

            await uploadLauncherIcon(
                file,
                userId,
                token,
                (url) => {
                    setSettings(prev => ({ ...prev, launcherIcon: "custom", launcherIconUrl: url }))
                    toast({
                        title: "Success",
                        description: "Icon uploaded successfully.",
                    })
                },
                (error) => {
                    toast({
                        title: "Error",
                        description: `Failed to upload icon: ${error.message}`,
                        variant: "destructive",
                    })
                }
            )
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

    const handleAmbientIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !userId || !user) return

        setIsUploading(true)
        try {
            const token = await user.getIdToken()
            if (!token) throw new Error('Not authenticated')

            await uploadAmbientIcon(
                file,
                userId,
                token,
                (url) => {
                    setSettings(prev => ({ ...prev, ambientIconType: 'custom', ambientIconUrl: url }))
                    toast({
                        title: "Success",
                        description: "Custom ambient icon uploaded successfully.",
                    })
                },
                (error) => {
                    toast({
                        title: "Error",
                        description: `Failed to upload icon: ${error.message}`,
                        variant: "destructive",
                    })
                }
            )
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

    const handleLauncherFullImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !userId || !user) return

        setIsUploading(true)
        try {
            const token = await user.getIdToken()
            if (!token) throw new Error('Not authenticated')

            await uploadLauncherFullImage(
                file,
                userId,
                token,
                (url) => {
                    setSettings(prev => ({ ...prev, launcherFullImageUrl: url }))
                },
                (error) => {
                    console.error('Upload error:', error)
                }
            )
        } catch (error) {
            console.error('Upload error:', error)
        } finally {
            setIsUploading(false)
        }
    }


    return (
        <div className="space-y-8">
            {/* Chat Mode Selection */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                <div className="mb-4">
                    <Label className="text-base font-semibold block">{language === 'tr' ? 'Görünüm Modu' : 'Display Mode'}</Label>
                    <p className="text-sm text-muted-foreground">{language === 'tr' ? 'Chatbotun web sitenizde nasıl görüneceğini seçin.' : 'Choose how the chatbot will appear on your website.'}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button onClick={() => applyDisplayPreset("classic_launcher")} className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all text-left ${!isAmbientMode && !isAlwaysOpenMode ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/30 bg-background'}`}>
                        <span className="font-semibold text-sm mb-1">{language === 'tr' ? 'Klasik + Başlatıcı' : 'Classic + Launcher'}</span>
                        <span className="text-xs text-muted-foreground text-center">{language === 'tr' ? 'Standart ikon ile açılır pencere.' : 'Standard popup window with an icon.'}</span>
                    </button>
                    <button onClick={() => applyDisplayPreset("ambient_always_open")} className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all text-left ${isAmbientMode ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/30 bg-background'}`}>
                        <span className="font-semibold text-sm mb-1">{language === 'tr' ? 'Ambient Mod' : 'Ambient Mode'}</span>
                        <span className="text-xs text-muted-foreground text-center">{language === 'tr' ? 'Altta yatan devasa geniş premium chat arayüzü.' : 'Wide, premium bottom-fixed chat.'}</span>
                    </button>
                </div>
            </div>

            {/* Common Settings */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">{language === 'tr' ? 'Ortak Ayarlar' : 'Common Settings'}</h3>
                <Accordion type="multiple" defaultValue={["brand-settings"]} className="w-full space-y-2">
                    <AccordionItem value="brand-settings" className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                            <span className="text-sm font-medium">{t('branding') || 'Marka Ayarları'}</span>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4 pb-6">
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
                                    <Label htmlFor="welcome-title">{t('welcomeTitle') || 'Hoş Geldiniz Başlığı'}</Label>
                                    <Input
                                        id="welcome-title"
                                        placeholder={language === 'tr' ? "Örn: Vion AI'a Hoş Geldiniz" : "E.g: Welcome to Vion AI"}
                                        value={settings.welcomeTitle || ''}
                                        onChange={(e) => setSettings(prev => ({ ...prev, welcomeTitle: e.target.value }))}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {language === 'tr' ? 'Boş bırakılırsa otomatik oluşturulur' : 'Leave empty for auto-generated title'}
                                    </p>
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
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="suggested-questions" className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                            <span className="text-sm font-medium">{t('suggestedQuestions') || 'Önerilen Sorular'}</span>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4 pb-6">
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
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="business-hours" className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center justify-between w-full pr-4">
                                <span className="text-sm font-medium">{t('availability') || 'Çalışma Saatleri'}</span>
                                <Switch
                                    checked={settings.enableBusinessHours}
                                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableBusinessHours: checked }))}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4 pb-6">
                            <div className="space-y-6">
                                <div className="text-sm text-muted-foreground">
                                    {t('enableBusinessHoursDesc')}
                                </div>

                                {settings.enableBusinessHours && (
                                    <div className="grid gap-4">
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
                        </AccordionContent>
                    </AccordionItem>


                </Accordion>
            </div>

            {/* Mode-Specific Settings */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
                    {isAmbientMode ? (language === 'tr' ? 'Ambient Ayarları' : 'Ambient Settings') : (language === 'tr' ? 'Klasik Ayarlar' : 'Classic Settings')}
                </h3>

                {isAmbientMode ? (
                    <Accordion type="single" collapsible defaultValue="ambient-position" className="w-full space-y-2">
                        <AccordionItem value="ambient-position" className="border rounded-lg px-4 bg-card">
                            <AccordionTrigger className="hover:no-underline">
                                <span className="text-sm font-medium">{t('positionLayout') || 'Pozisyon & Efektler'}</span>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4 pb-6">
                                <div className="grid gap-6">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>{language === 'tr' ? 'Mesaj Alan Yüksekliği (px)' : 'Message Rail Height (px)'}</Label>
                                            <Input
                                                type="number"
                                                min={180}
                                                max={800}
                                                value={settings.ambientMaxHeight}
                                                onChange={(e) => {
                                                    const raw = e.target.value === '' ? 0 : Number(e.target.value)
                                                    setSettings(prev => ({ ...prev, ambientMaxHeight: raw }))
                                                }}
                                                onBlur={() => {
                                                    setSettings(prev => ({ ...prev, ambientMaxHeight: Math.max(180, Math.min(800, prev.ambientMaxHeight || 260)) }))
                                                }}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>{language === 'tr' ? 'Arka Plan Siyahlığı (%)' : 'Overlay Opacity (%)'}</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                max={90}
                                                value={Math.round((settings.ambientOverlayOpacity || 0.55) * 100)}
                                                onChange={(e) => {
                                                    const raw = e.target.value === '' ? 0 : Number(e.target.value)
                                                    setSettings(prev => ({ ...prev, ambientOverlayOpacity: raw / 100 }))
                                                }}
                                                onBlur={() => {
                                                    setSettings(prev => ({ ...prev, ambientOverlayOpacity: Math.max(0, Math.min(0.9, prev.ambientOverlayOpacity || 0.55)) }))
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid md:grid-cols-3 gap-4 border-t pt-4">
                                        <div className="grid gap-2">
                                            <Label className="text-xs">{language === 'tr' ? 'Maksimum Genişlik (px)' : 'Max Width (px)'}</Label>
                                            <Input
                                                type="number"
                                                min={300}
                                                max={1200}
                                                value={settings.ambientWidth}
                                                onChange={(e) => {
                                                    const raw = e.target.value === '' ? 0 : Number(e.target.value)
                                                    setSettings(prev => ({ ...prev, ambientWidth: raw }))
                                                }}
                                                onBlur={() => {
                                                    setSettings(prev => ({ ...prev, ambientWidth: Math.max(300, Math.min(1200, prev.ambientWidth || 800)) }))
                                                }}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="text-xs">{language === 'tr' ? 'Yan Boşluk (px)' : 'Side Margin (px)'}</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                max={200}
                                                value={settings.ambientSideMargin}
                                                onChange={(e) => {
                                                    const raw = e.target.value === '' ? 0 : Number(e.target.value)
                                                    setSettings(prev => ({ ...prev, ambientSideMargin: raw }))
                                                }}
                                                onBlur={() => {
                                                    setSettings(prev => ({ ...prev, ambientSideMargin: Math.max(0, Math.min(200, prev.ambientSideMargin || 0)) }))
                                                }}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="text-xs">{language === 'tr' ? 'Alt Boşluk (px)' : 'Bottom Margin (px)'}</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                max={200}
                                                value={settings.ambientBottomMargin}
                                                onChange={(e) => {
                                                    const raw = e.target.value === '' ? 0 : Number(e.target.value)
                                                    setSettings(prev => ({ ...prev, ambientBottomMargin: raw }))
                                                }}
                                                onBlur={() => {
                                                    setSettings(prev => ({ ...prev, ambientBottomMargin: Math.max(0, Math.min(200, prev.ambientBottomMargin || 0)) }))
                                                }}
                                            />
                                        </div>
                                    </div>
                                    {/* Input Size Selector */}
                                    <div className="border-t pt-4">
                                        <Label className="text-xs mb-3 block">{language === 'tr' ? 'Input Boyutu' : 'Input Size'}</Label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {([
                                                { value: 'sm', label: language === 'tr' ? 'Küçük' : 'Small', desc: '44px' },
                                                { value: 'md', label: language === 'tr' ? 'Orta' : 'Medium', desc: '52px' },
                                                { value: 'lg', label: language === 'tr' ? 'Büyük' : 'Large', desc: '60px' },
                                                { value: 'xl', label: language === 'tr' ? 'Çok Büyük' : 'X-Large', desc: '68px' },
                                            ] as const).map(({ value, label, desc }) => (
                                                <button
                                                    key={value}
                                                    type="button"
                                                    onClick={() => setSettings(prev => ({ ...prev, ambientInputSize: value as "sm" | "md" | "lg" | "xl" }))}
                                                    className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${(settings.ambientInputSize || 'lg') === value
                                                        ? 'border-black bg-black text-white shadow-sm'
                                                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <div>{label}</div>
                                                    <div className="text-[10px] opacity-60 mt-0.5">{desc}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Loader Style Selector */}
                                    <div className="border-t pt-4 mt-4">
                                        <Label className="text-xs mb-3 block">{language === 'tr' ? 'Yüklenme Animasyonu' : 'Loader Style'}</Label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {([
                                                { value: 'skeleton', label: language === 'tr' ? 'İskelet' : 'Skeleton', desc: language === 'tr' ? 'Form görünümü' : 'Input shape' },
                                                { value: 'spinner', label: language === 'tr' ? 'Çember' : 'Spinner', desc: language === 'tr' ? 'Klasik döner' : 'Classic spin' },
                                                { value: 'pulsing-icon', label: language === 'tr' ? 'Nefes İkon' : 'Pulsing Icon', desc: language === 'tr' ? 'Marka ikonu' : 'Pulsing brand' },
                                            ] as const).map(({ value, label, desc }) => (
                                                <button
                                                    key={value}
                                                    onClick={() => setSettings(prev => ({ ...prev, widgetLoaderStyle: value as any }))}
                                                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${settings.widgetLoaderStyle === value || (!settings.widgetLoaderStyle && value === 'skeleton')
                                                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                                        : 'border-border hover:border-primary/50 hover:bg-muted/50 text-muted-foreground'
                                                        }`}
                                                >
                                                    <span className="text-sm font-medium">{label}</span>
                                                    <span className="text-[10px] opacity-70 mt-1">{desc}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Ambient Icon Toggle */}
                                    <div className="border-t pt-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <Label className="text-sm font-medium">{language === 'tr' ? 'Widget İkonu Göster' : 'Show Widget Icon'}</Label>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {language === 'tr' ? 'Input çubuğunun solunda marka logonuzu veya ikonunuzu gösterir.' : 'Shows your brand logo or icon on the left side of the input bar.'}
                                                </p>
                                            </div>
                                            <Switch
                                                checked={settings.showAmbientIcon}
                                                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showAmbientIcon: checked }))}
                                            />
                                        </div>
                                        {settings.showAmbientIcon && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant={settings.ambientIconType === "library" ? "secondary" : "outline"}
                                                        onClick={() => setSettings(prev => ({ ...prev, ambientIconType: "library" }))}
                                                    >
                                                        {t('library') || 'Library'}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant={settings.ambientIconType === "custom" ? "secondary" : "outline"}
                                                        onClick={() => setSettings(prev => ({ ...prev, ambientIconType: "custom" }))}
                                                    >
                                                        {t('custom') || 'Custom URL'}
                                                    </Button>
                                                </div>

                                                {settings.ambientIconType === "library" ? (
                                                    <div className="space-y-2">
                                                        <Input
                                                            placeholder={t('searchIcons') || 'Search icons...'}
                                                            className="h-8 text-xs bg-muted/20"
                                                            value={searchTerm}
                                                            onChange={(e) => setSearchTerm(e.target.value)}
                                                        />
                                                        <div className="border rounded-md p-2 h-32 overflow-y-auto grid grid-cols-6 gap-2 bg-muted/10">
                                                            {(searchTerm ? Object.keys(icons) : [
                                                                "MessageSquare", "MessageCircle", "MessageSquareText", "MessagesSquare",
                                                                "Bot", "Sparkles", "Brain", "BrainCircuit", "Cpu", "Zap", "Activity",
                                                                "Headset", "Mic", "Video", "Phone",
                                                                "User", "Users", "UserCheck",
                                                                "HelpCircle", "Info", "AlertCircle",
                                                                "Star", "Heart", "ThumbsUp", "Smile",
                                                                "Send", "Share2", "Paperclip",
                                                                "Command", "Terminal", "Code", "Box",
                                                                "Ghost", "Gamepad2", "Rocket"
                                                            ])
                                                                .filter(key => {
                                                                    if (searchTerm && !key.toLowerCase().includes(searchTerm.toLowerCase())) return false
                                                                    return (icons as any)[key] !== undefined
                                                                })
                                                                .slice(0, 100)
                                                                .map((iconName) => {
                                                                    const Icon = (icons as any)[iconName]
                                                                    if (typeof Icon !== 'function' && typeof Icon !== 'object') return null
                                                                    return (
                                                                        <button
                                                                            key={iconName}
                                                                            onClick={() => setSettings(prev => ({ ...prev, ambientIconType: "library", ambientLibraryIcon: iconName }))}
                                                                            className={`p-2 rounded hover:bg-muted/50 flex items-center justify-center transition-colors ${settings.ambientLibraryIcon === iconName ? 'bg-primary/10 text-primary shadow-sm' : 'text-foreground/70'}`}
                                                                            title={iconName}
                                                                        >
                                                                            <Icon className="w-5 h-5" />
                                                                        </button>
                                                                    )
                                                                })}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        <Label className="text-xs">{language === 'tr' ? 'Özel İkon Görseli Yükle veya Link Gir' : 'Upload Custom Icon or Enter Link'}</Label>
                                                        <div className="flex items-center gap-4">
                                                            <div className="relative w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden group">
                                                                {isUploading ? (
                                                                    <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                                                                ) : settings.ambientIconUrl ? (
                                                                    <div className="relative w-10 h-10">
                                                                        {/* We use generic img tag because it could be an external URL or Firebase storage URL without domain configured in next config */}
                                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                        <img src={settings.ambientIconUrl} alt="Custom Icon" className="w-full h-full object-contain" />
                                                                    </div>
                                                                ) : (
                                                                    <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                                                                )}
                                                                <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                    <Label htmlFor="ambient-icon-upload" className="cursor-pointer text-xs font-medium text-foreground hover:text-primary">
                                                                        {language === 'tr' ? 'Seç' : 'Select'}
                                                                    </Label>
                                                                    <Input
                                                                        id="ambient-icon-upload"
                                                                        type="file"
                                                                        accept="image/*"
                                                                        className="hidden"
                                                                        onChange={handleAmbientIconUpload}
                                                                        disabled={isUploading}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 space-y-1">
                                                                <p className="text-xs text-muted-foreground">
                                                                    {language === 'tr'
                                                                        ? 'Tavsiye edilen boyut: 64x64px (PNG, SVG, JPG). Maks 2MB.'
                                                                        : 'Recommended size: 64x64px (PNG, SVG, JPG). Max 2MB.'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Detaylı Renk Ayarları Akordiyonu */}
                                                <div className="mt-4 border-t pt-4">
                                                    <Accordion type="single" collapsible className="w-full">
                                                        <AccordionItem value="color-settings" className="border rounded-lg px-4 shadow-sm bg-white/50">
                                                            <AccordionTrigger className="hover:no-underline py-3">
                                                                <span className="text-sm font-medium text-gray-700">{t('detailedColorSettings') || 'Detaylı Renk Ayarları'}</span>
                                                            </AccordionTrigger>
                                                            <AccordionContent className="pt-2 pb-4 space-y-4">
                                                                <div className="grid gap-2 border-t pt-2 mt-2">
                                                                    <Label className="text-xs">{t('iconColor') || 'İkon Rengi (Boşsa Marka Rengi)'}</Label>
                                                                    <div className="flex items-center gap-2">
                                                                        <div
                                                                            className="h-8 w-8 rounded-full border shadow-sm"
                                                                            style={{ backgroundColor: settings.ambientIconColor || settings.brandColor }}
                                                                        />
                                                                        <Input
                                                                            type="color"
                                                                            value={settings.ambientIconColor || settings.brandColor}
                                                                            onChange={(e) => setSettings(prev => ({ ...prev, ambientIconColor: e.target.value }))}
                                                                            className="h-8 w-16 p-0.5 cursor-pointer border-0 rounded"
                                                                        />
                                                                        {settings.ambientIconColor && (
                                                                            <Button variant="ghost" size="icon" onClick={() => setSettings(prev => ({ ...prev, ambientIconColor: "" }))} className="h-8 w-8 hover:bg-red-50 hover:text-red-500 transition-colors" title={language === 'tr' ? 'Rengi Sıfırla' : 'Reset Color'}>
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="grid gap-2 border-t pt-2 mt-2">
                                                                    <Label className="text-xs">{t('borderIdleColor') || 'Kapalı Çerçeve Rengi (Boşsa Rainbow)'}</Label>
                                                                    <div className="flex items-center gap-2">
                                                                        {settings.ambientBorderColorIdle ? (
                                                                            <div
                                                                                className="h-8 w-8 rounded-full border shadow-sm"
                                                                                style={{ backgroundColor: settings.ambientBorderColorIdle }}
                                                                            />
                                                                        ) : (
                                                                            <div className="h-8 w-8 rounded-full border shadow-sm bg-[linear-gradient(90deg,#17b5e8_0%,#3f6eea_30%,#7c3aed_48%,#f59e0b_76%,#84cc16_100%)]" />
                                                                        )}
                                                                        <Input
                                                                            type="color"
                                                                            value={settings.ambientBorderColorIdle || "#17b5e8"}
                                                                            onChange={(e) => setSettings(prev => ({ ...prev, ambientBorderColorIdle: e.target.value }))}
                                                                            className="h-8 w-16 p-0.5 cursor-pointer border-0 rounded"
                                                                        />
                                                                        {settings.ambientBorderColorIdle && (
                                                                            <Button variant="ghost" size="icon" onClick={() => setSettings(prev => ({ ...prev, ambientBorderColorIdle: "" }))} className="h-8 w-8 hover:bg-red-50 hover:text-red-500 transition-colors" title={language === 'tr' ? 'Rainbow Efektine Dön' : 'Reset to Rainbow'}>
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="grid gap-2 border-t pt-2 mt-2">
                                                                    <Label className="text-xs">{t('borderFocusedColor') || 'Açık Çerçeve Rengi (Boşsa Marka Rengi)'}</Label>
                                                                    <div className="flex items-center gap-2">
                                                                        <div
                                                                            className="h-8 w-8 rounded-full border shadow-sm"
                                                                            style={{ backgroundColor: settings.ambientBorderColorFocused || settings.brandColor }}
                                                                        />
                                                                        <Input
                                                                            type="color"
                                                                            value={settings.ambientBorderColorFocused || settings.brandColor}
                                                                            onChange={(e) => setSettings(prev => ({ ...prev, ambientBorderColorFocused: e.target.value }))}
                                                                            className="h-8 w-16 p-0.5 cursor-pointer border-0 rounded"
                                                                        />
                                                                        {settings.ambientBorderColorFocused && (
                                                                            <Button variant="ghost" size="icon" onClick={() => setSettings(prev => ({ ...prev, ambientBorderColorFocused: "" }))} className="h-8 w-8 hover:bg-red-50 hover:text-red-500 transition-colors" title={language === 'tr' ? 'Marka Rengine Dön' : 'Reset to Brand Color'}>
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="grid gap-2 border-t pt-2 mt-2">
                                                                    <Label className="text-xs">{t('aiBubbleBgColor') || 'Yapay Zeka Balon Rengi (Boşsa Marka Rengi)'}</Label>
                                                                    <div className="flex items-center gap-2">
                                                                        <div
                                                                            className="h-8 w-8 rounded-full border shadow-sm"
                                                                            style={{ backgroundColor: settings.ambientAiBubbleColor || settings.brandColor }}
                                                                        />
                                                                        <Input
                                                                            type="color"
                                                                            value={settings.ambientAiBubbleColor || settings.brandColor}
                                                                            onChange={(e) => setSettings(prev => ({ ...prev, ambientAiBubbleColor: e.target.value }))}
                                                                            className="h-8 w-16 p-0.5 cursor-pointer border-0 rounded"
                                                                        />
                                                                        {settings.ambientAiBubbleColor && (
                                                                            <Button variant="ghost" size="icon" onClick={() => setSettings(prev => ({ ...prev, ambientAiBubbleColor: "" }))} className="h-8 w-8 hover:bg-red-50 hover:text-red-500 transition-colors" title={language === 'tr' ? 'Varsayılan Marka Rengine Dön' : 'Reset to Brand Color'}>
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="grid gap-2 border-t pt-2 mt-4">
                                                                    <Label className="text-xs font-semibold text-gray-500">{t('closedFormColors') || 'Sohbet Kapalıyken (Kapalı Form) Renkleri'}</Label>

                                                                    <div className="grid gap-2 mt-2">
                                                                        <Label className="text-xs">{t('closedFormBgColor') || 'Zemin Rengi (Boşsa İlk Gri)'}</Label>
                                                                        <div className="flex items-center gap-2">
                                                                            <div
                                                                                className="h-8 w-8 rounded-full border shadow-sm"
                                                                                style={{ backgroundColor: settings.ambientClosedBgColor || '#f3f4f6' }}
                                                                            />
                                                                            <Input
                                                                                type="color"
                                                                                value={settings.ambientClosedBgColor || '#f3f4f6'}
                                                                                onChange={(e) => setSettings(prev => ({ ...prev, ambientClosedBgColor: e.target.value }))}
                                                                                className="h-8 w-16 p-0.5 cursor-pointer border-0 rounded"
                                                                            />
                                                                            {settings.ambientClosedBgColor && (
                                                                                <Button variant="ghost" size="icon" onClick={() => setSettings(prev => ({ ...prev, ambientClosedBgColor: "" }))} className="h-8 w-8 hover:bg-red-50 hover:text-red-500 transition-colors" title={language === 'tr' ? 'Varsayılan Zemin Rengine Dön' : 'Reset to Default Background'}>
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="grid gap-2 mt-2">
                                                                        <Label className="text-xs">{t('closedFormTextColor') || 'Form Yazı Rengi (Boşsa Koyu Gri)'}</Label>
                                                                        <div className="flex items-center gap-2">
                                                                            <div
                                                                                className="h-8 w-8 rounded-full border shadow-sm"
                                                                                style={{ backgroundColor: settings.ambientInputTextColor || '#374151' }}
                                                                            />
                                                                            <Input
                                                                                type="color"
                                                                                value={settings.ambientInputTextColor || '#374151'}
                                                                                onChange={(e) => setSettings(prev => ({ ...prev, ambientInputTextColor: e.target.value }))}
                                                                                className="h-8 w-16 p-0.5 cursor-pointer border-0 rounded"
                                                                            />
                                                                            {settings.ambientInputTextColor && (
                                                                                <Button variant="ghost" size="icon" onClick={() => setSettings(prev => ({ ...prev, ambientInputTextColor: "" }))} className="h-8 w-8 hover:bg-red-50 hover:text-red-500 transition-colors" title={language === 'tr' ? 'Varsayılan Yazı Rengine Dön' : 'Reset to Default Text Color'}>
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="grid gap-2 mt-2">
                                                                        <Label className="text-xs">{t('closedFormBorderIdleColor') || 'Şifreli Çerçeve Rengi - Normal (Boşsa Zemin Gri)'}</Label>
                                                                        <div className="flex items-center gap-2">
                                                                            <div
                                                                                className="h-8 w-8 rounded-full border shadow-sm"
                                                                                style={{ backgroundColor: settings.ambientClosedBorderColorIdle || '#f3f4f6' }}
                                                                            />
                                                                            <Input
                                                                                type="color"
                                                                                value={settings.ambientClosedBorderColorIdle || '#f3f4f6'}
                                                                                onChange={(e) => setSettings(prev => ({ ...prev, ambientClosedBorderColorIdle: e.target.value }))}
                                                                                className="h-8 w-16 p-0.5 cursor-pointer border-0 rounded"
                                                                            />
                                                                            {settings.ambientClosedBorderColorIdle && (
                                                                                <Button variant="ghost" size="icon" onClick={() => setSettings(prev => ({ ...prev, ambientClosedBorderColorIdle: "" }))} className="h-8 w-8 hover:bg-red-50 hover:text-red-500 transition-colors" title={language === 'tr' ? 'Varsayılan Normal Çerçeveye Dön' : 'Reset to Default Idle Border'}>
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="grid gap-2 mt-2">
                                                                        <Label className="text-xs">{t('closedFormBorderFocusedColor') || 'Sınırlı Çerçeve Rengi - Aktif (Boşsa Koyu Gri)'}</Label>
                                                                        <div className="flex items-center gap-2">
                                                                            <div
                                                                                className="h-8 w-8 rounded-full border shadow-sm"
                                                                                style={{ backgroundColor: settings.ambientClosedBorderColorFocused || '#d1d5db' }}
                                                                            />
                                                                            <Input
                                                                                type="color"
                                                                                value={settings.ambientClosedBorderColorFocused || '#d1d5db'}
                                                                                onChange={(e) => setSettings(prev => ({ ...prev, ambientClosedBorderColorFocused: e.target.value }))}
                                                                                className="h-8 w-16 p-0.5 cursor-pointer border-0 rounded"
                                                                            />
                                                                            {settings.ambientClosedBorderColorFocused && (
                                                                                <Button variant="ghost" size="icon" onClick={() => setSettings(prev => ({ ...prev, ambientClosedBorderColorFocused: "" }))} className="h-8 w-8 hover:bg-red-50 hover:text-red-500 transition-colors" title={language === 'tr' ? 'Varsayılan Aktif Çerçeveye Dön' : 'Reset to Default Focused Border'}>
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                    </Accordion>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                ) : (
                    <Accordion type="single" collapsible defaultValue="widget-position" className="w-full space-y-2">
                        <AccordionItem value="widget-position" className="border rounded-lg px-4">
                            <AccordionTrigger className="hover:no-underline">
                                <span className="text-sm font-medium">{t('positionLayout') || 'Widget Pozisyonu'}</span>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4 pb-6">
                                <div className="space-y-6">
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
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="header-customization" className="border rounded-lg px-4">
                            <AccordionTrigger className="hover:no-underline">
                                <span className="text-sm font-medium">{t('headerCustomization') || 'Header Özelleştirme'}</span>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4 pb-6">
                                <div className="space-y-6">
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
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="launcher-settings" className="border rounded-lg px-4">
                            <AccordionTrigger className="hover:no-underline">
                                <span className="text-sm font-medium">{t('launcherAppearance') || 'Launcher Ayarları'}</span>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4 pb-6">
                                <div className="space-y-6">
                                    {isAlwaysOpenMode ? (
                                        <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                                            {language === 'tr'
                                                ? 'Bu modda başlatıcı devre dışı. Launcher ayarları yalnızca "Klasik + Başlatıcı" modunda kullanılabilir.'
                                                : 'Launcher is disabled in this mode. Launcher settings are available only in "Classic + Launcher" mode.'}
                                        </div>
                                    ) : (
                                        <>

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
                                                                    {settings.launcherFullImageUrl ? (
                                                                        <Image src={settings.launcherFullImageUrl} alt="Launcher" fill className="object-contain" unoptimized />
                                                                    ) : (
                                                                        <ImageIcon className="w-6 h-6 text-muted-foreground" />
                                                                    )}
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onChange={handleLauncherFullImageUpload}
                                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                                    />
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
                                                            <Input type="number" value={settings.fullImageLauncherWidth} onChange={(e) => setSettings(prev => ({ ...prev, fullImageLauncherWidth: parseInt(e.target.value) || 60 }))} />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label>{t('height') || 'Height'} (px)</Label>
                                                            <Input type="number" value={settings.fullImageLauncherHeight} onChange={(e) => setSettings(prev => ({ ...prev, fullImageLauncherHeight: parseInt(e.target.value) || 60 }))} />
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
                                            {settings.launcherType === "standard" && (
                                                <div className="grid gap-4">
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

                                                    {settings.launcherStyle === 'icon_text' && (
                                                        <div className="flex items-center justify-between space-x-2 border p-3 rounded-lg bg-muted/20">
                                                            <div className="space-y-0.5">
                                                                <Label className="text-sm">{t('autoCollapse') || 'Otomatik Daralt'}</Label>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {t('autoCollapseDesc') || '5 sn sonra daralarak sadece ikon görünür'}
                                                                </p>
                                                            </div>
                                                            <Switch
                                                                checked={settings.launcherCollapse || false}
                                                                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, launcherCollapse: checked }))}
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
                                                            <Input type="number" value={settings.launcherWidth} onChange={(e) => setSettings(prev => ({ ...prev, launcherWidth: parseInt(e.target.value) || 60 }))} />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label>{t('height') || 'Height'} (px)</Label>
                                                            <Input type="number" value={settings.launcherHeight} onChange={(e) => setSettings(prev => ({ ...prev, launcherHeight: parseInt(e.target.value) || 60 }))} />
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
                                                                        {(searchTerm ? Object.keys(icons) : [
                                                                            "MessageSquare", "MessageCircle", "MessageSquareText", "MessagesSquare",
                                                                            "Bot", "Sparkles", "Brain", "BrainCircuit", "Cpu", "Zap", "Activity",
                                                                            "Headset", "Mic", "Video", "Phone",
                                                                            "User", "Users", "UserCheck",
                                                                            "HelpCircle", "Info", "AlertCircle",
                                                                            "Star", "Heart", "ThumbsUp", "Smile",
                                                                            "Send", "Share2", "Paperclip",
                                                                            "Command", "Terminal", "Code", "Box",
                                                                            "Ghost", "Gamepad2", "Rocket"
                                                                        ])
                                                                            .filter(key => {
                                                                                if (searchTerm && !key.toLowerCase().includes(searchTerm.toLowerCase())) return false
                                                                                return (icons as any)[key] !== undefined
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
                                        </>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="effects-spacing" className="border rounded-lg px-4">
                            <AccordionTrigger className="hover:no-underline">
                                <span className="text-sm font-medium">{t('effectsSpacing') || 'Efektler ve Boşluklar'}</span>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4 pb-6">
                                <div className="space-y-6">
                                    <div className="grid gap-4">
                                        {/* Device Toggle */}
                                        <div className="flex p-1 bg-muted rounded-lg w-full mb-4">
                                            <button
                                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeDevice === 'desktop' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                                onClick={() => setActiveDevice('desktop')}
                                            >
                                                {t('desktop') || 'Desktop'}
                                            </button>
                                            <button
                                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeDevice === 'mobile' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                                onClick={() => setActiveDevice('mobile')}
                                            >
                                                {t('mobile') || 'Mobile'}
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label className="text-xs">{t('verticalSpacing')} ({activeDevice === 'desktop' ? 'Desktop' : 'Mobile'})</Label>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        value={activeDevice === 'desktop' ? settings.bottomSpacing : (settings.mobileBottomSpacing ?? 20)}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value);
                                                            if (activeDevice === 'desktop') {
                                                                setSettings(prev => ({ ...prev, bottomSpacing: val }))
                                                            } else {
                                                                setSettings(prev => ({ ...prev, mobileBottomSpacing: val }))
                                                            }
                                                        }}
                                                        className="flex-1"
                                                    />
                                                    <span className="text-xs w-8 text-right">
                                                        {activeDevice === 'desktop' ? settings.bottomSpacing : (settings.mobileBottomSpacing ?? 20)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label className="text-xs">{t('sideSpacing')} ({activeDevice === 'desktop' ? 'Desktop' : 'Mobile'})</Label>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        value={activeDevice === 'desktop' ? settings.sideSpacing : (settings.mobileSideSpacing ?? 20)}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value);
                                                            if (activeDevice === 'desktop') {
                                                                setSettings(prev => ({ ...prev, sideSpacing: val }))
                                                            } else {
                                                                setSettings(prev => ({ ...prev, mobileSideSpacing: val }))
                                                            }
                                                        }}
                                                        className="flex-1"
                                                    />
                                                    <span className="text-xs w-8 text-right">
                                                        {activeDevice === 'desktop' ? settings.sideSpacing : (settings.mobileSideSpacing ?? 20)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>{t('animationLoop') || 'Animasyon Döngüsü'} ({activeDevice === 'desktop' ? 'Desktop' : 'Mobile'})</Label>
                                            {isAlwaysOpenMode ? (
                                                <p className="text-xs text-muted-foreground">
                                                    {language === 'tr'
                                                        ? 'Launcher kapalı olduğu için animasyon seçimi uygulanmaz.'
                                                        : 'Animation selection does not apply because launcher is disabled.'}
                                                </p>
                                            ) : (
                                                <div className="grid grid-cols-3 gap-2">
                                                    {['none', 'pulse', 'bounce', 'wiggle', 'float', 'spin'].map((anim) => {
                                                        const currentAnim = activeDevice === 'desktop' ? settings.launcherAnimation : (settings.mobileLauncherAnimation ?? 'none');
                                                        return (
                                                            <button
                                                                key={anim}
                                                                onClick={() => {
                                                                    if (activeDevice === 'desktop') {
                                                                        setSettings(prev => ({ ...prev, launcherAnimation: anim }))
                                                                    } else {
                                                                        setSettings(prev => ({ ...prev, mobileLauncherAnimation: anim }))
                                                                    }
                                                                }}
                                                                className={`p-2 rounded-md border text-xs capitalize transition-all ${currentAnim === anim ? 'border-primary bg-primary/5 font-medium' : 'border-muted hover:bg-muted'}`}
                                                            >
                                                                {anim}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )}
            </div>
        </div >
    )
}

