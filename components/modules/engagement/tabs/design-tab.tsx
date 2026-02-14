import { Layout, Lock, Sparkles, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { EngagementLanguage, EngagementSettings } from "../types"

interface EngagementDesignTabProps {
    settings: EngagementSettings
    setSettings: React.Dispatch<React.SetStateAction<EngagementSettings>>
}

export function EngagementDesignTab({ settings, setSettings }: EngagementDesignTabProps) {
    const updateStyle = (key: keyof EngagementSettings['bubble']['style'], value: any) => {
        setSettings(prev => ({
            ...prev,
            bubble: {
                ...prev.bubble,
                style: {
                    ...prev.bubble.style,
                    [key]: value
                }
            }
        }))
    }

    return (
        <Card className="border-0 shadow-none bg-transparent">
            <CardContent className="p-1 grid gap-8">
                <div className="space-y-3">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Efekt Tipi</Label>
                    <div className="grid grid-cols-4 gap-3">
                        {[
                            { id: 'solid', label: 'Solid', icon: Layout },
                            { id: 'glass', label: 'Glass', icon: Sparkles },
                            { id: 'gradient', label: 'Gradient', icon: TrendingUp },
                            { id: 'outline', label: 'Outline', icon: Lock }
                        ].map((style) => (
                            <div
                                key={style.id}
                                onClick={() => updateStyle('effect', style.id)}
                                className={`cursor-pointer group relative overflow-hidden rounded-xl border p-4 flex flex-col items-center justify-center gap-3 transition-all duration-200 ${settings.bubble.style.effect === style.id
                                    ? 'border-primary ring-1 ring-primary bg-primary/5 shadow-sm'
                                    : 'border-border bg-background hover:border-primary/50 hover:bg-muted/30'
                                    }`}
                            >
                                <div className={`p-2 rounded-full transition-colors ${settings.bubble.style.effect === style.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-white group-hover:text-primary'}`}>
                                    <style.icon className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-medium">{style.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid gap-6 p-5 rounded-xl border bg-card/50">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Şekil</Label>
                            <Select
                                value={settings.bubble.style.shape}
                                onValueChange={(val: any) => updateStyle('shape', val)}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="rounded">Köşeli (Rounded)</SelectItem>
                                    <SelectItem value="pill">Hap (Pill)</SelectItem>
                                    <SelectItem value="square">Kare (Square)</SelectItem>
                                    <SelectItem value="speech">Konuşma Balonu</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Konum</Label>
                            <Select
                                value={settings.bubble.position}
                                onValueChange={(val: any) => setSettings(p => ({ ...p, bubble: { ...p.bubble, position: val } }))}
                            >
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="top">Üst (Top)</SelectItem>
                                    <SelectItem value="left">Sol (Left)</SelectItem>
                                    <SelectItem value="right">Sağ (Right)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Balon Dili</Label>
                        <Select
                            value={settings.language}
                            onValueChange={(val: EngagementLanguage) => setSettings(p => ({ ...p, language: val }))}
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="auto">Otomatik Algıla (Tarayıcı Dili)</SelectItem>
                                <SelectItem value="tr">Türkçe</SelectItem>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="es">Español</SelectItem>
                                <SelectItem value="de">Deutsch</SelectItem>
                                <SelectItem value="fr">Français</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-2">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Arka Plan Rengi</Label>
                            <div className="flex gap-2 items-center">
                                <div className="relative w-9 h-9 rounded-lg overflow-hidden border shadow-sm shrink-0">
                                    <Input
                                        type="color"
                                        value={settings.bubble.style.backgroundColor}
                                        onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                                        className="absolute -top-2 -left-2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                                    />
                                </div>
                                <Input
                                    value={settings.bubble.style.backgroundColor}
                                    onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                                    className="h-9 font-mono text-xs uppercase"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Metin Rengi</Label>
                            <div className="flex gap-2 items-center">
                                <div className="relative w-9 h-9 rounded-lg overflow-hidden border shadow-sm shrink-0">
                                    <Input
                                        type="color"
                                        value={settings.bubble.style.textColor}
                                        onChange={(e) => updateStyle('textColor', e.target.value)}
                                        className="absolute -top-2 -left-2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                                    />
                                </div>
                                <Input
                                    value={settings.bubble.style.textColor}
                                    onChange={(e) => updateStyle('textColor', e.target.value)}
                                    className="h-9 font-mono text-xs uppercase"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 pt-2">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Label className="text-sm font-medium">Yuvarlaklık (Border Radius)</Label>
                            <Badge variant="outline" className="font-mono text-[10px] h-5">{settings.bubble.style.borderRadius}px</Badge>
                        </div>
                        <Slider
                            value={[settings.bubble.style.borderRadius]}
                            max={50}
                            step={1}
                            onValueChange={(vals: number[]) => updateStyle('borderRadius', vals[0])}
                            className="[&_.range]:bg-primary"
                        />
                    </div>

                    {settings.bubble.style.effect === 'glass' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
                            <div className="flex justify-between items-center">
                                <Label className="text-sm font-medium">Bulanıklık (Blur)</Label>
                                <Badge variant="outline" className="font-mono text-[10px] h-5">{settings.bubble.style.backdropBlur || 0}px</Badge>
                            </div>
                            <Slider
                                value={[settings.bubble.style.backdropBlur || 0]}
                                max={20}
                                step={1}
                                onValueChange={(vals: number[]) => updateStyle('backdropBlur', vals[0])}
                            />
                        </div>
                    )}

                    <div className="space-y-2 pt-2">
                        <div className="flex justify-between items-center">
                            <Label className="text-sm font-medium">Gölge (Shadow)</Label>
                        </div>
                        <Select
                            value={settings.bubble.style.shadow}
                            onValueChange={(val: any) => updateStyle('shadow', val)}
                        >
                            <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Yok (None)</SelectItem>
                                <SelectItem value="small">Küçük (Small)</SelectItem>
                                <SelectItem value="medium">Orta (Medium)</SelectItem>
                                <SelectItem value="large">Büyük (Large)</SelectItem>
                                <SelectItem value="glow">Neon Parlama (Glow)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
