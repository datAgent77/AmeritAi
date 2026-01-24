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
import { uploadHeaderLogo, uploadLauncherIcon, uploadLauncherFullImage } from "@/lib/widget-settings-utils"
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
        <Accordion type="single" collapsible defaultValue="brand-settings" className="w-full space-y-2">
            {/* Marka Ayarları */}
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

            {/* Önerilen Sorular */}
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

            {/* Widget Position */}
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

            {/* Header Customization */}
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

            {/* Launcher Settings */}
            <AccordionItem value="launcher-settings" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                    <span className="text-sm font-medium">{t('launcherAppearance') || 'Launcher Ayarları'}</span>
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-6">
                    <div className="space-y-6">

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
                    </div>
                </AccordionContent>
            </AccordionItem>

            {/* Effects & Spacing */}
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
                    </div>
                </div>
                    </div>
                </AccordionContent>
            </AccordionItem>

            {/* Çalışma Saatleri */}
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
    )
}
