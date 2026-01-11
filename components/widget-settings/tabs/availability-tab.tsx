"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useLanguage } from "@/context/LanguageContext"
import { WidgetSettings } from "@/hooks/use-widget-settings"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface AvailabilityTabProps {
    settings: WidgetSettings
    setSettings: React.Dispatch<React.SetStateAction<WidgetSettings>>
}

export function AvailabilityTab({ settings, setSettings }: AvailabilityTabProps) {
    const { t } = useLanguage()

    return (
        <Accordion type="single" collapsible defaultValue="business-hours" className="w-full space-y-2">
            {/* Business Hours */}
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
