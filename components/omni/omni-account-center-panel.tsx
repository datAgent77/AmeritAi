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
import { formatPlanPrice, getPlanHighlightsSorted, getPublicPlansSorted, normalizePlanId, shouldShowPlanPrices, type PlanConfig } from "@/lib/pricing-config"
import { cn } from "@/lib/utils"

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

function getIndustryLabel(value: string, language: string) {
    const labels: Record<string, { tr: string; en: string; es: string }> = {
        ecommerce: { tr: "E-Ticaret", en: "E-Commerce", es: "Comercio electrónico" },
        saas: { tr: "SaaS / Yazılım", en: "SaaS / Software", es: "SaaS / Software" },
        service: { tr: "Hizmet", en: "Service", es: "Servicios" },
        restaurant: { tr: "Restoran", en: "Restaurant", es: "Restaurante" },
        healthcare: { tr: "Sağlık", en: "Healthcare", es: "Salud" },
        education: { tr: "Eğitim", en: "Education", es: "Educación" },
        finance: { tr: "Finans", en: "Finance", es: "Finanzas" },
        real_estate: { tr: "Emlak", en: "Real Estate", es: "Bienes raíces" },
        booking: { tr: "Seyahat", en: "Travel", es: "Viajes" },
        agriculture: { tr: "Tarım", en: "Agriculture", es: "Agricultura" },
        automotive: { tr: "Otomotiv", en: "Automotive", es: "Automotriz" },
        insurance: { tr: "Sigorta", en: "Insurance", es: "Seguros" },
        logistics: { tr: "Lojistik", en: "Logistics", es: "Logística" },
        beauty: { tr: "Güzellik", en: "Beauty & Wellness", es: "Belleza y bienestar" },
        legal: { tr: "Hukuk", en: "Legal", es: "Legal" },
        fitness: { tr: "Fitness", en: "Fitness", es: "Fitness" },
        maritime: { tr: "Denizcilik", en: "Maritime", es: "Marítimo" },
        other: { tr: "Diğer", en: "Other", es: "Otro" },
    }
    const entry = labels[value]
    if (!entry) return value
    return (entry as Record<string, string>)[language] || entry.en
}

export function OmniAccountCenterPanel() {
    const { user } = useAuth()
    const { language, t } = useLanguage()
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
    const showPlanPrices = shouldShowPlanPrices()

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
                throw new Error(language === "tr" ? "Ayarlar yüklenemedi." : language === "es" ? "No se pudieron cargar los ajustes." : "Failed to load settings.")
            }

            const accountCenterData = await accountCenterRes.json()
            const developerData = await developerRes.json()
            setPayload(accountCenterData)
            setDeveloper(developerData.developer || null)
            setBillingCycle(accountCenterData?.subscription?.billingCycle === "annual" ? "annual" : "monthly")
        } catch (error: any) {
            toast({
                title: language === "tr" ? "Hata" : language === "es" ? "Error" : "Error",
                description: error?.message || (language === "tr" ? "Ayarlar yüklenemedi." : language === "es" ? "No se pudieron cargar los ajustes." : "Failed to load settings."),
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
            title: language === "tr" ? "Kopyalandı" : language === "es" ? "Copiado" : "Copied",
            description: language === "tr" ? "Değer panoya kopyalandı." : language === "es" ? "Valor copiado al portapapeles." : "Value copied to clipboard.",
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
                title: language === "tr" ? "Kaydedildi" : language === "es" ? "Guardado" : "Saved",
                description: language === "tr" ? "Profil bilgileri güncellendi." : language === "es" ? "Datos del perfil actualizados." : "Profile details updated.",
            })
        } catch (error: any) {
            toast({
                title: language === "tr" ? "Hata" : language === "es" ? "Error" : "Error",
                description: error?.message || (language === "tr" ? "Profil kaydedilemedi." : language === "es" ? "No se pudo guardar el perfil." : "Failed to save profile."),
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
                title: language === "tr" ? "Kaydedildi" : language === "es" ? "Guardado" : "Saved",
                description: language === "tr" ? "Şirket bilgileri güncellendi." : language === "es" ? "Datos de la empresa actualizados." : "Company details updated.",
            })
        } catch (error: any) {
            toast({
                title: language === "tr" ? "Hata" : language === "es" ? "Error" : "Error",
                description: error?.message || (language === "tr" ? "Şirket bilgileri kaydedilemedi." : language === "es" ? "No se pudieron guardar los datos de la empresa." : "Failed to save company details."),
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
                title: language === "tr" ? "Kaydedildi" : language === "es" ? "Guardado" : "Saved",
                description:
                    action === "save"
                        ? language === "tr"
                            ? "Developer ayarları güncellendi."
                            : language === "es"
                              ? "Ajustes de desarrollador actualizados."
                              : "Developer settings updated."
                        : language === "tr"
                            ? "Gizli anahtarlar yenilendi."
                            : language === "es"
                              ? "Secretos regenerados."
                              : "Secrets regenerated.",
            })
        } catch (error: any) {
            toast({
                title: language === "tr" ? "Hata" : language === "es" ? "Error" : "Error",
                description: error?.message || (language === "tr" ? "Developer ayarları güncellenemedi." : language === "es" ? "No se pudieron actualizar los ajustes de desarrollador." : "Failed to update developer settings."),
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
                        title: language === "tr" ? "İzin Gerekli" : language === "es" ? "Permiso requerido" : "Permission Required",
                        description: language === "tr" ? "Push bildirim izni verilmedi." : language === "es" ? "No se concedió el permiso de notificaciones push." : "Push notification permission was not granted.",
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
                title: language === "tr" ? "Talep alındı" : language === "es" ? "Solicitud recibida" : "Request received",
                description: language === "tr" ? "Plan yükseltme talebi kaydedildi." : language === "es" ? "Solicitud de actualización registrada." : "Upgrade request recorded.",
            })
        } catch (error: any) {
            toast({
                title: language === "tr" ? "Hata" : language === "es" ? "Error" : "Error",
                description: error?.message || (language === "tr" ? "Plan talebi gönderilemedi." : language === "es" ? "No se pudo enviar la solicitud de plan." : "Failed to submit plan request."),
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
                    {language === "tr" ? "Önce aktif bir account seçin." : language === "es" ? "Selecciona primero una cuenta activa." : "Select an active account first."}
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

    const currentPlanId = normalizePlanId(payload.subscription.planId || "starter")
    const pendingPlanId = payload.subscription.lastUpgradeRequest?.status === "pending" && payload.subscription.lastUpgradeRequest?.targetPlan
        ? normalizePlanId(payload.subscription.lastUpgradeRequest.targetPlan)
        : null

    return (
        <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid h-auto w-full grid-cols-2 md:grid-cols-5">
                <TabsTrigger value="profile">{language === "tr" ? "Profil" : language === "es" ? "Perfil" : "Profile"}</TabsTrigger>
                <TabsTrigger value="company">{language === "tr" ? "Şirket" : language === "es" ? "Empresa" : "Company"}</TabsTrigger>
                <TabsTrigger value="notifications">{language === "tr" ? "Bildirimler" : language === "es" ? "Notificaciones" : "Notifications"}</TabsTrigger>
                <TabsTrigger value="developers">{language === "tr" ? "Geliştirici" : language === "es" ? "Desarrolladores" : "Developers"}</TabsTrigger>
                <TabsTrigger value="subscription">{language === "tr" ? "Abonelik" : language === "es" ? "Suscripción" : "Subscription"}</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><UserCircle className="h-5 w-5" />{language === "tr" ? "Hesap Profili" : language === "es" ? "Perfil de cuenta" : "Account Profile"}</CardTitle>
                        <CardDescription>
                            {activeAccount?.companyName || activeAccount?.email || chatbotId}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>{language === "tr" ? "Ad" : language === "es" ? "Nombre" : "First name"}</Label>
                                <Input value={payload.personal.firstName} onChange={(event) => setPayload((current) => current ? { ...current, personal: { ...current.personal, firstName: event.target.value } } : current)} />
                            </div>
                            <div className="space-y-2">
                                <Label>{language === "tr" ? "Soyad" : language === "es" ? "Apellido" : "Last name"}</Label>
                                <Input value={payload.personal.lastName} onChange={(event) => setPayload((current) => current ? { ...current, personal: { ...current.personal, lastName: event.target.value } } : current)} />
                            </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input value={payload.personal.email} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label>{language === "tr" ? "Telefon" : language === "es" ? "Teléfono" : "Phone"}</Label>
                                <Input value={payload.personal.phone} onChange={(event) => setPayload((current) => current ? { ...current, personal: { ...current.personal, phone: event.target.value } } : current)} />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={saveProfile} disabled={isSavingProfile}>
                                {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {language === "tr" ? "Profili Kaydet" : language === "es" ? "Guardar perfil" : "Save Profile"}
                            </Button>
                            <Button variant="outline" disabled>
                                {language === "tr" ? "Email Değişikliği Yakında" : language === "es" ? "Cambio de email próximamente" : "Email change coming soon"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />{language === "tr" ? "Güvenlik" : language === "es" ? "Seguridad" : "Security"}</CardTitle>
                        <CardDescription>{language === "tr" ? "Şifre sıfırlama bağlantısını mevcut kullanıcı email’ine gönderir." : language === "es" ? "Envía un enlace de restablecimiento de contraseña al email del usuario actual." : "Sends a password reset link to the current user email."}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" onClick={async () => {
                            if (!user?.email) return
                            try {
                                const authModule = await import("firebase/auth")
                                const firebaseModule = await import("@/lib/firebase")
                                await authModule.sendPasswordResetEmail(firebaseModule.auth, user.email)
                                toast({
                                    title: language === "tr" ? "Gönderildi" : language === "es" ? "Enviado" : "Sent",
                                    description: language === "tr" ? "Şifre sıfırlama email’i gönderildi." : language === "es" ? "Email de restablecimiento de contraseña enviado." : "Password reset email sent.",
                                })
                            } catch (error: any) {
                                toast({
                                    title: language === "tr" ? "Hata" : language === "es" ? "Error" : "Error",
                                    description: error?.message || (language === "tr" ? "Email gönderilemedi." : language === "es" ? "No se pudo enviar el email." : "Failed to send email."),
                                    variant: "destructive",
                                })
                            }
                        }}>
                            <Mail className="mr-2 h-4 w-4" />
                            {language === "tr" ? "Şifre Sıfırlama Email'i Gönder" : language === "es" ? "Enviar email de restablecimiento" : "Send Password Reset Email"}
                        </Button>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="company" className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>{language === "tr" ? "Şirket Bilgileri" : language === "es" ? "Datos de la empresa" : "Company Details"}</CardTitle>
                        <CardDescription>{language === "tr" ? "Bu alanlar account profili ile AI bağlamını birlikte besler." : language === "es" ? "Estos campos alimentan tanto el perfil de la cuenta como el contexto de IA." : "These fields feed both account profile and AI context."}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>{language === "tr" ? "Şirket Adı" : language === "es" ? "Nombre de la empresa" : "Company name"}</Label>
                                <Input value={payload.company.companyName} onChange={(event) => setPayload((current) => current ? { ...current, company: { ...current.company, companyName: event.target.value } } : current)} />
                            </div>
                            <div className="space-y-2">
                                <Label>{language === "tr" ? "Sektör" : language === "es" ? "Sector" : "Industry"}</Label>
                                <select value={payload.company.industry} onChange={(event) => setPayload((current) => current ? { ...current, company: { ...current.company, industry: event.target.value } } : current)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                                    <option value="">{language === "tr" ? "Seçin" : language === "es" ? "Selecciona" : "Select"}</option>
                                    {INDUSTRY_OPTIONS.map((option) => (
                                        <option key={option} value={option}>{getIndustryLabel(option, language)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>{language === "tr" ? "Web Sitesi" : language === "es" ? "Sitio web" : "Website"}</Label>
                                <Input value={payload.company.companyWebsite} onChange={(event) => setPayload((current) => current ? { ...current, company: { ...current.company, companyWebsite: event.target.value } } : current)} />
                            </div>
                            <div className="space-y-2">
                                <Label>{language === "tr" ? "Şirket Email" : language === "es" ? "Email de la empresa" : "Company email"}</Label>
                                <Input value={payload.company.companyEmail} disabled />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>{language === "tr" ? "Adres" : language === "es" ? "Dirección" : "Address"}</Label>
                            <Input value={payload.company.companyAddress} onChange={(event) => setPayload((current) => current ? { ...current, company: { ...current.company, companyAddress: event.target.value } } : current)} />
                        </div>
                        <Button onClick={saveCompany} disabled={isSavingCompany}>
                            {isSavingCompany ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {language === "tr" ? "Şirket Bilgilerini Kaydet" : language === "es" ? "Guardar datos de la empresa" : "Save Company Details"}
                        </Button>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />{language === "tr" ? "Bildirim Tercihleri" : language === "es" ? "Preferencias de notificación" : "Notification Preferences"}</CardTitle>
                        <CardDescription>{language === "tr" ? "Omni operasyon sesleri ve bildirim izinleri." : language === "es" ? "Sonidos operativos de Omni y permisos de notificación." : "Omni operational sounds and notification permissions."}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                            <div>
                                <div className="font-medium">{language === "tr" ? "Sesli Bildirim" : language === "es" ? "Notificaciones de sonido" : "Sound Notifications"}</div>
                                <div className="text-sm text-muted-foreground">{language === "tr" ? "Inbox ve operasyon olaylarında ses çalar." : language === "es" ? "Reproduce un sonido para eventos de inbox y operativos." : "Plays a sound for inbox and operational events."}</div>
                            </div>
                            <Switch checked={soundEnabled} onCheckedChange={(checked) => {
                                setSoundEnabled(checked)
                                window.localStorage.setItem("notificationSoundEnabled", String(checked))
                            }} />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                            <div>
                                <div className="font-medium">{language === "tr" ? "Push Bildirim" : language === "es" ? "Notificaciones push" : "Push Notifications"}</div>
                                <div className="text-sm text-muted-foreground">{language === "tr" ? "Tarayıcı push iznini kullanır." : language === "es" ? "Usa el permiso de notificaciones del navegador." : "Uses browser notification permission."}</div>
                            </div>
                            <Switch checked={pushEnabled} onCheckedChange={handlePushToggle} />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                            <div>
                                <div className="font-medium">{language === "tr" ? "Email Özeti" : language === "es" ? "Resumen por email" : "Email Summary"}</div>
                                <div className="text-sm text-muted-foreground">{language === "tr" ? "Operasyon özetlerini email ile almak için yer tutucu tercih." : language === "es" ? "Preferencia provisional para recibir resúmenes operativos por email." : "Placeholder preference for receiving operational digests by email."}</div>
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
                        <CardDescription>{language === "tr" ? "Webhook hedefi, access token ve webhook secret burada yönetilir." : language === "es" ? "Gestiona aquí el destino del webhook, el access token y el webhook secret." : "Manage webhook target, access token, and webhook secret here."}</CardDescription>
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
                                    {language === "tr" ? "Yenile" : language === "es" ? "Regenerar" : "Regenerate"}
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
                                    {language === "tr" ? "Yenile" : language === "es" ? "Regenerar" : "Regenerate"}
                                </Button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={() => mutateDeveloper(developer.accessToken && developer.webhookSecret ? "save" : "bootstrap")} disabled={isSavingDeveloper}>
                                {isSavingDeveloper ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {language === "tr" ? "Developer Ayarlarını Kaydet" : language === "es" ? "Guardar ajustes de desarrollador" : "Save Developer Settings"}
                            </Button>
                            <Button variant="outline" asChild>
                                <a href={developer.docsUrl} target="_blank" rel="noreferrer">{language === "tr" ? "Smoke & Webhook Runbook" : "Smoke & Webhook Runbook"}</a>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{language === "tr" ? "Webhook Eventleri" : language === "es" ? "Eventos de webhook" : "Webhook Events"}</CardTitle>
                        <CardDescription>{language === "tr" ? "Harici sisteminize göndermeyi hedeflediğimiz olaylar." : language === "es" ? "Eventos destinados a tus sistemas externos." : "Events intended for your external systems."}</CardDescription>
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
                        <CardTitle>{language === "tr" ? "Plan & Faturalama" : language === "es" ? "Plan y facturación" : "Plan & Billing"}</CardTitle>
                        <CardDescription>{language === "tr" ? "Seçili account için plan durumunu izleyin ve yükseltme talebi gönderin." : language === "es" ? "Supervisa el estado del plan y envía una solicitud de actualización para la cuenta seleccionada." : "Track plan state and submit an upgrade request for the selected account."}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                            <span><strong>{language === "tr" ? "Mevcut plan:" : language === "es" ? "Plan actual:" : "Current plan:"}</strong> {currentPlanId}</span>
                            <span><strong>{language === "tr" ? "Durum:" : language === "es" ? "Estado:" : "Status:"}</strong> {payload.subscription.subscriptionStatus}</span>
                            {pendingPlanId ? <span><strong>{language === "tr" ? "Bekleyen talep:" : language === "es" ? "Solicitud pendiente:" : "Pending request:"}</strong> {pendingPlanId}</span> : null}
                        </div>
                        {showPlanPrices && (
                            <div className="flex justify-center">
                                <BillingToggle billingCycle={billingCycle} onChange={setBillingCycle} />
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid gap-4 lg:grid-cols-3">
                    {plans.map((plan: PlanConfig) => {
                        const isCurrentPlan = plan.planId === currentPlanId
                        const isPending = pendingPlanId === plan.planId
                        const price = formatPlanPrice(plan.planId, billingCycle, language === "tr" ? "tr" : "en")
                        const isDowngrade = plan.sortOrder < (plans.find((item) => item.planId === currentPlanId)?.sortOrder || 0)
                        return (
                            <Card key={plan.planId} className={cn("shadow-lg shadow-slate-900/5", isCurrentPlan ? "border-black" : "")}>
                                <CardHeader>
                                    <CardTitle className="text-lg">
                                        {(() => {
                                            const key = `plan${plan.planId.charAt(0).toUpperCase() + plan.planId.slice(1)}`
                                            const translated = t(key)
                                            return translated !== key ? translated : plan.displayName
                                        })()}
                                    </CardTitle>
                                    <CardDescription>{price}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        {getPlanHighlightsSorted(plan).slice(0, 4).map((feature) => (
                                            <div key={feature}>• {t(feature) !== feature ? t(feature) : feature}</div>
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
                                            ? language === "tr" ? "Mevcut Plan" : language === "es" ? "Plan actual" : "Current Plan"
                                            : isPending
                                                ? language === "tr" ? "Talep Bekliyor" : language === "es" ? "Solicitud pendiente" : "Pending Request"
                                                : isDowngrade
                                                    ? language === "tr" ? "Düşürme Yok" : language === "es" ? "Descenso deshabilitado" : "Downgrade Disabled"
                                                    : language === "tr" ? "Yükseltme Talebi" : language === "es" ? "Solicitar actualización" : "Request Upgrade"}
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
