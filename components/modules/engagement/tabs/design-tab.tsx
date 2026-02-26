import { useState } from "react"
import { Layout, Lock, Sparkles, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
    EngagementLanguage,
    EngagementSettings,
    EngagementBubbleAnimation,
    EngagementBubblePosition,
    EngagementBubbleRenderStyle,
    EngagementAmbientAiBubbleTheme,
} from "../types"

interface EngagementDesignTabProps {
    settings: EngagementSettings
    setSettings: React.Dispatch<React.SetStateAction<EngagementSettings>>
}

type VariantMode = "classic" | "ambient"

const DEFAULT_AMBIENT_TYPEWRITER = {
    charDelayMs: 18,
    startDelayMs: 100,
    cursorVisible: true,
    cursorChar: "▍",
    completePauseMs: 300,
} as const

export function EngagementDesignTab({ settings, setSettings }: EngagementDesignTabProps) {
    const [variantMode, setVariantMode] = useState<VariantMode>("classic")
    const ambientVariant = (() => {
        const saved = (settings.bubble.ambientVariant || {}) as Partial<NonNullable<EngagementSettings["bubble"]["ambientVariant"]>>
        return {
            enabled: typeof saved.enabled === "boolean" ? saved.enabled : false,
            renderStyle: (saved.renderStyle || "custom") as EngagementBubbleRenderStyle,
            aiBubbleTheme: (saved.aiBubbleTheme || "default") as EngagementAmbientAiBubbleTheme,
            animation: (saved.animation || "bounce") as EngagementBubbleAnimation,
            position: (saved.position || "top") as EngagementBubblePosition,
            offsetX: Number.isFinite(Number(saved.offsetX)) ? Number(saved.offsetX) : 0,
            offsetY: Number.isFinite(Number(saved.offsetY)) ? Number(saved.offsetY) : 0,
            maxWidth: Number.isFinite(Number(saved.maxWidth)) ? Number(saved.maxWidth) : undefined,
            style: { ...(saved.style || {}) },
            typewriter: {
                ...DEFAULT_AMBIENT_TYPEWRITER,
                ...(saved.typewriter || {}),
                replayBehavior: "new_text_only" as const
            }
        }
    })()
    const isAmbientEditor = variantMode === "ambient"

    const currentStyle = isAmbientEditor
        ? { ...settings.bubble.style, ...(ambientVariant.style || {}) }
        : settings.bubble.style

    const currentPosition = (isAmbientEditor ? ambientVariant.position : settings.bubble.position) || "top"
    const currentAnimation = (isAmbientEditor ? ambientVariant.animation : settings.bubble.animation) || "bounce"
    const currentRenderStyle = (ambientVariant.renderStyle || "custom") as EngagementBubbleRenderStyle
    const currentAiBubbleTheme = (ambientVariant.aiBubbleTheme || "default") as EngagementAmbientAiBubbleTheme
    const typewriter = { ...DEFAULT_AMBIENT_TYPEWRITER, ...(ambientVariant.typewriter || {}) }

    const updateAmbientVariant = (patch: Partial<NonNullable<EngagementSettings["bubble"]["ambientVariant"]>>) => {
        setSettings(prev => ({
            ...prev,
            bubble: {
                ...prev.bubble,
                ambientVariant: {
                    enabled: (prev.bubble.ambientVariant && typeof prev.bubble.ambientVariant.enabled === "boolean")
                        ? prev.bubble.ambientVariant.enabled
                        : false,
                    ...(prev.bubble.ambientVariant || {}),
                    ...patch,
                    style: patch.style !== undefined
                        ? patch.style
                        : ((prev.bubble.ambientVariant && prev.bubble.ambientVariant.style) || {}),
                    typewriter: patch.typewriter !== undefined
                        ? patch.typewriter
                        : ((prev.bubble.ambientVariant && prev.bubble.ambientVariant.typewriter) || {}),
                }
            }
        }))
    }

    const updateAmbientTypewriter = (patch: Partial<NonNullable<NonNullable<EngagementSettings["bubble"]["ambientVariant"]>["typewriter"]>>) => {
        setSettings(prev => ({
            ...prev,
            bubble: {
                ...prev.bubble,
                ambientVariant: {
                    enabled: (prev.bubble.ambientVariant && typeof prev.bubble.ambientVariant.enabled === "boolean")
                        ? prev.bubble.ambientVariant.enabled
                        : false,
                    ...(prev.bubble.ambientVariant || {}),
                    typewriter: {
                        ...DEFAULT_AMBIENT_TYPEWRITER,
                        ...((prev.bubble.ambientVariant && prev.bubble.ambientVariant.typewriter) || {}),
                        ...patch,
                        replayBehavior: "new_text_only"
                    }
                }
            }
        }))
    }

    const updateStyle = (key: keyof EngagementSettings['bubble']['style'], value: any) => {
        if (!isAmbientEditor) {
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
            return
        }

        setSettings(prev => ({
            ...prev,
            bubble: {
                ...prev.bubble,
                ambientVariant: {
                    enabled: (prev.bubble.ambientVariant && typeof prev.bubble.ambientVariant.enabled === "boolean")
                        ? prev.bubble.ambientVariant.enabled
                        : false,
                    ...(prev.bubble.ambientVariant || {}),
                    style: {
                        ...((prev.bubble.ambientVariant && prev.bubble.ambientVariant.style) || {}),
                        [key]: value
                    }
                }
            }
        }))
    }

    const updatePosition = (val: EngagementBubblePosition) => {
        if (!isAmbientEditor) {
            setSettings(p => ({ ...p, bubble: { ...p.bubble, position: val } }))
            return
        }
        updateAmbientVariant({ position: val })
    }

    const updateAnimation = (val: EngagementBubbleAnimation) => {
        if (!isAmbientEditor) {
            setSettings(p => ({ ...p, bubble: { ...p.bubble, animation: val } }))
            return
        }
        updateAmbientVariant({ animation: val })
    }

    const isAmbientAiPreset = currentRenderStyle === "ambient_ai_bubble" || currentRenderStyle === "ambient_ai_bubble_typewriter"
    const showTypewriterPanel = isAmbientEditor && currentRenderStyle === "ambient_ai_bubble_typewriter"

    return (
        <Card className="border-0 shadow-none bg-transparent">
            <CardContent className="p-1 grid gap-6">
                <Accordion type="multiple" defaultValue={["setup"]} className="rounded-xl border bg-card/50 px-4">
                    <AccordionItem value="setup" className="border-b">
                        <AccordionTrigger className="py-4 hover:no-underline">
                            <div className="text-sm font-semibold text-left">Kurulum</div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="grid gap-4 rounded-xl border bg-background/60 p-5">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <Label className="text-sm font-medium">Ambient modda farklı balon</Label>
                                    </div>
                                    <Switch
                                        checked={!!ambientVariant.enabled}
                                        onCheckedChange={(checked) => updateAmbientVariant({ enabled: checked })}
                                    />
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    <div className="inline-flex rounded-lg border bg-background p-1">
                                        <button
                                            type="button"
                                            onClick={() => setVariantMode("classic")}
                                            className={`px-3 py-1.5 rounded text-xs transition ${variantMode === "classic" ? "bg-black text-white" : "text-muted-foreground"}`}
                                        >
                                            Classic Balon
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setVariantMode("ambient")}
                                            className={`px-3 py-1.5 rounded text-xs transition ${variantMode === "ambient" ? "bg-black text-white" : "text-muted-foreground"}`}
                                        >
                                            Ambient Balon
                                        </button>
                                    </div>
                                    {isAmbientEditor && !ambientVariant.enabled && (
                                        <Badge variant="outline" className="text-[10px]">Override kapalı (fallback classic)</Badge>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {isAmbientEditor && (
                                        <>
                                            <div className="space-y-2 md:col-span-2">
                                                <Label className="text-xs font-medium text-muted-foreground">Ambient Render Stili</Label>
                                                <Select
                                                    value={currentRenderStyle}
                                                    onValueChange={(val: EngagementBubbleRenderStyle) => updateAmbientVariant({ renderStyle: val })}
                                                >
                                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="custom">Custom</SelectItem>
                                                        <SelectItem value="ambient_ai_bubble">Ambient AI Bubble</SelectItem>
                                                        <SelectItem value="ambient_ai_bubble_typewriter">Ambient AI Bubble + Typewriter</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {isAmbientAiPreset && (
                                                <div className="space-y-2 md:col-span-2">
                                                    <Label className="text-xs font-medium text-muted-foreground">Ambient AI Tema</Label>
                                                    <Select
                                                        value={currentAiBubbleTheme}
                                                        onValueChange={(val: EngagementAmbientAiBubbleTheme) => updateAmbientVariant({ aiBubbleTheme: val })}
                                                    >
                                                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="default">Default</SelectItem>
                                                            <SelectItem value="minimal">Minimal</SelectItem>
                                                            <SelectItem value="glass">Glass</SelectItem>
                                                            <SelectItem value="compact">Compact</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium text-muted-foreground">Konum</Label>
                                        <Select value={currentPosition} onValueChange={(val: EngagementBubblePosition) => updatePosition(val)}>
                                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="top">Üst (Top)</SelectItem>
                                                <SelectItem value="left">Sol (Left)</SelectItem>
                                                <SelectItem value="right">Sağ (Right)</SelectItem>
                                                <SelectItem value="bottom-left">Alt Sol</SelectItem>
                                                <SelectItem value="bottom-right">Alt Sağ</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium text-muted-foreground">Animasyon</Label>
                                        <Select value={currentAnimation} onValueChange={(val: EngagementBubbleAnimation) => updateAnimation(val)}>
                                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Yok</SelectItem>
                                                <SelectItem value="bounce">Bounce</SelectItem>
                                                <SelectItem value="pulse">Pulse</SelectItem>
                                                <SelectItem value="shake">Shake</SelectItem>
                                                <SelectItem value="slide">Slide</SelectItem>
                                                <SelectItem value="fade">Fade</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="style" className="border-b">
                        <AccordionTrigger className="py-4 hover:no-underline">
                            <div className="text-sm font-semibold text-left">Görsel Stil</div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="grid gap-6">
                                <div className="space-y-3">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                                        Efekt Tipi {isAmbientEditor ? "(Ambient varyantı)" : "(Classic)"}
                                    </Label>
                                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                                        {[
                                            { id: 'solid', label: 'Solid', icon: Layout },
                                            { id: 'glass', label: 'Glass', icon: Sparkles },
                                            { id: 'gradient', label: 'Gradient', icon: TrendingUp },
                                            { id: 'outline', label: 'Outline', icon: Lock }
                                        ].map((styleItem) => (
                                            <div
                                                key={styleItem.id}
                                                onClick={() => updateStyle('effect', styleItem.id)}
                                                className={`cursor-pointer group relative overflow-hidden rounded-xl border p-4 flex flex-col items-center justify-center gap-3 transition-all duration-200 ${currentStyle.effect === styleItem.id
                                                    ? 'border-primary ring-1 ring-primary bg-primary/5 shadow-sm'
                                                    : 'border-border bg-background hover:border-primary/50 hover:bg-muted/30'
                                                    }`}
                                            >
                                                <div className={`p-2 rounded-full transition-colors ${currentStyle.effect === styleItem.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-white group-hover:text-primary'}`}>
                                                    <styleItem.icon className="w-4 h-4" />
                                                </div>
                                                <span className="text-xs font-medium">{styleItem.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid gap-6 p-5 rounded-xl border bg-background/60">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-medium text-muted-foreground">Şekil</Label>
                                            <Select value={currentStyle.shape} onValueChange={(val: any) => updateStyle('shape', val)}>
                                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="rounded">Köşeli (Rounded)</SelectItem>
                                                    <SelectItem value="pill">Hap (Pill)</SelectItem>
                                                    <SelectItem value="square">Kare (Square)</SelectItem>
                                                    <SelectItem value="speech">Konuşma Balonu</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-medium text-muted-foreground">Balon Dili</Label>
                                            <Select
                                                value={settings.language}
                                                onValueChange={(val: EngagementLanguage) => setSettings(p => ({ ...p, language: val }))}
                                            >
                                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
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
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-medium text-muted-foreground">Arka Plan Rengi</Label>
                                            <div className="flex gap-2 items-center">
                                                <div className="relative w-9 h-9 rounded-lg overflow-hidden border shadow-sm shrink-0">
                                                    <Input
                                                        type="color"
                                                        value={currentStyle.backgroundColor}
                                                        onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                                                        className="absolute -top-2 -left-2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                                                    />
                                                </div>
                                                <Input
                                                    value={currentStyle.backgroundColor}
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
                                                        value={currentStyle.textColor}
                                                        onChange={(e) => updateStyle('textColor', e.target.value)}
                                                        className="absolute -top-2 -left-2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                                                    />
                                                </div>
                                                <Input
                                                    value={currentStyle.textColor}
                                                    onChange={(e) => updateStyle('textColor', e.target.value)}
                                                    className="h-9 font-mono text-xs uppercase"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="advanced" className="border-none">
                        <AccordionTrigger className="py-4 hover:no-underline">
                            <div className="text-sm font-semibold text-left">Gelişmiş</div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-6 pt-1">
                                {isAmbientEditor && (
                                    <div className="grid gap-4 rounded-lg border bg-background/60 p-4">
                                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Ambient Yerleşim</Label>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-medium text-muted-foreground">Max Width</Label>
                                                <Input
                                                    type="number"
                                                    min={180}
                                                    max={560}
                                                    value={ambientVariant.maxWidth ?? ""}
                                                    onChange={(e) => {
                                                        const raw = e.target.value
                                                        updateAmbientVariant({ maxWidth: raw === "" ? undefined : Number(raw) })
                                                    }}
                                                    className="h-9"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-medium text-muted-foreground">Offset X</Label>
                                                <Input
                                                    type="number"
                                                    value={ambientVariant.offsetX ?? 0}
                                                    onChange={(e) => updateAmbientVariant({ offsetX: Number(e.target.value || 0) })}
                                                    className="h-9"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-medium text-muted-foreground">Offset Y</Label>
                                                <Input
                                                    type="number"
                                                    value={ambientVariant.offsetY ?? 0}
                                                    onChange={(e) => updateAmbientVariant({ offsetY: Number(e.target.value || 0) })}
                                                    className="h-9"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {showTypewriterPanel && (
                                    <div className="grid gap-4 rounded-lg border bg-background/60 p-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Daktilo Görünümü</Label>
                                                <p className="text-xs text-muted-foreground mt-1">Yeni metinlerde çalışır.</p>
                                            </div>
                                            <Switch
                                                checked={ambientVariant.typewriter?.cursorVisible ?? true}
                                                onCheckedChange={(checked) => updateAmbientTypewriter({ cursorVisible: checked })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-medium text-muted-foreground">Karakter Hızı (ms)</Label>
                                                <Input
                                                    type="number"
                                                    min={5}
                                                    max={120}
                                                    value={typewriter.charDelayMs}
                                                    onChange={(e) => updateAmbientTypewriter({ charDelayMs: Number(e.target.value || DEFAULT_AMBIENT_TYPEWRITER.charDelayMs) })}
                                                    className="h-9"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-medium text-muted-foreground">Başlangıç Gecikmesi (ms)</Label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={2000}
                                                    value={typewriter.startDelayMs}
                                                    onChange={(e) => updateAmbientTypewriter({ startDelayMs: Number(e.target.value || DEFAULT_AMBIENT_TYPEWRITER.startDelayMs) })}
                                                    className="h-9"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-medium text-muted-foreground">Cursor Karakteri</Label>
                                                <Input
                                                    value={typewriter.cursorChar}
                                                    onChange={(e) => updateAmbientTypewriter({ cursorChar: e.target.value || DEFAULT_AMBIENT_TYPEWRITER.cursorChar })}
                                                    className="h-9"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-medium text-muted-foreground">Yazım Sonrası Bekleme (ms)</Label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={3000}
                                                    value={typewriter.completePauseMs}
                                                    onChange={(e) => updateAmbientTypewriter({ completePauseMs: Number(e.target.value || DEFAULT_AMBIENT_TYPEWRITER.completePauseMs) })}
                                                    className="h-9"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid gap-6 rounded-xl border bg-background/60 p-5">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <Label className="text-sm font-medium">Yuvarlaklık (Border Radius)</Label>
                                            <Badge variant="outline" className="font-mono text-[10px] h-5">{currentStyle.borderRadius}px</Badge>
                                        </div>
                                        <Slider
                                            value={[currentStyle.borderRadius]}
                                            max={50}
                                            step={1}
                                            onValueChange={(vals: number[]) => updateStyle('borderRadius', vals[0])}
                                            className="[&_.range]:bg-primary"
                                        />
                                    </div>

                                    {currentStyle.effect === 'glass' && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-sm font-medium">Bulanıklık (Blur)</Label>
                                                <Badge variant="outline" className="font-mono text-[10px] h-5">{currentStyle.backdropBlur || 0}px</Badge>
                                            </div>
                                            <Slider
                                                value={[currentStyle.backdropBlur || 0]}
                                                max={20}
                                                step={1}
                                                onValueChange={(vals: number[]) => updateStyle('backdropBlur', vals[0])}
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-2 pt-2">
                                        <Label className="text-sm font-medium">Gölge (Shadow)</Label>
                                        <Select value={currentStyle.shadow} onValueChange={(val: any) => updateStyle('shadow', val)}>
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
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    )
}
