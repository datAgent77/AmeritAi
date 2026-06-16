import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EngagementSettings } from "../types"
import { TriggerCard } from "../components/trigger-card"
import { useLanguage } from "@/context/LanguageContext"

interface EngagementTriggersTabProps {
    settings: EngagementSettings
    setSettings: React.Dispatch<React.SetStateAction<EngagementSettings>>
}

const numericTriggerDefaults = {
    scrollDepth: 50,
    inactivity: 30,
    timeOnPage: 10,
    clickCount: 3,
}

export function EngagementTriggersTab({ settings, setSettings }: EngagementTriggersTabProps) {
    const { t } = useLanguage()
    const getTriggerNumber = (key: 'scrollDepth' | 'inactivity' | 'timeOnPage' | 'clickCount') => {
        const value = (settings.triggers as Record<string, unknown>)[key]
        if (value === true) return numericTriggerDefaults[key]
        return typeof value === 'number' && Number.isFinite(value) ? value : 0
    }

    return (
        <div className="space-y-6">
            <Card className="border-0 shadow-none bg-transparent">
                <CardContent className="p-0 space-y-4">

                    <TriggerCard
                        id="exitIntent"
                        label={t('trigExitIntent')}
                        description={t('trigExitIntentDesc')}
                        messageListKey="exitIntentMessages"
                        settings={settings}
                        setSettings={setSettings}
                    />

                    <TriggerCard
                        id="scrollDepth"
                        label={t('trigScrollDepth')}
                        description={t('trigScrollDepthDesc').replace('{n}', String(getTriggerNumber('scrollDepth')))}
                        configInput={
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number" className="w-16 h-8 text-xs" min={0} max={100}
                                    value={getTriggerNumber('scrollDepth')}
                                    onChange={(e) => setSettings(p => ({ ...p, triggers: { ...p.triggers, scrollDepth: parseInt(e.target.value) || 0 } }))}
                                />
                                <span className="text-xs text-muted-foreground">%</span>
                            </div>
                        }
                        messageListKey="scrollDepthMessages"
                        settings={settings}
                        setSettings={setSettings}
                    />

                    <TriggerCard
                        id="inactivity"
                        label={t('trigInactivity')}
                        description={t('trigInactivityDesc').replace('{n}', String(getTriggerNumber('inactivity')))}
                        configInput={
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number" className="w-16 h-8 text-xs" min={0}
                                    value={getTriggerNumber('inactivity')}
                                    onChange={(e) => setSettings(p => ({ ...p, triggers: { ...p.triggers, inactivity: parseInt(e.target.value) || 0 } }))}
                                />
                                <span className="text-xs text-muted-foreground">{t('unitSeconds')}</span>
                            </div>
                        }
                        messageListKey="inactivityMessages"
                        settings={settings}
                        setSettings={setSettings}
                    />

                    <TriggerCard
                        id="timeOnPage"
                        label={t('trigTimeOnPage')}
                        description={t('trigTimeOnPageDesc').replace('{n}', String(getTriggerNumber('timeOnPage')))}
                        configInput={
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number" className="w-16 h-8 text-xs" min={0}
                                    value={getTriggerNumber('timeOnPage')}
                                    onChange={(e) => setSettings(p => ({ ...p, triggers: { ...p.triggers, timeOnPage: parseInt(e.target.value) || 0 } }))}
                                />
                                <span className="text-xs text-muted-foreground">{t('unitSeconds')}</span>
                            </div>
                        }
                        messageListKey="timeOnPageMessages"
                        settings={settings}
                        setSettings={setSettings}
                    />

                    <TriggerCard
                        id="clickCount"
                        label={t('trigClickCount')}
                        description={t('trigClickCountDesc').replace('{n}', String(getTriggerNumber('clickCount')))}
                        configInput={
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number" className="w-16 h-8 text-xs" min={0}
                                    value={getTriggerNumber('clickCount')}
                                    onChange={(e) => setSettings(p => ({ ...p, triggers: { ...p.triggers, clickCount: parseInt(e.target.value) || 0 } }))}
                                />
                                <span className="text-xs text-muted-foreground">{t('unitClicks')}</span>
                            </div>
                        }
                        messageListKey="clickCountMessages"
                        settings={settings}
                        setSettings={setSettings}
                    />

                </CardContent>
            </Card>
        </div>
    )
}
