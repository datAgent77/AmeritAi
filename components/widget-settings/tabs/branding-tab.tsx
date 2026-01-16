"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { WidgetSettings } from "@/hooks/use-widget-settings"
import { INDUSTRY_CONFIG } from "@/lib/industry-config"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface BrandingTabProps {
    settings: WidgetSettings
    setSettings: React.Dispatch<React.SetStateAction<WidgetSettings>>
}

export function BrandingTab({ settings, setSettings }: BrandingTabProps) {
    const { t, language } = useLanguage()

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
        </Accordion>
    )
}
