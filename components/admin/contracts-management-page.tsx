"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Save } from "lucide-react"
import { auth } from "@/lib/firebase"
import type { ContractTemplateType } from "@/lib/contracts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/context/LanguageContext"

type TemplateState = {
    title: string
    text: string
    publishedVersionId?: string | null
    publishedAt?: string | null
}

export function ContractsManagementPage() {
    const { language } = useLanguage()
    const p = (tr: string, en: string, es: string) => (language === "tr" ? tr : language === "es" ? es : en)
    const dateLocale = language === "tr" ? "tr-TR" : language === "es" ? "es-US" : "en-US"
    const templateLabels: Record<ContractTemplateType, string> = {
        tenantAgreement: p("Tenant Sözleşmesi", "Tenant Agreement", "Acuerdo de cliente"),
        partnerAgreement: p("Partnerlik Sözleşmesi", "Partner Agreement", "Acuerdo de socio"),
        kvkkDefault: p("Varsayılan Gizlilik Metni", "Default Privacy Notice", "Aviso de privacidad predeterminado"),
    }
    const [isLoading, setIsLoading] = useState(true)
    const [isSavingType, setIsSavingType] = useState<ContractTemplateType | null>(null)
    const [templates, setTemplates] = useState<Record<ContractTemplateType, TemplateState>>({
        tenantAgreement: { title: "", text: "" },
        partnerAgreement: { title: "", text: "" },
        kvkkDefault: { title: "", text: "" },
    })

    const orderedTypes = useMemo<ContractTemplateType[]>(
        () => ["tenantAgreement", "partnerAgreement", "kvkkDefault"],
        []
    )

    const loadTemplates = async () => {
        setIsLoading(true)
        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) return

            const response = await fetch("/api/contracts/templates", {
                headers: { Authorization: `Bearer ${token}` },
            })
            const data = response.ok ? await response.json() : null
            if (!data) return

            setTemplates({
                tenantAgreement: {
                    title: data.published?.tenantAgreement?.title || data.defaults?.tenantAgreement?.title || "",
                    text: data.published?.tenantAgreement?.text || data.defaults?.tenantAgreement?.text || "",
                    publishedVersionId: data.published?.tenantAgreement?.versionId || null,
                    publishedAt: data.published?.tenantAgreement?.publishedAt || null,
                },
                partnerAgreement: {
                    title: data.published?.partnerAgreement?.title || data.defaults?.partnerAgreement?.title || "",
                    text: data.published?.partnerAgreement?.text || data.defaults?.partnerAgreement?.text || "",
                    publishedVersionId: data.published?.partnerAgreement?.versionId || null,
                    publishedAt: data.published?.partnerAgreement?.publishedAt || null,
                },
                kvkkDefault: {
                    title: data.published?.kvkkDefault?.title || data.defaults?.kvkkDefault?.title || "",
                    text: data.published?.kvkkDefault?.text || data.defaults?.kvkkDefault?.text || "",
                    publishedVersionId: data.published?.kvkkDefault?.versionId || null,
                    publishedAt: data.published?.kvkkDefault?.publishedAt || null,
                },
            })
        } catch (error) {
            console.error("Failed to load templates:", error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadTemplates()
    }, [])

    const publishTemplate = async (type: ContractTemplateType) => {
        setIsSavingType(type)
        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) return

            const template = templates[type]
            const response = await fetch("/api/contracts/templates", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    type,
                    title: template.title,
                    text: template.text,
                }),
            })

            if (!response.ok) {
                throw new Error("Publish failed")
            }

            await loadTemplates()
        } catch (error) {
            console.error("Failed to publish template:", error)
        } finally {
            setIsSavingType(null)
        }
    }

    if (isLoading) {
        return (
            <div className="flex min-h-[320px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">{p("Sözleşmeler", "Agreements", "Acuerdos")}</h1>
                <p className="text-sm text-muted-foreground">
                    {p(
                        "Tenant sözleşmesi, partnerlik sözleşmesi ve global gizlilik metni burada düz metin olarak versiyonlanır. Kaydetmek yeni değiştirilemez bir sürüm yayınlar.",
                        "The tenant agreement, partner agreement, and global privacy notice are versioned here as plain text. Saving publishes a new immutable version.",
                        "El acuerdo de cliente, el acuerdo de socio y el aviso de privacidad global se versionan aquí como texto plano. Guardar publica una nueva versión inmutable."
                    )}
                </p>
            </div>

            <div className="grid gap-6">
                {orderedTypes.map((type) => {
                    const template = templates[type]
                    return (
                        <Card key={type}>
                            <CardHeader>
                                <div className="flex flex-wrap items-center gap-3">
                                    <CardTitle>{templateLabels[type]}</CardTitle>
                                    {template.publishedVersionId ? (
                                        <Badge variant="outline">
                                            {p("Aktif sürüm:", "Active version:", "Versión activa:")} {template.publishedVersionId}
                                        </Badge>
                                    ) : null}
                                </div>
                                <CardDescription>
                                    {template.publishedAt
                                        ? `${p("Son yayın tarihi:", "Last published:", "Última publicación:")} ${new Date(template.publishedAt).toLocaleString(dateLocale)}`
                                        : p("Bu tipte henüz yayınlanmış bir metin yok.", "No text has been published for this type yet.", "Aún no se ha publicado ningún texto para este tipo.")}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor={`${type}-title`}>{p("Başlık", "Title", "Título")}</Label>
                                    <Input
                                        id={`${type}-title`}
                                        value={template.title}
                                        onChange={(event) => setTemplates((prev) => ({
                                            ...prev,
                                            [type]: {
                                                ...prev[type],
                                                title: event.target.value,
                                            },
                                        }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor={`${type}-text`}>{p("Metin", "Text", "Texto")}</Label>
                                    <Textarea
                                        id={`${type}-text`}
                                        value={template.text}
                                        onChange={(event) => setTemplates((prev) => ({
                                            ...prev,
                                            [type]: {
                                                ...prev[type],
                                                text: event.target.value,
                                            },
                                        }))}
                                        className="min-h-[240px]"
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <Button onClick={() => publishTemplate(type)} disabled={isSavingType === type}>
                                        {isSavingType === type ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                        {p("Yeni sürüm yayınla", "Publish new version", "Publicar nueva versión")}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
