"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
    BadgePercent,
    CalendarClock,
    Coins,
    FileText,
    Handshake,
    Loader2,
    ShieldCheck,
    Sparkles,
    Users,
} from "lucide-react"
import { auth } from "@/lib/firebase"
import type { ManagementPartnerRecord, PartnerCapabilities, PartnerLevel } from "@/lib/management/types"
import { getPartnerLevelLabel } from "@/lib/management/access"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/context/LanguageContext"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type CommissionModel = "one_time" | "recurring" | "hybrid"

type PartnershipProgram = {
    commissionRate: number
    commissionModel: CommissionModel
    payoutScheduleDays: number
    summary: string
    rules: string[]
}

function formatDate(value: string | null | undefined, locale: string, fallback: string) {
    if (!value) return fallback

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return fallback

    return parsed.toLocaleDateString(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
    })
}

function resolveCommissionModel(model: string | null | undefined): CommissionModel {
    if (model === "one_time" || model === "recurring" || model === "hybrid") {
        return model
    }
    return "recurring"
}

function getDefaultProgram(level: PartnerLevel, isTr: boolean): PartnershipProgram {
    switch (level) {
        case "partner":
            return {
                commissionRate: 10,
                commissionModel: "one_time",
                payoutScheduleDays: 30,
                summary: isTr
                    ? "Temel partner paketi. Yönlendirdiğiniz ilk satış üzerinden tek seferlik komisyon kazanırsınız."
                    : "Base partner plan. You earn a one-time commission on the first sale you refer.",
                rules: isTr
                    ? [
                        "Yönlendirme hakkı müşteri ilk kayıt tarihinden itibaren 30 gün boyunca korunur.",
                        "Aynı müşteri için ilk kayıt oluşturan partner komisyon hakkını alır.",
                        "Ödeme, tahsil edilen faturadan sonra 30 gün içinde yapılır.",
                        "Bu seviye müşteri hesaplarını inceleyebilir ancak çalışma alanlarına giremez.",
                    ]
                    : [
                        "Referral ownership is protected for 30 days from the customer's first registration.",
                        "For duplicate referrals, the first registered partner receives the commission.",
                        "Payout is made within 30 days after the invoice is collected.",
                        "This tier can review managed accounts but cannot enter their workspaces.",
                    ],
            }
        case "strategic_partner":
            return {
                commissionRate: 30,
                commissionModel: "hybrid",
                payoutScheduleDays: 15,
                summary: isTr
                    ? "Stratejik partner paketi. Yinelenen lisans komisyonu alırsınız ve hizmet gelirlerini partner tarafında tutabilirsiniz."
                    : "Strategic partner plan. You receive recurring license commissions and retain partner-side service revenue.",
                rules: isTr
                    ? [
                        "Yinelenen lisans komisyonu aktif abonelik devam ettiği sürece işler.",
                        "Partner logonuz bağlı müşteri hesaplarının başlığında gösterilebilir.",
                        "Tahsil edilen faturalar için ödeme hedefi 15 gündür.",
                        "Sözleşme ve marka kurallarının ihlali komisyon akışını durdurabilir.",
                    ]
                    : [
                        "Recurring license commission applies while the customer subscription remains active.",
                        "Your partner logo can be shown in linked customer account headers.",
                        "Collected invoices target a 15-day payout window.",
                        "Violations of agreement or brand rules can suspend commission flow.",
                    ],
            }
        default:
            return {
                commissionRate: 20,
                commissionModel: "recurring",
                payoutScheduleDays: 30,
                summary: isTr
                    ? "Solution Partner paketi. Yönetilen hesaplar oluşturabilir ve aktif aboneliklerden yinelenen komisyon kazanabilirsiniz."
                    : "Solution Partner plan. You can create managed accounts and earn recurring commission from active subscriptions.",
                rules: isTr
                    ? [
                        "Yinelenen komisyon aktif aboneliklerde aylık olarak işler.",
                        "Yönlendirilen müşteri için ilk temas kuralı geçerlidir.",
                        "Tahsil edilen faturalar için ödeme 30 gün içinde hedeflenir.",
                        "Bu seviye bağlı müşteri çalışma alanlarına erişebilir.",
                    ]
                    : [
                        "Recurring commission is paid monthly on active subscriptions.",
                        "First-touch attribution applies to referred customers.",
                        "Collected invoices target a 30-day payout window.",
                        "This tier can access linked customer workspaces.",
                    ],
            }
    }
}

export default function AgencyPartnershipPage() {
    const { toast } = useToast()
    const { language, t } = useLanguage()
    const isTr = language === "tr"
    const locale = isTr ? "tr-TR" : "en-US"

    const [partner, setPartner] = useState<ManagementPartnerRecord | null>(null)
    const [capabilities, setCapabilities] = useState<PartnerCapabilities | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const loadPartnerProfile = useCallback(async () => {
        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) {
                setIsLoading(false)
                return
            }

            const response = await fetch("/api/agency/profile", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.error || "Failed to fetch partner profile")
            }

            setPartner(data?.partner || null)
            setCapabilities(data?.capabilities || null)
        } catch (error: any) {
            toast({
                title: isTr ? "Hata" : "Error",
                description: error?.message || (isTr ? "Partner profili yüklenemedi." : "Failed to load partner profile."),
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }, [isTr, toast])

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                loadPartnerProfile()
            } else {
                setIsLoading(false)
            }
        })

        return () => unsubscribe()
    }, [loadPartnerProfile])

    const resolvedCapabilities = capabilities || partner?.capabilities || null

    const partnershipProgram = useMemo(() => {
        const defaults = getDefaultProgram(partner?.partnerLevel || "solution_partner", isTr)
        return {
            commissionRate: typeof partner?.commissionRate === "number" ? partner.commissionRate : defaults.commissionRate,
            commissionModel: resolveCommissionModel(partner?.commissionModel || defaults.commissionModel),
            payoutScheduleDays: typeof partner?.payoutScheduleDays === "number" ? partner.payoutScheduleDays : defaults.payoutScheduleDays,
            summary: partner?.commissionNotes || defaults.summary,
            rules: defaults.rules,
        }
    }, [isTr, partner])

    const rights = useMemo(() => {
        const featureCopy = isTr
            ? [
                {
                    enabled: resolvedCapabilities?.canCreateManagedAccounts === true,
                    title: "Yönetilen hesap oluşturma",
                    on: "Yeni müşteri hesabı açabilir ve kendi partnerliğinize bağlayabilirsiniz.",
                    off: "Bu partner seviyesi yeni yönetilen hesap açamaz.",
                },
                {
                    enabled: resolvedCapabilities?.canAccessManagedAccountWorkspace === true,
                    title: "Müşteri çalışma alanı erişimi",
                    on: "Bağlı müşteri çalışma alanlarına girip operasyonu yönetebilirsiniz.",
                    off: "Bu partner seviyesi müşteri çalışma alanlarına giriş yetkisi vermez.",
                },
                {
                    enabled: resolvedCapabilities?.canSwitchOmniAccounts === true,
                    title: "Hesaplar arasında geçiş",
                    on: "Bağlı hesaplar arasında geçiş yapıp destek sağlayabilirsiniz.",
                    off: "Bu partner seviyesi hesaplar arasında geçiş yapamaz.",
                },
                {
                    enabled: resolvedCapabilities?.canUsePartnerBranding === true,
                    title: "Partner markalama",
                    on: "Logo ve marka görünümü bağlı hesaplarda gösterilebilir.",
                    off: "Partner markalama yalnızca Strategic Partner seviyesinde aktiftir.",
                },
            ]
            : [
                {
                    enabled: resolvedCapabilities?.canCreateManagedAccounts === true,
                    title: "Managed account creation",
                    on: "You can create new customer accounts and attach them to your partner organization.",
                    off: "This partner tier cannot create managed accounts.",
                },
                {
                    enabled: resolvedCapabilities?.canAccessManagedAccountWorkspace === true,
                    title: "Managed workspace access",
                    on: "You can enter linked customer workspaces and operate them directly.",
                    off: "This tier does not include direct access to customer workspaces.",
                },
                {
                    enabled: resolvedCapabilities?.canSwitchOmniAccounts === true,
                    title: "Account switching",
                    on: "You can switch across linked accounts to provide partner-side support.",
                    off: "This tier cannot switch between linked accounts.",
                },
                {
                    enabled: resolvedCapabilities?.canUsePartnerBranding === true,
                    title: "Partner branding",
                    on: "Your logo and brand treatment can be shown across linked accounts.",
                    off: "Partner branding is available only for Strategic Partner tier.",
                },
            ]

        return featureCopy
    }, [isTr, resolvedCapabilities])

    const commissionModelLabel = useMemo(() => {
        if (partnershipProgram.commissionModel === "one_time") {
            return isTr ? "Tek seferlik" : "One-time"
        }
        if (partnershipProgram.commissionModel === "hybrid") {
            return isTr ? "Hibrit" : "Hybrid"
        }
        return isTr ? "Yinelenen" : "Recurring"
    }, [isTr, partnershipProgram.commissionModel])

    const agreementVersion = partner?.agreementVersion || "Program 2026.1"
    const partnerName = partner?.partnerName || partner?.agencyName || partner?.email || (isTr ? "Partner hesabı" : "Partner account")
    const partnerSince = formatDate(partner?.createdAt, locale, isTr ? "Kayıt yok" : "Not recorded")
    const agreementAcceptedAt = formatDate(partner?.agreementAcceptedAt, locale, isTr ? "Standart program" : "Standard program")

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!partner) {
        return (
            <Card className="border-border/70">
                <CardHeader>
                    <CardTitle>{t("agencyPartnership")}</CardTitle>
                    <CardDescription>{t("agencyPartnershipDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        {isTr
                            ? "Bu hesap için partner profili bulunamadı. Lütfen yönetici ile iletişime geçin."
                            : "No partner profile was found for this account. Please contact an administrator."}
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Handshake className="h-4 w-4" />
                        <span>{t("agencyPartnership")}</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {isTr ? "Partnerlik Merkezi" : "Partnership Center"}
                    </h1>
                    <p className="max-w-3xl text-muted-foreground">
                        {isTr
                            ? "Partner seviyenizi, komisyon modelinizi, temel operasyon kurallarınızı ve sahip olduğunuz yetkileri tek ekranda görün."
                            : "View your partner tier, commission model, operating rules, and active permissions in one place."}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{getPartnerLevelLabel(partner.partnerLevel)}</Badge>
                    <Badge variant={partner.isActive ? "default" : "secondary"}>
                        {partner.isActive ? (isTr ? "Aktif" : "Active") : (isTr ? "Pasif" : "Inactive")}
                    </Badge>
                    <Badge variant="secondary">{agreementVersion}</Badge>
                </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
                <Card className="border-border/70">
                    <CardHeader>
                        <CardDescription>{isTr ? "Profil" : "Profile"}</CardDescription>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            {partnerName}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <div className="text-xs uppercase tracking-wide text-muted-foreground">{isTr ? "Partner seviyesi" : "Partner tier"}</div>
                            <div className="mt-1 font-medium">{getPartnerLevelLabel(partner.partnerLevel)}</div>
                        </div>
                        <div>
                            <div className="text-xs uppercase tracking-wide text-muted-foreground">{isTr ? "Partner başlangıcı" : "Partner since"}</div>
                            <div className="mt-1 font-medium">{partnerSince}</div>
                        </div>
                        <div>
                            <div className="text-xs uppercase tracking-wide text-muted-foreground">{isTr ? "Toplam müşteri" : "Total customers"}</div>
                            <div className="mt-1 font-medium">{partner.customerCount}</div>
                        </div>
                        <div>
                            <div className="text-xs uppercase tracking-wide text-muted-foreground">{isTr ? "Omni aktif hesap" : "Omni-enabled accounts"}</div>
                            <div className="mt-1 font-medium">{partner.omniEnabledAccounts}</div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/70">
                    <CardHeader>
                        <CardDescription>{isTr ? "Komisyon planı" : "Commission plan"}</CardDescription>
                        <CardTitle className="flex items-center gap-2">
                            <BadgePercent className="h-5 w-5 text-primary" />
                            {isTr ? `%${partnershipProgram.commissionRate}` : `${partnershipProgram.commissionRate}%`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{commissionModelLabel}</Badge>
                            <Badge variant="secondary">
                                {isTr
                                    ? `${partnershipProgram.payoutScheduleDays} gün ödeme hedefi`
                                    : `${partnershipProgram.payoutScheduleDays}-day payout target`}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{partnershipProgram.summary}</p>
                    </CardContent>
                </Card>

                <Card className="border-border/70">
                    <CardHeader>
                        <CardDescription>{isTr ? "Program durumu" : "Program status"}</CardDescription>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            {isTr ? "Sözleşme ve işletim" : "Agreement & operations"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="flex items-start gap-3">
                            <CalendarClock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                            <div>
                                <div className="text-sm font-medium">{isTr ? "Kabul kaydı" : "Acceptance record"}</div>
                                <div className="text-sm text-muted-foreground">{agreementAcceptedAt}</div>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Coins className="mt-0.5 h-4 w-4 text-muted-foreground" />
                            <div>
                                <div className="text-sm font-medium">{isTr ? "Ödeme akışı" : "Payout flow"}</div>
                                <div className="text-sm text-muted-foreground">
                                    {isTr
                                        ? `Tahsil edilen faturalarda hedef ödeme ${partnershipProgram.payoutScheduleDays} gündür.`
                                        : `Collected invoices target a ${partnershipProgram.payoutScheduleDays}-day payout window.`}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                            <div>
                                <div className="text-sm font-medium">{isTr ? "Politika kaydı" : "Policy record"}</div>
                                <div className="text-sm text-muted-foreground">
                                    {partner.programPolicyUrl
                                        ? partner.programPolicyUrl
                                        : (isTr ? "Standart partner programı kuralları uygulanır." : "Standard partner program rules apply.")}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                <Card className="border-border/70">
                    <CardHeader>
                        <CardDescription>{isTr ? "Yetkileriniz" : "Your permissions"}</CardDescription>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            {isTr ? "Bu seviyede neler yapabilirsiniz?" : "What you can do at this tier"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {rights.map((item) => (
                            <div key={item.title} className="rounded-lg border border-border/70 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="font-medium">{item.title}</div>
                                    <Badge variant={item.enabled ? "default" : "secondary"}>
                                        {item.enabled ? (isTr ? "Açık" : "Enabled") : (isTr ? "Kapalı" : "Locked")}
                                    </Badge>
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">{item.enabled ? item.on : item.off}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="border-border/70">
                    <CardHeader>
                        <CardDescription>{isTr ? "Genel kurallar" : "Operating rules"}</CardDescription>
                        <CardTitle className="flex items-center gap-2">
                            <Handshake className="h-5 w-5 text-primary" />
                            {isTr ? "Partnerlik genel koşulları" : "Partnership ground rules"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {partnershipProgram.rules.map((rule) => (
                            <div key={rule} className="flex items-start gap-3 rounded-lg border border-border/70 p-4">
                                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                <p className="text-sm text-muted-foreground">{rule}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
