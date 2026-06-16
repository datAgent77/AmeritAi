"use client"

import { useEffect, useState } from "react"
import { Loader2, RefreshCw, Save } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface KvkkConsentSettingsFormProps {
    targetUserId: string
}

const PRIVACY_LANGUAGES = ["tr", "en", "de", "es"] as const
type PrivacyLanguage = (typeof PRIVACY_LANGUAGES)[number]

// Labels are region-neutral (US-first product). The `kvkkNotice` key is kept
// internally for data compatibility; the displayed label is "Privacy Notice".
const PRIVACY_DOCUMENT_FIELDS = [
    { key: "kvkkNotice", label: "Privacy Notice" },
    { key: "gdprPrivacyNotice", label: "GDPR Privacy Notice" },
    { key: "explicitConsentLead", label: "Lead Consent" },
    { key: "explicitConsentAppointment", label: "Appointment Consent" },
    { key: "explicitConsentMarketing", label: "Marketing Consent" },
    { key: "explicitConsentSpecialCategory", label: "Special Category Data" },
    { key: "explicitConsentInternationalTransfer", label: "International Transfer" },
] as const

type PrivacyTextDraft = Record<PrivacyLanguage, {
    shortNotice: string
    kvkkNotice: string
    gdprPrivacyNotice: string
    explicitConsentLead: string
    explicitConsentAppointment: string
    explicitConsentMarketing: string
    explicitConsentSpecialCategory: string
    explicitConsentInternationalTransfer: string
}>

function safeText(value: unknown) {
    return typeof value === "string" ? value.trim() : ""
}

function buildDefaultPrivacyTexts(settingsData: Record<string, any>): PrivacyTextDraft {
    const companyName = safeText(settingsData.companyName) || safeText(settingsData.businessName) || "Tenant"
    const contactEmail = safeText(settingsData.privacyEmail) || safeText(settingsData.supportEmail) || safeText(settingsData.email) || "info@example.com"
    const aiProviderNote = safeText(settingsData.privacyAiProviderNote) || "Yapay zeka ve teknik altyapı sağlayıcıları verileri yalnızca hizmet sunumu için işleyebilir."

    return {
        tr: {
            shortNotice: "Bu sohbet kapsamında paylaştığınız bilgiler hizmet sunumu, talebinize yanıt verilmesi ve güvenliğin sağlanması amacıyla işlenebilir. Lütfen özel nitelikli kişisel veri paylaşmayın. Aydınlatma metnini inceleyebilirsiniz. Sohbete devam ederek bu bilgilendirmeyi okuduğunuzu ve temel sohbet hizmeti kapsamında gerekli veri işlemeyi kabul ettiğinizi beyan etmiş olursunuz.",
            kvkkNotice: `${companyName} KVKK Aydınlatma Metni\n\nVeri sorumlusu: ${companyName}. İletişim: ${contactEmail}.\n\nBu sohbet kapsamında ad, soyad, iletişim bilgileri, mesaj içerikleri, teknik loglar, lead ve randevu bilgileri hizmet sunumu, taleplerin yanıtlanması, güvenlik ve kalite iyileştirme amaçlarıyla işlenebilir.\n\n${aiProviderNote}`,
            gdprPrivacyNotice: `${companyName} GDPR Privacy Notice\n\nController: ${companyName}. Contact: ${contactEmail}.\n\nChat messages, technical logs, contact details, lead and appointment information may be processed to provide the requested service, answer questions, maintain security, and improve support quality.`,
            explicitConsentLead: "İletişim bilgilerimin lead/talep kaydı oluşturulması ve bu talebime dönüş yapılması amacıyla işlenmesine açık rıza veriyorum.",
            explicitConsentAppointment: "Randevu talebimin oluşturulması ve benimle randevu hakkında iletişime geçilmesi amacıyla kişisel verilerimin işlenmesine açık rıza veriyorum.",
            explicitConsentMarketing: "Kampanya, duyuru ve pazarlama iletileri için benimle iletişime geçilmesine açık rıza veriyorum.",
            explicitConsentSpecialCategory: "Paylaşmam halinde özel nitelikli kişisel verilerimin yalnızca talebimin değerlendirilmesi amacıyla işlenmesine açık rıza veriyorum.",
            explicitConsentInternationalTransfer: "Hizmetin sağlanması için gerekli teknik altyapı ve yapay zeka servisleri kapsamında kişisel verilerimin yurt dışına aktarılmasına açık rıza veriyorum.",
        },
        en: {
            shortNotice: "Information you share in this chat may be processed to provide the service, respond to your request, and keep the service secure. Please do not share special category personal data. You can review the privacy notice. By continuing the chat, you confirm that you have read this notice and accept the necessary processing for the basic chat service.",
            kvkkNotice: `${companyName} Privacy Notice\n\nData controller: ${companyName}. Contact: ${contactEmail}.\n\nThis chat may process identity, contact, message content, technical logs, lead and appointment data to provide the service, respond to requests, maintain security, and improve quality. California residents have rights under the CCPA/CPRA (see Privacy Policy).`,
            gdprPrivacyNotice: `${companyName} GDPR Privacy Notice\n\nController: ${companyName}. Contact: ${contactEmail}.\n\nChat messages, technical logs, contact details, lead and appointment information may be processed to provide the requested service, answer questions, maintain security, and improve support quality.`,
            explicitConsentLead: "I consent to the processing of my contact details to create a lead/request record and respond to my request.",
            explicitConsentAppointment: "I consent to the processing of my personal data to create my appointment request and contact me about the appointment.",
            explicitConsentMarketing: "I consent to being contacted for campaigns, announcements, and marketing communications.",
            explicitConsentSpecialCategory: "If I share special category data, I consent to its processing only to evaluate and respond to my request.",
            explicitConsentInternationalTransfer: "I consent to the international transfer of my personal data where required for technical infrastructure and AI services.",
        },
        de: {
            shortNotice: "Informationen, die Sie in diesem Chat teilen, koennen zur Bereitstellung des Dienstes, zur Beantwortung Ihrer Anfrage und zur Sicherheit verarbeitet werden. Bitte teilen Sie keine besonderen Kategorien personenbezogener Daten. Wenn Sie den Chat fortsetzen, bestaetigen Sie, dass Sie diesen Hinweis gelesen haben.",
            kvkkNotice: `${companyName} Datenschutzhinweis\n\nVerantwortlicher: ${companyName}. Kontakt: ${contactEmail}.`,
            gdprPrivacyNotice: `${companyName} GDPR Privacy Notice\n\nController: ${companyName}. Contact: ${contactEmail}.`,
            explicitConsentLead: "Ich willige in die Verarbeitung meiner Kontaktdaten ein, um meine Anfrage zu bearbeiten.",
            explicitConsentAppointment: "Ich willige in die Verarbeitung meiner personenbezogenen Daten fuer meine Terminanfrage ein.",
            explicitConsentMarketing: "Ich willige ein, fuer Kampagnen, Ankuendigungen und Marketing kontaktiert zu werden.",
            explicitConsentSpecialCategory: "Falls ich besondere Kategorien personenbezogener Daten teile, willige ich in deren Verarbeitung zur Bearbeitung meiner Anfrage ein.",
            explicitConsentInternationalTransfer: "Ich willige in internationale Datentransfers ein, soweit sie fuer technische Infrastruktur und KI-Dienste erforderlich sind.",
        },
        es: {
            shortNotice: "La informacion que comparta en este chat puede tratarse para prestar el servicio, responder a su solicitud y mantener la seguridad. No comparta datos personales de categorias especiales. Al continuar el chat, confirma que ha leido este aviso.",
            kvkkNotice: `${companyName} Aviso de privacidad\n\nResponsable del tratamiento: ${companyName}. Contacto: ${contactEmail}.\n\nLos residentes de California tienen derechos conforme a la CCPA/CPRA (consulte la Política de privacidad).`,
            gdprPrivacyNotice: `${companyName} GDPR Privacy Notice\n\nController: ${companyName}. Contact: ${contactEmail}.`,
            explicitConsentLead: "Consiento el tratamiento de mis datos de contacto para crear una solicitud y responderme.",
            explicitConsentAppointment: "Consiento el tratamiento de mis datos personales para crear mi solicitud de cita.",
            explicitConsentMarketing: "Consiento que me contacten para campanas, anuncios y comunicaciones de marketing.",
            explicitConsentSpecialCategory: "Si comparto datos de categorias especiales, consiento su tratamiento solo para evaluar mi solicitud.",
            explicitConsentInternationalTransfer: "Consiento la transferencia internacional de mis datos cuando sea necesaria para infraestructura tecnica y servicios de IA.",
        },
    }
}

function mergePrivacyTexts(settingsData: Record<string, any>) {
    const defaults = buildDefaultPrivacyTexts(settingsData)
    const privacySettings = settingsData.privacyComplianceSettings || settingsData.privacyCompliance || {}
    const shortNoticeByLanguage = privacySettings.shortNoticeByLanguage || {}
    const documentsByLanguage = privacySettings.documentsByLanguage || {}

    return PRIVACY_LANGUAGES.reduce((acc, lang) => {
        const langDocs = documentsByLanguage?.[lang] || {}
        acc[lang] = {
            ...defaults[lang],
            shortNotice: safeText(shortNoticeByLanguage?.[lang]) || defaults[lang].shortNotice,
            kvkkNotice: safeText(langDocs?.kvkkNotice?.text || langDocs?.kvkkNotice) || defaults[lang].kvkkNotice,
            gdprPrivacyNotice: safeText(langDocs?.gdprPrivacyNotice?.text || langDocs?.gdprPrivacyNotice) || defaults[lang].gdprPrivacyNotice,
            explicitConsentLead: safeText(langDocs?.explicitConsentLead?.text || langDocs?.explicitConsentLead) || defaults[lang].explicitConsentLead,
            explicitConsentAppointment: safeText(langDocs?.explicitConsentAppointment?.text || langDocs?.explicitConsentAppointment) || defaults[lang].explicitConsentAppointment,
            explicitConsentMarketing: safeText(langDocs?.explicitConsentMarketing?.text || langDocs?.explicitConsentMarketing) || defaults[lang].explicitConsentMarketing,
            explicitConsentSpecialCategory: safeText(langDocs?.explicitConsentSpecialCategory?.text || langDocs?.explicitConsentSpecialCategory) || defaults[lang].explicitConsentSpecialCategory,
            explicitConsentInternationalTransfer: safeText(langDocs?.explicitConsentInternationalTransfer?.text || langDocs?.explicitConsentInternationalTransfer) || defaults[lang].explicitConsentInternationalTransfer,
        }
        return acc
    }, {} as PrivacyTextDraft)
}

function toPrivacyComplianceSettings(texts: PrivacyTextDraft) {
    return {
        shortNoticeByLanguage: Object.fromEntries(PRIVACY_LANGUAGES.map((lang) => [lang, texts[lang].shortNotice])),
        documentsByLanguage: Object.fromEntries(PRIVACY_LANGUAGES.map((lang) => [
            lang,
            Object.fromEntries(PRIVACY_DOCUMENT_FIELDS.map((field) => [field.key, { text: texts[lang][field.key] }]))
        ])),
    }
}

export function KvkkConsentSettingsForm({ targetUserId }: KvkkConsentSettingsFormProps) {
    const { user, role } = useAuth()
    const isSuperAdmin = role === 'SUPER_ADMIN' || role === 'AGENCY_ADMIN';
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState<"settings" | "texts" | "consents">("settings")
    const [consentsView, setConsentsView] = useState<"summary" | "details">("summary")
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [enabled, setEnabled] = useState(true)
    const [customText, setCustomText] = useState("")
    const [rejectionContactText, setRejectionContactText] = useState("")
    const [defaultText, setDefaultText] = useState("")
    const [publishedVersionId, setPublishedVersionId] = useState<string | null>(null)
    const [activeLanguage, setActiveLanguage] = useState<PrivacyLanguage>("tr")
    const [privacyTexts, setPrivacyTexts] = useState<PrivacyTextDraft>(() => buildDefaultPrivacyTexts({}))

    const [consentEvents, setConsentEvents] = useState<Array<{
        id: string
        eventType: string | null
        purpose: string | null
        documentType: string | null
        documentVersionHash?: string | null
        textHash?: string | null
        origin: string | null
        sessionId: string | null
        visitorId: string | null
        createdAtMs: number | null
    }>>([])
    const [consentsLoading, setConsentsLoading] = useState(false)
    const [consentsError, setConsentsError] = useState<string | null>(null)
    const [consentsLimit, setConsentsLimit] = useState(200)
    const [consentsEventType, setConsentsEventType] = useState("")
    const [consentsPurpose, setConsentsPurpose] = useState("")

    useEffect(() => {
        const load = async () => {
            if (!user?.uid) return
            setIsLoading(true)
            try {
                const token = await user.getIdToken()
                const [settingsResponse, contractsResponse] = await Promise.all([
                    fetch(`/api/console/settings?chatbotId=${targetUserId}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch("/api/contracts/current", {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ])

                const settingsData = settingsResponse.ok ? await settingsResponse.json() : {}
                const contractsData = contractsResponse.ok ? await contractsResponse.json() : {}

                setEnabled(settingsData.enableKvkkConsent !== false)
                setCustomText(
                    typeof settingsData.kvkkConsentSettings?.customText === "string" ? settingsData.kvkkConsentSettings.customText 
                    : (typeof settingsData.kvkkCustomText === "string" ? settingsData.kvkkCustomText : "")
                )
                setRejectionContactText(
                    typeof settingsData.kvkkConsentSettings?.rejectionContactText === "string" ? settingsData.kvkkConsentSettings.rejectionContactText 
                    : (typeof settingsData.kvkkRejectionContactText === "string" ? settingsData.kvkkRejectionContactText 
                    : (typeof settingsData.rejectionContactText === "string" ? settingsData.rejectionContactText : ""))
                )
                setDefaultText(typeof contractsData?.published?.kvkkDefault?.text === "string" ? contractsData.published.kvkkDefault.text : "")
                setPublishedVersionId(typeof contractsData?.published?.kvkkDefault?.versionId === "string" ? contractsData.published.kvkkDefault.versionId : null)
                setPrivacyTexts(mergePrivacyTexts(settingsData))
            } catch (error) {
                console.error("Failed to load KVKK settings:", error)
                toast({
                    title: "Hata",
                    description: "KVKK ayarlari yuklenemedi.",
                    variant: "destructive",
                })
            } finally {
                setIsLoading(false)
            }
        }

        load()
    }, [targetUserId, toast, user])

    const loadConsentEvents = async () => {
        if (!user?.uid) return
        setConsentsLoading(true)
        setConsentsError(null)
        try {
            const token = await user.getIdToken()
            const params = new URLSearchParams({
                chatbotId: targetUserId,
                limit: String(consentsLimit),
            })
            if (consentsEventType) params.set("eventType", consentsEventType)
            if (consentsPurpose) params.set("purpose", consentsPurpose)

            const response = await fetch(`/api/console/privacy/consents?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.error || "Consent log fetch failed")
            }

            const events = Array.isArray(data?.events) ? data.events : []
            setConsentEvents(events)
        } catch (error: any) {
            setConsentsError(error?.message || "Onay kayitlari yuklenemedi")
        } finally {
            setConsentsLoading(false)
        }
    }

    useEffect(() => {
        loadConsentEvents()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetUserId, user?.uid])

    const saveSettings = async () => {
        if (!user?.uid) return
        setIsSaving(true)
        try {
            const token = await user.getIdToken()
            const privacyComplianceSettings = toPrivacyComplianceSettings(privacyTexts)
            const response = await fetch("/api/console/settings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    chatbotId: targetUserId,
                    userSettings: {
                        enableKvkkConsent: enabled,
                        kvkkConsentSettings: {
                            customText: customText || null,
                            rejectionContactText: rejectionContactText || null,
                        },
                        privacyComplianceSettings,
                        // Fallback fields for old implementations reading flat values
                        kvkkCustomText: customText || null,
                        kvkkRejectionContactText: rejectionContactText || null,
                        rejectionContactText: rejectionContactText || null,
                    },
                    chatbotSettings: {
                        enableKvkkConsent: enabled,
                        kvkkConsentSettings: {
                            customText: customText || null,
                            rejectionContactText: rejectionContactText || null,
                        },
                        privacyComplianceSettings,
                        // Fallback fields for old implementations reading flat values
                        kvkkCustomText: customText || null,
                        kvkkRejectionContactText: rejectionContactText || null,
                        rejectionContactText: rejectionContactText || null,
                    },
                }),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || "Save failed")
            }

            toast({
                title: "Kaydedildi",
                description: "KVKK modulu ayarlari guncellendi.",
            })
        } catch (error: any) {
            console.error("Failed to save KVKK settings:", error)
            toast({
                title: "Hata",
                description: error.message || "KVKK ayarlari kaydedilemedi.",
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    const updatePrivacyText = (lang: PrivacyLanguage, key: keyof PrivacyTextDraft[PrivacyLanguage], value: string) => {
        setPrivacyTexts((current) => ({
            ...current,
            [lang]: {
                ...current[lang],
                [key]: value,
            },
        }))
    }

    if (isLoading) {
        return (
            <div className="flex min-h-[300px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const SaveButton = (
        <div className="flex justify-end">
            <Button onClick={saveSettings} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Kaydet
            </Button>
        </div>
    )

    return (
        <div className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight">Data Privacy &amp; Consent</h1>
                </div>
                <p className="max-w-3xl text-sm text-muted-foreground">
                    The visitor accepts the privacy notice before starting the chat. If no tenant-specific text is entered, the default published by the super admin is used.
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={(next) => setActiveTab(next as any)}>
                <TabsList>
                    <TabsTrigger value="settings">Ayarlar</TabsTrigger>
                    <TabsTrigger value="texts">Metinler</TabsTrigger>
                    <TabsTrigger value="consents">Onay Kayıtları</TabsTrigger>
                </TabsList>

                <TabsContent value="settings" className="space-y-6">
                    {isSuperAdmin && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Modul durumu</CardTitle>
                                <CardDescription>Bu ayar tum paketlerde kullanilabilir.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex items-center justify-between gap-4">
                                <div>
                                    <Label htmlFor="kvkk-enabled" className="text-base font-medium">KVKK kabul modalini aktif et</Label>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Aktif oldugunda ziyaretci kabul etmeden mesaj gonderemez.
                                    </p>
                                </div>
                                <Switch id="kvkk-enabled" checked={enabled} onCheckedChange={setEnabled} />
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <div className="flex flex-wrap items-center gap-3">
                                <CardTitle>Tenant metni</CardTitle>
                                {publishedVersionId ? <Badge variant="outline">Varsayilan surum: {publishedVersionId}</Badge> : null}
                            </div>
                            <CardDescription>
                                Bu alan bos birakilirsa yayindaki global KVKK metni kullanilir.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="kvkk-rejection-contact-text">Reddedilme Durumu İletişim Metni</Label>
                                <Textarea
                                    id="kvkk-rejection-contact-text"
                                    value={rejectionContactText}
                                    onChange={(event) => setRejectionContactText(event.target.value)}
                                    placeholder="Kullanıcı KVKK metnini reddettiğinde ekranda görünecek alternatif iletişim metni (ör: Hizmeti kullanabilmek için onaylamalısınız. İletişim: info@firma.com)"
                                    className="min-h-[100px]"
                                />
                                <p className="text-xs text-muted-foreground">Kullanıcı onay metnini reddettiğinde, sohbeti kullanamayacağı için bu iletişim bilgileri gösterilecektir.</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="kvkk-custom-text">Tenant ozel metni</Label>
                                <Textarea
                                    id="kvkk-custom-text"
                                    value={customText}
                                    onChange={(event) => setCustomText(event.target.value)}
                                    placeholder="Tenant ozel KVKK metnini buraya girin"
                                    className="min-h-[220px]"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Global varsayilan metin</Label>
                                <div className="rounded-xl border bg-muted/30 p-4">
                                    <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-muted-foreground">
                                        {defaultText || "Henuz yayinlanmis bir varsayilan KVKK metni yok."}
                                    </pre>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {SaveButton}
                </TabsContent>

                <TabsContent value="texts" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <CardTitle>Uyumluluk Metinleri</CardTitle>
                                    <CardDescription>
                                        Chatbotta gösterilecek kısa bilgilendirme ve açık rıza metinlerini dil bazlı düzenleyin. Boş alanlar tenant bilgilerinden oluşturulan varsayılan metinlerle doldurulur.
                                    </CardDescription>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {PRIVACY_LANGUAGES.map((lang) => (
                                        <Button
                                            key={lang}
                                            type="button"
                                            variant={activeLanguage === lang ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setActiveLanguage(lang)}
                                        >
                                            {lang.toUpperCase()}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor={`privacy-short-${activeLanguage}`}>Kısa sohbet bilgilendirme metni ({activeLanguage.toUpperCase()})</Label>
                                <Textarea
                                    id={`privacy-short-${activeLanguage}`}
                                    value={privacyTexts[activeLanguage].shortNotice}
                                    onChange={(event) => updatePrivacyText(activeLanguage, "shortNotice", event.target.value)}
                                    className="min-h-[120px]"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Bu metin sohbet içinde bloklamayan bilgilendirme olarak görünür. Kullanıcı butona basmasa bile sohbete devam ettiğinde temel sohbet için kabul kaydı alınır.
                                </p>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                                {PRIVACY_DOCUMENT_FIELDS.map((field) => (
                                    <div key={field.key} className="space-y-2">
                                        <Label htmlFor={`privacy-${field.key}-${activeLanguage}`}>{field.label}</Label>
                                        <Textarea
                                            id={`privacy-${field.key}-${activeLanguage}`}
                                            value={privacyTexts[activeLanguage][field.key]}
                                            onChange={(event) => updatePrivacyText(activeLanguage, field.key, event.target.value)}
                                            className={field.key === "kvkkNotice" || field.key === "gdprPrivacyNotice" ? "min-h-[220px]" : "min-h-[110px]"}
                                        />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {SaveButton}
                </TabsContent>

                <TabsContent value="consents" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <CardTitle>Onay kayıtları</CardTitle>
                                    <CardDescription>
                                        KVKK/GDPR bilgilendirme ve açık rıza olaylarının denetim izi.
                                    </CardDescription>
                                </div>
                                <Button type="button" variant="outline" onClick={loadConsentEvents} disabled={consentsLoading} className="gap-2">
                                    {consentsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                    Yenile
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="space-y-2">
                                    <Label>Limit</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={500}
                                        value={consentsLimit}
                                        onChange={(e) => setConsentsLimit(Math.max(1, Math.min(500, Number(e.target.value) || 200)))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Event type (opsiyonel)</Label>
                                    <Input
                                        value={consentsEventType}
                                        onChange={(e) => setConsentsEventType(e.target.value)}
                                        placeholder="notice_acknowledged"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Purpose (opsiyonel)</Label>
                                    <Input
                                        value={consentsPurpose}
                                        onChange={(e) => setConsentsPurpose(e.target.value)}
                                        placeholder="lead_capture"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button type="button" onClick={loadConsentEvents} disabled={consentsLoading}>
                                    Filtrele
                                </Button>
                            </div>

                            {consentsError ? (
                                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                                    {consentsError}
                                </div>
                            ) : null}

                            <Tabs value={consentsView} onValueChange={(next) => setConsentsView(next as any)}>
                                <TabsList>
                                    <TabsTrigger value="summary">Özet</TabsTrigger>
                                    <TabsTrigger value="details">Detay</TabsTrigger>
                                </TabsList>

                                <TabsContent value="summary">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Tarih</TableHead>
                                                <TableHead>Event</TableHead>
                                                <TableHead>Amaç</TableHead>
                                                <TableHead>Doküman</TableHead>
                                                <TableHead>Ziyaretçi</TableHead>
                                                <TableHead>Origin</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {consentEvents.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-muted-foreground">
                                                        {consentsLoading ? "Yükleniyor..." : "Kayıt bulunamadı."}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                consentEvents.map((row) => (
                                                    <TableRow key={row.id}>
                                                        <TableCell>
                                                            {row.createdAtMs ? new Date(row.createdAtMs).toLocaleString() : "-"}
                                                        </TableCell>
                                                        <TableCell>{row.eventType || "-"}</TableCell>
                                                        <TableCell>{row.purpose || "-"}</TableCell>
                                                        <TableCell>{row.documentType || "-"}</TableCell>
                                                        <TableCell className="max-w-[220px] truncate" title={row.visitorId || row.sessionId || ""}>
                                                            {row.visitorId || row.sessionId || "-"}
                                                        </TableCell>
                                                        <TableCell className="max-w-[220px] truncate" title={row.origin || ""}>
                                                            {row.origin || "-"}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </TabsContent>

                                <TabsContent value="details">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Tarih</TableHead>
                                                <TableHead>Event</TableHead>
                                                <TableHead>Amaç</TableHead>
                                                <TableHead>Doküman</TableHead>
                                                <TableHead>Session</TableHead>
                                                <TableHead>Ziyaretçi</TableHead>
                                                <TableHead>Doc hash</TableHead>
                                                <TableHead>Text hash</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {consentEvents.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="text-muted-foreground">
                                                        {consentsLoading ? "Yükleniyor..." : "Kayıt bulunamadı."}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                consentEvents.map((row) => (
                                                    <TableRow key={row.id}>
                                                        <TableCell>
                                                            {row.createdAtMs ? new Date(row.createdAtMs).toLocaleString() : "-"}
                                                        </TableCell>
                                                        <TableCell>{row.eventType || "-"}</TableCell>
                                                        <TableCell>{row.purpose || "-"}</TableCell>
                                                        <TableCell>{row.documentType || "-"}</TableCell>
                                                        <TableCell className="max-w-[220px] truncate" title={row.sessionId || ""}>
                                                            {row.sessionId || "-"}
                                                        </TableCell>
                                                        <TableCell className="max-w-[220px] truncate" title={row.visitorId || ""}>
                                                            {row.visitorId || "-"}
                                                        </TableCell>
                                                        <TableCell className="max-w-[220px] truncate" title={row.documentVersionHash || ""}>
                                                            {row.documentVersionHash || "-"}
                                                        </TableCell>
                                                        <TableCell className="max-w-[220px] truncate" title={row.textHash || ""}>
                                                            {row.textHash || "-"}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                            </Tabs>

                            <div className="text-xs text-muted-foreground">
                                Not: Bu liste oturum/ziyaretçi bazında gösterim yapar. IP ve user-agent bilgileri hash olarak tutulur; PII burada gösterilmez.
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
