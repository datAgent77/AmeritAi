"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Loader2, LifeBuoy, Mail, MessageCircle, Phone, Save, Clock3, UserRound } from "lucide-react"
import type { ManagementPartnerRecord } from "@/lib/management/types"

type SupportFormState = {
    supportContactName: string
    supportEmail: string
    supportPhone: string
    supportWhatsapp: string
    supportHours: string
    supportNotes: string
}

const EMPTY_FORM: SupportFormState = {
    supportContactName: "",
    supportEmail: "",
    supportPhone: "",
    supportWhatsapp: "",
    supportHours: "",
    supportNotes: "",
}

function toFormState(partner: ManagementPartnerRecord | null): SupportFormState {
    return {
        supportContactName: partner?.supportContactName || "",
        supportEmail: partner?.supportEmail || "",
        supportPhone: partner?.supportPhone || "",
        supportWhatsapp: partner?.supportWhatsapp || "",
        supportHours: partner?.supportHours || "",
        supportNotes: partner?.supportNotes || "",
    }
}

export function PartnerSupportCenterContent({
    editable = false,
    targetUserId,
}: {
    editable?: boolean
    targetUserId?: string
}) {
    const { user } = useAuth()
    const { t, language } = useLanguage()
    const { toast } = useToast()
    const isTr = language === "tr"
    const [partner, setPartner] = useState<ManagementPartnerRecord | null>(null)
    const [form, setForm] = useState<SupportFormState>(EMPTY_FORM)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    const loadPartnerContext = useCallback(async () => {
        if (!user) return

        setIsLoading(true)
        try {
            const token = await user.getIdToken()
            const endpoint = editable
                ? "/api/agency/profile"
                : `/api/management/viewer-context${targetUserId ? `?accountId=${encodeURIComponent(targetUserId)}` : ""}`
            const response = await fetch(endpoint, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.error || (isTr ? "Destek bilgileri yüklenemedi." : "Failed to load support information."))
            }

            const resolvedPartner = data?.partner || null
            setPartner(resolvedPartner)
            setForm(toFormState(resolvedPartner))
        } catch (error: any) {
            toast({
                title: t("error"),
                description: error?.message || (isTr ? "Destek bilgileri yüklenemedi." : "Failed to load support information."),
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }, [editable, isTr, t, targetUserId, toast, user])

    useEffect(() => {
        loadPartnerContext()
    }, [loadPartnerContext])

    const handleSave = async () => {
        if (!editable || !user) return

        setIsSaving(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/agency/profile", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(form),
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.error || (isTr ? "Destek bilgileri kaydedilemedi." : "Failed to save support information."))
            }

            const resolvedPartner = data?.partner || null
            setPartner(resolvedPartner)
            setForm(toFormState(resolvedPartner))
            toast({
                title: t("success"),
                description: isTr ? "Partner yardım bilgileri kaydedildi." : "Partner help details saved.",
            })
        } catch (error: any) {
            toast({
                title: t("error"),
                description: error?.message || (isTr ? "Destek bilgileri kaydedilemedi." : "Failed to save support information."),
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    const preview = useMemo(() => {
        const baseName = form.supportContactName || partner?.partnerName || partner?.agencyName || partner?.email || (isTr ? "Partner Destek Ekibi" : "Partner Support Team")
        const email = form.supportEmail || partner?.supportEmail || partner?.email || "info@getvion.com"
        const phone = form.supportPhone || partner?.supportPhone || partner?.phone || null
        const whatsapp = form.supportWhatsapp || partner?.supportWhatsapp || null
        const hours = form.supportHours || partner?.supportHours || (isTr ? "Hafta içi 09:00 - 18:00" : "Weekdays 09:00 - 18:00")
        const notes = form.supportNotes || partner?.supportNotes || (isTr ? "Kurulum, eğitim ve operasyonel sorular için bu kanalı kullanabilirsiniz." : "Use this channel for installation, training, and operational questions.")

        return {
            name: baseName,
            email,
            phone,
            whatsapp,
            hours,
            notes,
        }
    }, [form, isTr, partner])

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <LifeBuoy className="h-4 w-4" />
                        <span>{t("footerHelp") || "Help Center"}</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {isTr ? "Yardım Merkezi" : "Help Center"}
                    </h1>
                    <p className="max-w-3xl text-muted-foreground">
                        {editable
                            ? (isTr
                                ? "Bağlı son kullanıcıların göreceği destek ve iletişim bilgilerini burada yönetin."
                                : "Manage the support and contact details that linked end users will see.")
                            : (isTr
                                ? "Bağlı olduğunuz partnerin kurulum ve destek iletişim bilgileri aşağıda yer alır."
                                : "Your linked partner's installation and support contact details are shown below.")}
                    </p>
                </div>
                {partner?.partnerLevel ? <Badge variant="outline">{partner.partnerLevel.replaceAll("_", " ")}</Badge> : null}
            </div>

            <div
                className={cn(
                    "grid w-full items-start gap-6",
                    editable
                        ? "xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
                        : "max-w-3xl"
                )}
            >
                {editable ? (
                    <Card className="border-border/70">
                        <CardHeader>
                            <CardTitle>{isTr ? "İletişim Bilgileri" : "Contact Details"}</CardTitle>
                            <CardDescription>
                                {isTr
                                    ? "Müşterileriniz bu bilgileri yardım ekranında görecek."
                                    : "Your customers will see these details in their help screen."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="supportContactName">{isTr ? "İlgili Kişi" : "Contact Name"}</Label>
                                    <Input
                                        id="supportContactName"
                                        value={form.supportContactName}
                                        onChange={(event) => setForm((prev) => ({ ...prev, supportContactName: event.target.value }))}
                                        placeholder={isTr ? "Örn. Partner Operasyon Ekibi" : "e.g. Partner Operations Team"}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="supportEmail">{isTr ? "Destek E-postası" : "Support Email"}</Label>
                                    <Input
                                        id="supportEmail"
                                        type="email"
                                        value={form.supportEmail}
                                        onChange={(event) => setForm((prev) => ({ ...prev, supportEmail: event.target.value }))}
                                        placeholder="support@partner.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="supportPhone">{isTr ? "Telefon" : "Phone"}</Label>
                                    <Input
                                        id="supportPhone"
                                        value={form.supportPhone}
                                        onChange={(event) => setForm((prev) => ({ ...prev, supportPhone: event.target.value }))}
                                        placeholder={isTr ? "+90 5xx xxx xx xx" : "+1 (555) 000-0000"}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="supportWhatsapp">{isTr ? "WhatsApp" : "WhatsApp"}</Label>
                                    <Input
                                        id="supportWhatsapp"
                                        value={form.supportWhatsapp}
                                        onChange={(event) => setForm((prev) => ({ ...prev, supportWhatsapp: event.target.value }))}
                                        placeholder={isTr ? "WhatsApp hattı veya linki" : "WhatsApp line or link"}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="supportHours">{isTr ? "Destek Saatleri" : "Support Hours"}</Label>
                                <Input
                                    id="supportHours"
                                    value={form.supportHours}
                                    onChange={(event) => setForm((prev) => ({ ...prev, supportHours: event.target.value }))}
                                    placeholder={isTr ? "Hafta içi 09:00 - 18:00" : "Weekdays 09:00 - 18:00"}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="supportNotes">{t("notes") || "Notes"}</Label>
                                <Textarea
                                    id="supportNotes"
                                    value={form.supportNotes}
                                    onChange={(event) => setForm((prev) => ({ ...prev, supportNotes: event.target.value }))}
                                    placeholder={isTr ? "Kurulum, eğitim veya öncelikli destek süreci hakkında kısa bilgi verin." : "Share a short note about installation, training, or your preferred support process."}
                                    className="min-h-[140px]"
                                />
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    {t("saveChanges") || "Save Changes"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : null}

                <Card className="border-border/70">
                    <CardHeader>
                        <CardTitle>{editable ? (isTr ? "Müşteri Önizlemesi" : "Customer Preview") : (isTr ? "İletişim Kartı" : "Contact Card")}</CardTitle>
                        <CardDescription>
                            {editable
                                ? (isTr ? "Bağlı son kullanıcıların göreceği görünüm." : "What linked end users will see.")
                                : (isTr ? "Partner destek ekibinize ulaşabileceğiniz kanallar." : "The channels you can use to reach your partner support team.")}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="rounded-2xl border border-border/70 bg-muted/30 p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                        {partner?.partnerName || partner?.agencyName || (isTr ? "Partner Desteği" : "Partner Support")}
                                    </div>
                                    <div className="mt-2 text-xl font-semibold">{preview.name}</div>
                                </div>
                                <Badge variant="secondary">{t("footerHelp") || "Help Center"}</Badge>
                            </div>

                            <div className="mt-5 space-y-3 text-sm">
                                <div className="flex items-center gap-3">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <a className="hover:underline" href={`mailto:${preview.email}`}>{preview.email}</a>
                                </div>
                                {preview.phone ? (
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <a className="hover:underline" href={`tel:${preview.phone}`}>{preview.phone}</a>
                                    </div>
                                ) : null}
                                {preview.whatsapp ? (
                                    <div className="flex items-center gap-3">
                                        <MessageCircle className="h-4 w-4 text-muted-foreground" />
                                        <span>{preview.whatsapp}</span>
                                    </div>
                                ) : null}
                                <div className="flex items-center gap-3">
                                    <Clock3 className="h-4 w-4 text-muted-foreground" />
                                    <span>{preview.hours}</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <UserRound className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                    <p className="text-muted-foreground">{preview.notes}</p>
                                </div>
                            </div>
                        </div>

                        {!editable && !partner ? (
                            <div className="rounded-xl border border-dashed border-border/70 bg-background p-4 text-sm text-muted-foreground">
                                {isTr
                                    ? "Bu hesap için partner yardımı tanımlanmamış. Şimdilik varsayılan Vion destek kanallarını kullanabilirsiniz."
                                    : "No partner help details are configured for this account yet. You can use the default Vion support channels for now."}
                            </div>
                        ) : null}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
