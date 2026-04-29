"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useLanguage } from "@/context/LanguageContext"
import { ArrowRight, Bot, CheckCircle2, MessageSquareText, MousePointerClick, Sparkles } from "lucide-react"

export function GuidedSettingsForm({ targetUserId }: { targetUserId: string }) {
    const { language } = useLanguage()
    const isTr = language === "tr"

    const steps = isTr
        ? [
            "Asistan kullanıcının sorusuna düz metinle cevap verir.",
            "AI, cevaba uygun 2-4 kısa seçenek üretir.",
            "Kullanıcı seçeneğe tıklayınca seçim yeni mesaj gibi konuşmaya eklenir.",
        ]
        : [
            "The assistant answers the user's question in plain text.",
            "AI generates 2-4 concise options that fit the answer.",
            "When the user taps an option, that choice continues the conversation as a new message.",
        ]

    const examples = isTr
        ? ["Fiyatları göster", "Randevu al", "Temsilciyle görüş", "Daha fazla bilgi ver"]
        : ["Show pricing", "Book an appointment", "Talk to a representative", "Tell me more"]

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-3xl font-bold tracking-tight">Guided</h2>
                    <Badge variant="secondary">{isTr ? "AI üretimli seçenekler" : "AI-generated options"}</Badge>
                </div>
                <p className="max-w-3xl text-muted-foreground">
                    {isTr
                        ? "Guided aktif olduğunda asistan cevaplarını uzun akış editörleriyle değil, her cevaba göre AI tarafından üretilen kısa seçeneklerle yönlendirir."
                        : "When Guided is active, the assistant guides users with short AI-generated options for each answer instead of manually configured flow editors."}
                </p>
                <p className="text-xs text-muted-foreground">Tenant: {targetUserId}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <MessageSquareText className="h-4 w-4 text-primary" />
                            {isTr ? "Düz metin cevap" : "Plain text answer"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        {isTr
                            ? "Asistan önce okunabilir, kısa ve doğal bir cevap verir. Seçenekler cevap metninin içine liste olarak gömülmez."
                            : "The assistant first gives a short, readable answer. Options are not embedded as a visible list inside the answer."}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Sparkles className="h-4 w-4 text-primary" />
                            {isTr ? "AI seçenek üretimi" : "AI option generation"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        {isTr
                            ? "Her cevap için bağlama uygun 2-4 seçenek AI tarafından üretilir; sabit skill, step veya kart tanımı gerekmez."
                            : "For each answer, AI generates 2-4 contextual options; no fixed skill, step, or card definition is required."}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <MousePointerClick className="h-4 w-4 text-primary" />
                            {isTr ? "Tıklanabilir yönlendirme" : "Clickable guidance"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        {isTr
                            ? "Kullanıcı bir seçeneğe tıkladığında bu seçim yeni kullanıcı mesajı gibi işlenir ve konuşma o yönde devam eder."
                            : "When a user taps an option, it is processed like a new user message and the conversation continues in that direction."}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-primary" />
                        {isTr ? "Çalışma Mantığı" : "Runtime Behavior"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="grid gap-3 md:grid-cols-3">
                        {steps.map((step, index) => (
                            <div key={step} className="rounded-lg border border-border/70 bg-background p-4">
                                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                                    {index + 1}
                                </div>
                                <p className="text-sm text-muted-foreground">{step}</p>
                            </div>
                        ))}
                    </div>
                    <Separator />
                    <div>
                        <div className="mb-3 text-sm font-medium">{isTr ? "Örnek seçenekler" : "Example options"}</div>
                        <div className="flex flex-wrap gap-2">
                            {examples.map((example) => (
                                <Badge key={example} variant="outline" className="rounded-full px-3 py-1">
                                    {example}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        {isTr ? "Modül aktifse ne olur?" : "What happens when active?"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                    <div className="flex gap-3">
                        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{isTr ? "Widget cevapları streaming yerine yapılandırılmış JSON ile gelir; böylece seçenekler ayrıca render edilir." : "Widget replies use structured JSON instead of streaming so options can render separately."}</span>
                    </div>
                    <div className="flex gap-3">
                        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{isTr ? "Eski manuel Guided akışları başlangıç önerisi olarak gösterilmez; seçenekler anlık AI cevabından üretilir." : "Legacy manual Guided flows are not shown as starting shortcuts; options are generated from the live AI answer."}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
