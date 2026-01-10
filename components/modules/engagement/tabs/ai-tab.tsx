import { Bot, Clock, Eye, Layout, Lock, MessageCircle, MousePointerClick, Settings2, Sparkles, Zap, Plus, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EngagementSettings } from "../types"
import { EngagementHeroCard } from "../components/hero-card"

interface EngagementAITabProps {
    settings: EngagementSettings
    setSettings: React.Dispatch<React.SetStateAction<EngagementSettings>>
}

export function EngagementAITab({ settings, setSettings }: EngagementAITabProps) {
    return (
        <div className="space-y-6">
            <EngagementHeroCard settings={settings} setSettings={setSettings} />

            {settings.aiSmartBubbles.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* 1. Behavior Card */}
                    <Card className="border shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-medium flex items-center gap-2">
                                <Bot className="w-4 h-4 text-purple-500" />
                                Davranış & Ton
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">İletişim Tonu</Label>
                                <Select
                                    value={settings.aiSmartBubbles.tone}
                                    onValueChange={(val: any) => setSettings(p => ({ ...p, aiSmartBubbles: { ...p.aiSmartBubbles, tone: val } }))}
                                >
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="friendly">👋 Samimi & Sıcak</SelectItem>
                                        <SelectItem value="professional">👔 Profesyonel & Resmi</SelectItem>
                                        <SelectItem value="playful">🎉 Eğlenceli & Enerjik</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Mesaj Uzunluğu</Label>
                                <div className="flex bg-muted p-1 rounded-lg">
                                    {['short', 'medium', 'detailed'].map((len) => (
                                        <button
                                            key={len}
                                            onClick={() => setSettings(p => ({ ...p, aiSmartBubbles: { ...p.aiSmartBubbles, messageLength: len as any } }))}
                                            className={`flex-1 text-xs py-1.5 rounded-md transition-all ${settings.aiSmartBubbles.messageLength === len ? 'bg-background shadow-sm text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            {len === 'short' ? 'Kısa' : len === 'medium' ? 'Orta' : 'Detaylı'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. Timing & Limits Card */}
                    <Card className="border shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-medium flex items-center gap-2">
                                <Clock className="w-4 h-4 text-blue-500" />
                                Zamanlama & Limitler
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <Label className="text-xs text-muted-foreground">Gösterim Sıklığı</Label>
                                    <span className="text-xs font-mono">{settings.aiSmartBubbles.frequency}sn</span>
                                </div>
                                <Slider
                                    value={[settings.aiSmartBubbles.frequency]}
                                    min={5} max={120} step={5}
                                    onValueChange={(val) => setSettings(p => ({ ...p, aiSmartBubbles: { ...p.aiSmartBubbles, frequency: val[0] as any } }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <Label className="text-xs text-muted-foreground">Oturum Başına Max</Label>
                                    <span className="text-xs font-mono">{settings.aiSmartBubbles.maxPerSession === 0 ? 'Sınırsız' : settings.aiSmartBubbles.maxPerSession}</span>
                                </div>
                                <Slider
                                    value={[settings.aiSmartBubbles.maxPerSession]}
                                    min={0} max={20} step={1}
                                    onValueChange={(val) => setSettings(p => ({ ...p, aiSmartBubbles: { ...p.aiSmartBubbles, maxPerSession: val[0] } }))}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. Targeting Card - With Segmented Control */}
                    <Card className="border shadow-sm hover:shadow-md transition-all md:col-span-2">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-base font-medium flex items-center gap-2">
                                    <MousePointerClick className="w-4 h-4 text-green-500" />
                                    Hedefleme
                                </CardTitle>
                                <div className="flex bg-muted p-1 rounded-lg">
                                    {[
                                        { id: 'all', label: 'Tüm Sayfalar' },
                                        { id: 'homepage', label: 'Sadece Anasayfa' },
                                        { id: 'custom', label: 'Özel Sayfalar' }
                                    ].map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => setSettings(p => ({ ...p, aiSmartBubbles: { ...p.aiSmartBubbles, targeting: t.id as any } }))}
                                            className={`px-3 py-1 text-xs rounded-md transition-all ${settings.aiSmartBubbles.targeting === t.id ? 'bg-background shadow-sm text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </CardHeader>
                        {settings.aiSmartBubbles.targeting === 'custom' && (
                            <CardContent className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Hedef URL'ler (Her satıra bir tane)</Label>
                                    <div className="space-y-2">
                                        {settings.aiSmartBubbles.targetUrls.map((url, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <Input
                                                    value={url}
                                                    onChange={(e) => {
                                                        const newUrls = [...settings.aiSmartBubbles.targetUrls];
                                                        newUrls[idx] = e.target.value;
                                                        setSettings(p => ({ ...p, aiSmartBubbles: { ...p.aiSmartBubbles, targetUrls: newUrls } }));
                                                    }}
                                                    className="h-8 text-xs"
                                                    placeholder="https://example.com/urunler"
                                                />
                                                <Button
                                                    variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => {
                                                        const newUrls = settings.aiSmartBubbles.targetUrls.filter((_, i) => i !== idx);
                                                        setSettings(p => ({ ...p, aiSmartBubbles: { ...p.aiSmartBubbles, targetUrls: newUrls } }));
                                                    }}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        ))}
                                        <Button
                                            variant="outline" size="sm" className="h-7 text-xs w-full border-dashed"
                                            onClick={() => setSettings(p => ({ ...p, aiSmartBubbles: { ...p.aiSmartBubbles, targetUrls: [...p.aiSmartBubbles.targetUrls, ''] } }))}
                                        >
                                            <Plus className="w-3 h-3 mr-1.5" /> URL Ekle
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        )}
                    </Card>

                    {/* 4. Constraints Card */}
                    <Card className="border shadow-sm hover:shadow-md transition-all md:col-span-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-medium flex items-center gap-2">
                                <Settings2 className="w-4 h-4 text-orange-500" />
                                Kısıtlamalar
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-medium">Sessiz Saatler</Label>
                                    <p className="text-xs text-muted-foreground">Belirli saatlerde AI mesajı göndermeyi durdur.</p>
                                </div>
                                <Switch
                                    checked={settings.aiSmartBubbles.quietHours.enabled}
                                    onCheckedChange={(c) => setSettings(p => ({ ...p, aiSmartBubbles: { ...p.aiSmartBubbles, quietHours: { ...p.aiSmartBubbles.quietHours, enabled: c } } }))}
                                />
                            </div>

                            {settings.aiSmartBubbles.quietHours.enabled && (
                                <div className="mt-4 p-4 border rounded-lg bg-card animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-4">
                                        <div className="space-y-2 flex-1">
                                            <Label className="text-xs text-muted-foreground">Başlangıç</Label>
                                            <Select
                                                value={settings.aiSmartBubbles.quietHours.startHour.toString()}
                                                onValueChange={(val) => setSettings(p => ({ ...p, aiSmartBubbles: { ...p.aiSmartBubbles, quietHours: { ...p.aiSmartBubbles.quietHours, startHour: parseInt(val) } } }))}
                                            >
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent className="h-48">
                                                    {Array.from({ length: 24 }).map((_, i) => (
                                                        <SelectItem key={i} value={i.toString()}>{`${i}:00`}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="text-muted-foreground mt-6">→</div>
                                        <div className="space-y-2 flex-1">
                                            <Label className="text-xs text-muted-foreground">Bitiş</Label>
                                            <Select
                                                value={settings.aiSmartBubbles.quietHours.endHour.toString()}
                                                onValueChange={(val) => setSettings(p => ({ ...p, aiSmartBubbles: { ...p.aiSmartBubbles, quietHours: { ...p.aiSmartBubbles.quietHours, endHour: parseInt(val) } } }))}
                                            >
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent className="h-48">
                                                    {Array.from({ length: 24 }).map((_, i) => (
                                                        <SelectItem key={i} value={i.toString()}>{`${i}:00`}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-2">
                                        Seçilen saatler arasında (örn: gece yarısından sabah 8'e kadar) AI baloncukları gösterilmez.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>
            )}
        </div>
    )
}
