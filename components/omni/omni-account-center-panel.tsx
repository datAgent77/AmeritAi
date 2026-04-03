"use client"

import { useEffect, useMemo, useState } from "react"
import { Bell, Copy, Eye, EyeOff, KeyRound, Loader2, Mail, RefreshCw, Save, Shield, UserCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { useOmniAccount } from "@/context/OmniAccountContext"
import { useToast } from "@/hooks/use-toast"
import { BillingToggle } from "@/components/pricing/billing-toggle"
import { formatPlanPrice, getPublicPlansSorted, type PlanConfig } from "@/lib/pricing-config"

interface AccountCenterPayload {
    personal: {
        email: string
        firstName: string
        lastName: string
        phone: string
    }
    company: {
        companyName: string
        companyWebsite: string
        companyAddress: string
        companyEmail: string
        industry: string
    }
    subscription: {
        planId: string
        subscriptionStatus: string
        trialEndsAt?: string | null
        billingCycle: "monthly" | "annual"
        lastUpgradeRequest?: {
            targetPlan?: string
            status?: string
            source?: string
        } | null
    }
}

interface DeveloperPayload {
    accessToken: string | null
    webhookUrl: string
    webhookSecret: string | null
    docsUrl: string
    webhookEvents: string[]
    updatedAt?: string | null
}

const INDUSTRY_OPTIONS = [
    "ecommerce",
    "saas",
    "service",
    "restaurant",
    "healthcare",
    "education",
    "finance",
    "real_estate",
    "booking",
    "agriculture",
    "automotive",
    "insurance",
    "logistics",
    "beauty",
    "legal",
    "fitness",
    "maritime",
    "other",
]

function getIndustryLabel(value: string, language: "tr" | "en") {
    const labels: Record<string, { tr: string; en: string }> = {
        ecommerce: { tr: "E-Ticaret", en: "E-Commerce" },
        saas: { tr: "SaaS / Yazılım", en: "SaaS / Software" },
        service: { tr: "Hizmet", en: "Service" },
        restaurant: { tr: "Restoran", en: "Restaurant" },
        healthcare: { tr: "Sağlık", en: "Healthcare" },
        education: { tr: "Eğitim", en: "Education" },
        finance: { tr: "Finans", en: "Finance" },
        real_estate: { tr: "Emlak", en: "Real Estate" },
        booking: { tr: "Seyahat", en: "Travel" },
        agriculture: { tr: "Tarım", en: "Agriculture" },
        automotive: { tr: "Otomotiv", en: "Automotive" },
        insurance: { tr: "Sigorta", en: "Insurance" },
        logistics: { tr: "Lojistik", en: "Logistics" },
        beauty: { tr: "Güzellik", en: "Beauty & Wellness" },
        legal: { tr: "Hukuk", en: "Legal" },
        fitness: { tr: "Fitness", en: "Fitness" },
        maritime: { tr: "Denizcilik", en: "Maritime" },
        other: { tr: "Diğer", en: "Other" },
    }
    return labels[value]?.[language] || value
}

export function OmniAccountCenterPanel() {
    const { user } = useAuth()
    const { language } = useLanguage()
    const { activeAccountId: chatbotId, activeAccount } = useOmniAccount()
    const { toast } = useToast()
    const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly")
    const [payload, setPayload] = useState<AccountCenterPayload | null>(null)
    const [developer, setDeveloper] = useState<DeveloperPayload | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSavingProfile, setIsSavingProfile] = useState(false)
    const [isSavingCompany, setIsSavingCompany] = useState(false)
    const [isSavingDeveloper, setIsSavingDeveloper] = useState(false)
    const [isSubmittingPlan, setIsSubmittingPlan] = useState<string | null>(null)
    const [showToken, setShowToken] = useState(false)
    const [showWebhookSecret, setShowWebhookSecret] = useState(false)
    const [soundEnabled, setSoundEnabled] = useState(true)
    const [pushEnabled, setPushEnabled] = useState(false)
    const [emailEnabled, setEmailEnabled] = useState(true)

    const plans = useMemo(() => getPublicPlansSorted(), [])

    const load = async () => {
        if (!user || !chatbotId) return
        setIsLoading(true)
        try {
            const token = await user.getIdToken()
            const [accountCenterRes, developerRes] = await Promise.all([
                fetch(`/api/omni/account-center?chatbotId=${encodeURIComponent(chatbotId)}`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch(`/api/omni/account-center/developers?chatbotId=${encodeURIComponent(chatbotId)}`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ])

            if (!accountCenterRes.ok || !developerRes.ok) {
                throw new Error(language === "tr" ? "Ayarlar yüklenemedi." : "Failed to load settings.")
            }

            const accountCenterData = await accountCenterRes.json()
            const developerData = await developerRes.json()
            setPayload(accountCenterData)
            setDeveloper(developerData.developer || null)
            setBillingCycle(accountCenterData?.subscription?.billingCycle === "annual" ? "annual" : "monthly")
        } catch (error: any) {
            toast({
                title: language === "tr" ? "Hata" : "Error",
                description: error?.message || (language === "tr" ? "Ayarlar yüklenemedi." : "Failed to load settings."),
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        load()
    }, [user?.uid, chatbotId])

    useEffect(() => {
        if (typeof window === "undefined") return
        const sound = window.localStorage.getItem("notificationSoundEnabled")
        const push = window.localStorage.getItem("omniPushNotificationsEnabled")
        const email = window.localStorage.getItem("omniEmailNotificationsEnabled")
        if (sound !== null) setSoundEnabled(sound === "true")
        if (push !== null) setPushEnabled(push === "true")
        if (email !== null) setEmailEnabled(email === "true")
        if ("Notification" in window && Notification.permission === "granted") {
            setPushEnabled(true)
        }
    }, [])

    const copyValue = async (value?: string | null) => {
        if (!value) return
        await navigator.clipboard.writeText(value)
        toast({
            title: language === "tr" ? "Kopyalandı" : "Copied",
            description: language === "tr" ? "Değer panoya kopyalandı." : "Value copied to clipboard.",
        })
    }

    const saveProfile = async () => {
        if (!user || !chatbotId || !payload) return
        setIsSavingProfile(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/omni/account-center", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    chatbotId,
                    personal: payload.personal,
                }),
            })
            const data = await response.json()
            if (!response.ok) {
                throw new Error(data?.error || "Failed to save")
            }
            setPayload((current) => current ? { ...current, personal: data.personal } : current)
            toast({
                title: language === "tr" ? "Kaydedildi" : "Saved",
                description: language === "tr" ? "Profil bilgileri güncellendi." : "Profile details updated.",
            })
        } catch (error: any) {
            toast({
                title: language === "tr" ? "Hata" : "Error",
                description: error?.message || (language === "tr" ? "Profil kaydedilemedi." : "Failed to save profile."),
                variant: "destructive",
            })
        } finally {
            setIsSavingProfile(false)
        }
    }

    const saveCompany = async () => {
        if (!user || !chatbotId || !payload) return
        setIsSavingCompany(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/omni/account-center", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    chatbotId,
                    company: payload.company,
                }),
            })
            const data = await response.json()
            if (!response.ok) {
                throw new Error(data?.error || "Failed to save")
            }
            setPayload((current) => current ? { ...current, company: data.company } : current)
            toast({
                title: language === "tr" ? "Kaydedildi" : "Saved",
                description: language === "tr" ? "Şirket bilgileri güncellendi." : "Company details updated.",
            })
        } catch (error: any) {
            toast({
                title: language === "tr" ? "Hata" : "Error",
                description: error?.message || (language === "tr" ? "Şirket bilgileri kaydedilemedi." : "Failed to save company details."),
                variant: "destructive",
            })
        } finally {
            setIsSavingCompany(false)
        }
    }

    const mutateDeveloper = async (action: "bootstrap" | "save" | "regenerate_token" | "regenerate_secret") => {
        if (!user || !chatbotId || !developer) return
        setIsSavingDeveloper(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/omni/account-center/developers", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    chatbotId,
                    action,
                    webhookUrl: developer.webhookUrl,
                }),
            })
            const data = await response.json()
            if (!response.ok) {
                throw new Error(data?.error || "Failed to update developer settings")
            }
            setDeveloper(data.developer || null)
            toast({
                title: language === "tr" ? "Kaydedildi" : "Saved",
                description:
                    action === "save"
                        ? language === "tr"
                            ? "Developer ayarları güncellendi."
                            : "Developer settings updated."
                        : language === "tr"
                            ? "Gizli anahtarlar yenilendi."
                            : "Secrets regenerated.",
            })
        } catch (error: any) {
            toast({
                title: language === "tr" ? "Hata" : "Error",
                description: error?.message || (language === "tr" ? "Developer ayarları güncellenemedi." : "Failed to update developer settings."),
                variant: "destructive",
            })
        } finally {
            setIsSavingDeveloper(false)
        }
    }

    const handlePushToggle = async (checked: boolean) => {
        if (typeof window === "undefined") return
        if (checked) {
            if ("Notification" in window) {
                const permission = await Notification.requestPermission()
                const enabled = permission === "granted"
                setPushEnabled(enabled)
                window.localStorage.setItem("omniPushNotificationsEnabled", String(enabled))
                if (!enabled) {
                    toast({
                        title: language === "tr" ? "İzin Gerekli" : "Permission Required",
                        description: language === "tr" ? "Push bildirim izni verilmedi." : "Push notification permission was not granted.",
                        variant: "destructive",
                    })
                }
                return
            }
        }
        setPushEnabled(checked)
        window.localStorage.setItem("omniPushNotificationsEnabled", String(checked))
    }

    const requestUpgrade = async (planId: string) => {
        if (!user || !chatbotId) return
        setIsSubmittingPlan(planId)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/omni/account-center/subscription", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ chatbotId, targetPlan: planId }),
            })
            const data = await response.json()
            if (!response.ok) {
                throw new Error(data?.error || "Failed to submit upgrade request")
            }
            setPayload((current) => current ? {
                ...current,
                subscription: {
                    ...current.subscription,
                    lastUpgradeRequest: data.lastUpgradeRequest,
                },
            } : current)
            toast({
                title: language === "tr" ? "Talep alındı" : "Request received",
                description: language === "tr" ? "Plan yükseltme talebi kaydedildi." : "Upgrade request recorded.",
            })
        } catch (error: any) {
            toast({
                title: language === "tr" ? "Hata" : "Error",
                description: error?.message || (language === "tr" ? "Plan talebi gönderilemedi." : "Failed to submit plan request."),
                variant: "destructive",
            })
        } finally {
            setIsSubmittingPlan(null)
        }
    }

    if (!chatbotId) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-16 text-center text-sm text-muted-foreground">
                    {language === "tr" ? "Önce aktif bir account seçin." : "Select an active account first."}
                </CardContent>
            </Card>
        )
    }

    if (isLoading || !payload || !developer) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const currentPlanId = payload.subscription.planId || "starter"
    const pendingPlanId = payload.subscription.lastUpgradeRequest?.status === "pending" ? payload.subscription.lastUpgradeRequest?.targetPlan || null : null

    return (
        <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid h-auto w-full grid-cols-2 md:grid-cols-5">
                <TabsTrigger value="profile">{language === "tr" ? "Profil" : "Profile"}</TabsTrigger>
                <TabsTrigger value="company">{language === "tr" ? "Şirket" : "Company"}</TabsTrigger>
                <TabsTrigger value="notifications">{language === "tr" ? "Bildirimler" : "Notifications"}</TabsTrigger>
                <TabsTrigger value="developers">{language === "tr" ? "Geliştirici" : "Developers"}</TabsTrigger>
                <TabsTrigger value="subscription">{language === "tr" ? "Abonelik" : "Subscription"}</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><UserCircle className="h-5 w-5" />{language === "tr" ? "Hesap Profili" : "Account Profile"}</CardTitle>
                        <CardDescription>
                            {activeAccount?.companyName || activeAccount?.email || chatbotId}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>{language === "tr" ? "Ad" : "First name"}</Label>
                                <Input value={payload.personal.firstName} onChange={(event) => setPayload((current) => current ? { ...current, personal: { ...current.personal, firstName: event.target.value } } : current)} />
                            </div>
                            <div className="space-y-2">
                                <Label>{language === "tr" ? "Soyad" : "Last name"}</Label>
                                <Input value={payload.personal.lastName} onChange={(event) => setPayload((current) => current ? { ...current, personal: { ...current.personal, lastName: event.target.value } } : current)} />
                            </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input value={payload.personal.email} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label>{language === "tr" ? "Telefon" : "Phone"}</Label>
                                <Input value={payload.personal.phone} onChange={(event) => setPayload((current) => current ? { ...current, personal: { ...current.personal, phone: event.target.value } } : current)} />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={saveProfile} disabled={isSavingProfile}>
                                {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {language === "tr" ? "Profili Kaydet" : "Save Profile"}
                            </Button>
                            <Button variant="outline" disabled>
                                {language === "tr" ? "Email Değişikliği Yakında" : "Email change coming soon"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />{language === "tr" ? "Güvenlik" : "Security"}</CardTitle>
                        <CardDescription>{language === "tr" ? "Şifre sıfırlama bağlantısını mevcut kullanıcı email’ine gönderir." : "Sends a password reset link to the current user email."}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" onClick={async () => {
                            if (!user?.email) return
                            try {
                                const authModule = await import("firebase/auth")
                                const firebaseModule = await import("@/lib/firebase")
                                await authModule.sendPasswordResetEmail(firebaseModule.auth, user.email)
                                toast({
                                    title: language === "tr" ? "Gönderildi" : "Sent",
                                    description: language === "tr" ? "Şifre sıfırlama email’i gönderildi." : "Password reset email sent.",
                                })
                            } catch (error: any) {
                                toast({
                                    title: language === "tr" ? "Hata" : "Error",
                                    description: error?.message || (language === "tr" ? "Email gönderilemedi." : "Failed to send email."),
                                    variant: "destructive",
                                })
                            }
                        }}>
                            <Mail className="mr-2 h-4 w-4" />
                            {language === "tr" ? "Şifre Sıfırlama Email'i Gönder" : "Send Password Reset Email"}
                        </Button>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="company" className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>{language === "tr" ? "Şirket Bilgileri" : "Company Details"}</CardTitle>
                        <CardDescription>{language === "tr" ? "Bu alanlar account profili ile AI bağlamını birlikte besler." : "These fields feed both account profile and AI context."}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>{language === "tr" ? "Şirket Adı" : "Company name"}</Label>
                                <Input value={payload.company.companyName} onChange={(event) => setPayload((current) => current ? { ...current, company: { ...current.company, companyName: event.target.value } } : current)} />
                            </div>
                            <div className="space-y-2">
                                <Label>{language === "tr" ? "Sektör" : "Industry"}</Label>
                                <select value={payload.company.industry} onChange={(event) => setPayload((current) => current ? { ...current, company: { ...current.company, industry: event.target.value } } : current)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                                    <option value="">{language === "tr" ? "Seçin" : "Select"}</option>
                                    {INDUSTRY_OPTIONS.map((option) => (
                                        <option key={option} value={option}>{getIndustryLabel(option, language === "tr" ? "tr" : "en")}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>{language === "tr" ? "Web Sitesi" : "Website"}</Label>
                                <Input value={payload.company.companyWebsite} onChange={(event) => setPayload((current) => current ? { ...current, company: { ...current.company, companyWebsite: event.target.value } } : current)} />
                            </div>
                            <div className="space-y-2">
                                <Label>{language === "tr" ? "Şirket Email" : "Company email"}</Label>
                                <Input value={payload.company.companyEmail} disabled />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>{language === "tr" ? "Adres" : "Address"}</Label>
                            <Input value={payload.company.companyAddress} onChange={(event) => setPayload((current) => current ? { ...current, company: { ...current.company, companyAddress: event.target.value } } : current)} />
                        </div>
                        <Button onClick={saveCompany} disabled={isSavingCompany}>
                            {isSavingCompany ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {language === "tr" ? "Şirket Bilgilerini Kaydet" : "Save Company Details"}
                        </Button>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />{language === "tr" ? "Bildirim Tercihleri" : "Notification Preferences"}</CardTitle>
                        <CardDescription>{language === "tr" ? "Omni operasyon sesleri ve bildirim izinleri." : "Omni operational sounds and notification permissions."}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                            <div>
                                <div className="font-medium">{language === "tr" ? "Sesli Bildirim" : "Sound Notifications"}</div>
                                <div className="text-sm text-muted-foreground">{language === "tr" ? "Inbox ve operasyon olaylarında ses çalar." : "Plays a sound for inbox and operational events."}</div>
                            </div>
                            <Switch checked={soundEnabled} onCheckedChange={(checked) => {
                                setSoundEnabled(checked)
                                window.localStorage.setItem("notificationSoundEnabled", String(checked))
                            }} />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                            <div>
                                <div className="font-medium">{language === "tr" ? "Push Bildirim" : "Push Notifications"}</div>
                                <div className="text-sm text-muted-foreground">{language === "tr" ? "Tarayıcı push iznini kullanır." : "Uses browser notification permission."}</div>
                            </div>
                            <Switch checked={pushEnabled} onCheckedChange={handlePushToggle} />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                            <div>
                                <div className="font-medium">{language === "tr" ? "Email Özeti" : "Email Summary"}</div>
                                <div className="text-sm text-muted-foreground">{language === "tr" ? "Operasyon özetlerini email ile almak için yer tutucu tercih." : "Placeholder preference for receiving operational digests by email."}</div>
                            </div>
                            <Switch checked={emailEnabled} onCheckedChange={(checked) => {
                                setEmailEnabled(checked)
                                window.localStorage.setItem("omniEmailNotificationsEnabled", String(checked))
                            }} />
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="developers" className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" />{language === "tr" ? "Developer Access" : "Developer Access"}</CardTitle>
                        <CardDescription>{language === "tr" ? "Webhook hedefi, access token ve webhook secret burada yönetilir." : "Manage webhook target, access token, and webhook secret here."}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>{language === "tr" ? "Access Token" : "Access Token"}</Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input readOnly type={showToken ? "text" : "password"} value={developer.accessToken || ""} className="pr-10 font-mono" />
                                    <button type="button" onClick={() => setShowToken((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                        {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                <Button variant="outline" onClick={() => copyValue(developer.accessToken)}><Copy className="h-4 w-4" /></Button>
                                <Button variant="outline" onClick={() => mutateDeveloper(developer.accessToken ? "regenerate_token" : "bootstrap")} disabled={isSavingDeveloper}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    {language === "tr" ? "Yenile" : "Regenerate"}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>{language === "tr" ? "Webhook URL" : "Webhook URL"}</Label>
                            <Input value={developer.webhookUrl} onChange={(event) => setDeveloper((current) => current ? { ...current, webhookUrl: event.target.value } : current)} placeholder="https://example.com/api/webhooks/vion" />
                        </div>
                        <div className="space-y-2">
                            <Label>{language === "tr" ? "Webhook Secret" : "Webhook Secret"}</Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input readOnly type={showWebhookSecret ? "text" : "password"} value={developer.webhookSecret || ""} className="pr-10 font-mono" />
                                    <button type="button" onClick={() => setShowWebhookSecret((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                        {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                <Button variant="outline" onClick={() => copyValue(developer.webhookSecret)}><Copy className="h-4 w-4" /></Button>
                                <Button variant="outline" onClick={() => mutateDeveloper(developer.webhookSecret ? "regenerate_secret" : "bootstrap")} disabled={isSavingDeveloper}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    {language === "tr" ? "Yenile" : "Regenerate"}
                                </Button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={() => mutateDeveloper(developer.accessToken && developer.webhookSecret ? "save" : "bootstrap")} disabled={isSavingDeveloper}>
                                {isSavingDeveloper ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {language === "tr" ? "Developer Ayarlarını Kaydet" : "Save Developer Settings"}
                            </Button>
                            <Button variant="outline" asChild>
                                <a href={developer.docsUrl} target="_blank" rel="noreferrer">{language === "tr" ? "Smoke & Webhook Runbook" : "Smoke & Webhook Runbook"}</a>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{language === "tr" ? "Webhook Eventleri" : "Webhook Events"}</CardTitle>
                        <CardDescription>{language === "tr" ? "Harici sisteminize göndermeyi hedeflediğimiz olaylar." : "Events intended for your external systems."}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-2">
                        {developer.webhookEvents.map((eventName) => (
                            <div key={eventName} className="rounded-lg border bg-muted/30 px-4 py-3 font-mono text-xs">{eventName}</div>
                        ))}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="subscription" className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>{language === "tr" ? "Plan & Faturalama" : "Plan & Billing"}</CardTitle>
                        <CardDescription>{language === "tr" ? "Seçili account için plan durumunu izleyin ve yükseltme talebi gönderin." : "Track plan state and submit an upgrade request for the selected account."}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                            <span><strong>{language === "tr" ? "Mevcut plan:" : "Current plan:"}</strong> {currentPlanId}</span>
                            <span><strong>{language === "tr" ? "Durum:" : "Status:"}</strong> {payload.subscription.subscriptionStatus}</span>
                            {pendingPlanId ? <span><strong>{language === "tr" ? "Bekleyen talep:" : "Pending request:"}</strong> {pendingPlanId}</span> : null}
                        </div>
                        <div className="flex justify-center">
                            <BillingToggle billingCycle={billingCycle} onChange={setBillingCycle} />
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-4 lg:grid-cols-4">
                    {plans.map((plan: PlanConfig) => {
                        const isCurrentPlan = plan.planId === currentPlanId
                        const isPending = pendingPlanId === plan.planId
                        const price = formatPlanPrice(plan.planId, billingCycle, language === "tr" ? "tr" : "en")
                        const isDowngrade = plan.sortOrder < (plans.find((item) => item.planId === currentPlanId)?.sortOrder || 0)
                        return (
                            <Card key={plan.planId} className={isCurrentPlan ? "border-black" : ""}>
                                <CardHeader>
                                    <CardTitle className="text-lg">{plan.displayName}</CardTitle>
                                    <CardDescription>{price}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        {plan.highlights?.slice(0, 4).map((feature) => (
                                            <div key={feature}>• {feature}</div>
                                        ))}
                                    </div>
                                    <Button
                                        className="w-full"
                                        variant={isCurrentPlan ? "outline" : "default"}
                                        disabled={isCurrentPlan || isPending || isDowngrade || Boolean(isSubmittingPlan)}
                                        onClick={() => requestUpgrade(plan.planId)}
                                    >
                                        {isSubmittingPlan === plan.planId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        {isCurrentPlan
                                            ? language === "tr" ? "Mevcut Plan" : "Current Plan"
                                            : isPending
                                                ? language === "tr" ? "Talep Bekliyor" : "Pending Request"
                                                : isDowngrade
                                                    ? language === "tr" ? "Düşürme Yok" : "Downgrade Disabled"
                                                    : language === "tr" ? "Yükseltme Talebi" : "Request Upgrade"}
                                    </Button>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </TabsContent>
        </Tabs>
    )
}
