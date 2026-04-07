"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/context/LanguageContext"
import { ArrowUpRight, BookOpen, ExternalLink, FileText, PlayCircle, Rocket, Wrench } from "lucide-react"
import type { CmsEducationItem } from "@/lib/cms-content"

function getPartnerPlaybooks(isTr: boolean) {
    return [
        {
            icon: Wrench,
            title: isTr ? "Kurulum Başlangıcı" : "Installation Kickoff",
            description: isTr
                ? "İlk kurulumda tamamlamanız gereken temel adımlar."
                : "The core steps you should complete during the initial setup.",
            steps: isTr
                ? ["Widget kurulumunu doğrulayın.", "Entegrasyon bağlantılarını tamamlayın.", "İlk test konuşmasını canlı öncesi çalıştırın."]
                : ["Validate widget installation.", "Complete integration wiring.", "Run the first test conversation before go-live."],
        },
        {
            icon: Rocket,
            title: isTr ? "Kullanım ve Operasyon" : "Usage & Operations",
            description: isTr
                ? "Günlük kullanımda partner ekiplerinin izlemesi gereken operasyon akışı."
                : "The operating flow partner teams should follow during daily usage.",
            steps: isTr
                ? ["Rapor ekranından haftalık performansı izleyin.", "Sohbet ve lead akışlarını düzenli kontrol edin.", "Gerekirse son kullanıcıya yönlendirme ve destek sağlayın."]
                : ["Review weekly performance from reports.", "Check chat and lead flows regularly.", "Jump into end-user operations when needed."],
        },
        {
            icon: BookOpen,
            title: isTr ? "Yayına Alma Kontrolü" : "Go-Live Readiness",
            description: isTr
                ? "Yeni bir son kullanıcıyı yayına almadan önce kısa son kontrol listesi."
                : "A short final checklist before launching a new end user.",
            steps: isTr
                ? ["Plan ve erişim yetkilerini doğrulayın.", "Bildirim, lead ve randevu akışlarını test edin.", "Partner yardım bilgilerini ve destek kanallarını güncel tutun."]
                : ["Verify plan and access permissions.", "Test notifications, lead flows, and appointments.", "Keep partner help details and support channels up to date."],
        },
    ]
}

export function PartnerTrainingContent() {
    const { language, t } = useLanguage()
    const isTr = language === "tr"
    const [resources, setResources] = useState<CmsEducationItem[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            try {
                const response = await fetch("/api/cms/education")
                const data = await response.json().catch(() => [])
                if (!response.ok || cancelled) return
                setResources(Array.isArray(data) ? data : [])
            } catch (error) {
                console.error("Failed to load partner training resources", error)
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [])

    const playbooks = useMemo(() => getPartnerPlaybooks(isTr), [isTr])

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    <span>{t("training") || "Training"}</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">
                    {isTr ? "Partner Eğitim Merkezi" : "Partner Training Center"}
                </h1>
                <p className="max-w-3xl text-muted-foreground">
                    {isTr
                        ? "Kurulum, kullanım ve operasyon akışları için hızlı eğitim kartları ile destek dokümanlarını tek yerde toplayın."
                        : "Keep setup, usage, and operational playbooks together with support materials in one place."}
                </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
                {playbooks.map((playbook) => (
                    <Card key={playbook.title} className="border-border/70">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                    <playbook.icon className="h-5 w-5" />
                                </div>
                                <Badge variant="secondary">{isTr ? "Temel Eğitim" : "Core Playbook"}</Badge>
                            </div>
                            <CardTitle className="pt-2">{playbook.title}</CardTitle>
                            <CardDescription>{playbook.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                {playbook.steps.map((step) => (
                                    <li key={step} className="flex gap-2">
                                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/60" />
                                        <span>{step}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border-border/70">
                <CardHeader>
                    <CardTitle>{isTr ? "Ek Eğitim Kaynakları" : "Additional Learning Resources"}</CardTitle>
                    <CardDescription>
                        {isTr
                            ? "CMS tarafında yayınlanan eğitim içerikleri burada listelenir."
                            : "Education items published in CMS are listed here."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-sm text-muted-foreground">{isTr ? "Kaynaklar yükleniyor..." : "Loading resources..."}</div>
                    ) : resources.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border/70 bg-background p-4 text-sm text-muted-foreground">
                            {isTr ? "Henüz yayınlanmış eğitim içeriği yok." : "No published training content yet."}
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {resources.map((resource) => {
                                const Icon = resource.type === "video" ? PlayCircle : FileText
                                return (
                                    <Card key={resource.id || resource.title.en} className="border-border/70 shadow-none">
                                        <CardHeader className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-foreground">
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                <Badge variant="outline">{resource.type}</Badge>
                                            </div>
                                            <CardTitle className="text-base">
                                                {resource.title[isTr ? "tr" : "en"]}
                                            </CardTitle>
                                            <CardDescription>
                                                {resource.description[isTr ? "tr" : "en"]}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            {resource.url ? (
                                                <Button asChild variant="outline" className="w-full gap-2">
                                                    <a href={resource.url} target="_blank" rel="noreferrer">
                                                        {isTr ? "Kaynağı Aç" : "Open Resource"}
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            ) : (
                                                <Button variant="ghost" disabled className="w-full gap-2">
                                                    {isTr ? "Bağlantı Yakında" : "Link Coming Soon"}
                                                    <ArrowUpRight className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
