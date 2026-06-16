"use client"

import { useEffect, useState } from "react"
import { Loader2, RefreshCw, Save } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
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
    const { language } = useLanguage()
    const p = (tr: string, en: string, es: string) => (language === "tr" ? tr : language === "es" ? es : en)
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
                    title: p("Hata", "Error", "Error"),
                    description: p("Gizlilik ayarları yüklenemedi.", "Failed to load privacy settings.", "No se pudieron cargar los ajustes de privacidad."),
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
            setConsentsError(error?.message || p("Onay kayıtları yüklenemedi", "Failed to load consent records", "No se pudieron cargar los registros de consentimiento"))
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
                title: p("Kaydedildi", "Saved", "Guardado"),
                description: p("Gizlilik modülü ayarları güncellendi.", "Privacy module settings updated.", "Ajustes del módulo de privacidad actualizados."),
            })
        } catch (error: any) {
            console.error("Failed to save KVKK settings:", error)
            toast({
                title: p("Hata", "Error", "Error"),
                description: error.message || p("Gizlilik ayarları kaydedilemedi.", "Failed to save privacy settings.", "No se pudieron guardar los ajustes de privacidad."),
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
                {p("Kaydet", "Save", "Guardar")}
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
                    <TabsTrigger value="settings">{p("Ayarlar", "Settings", "Ajustes")}</TabsTrigger>
                    <TabsTrigger value="texts">{p("Metinler", "Texts", "Textos")}</TabsTrigger>
                    <TabsTrigger value="consents">{p("Onay Kayıtları", "Consent Records", "Registros de consentimiento")}</TabsTrigger>
                </TabsList>

                <TabsContent value="settings" className="space-y-6">
                    {isSuperAdmin && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{p("Modül durumu", "Module status", "Estado del módulo")}</CardTitle>
                                <CardDescription>{p("Bu ayar tüm paketlerde kullanılabilir.", "This setting is available on all plans.", "Este ajuste está disponible en todos los planes.")}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex items-center justify-between gap-4">
                                <div>
                                    <Label htmlFor="kvkk-enabled" className="text-base font-medium">{p("Onay modalını aktif et", "Enable consent modal", "Activar modal de consentimiento")}</Label>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {p("Aktif olduğunda ziyaretçi kabul etmeden mesaj gönderemez.", "When enabled, visitors cannot send messages without accepting.", "Cuando está activado, los visitantes no pueden enviar mensajes sin aceptar.")}
                                    </p>
                                </div>
                                <Switch id="kvkk-enabled" checked={enabled} onCheckedChange={setEnabled} />
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <div className="flex flex-wrap items-center gap-3">
                                <CardTitle>{p("Tenant metni", "Tenant text", "Texto del tenant")}</CardTitle>
                                {publishedVersionId ? <Badge variant="outline">{p("Varsayılan sürüm:", "Default version:", "Versión predeterminada:")} {publishedVersionId}</Badge> : null}
                            </div>
                            <CardDescription>
                                {p("Bu alan boş bırakılırsa yayındaki global gizlilik metni kullanılır.", "If left blank, the published global privacy text is used.", "Si se deja en blanco, se usa el texto de privacidad global publicado.")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="kvkk-rejection-contact-text">{p("Reddedilme Durumu İletişim Metni", "Rejection Contact Text", "Texto de contacto en caso de rechazo")}</Label>
                                <Textarea
                                    id="kvkk-rejection-contact-text"
                                    value={rejectionContactText}
                                    onChange={(event) => setRejectionContactText(event.target.value)}
                                    placeholder={p("Kullanıcı gizlilik metnini reddettiğinde ekranda görünecek alternatif iletişim metni (ör: Hizmeti kullanabilmek için onaylamalısınız. İletişim: info@firma.com)", "Alternative contact text shown when the user declines the privacy notice (e.g., You must accept to use the service. Contact: info@company.com)", "Texto de contacto alternativo que se muestra cuando el usuario rechaza el aviso de privacidad (ej.: Debes aceptar para usar el servicio. Contacto: info@empresa.com)")}
                                    className="min-h-[100px]"
                                />
                                <p className="text-xs text-muted-foreground">{p("Kullanıcı onay metnini reddettiğinde, sohbeti kullanamayacağı için bu iletişim bilgileri gösterilecektir.", "When the user declines, this contact info is shown since they cannot use the chat.", "Cuando el usuario rechaza, se muestra esta información de contacto porque no puede usar el chat.")}</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="kvkk-custom-text">{p("Tenant özel metni", "Tenant custom text", "Texto personalizado del tenant")}</Label>
                                <Textarea
                                    id="kvkk-custom-text"
                                    value={customText}
                                    onChange={(event) => setCustomText(event.target.value)}
                                    placeholder={p("Tenant özel gizlilik metnini buraya girin", "Enter the tenant-specific privacy text here", "Introduce aquí el texto de privacidad específico del tenant")}
                                    className="min-h-[220px]"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{p("Global varsayılan metin", "Global default text", "Texto global predeterminado")}</Label>
                                <div className="rounded-xl border bg-muted/30 p-4">
                                    <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-muted-foreground">
                                        {defaultText || p("Henüz yayınlanmış bir varsayılan gizlilik metni yok.", "No default privacy text has been published yet.", "Aún no se ha publicado un texto de privacidad predeterminado.")}
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
                                    <CardTitle>{p("Uyumluluk Metinleri", "Compliance Texts", "Textos de cumplimiento")}</CardTitle>
                                    <CardDescription>
                                        {p("Chatbotta gösterilecek kısa bilgilendirme ve açık rıza metinlerini dil bazlı düzenleyin. Boş alanlar tenant bilgilerinden oluşturulan varsayılan metinlerle doldurulur.", "Edit the short notice and explicit consent texts shown in the chatbot, per language. Blank fields are filled with defaults generated from tenant information.", "Edita el aviso breve y los textos de consentimiento explícito que se muestran en el chatbot, por idioma. Los campos vacíos se rellenan con valores predeterminados generados a partir de la información del tenant.")}
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
                                <Label htmlFor={`privacy-short-${activeLanguage}`}>{p("Kısa sohbet bilgilendirme metni", "Short chat notice", "Aviso breve del chat")} ({activeLanguage.toUpperCase()})</Label>
                                <Textarea
                                    id={`privacy-short-${activeLanguage}`}
                                    value={privacyTexts[activeLanguage].shortNotice}
                                    onChange={(event) => updatePrivacyText(activeLanguage, "shortNotice", event.target.value)}
                                    className="min-h-[120px]"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {p("Bu metin sohbet içinde bloklamayan bilgilendirme olarak görünür. Kullanıcı butona basmasa bile sohbete devam ettiğinde temel sohbet için kabul kaydı alınır.", "This text appears as a non-blocking notice in the chat. Even if the user does not click a button, continuing the chat records acceptance for the basic chat service.", "Este texto aparece como un aviso no bloqueante en el chat. Aunque el usuario no haga clic en un botón, continuar el chat registra la aceptación del servicio básico de chat.")}
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
                                    <CardTitle>{p("Onay kayıtları", "Consent records", "Registros de consentimiento")}</CardTitle>
                                    <CardDescription>
                                        {p("Gizlilik bilgilendirme ve açık rıza olaylarının denetim izi.", "Audit trail of privacy notice and explicit consent events.", "Registro de auditoría de eventos de aviso de privacidad y consentimiento explícito.")}
                                    </CardDescription>
                                </div>
                                <Button type="button" variant="outline" onClick={loadConsentEvents} disabled={consentsLoading} className="gap-2">
                                    {consentsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                    {p("Yenile", "Refresh", "Actualizar")}
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
                                    <Label>{p("Event type (opsiyonel)", "Event type (optional)", "Tipo de evento (opcional)")}</Label>
                                    <Input
                                        value={consentsEventType}
                                        onChange={(e) => setConsentsEventType(e.target.value)}
                                        placeholder="notice_acknowledged"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{p("Purpose (opsiyonel)", "Purpose (optional)", "Propósito (opcional)")}</Label>
                                    <Input
                                        value={consentsPurpose}
                                        onChange={(e) => setConsentsPurpose(e.target.value)}
                                        placeholder="lead_capture"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button type="button" onClick={loadConsentEvents} disabled={consentsLoading}>
                                    {p("Filtrele", "Filter", "Filtrar")}
                                </Button>
                            </div>

                            {consentsError ? (
                                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                                    {consentsError}
                                </div>
                            ) : null}

                            <Tabs value={consentsView} onValueChange={(next) => setConsentsView(next as any)}>
                                <TabsList>
                                    <TabsTrigger value="summary">{p("Özet", "Summary", "Resumen")}</TabsTrigger>
                                    <TabsTrigger value="details">{p("Detay", "Details", "Detalle")}</TabsTrigger>
                                </TabsList>

                                <TabsContent value="summary">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{p("Tarih", "Date", "Fecha")}</TableHead>
                                                <TableHead>Event</TableHead>
                                                <TableHead>{p("Amaç", "Purpose", "Propósito")}</TableHead>
                                                <TableHead>{p("Doküman", "Document", "Documento")}</TableHead>
                                                <TableHead>{p("Ziyaretçi", "Visitor", "Visitante")}</TableHead>
                                                <TableHead>Origin</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {consentEvents.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-muted-foreground">
                                                        {consentsLoading ? p("Yükleniyor...", "Loading...", "Cargando...") : p("Kayıt bulunamadı.", "No records found.", "No se encontraron registros.")}
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
                                                <TableHead>{p("Tarih", "Date", "Fecha")}</TableHead>
                                                <TableHead>Event</TableHead>
                                                <TableHead>{p("Amaç", "Purpose", "Propósito")}</TableHead>
                                                <TableHead>{p("Doküman", "Document", "Documento")}</TableHead>
                                                <TableHead>Session</TableHead>
                                                <TableHead>{p("Ziyaretçi", "Visitor", "Visitante")}</TableHead>
                                                <TableHead>Doc hash</TableHead>
                                                <TableHead>Text hash</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {consentEvents.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="text-muted-foreground">
                                                        {consentsLoading ? p("Yükleniyor...", "Loading...", "Cargando...") : p("Kayıt bulunamadı.", "No records found.", "No se encontraron registros.")}
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
                                {p("Not: Bu liste oturum/ziyaretçi bazında gösterim yapar. IP ve user-agent bilgileri hash olarak tutulur; PII burada gösterilmez.", "Note: This list is shown per session/visitor. IP and user-agent are stored as hashes; PII is not shown here.", "Nota: Esta lista se muestra por sesión/visitante. La IP y el user-agent se almacenan como hashes; aquí no se muestra PII.")}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
