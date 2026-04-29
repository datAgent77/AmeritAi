import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EngagementSettings } from "../types"
import { TriggerCard } from "../components/trigger-card"

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
                        label="Exit Intent (Çıkış Niyeti)"
                        description="Kullanıcı fareyi pencere dışına çıkardığında."
                        messageListKey="exitIntentMessages"
                        settings={settings}
                        setSettings={setSettings}
                    />

                    <TriggerCard
                        id="scrollDepth"
                        label="Scroll Derinliği"
                        description={`Sayfanın belirli bir kısmına inildiğinde (%${getTriggerNumber('scrollDepth')})`}
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
                        label="Hareketsizlik (Idle)"
                        description={`Kullanıcı ${getTriggerNumber('inactivity')} saniye işlem yapmazsa`}
                        configInput={
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number" className="w-16 h-8 text-xs" min={0}
                                    value={getTriggerNumber('inactivity')}
                                    onChange={(e) => setSettings(p => ({ ...p, triggers: { ...p.triggers, inactivity: parseInt(e.target.value) || 0 } }))}
                                />
                                <span className="text-xs text-muted-foreground">sn</span>
                            </div>
                        }
                        messageListKey="inactivityMessages"
                        settings={settings}
                        setSettings={setSettings}
                    />

                    <TriggerCard
                        id="timeOnPage"
                        label="Sayfada Geçirilen Süre"
                        description={`${getTriggerNumber('timeOnPage')} saniye sonra (Hareketsizlikten bağımsız)`}
                        configInput={
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number" className="w-16 h-8 text-xs" min={0}
                                    value={getTriggerNumber('timeOnPage')}
                                    onChange={(e) => setSettings(p => ({ ...p, triggers: { ...p.triggers, timeOnPage: parseInt(e.target.value) || 0 } }))}
                                />
                                <span className="text-xs text-muted-foreground">sn</span>
                            </div>
                        }
                        messageListKey="timeOnPageMessages"
                        settings={settings}
                        setSettings={setSettings}
                    />

                    <TriggerCard
                        id="clickCount"
                        label="Tıklama Sayısı"
                        description={`${getTriggerNumber('clickCount')} tıklamadan sonra`}
                        configInput={
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number" className="w-16 h-8 text-xs" min={0}
                                    value={getTriggerNumber('clickCount')}
                                    onChange={(e) => setSettings(p => ({ ...p, triggers: { ...p.triggers, clickCount: parseInt(e.target.value) || 0 } }))}
                                />
                                <span className="text-xs text-muted-foreground">tık</span>
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
