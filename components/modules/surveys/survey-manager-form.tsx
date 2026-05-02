"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { BarChart3, Download, Loader2, Plus, Save, Send, Trash2, GripVertical, FileText, Settings, LayoutTemplate, PieChart, Users } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type {
    SurveyAnalyticsPayload,
    SurveyDefinition,
    SurveyModuleConfig,
    SurveyQuestion,
    SurveyTemplateType,
} from "@/lib/surveys/types"

type SurveyManagerFormProps = {
    targetUserId: string
    isSuperAdmin?: boolean
}

const DEFAULT_MODULE_CONFIG: SurveyModuleConfig = {
    showCta: true,
    autoOpenOnLoad: false,
    widgetActiveSurveyId: null,
    defaultConsentTitle: "Aydınlatma ve Açık Rıza",
    defaultConsentText: "Bu ankette paylaştığınız cevaplar istatistiksel raporlama amacıyla işlenecektir.",
    defaultConsentCheckboxLabel: "Aydınlatma metnini okudum ve ankete katılmayı kabul ediyorum.",
}

const TEMPLATE_OPTIONS: Array<{ id: SurveyTemplateType; label: string }> = [
    { id: "blank", label: "Boş Anket" },
    { id: "political_poll", label: "Siyasi Anket" },
    { id: "satisfaction", label: "Memnuniyet" },
    { id: "market_research", label: "Pazar Araştırması" },
]

const QUESTION_TYPE_OPTIONS: Array<{ id: SurveyQuestion["type"]; label: string }> = [
    { id: "singleChoice", label: "Tek Seçim" },
    { id: "multiChoice", label: "Çoklu Seçim" },
    { id: "shortText", label: "Kısa Yanıt" },
    { id: "longText", label: "Uzun Yanıt" },
    { id: "number", label: "Sayısal" },
]

function cloneSurvey<T>(value: T): T {
    return JSON.parse(JSON.stringify(value))
}

function createQuestion(): SurveyQuestion {
    return {
        id: `question_${Date.now()}`,
        type: "singleChoice",
        title: "Yeni Soru",
        required: true,
        options: ["Seçenek 1", "Seçenek 2"],
        allowOther: false,
    }
}

export function SurveyManagerForm({ targetUserId, isSuperAdmin = false }: SurveyManagerFormProps) {
    const { user } = useAuth()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(true)
    const [isSavingSurvey, setIsSavingSurvey] = useState(false)
    const [isSavingModule, setIsSavingModule] = useState(false)
    const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)
    const [enableSurveyManager, setEnableSurveyManager] = useState(false)
    const [moduleConfig, setModuleConfig] = useState<SurveyModuleConfig>(DEFAULT_MODULE_CONFIG)
    const [surveys, setSurveys] = useState<SurveyDefinition[]>([])
    const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null)
    const [draftSurvey, setDraftSurvey] = useState<SurveyDefinition | null>(null)
    const [analytics, setAnalytics] = useState<SurveyAnalyticsPayload | null>(null)

    const getAuthHeaders = useCallback(async () => {
        const token = await user?.getIdToken()
        return {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        }
    }, [user])

    const loadAnalytics = useCallback(async (surveyId: string | null) => {
        if (!surveyId || !user) {
            setAnalytics(null)
            return
        }

        setIsLoadingAnalytics(true)
        try {
            const headers = await getAuthHeaders()
            const response = await fetch(`/api/surveys/${surveyId}/analytics`, { headers, cache: "no-store" })
            if (!response.ok) throw new Error("Analytics could not be loaded")
            const data = await response.json()
            setAnalytics(data)
        } catch (error) {
            console.error(error)
            setAnalytics(null)
        } finally {
            setIsLoadingAnalytics(false)
        }
    }, [getAuthHeaders, user])

    const loadData = useCallback(async () => {
        if (!user) return
        setIsLoading(true)
        try {
            const headers = await getAuthHeaders()
            const [settingsResponse, surveysResponse] = await Promise.all([
                fetch(`/api/console/settings?chatbotId=${targetUserId}`, { headers, cache: "no-store" }),
                fetch(`/api/surveys?chatbotId=${targetUserId}`, { headers, cache: "no-store" }),
            ])

            if (settingsResponse.ok) {
                const settingsData = await settingsResponse.json()
                setEnableSurveyManager(settingsData.enableSurveyManager === true)
                setModuleConfig({
                    ...DEFAULT_MODULE_CONFIG,
                    ...(settingsData.surveyModuleConfig || {}),
                })
            }

            if (surveysResponse.ok) {
                const surveyData = await surveysResponse.json()
                const nextSurveys = Array.isArray(surveyData.surveys) ? surveyData.surveys : []
                setSurveys(nextSurveys)
                if (nextSurveys.length > 0) {
                    const selected = nextSurveys.find((item: SurveyDefinition) => item.id === selectedSurveyId) || nextSurveys[0]
                    setSelectedSurveyId(selected.id)
                    setDraftSurvey(cloneSurvey(selected))
                    await loadAnalytics(selected.id)
                } else {
                    setSelectedSurveyId(null)
                    setDraftSurvey(null)
                    setAnalytics(null)
                }
            }
        } catch (error) {
            console.error(error)
            toast({
                title: "Anket modülü yüklenemedi",
                description: "Sunucudan anket verisi alınırken hata oluştu.",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }, [getAuthHeaders, loadAnalytics, selectedSurveyId, targetUserId, toast, user])

    useEffect(() => {
        void loadData()
    }, [loadData])

    const publishedWidgetSurveys = useMemo(
        () => surveys.filter((survey) => survey.status === "published" && survey.channels.includes("widget")),
        [surveys]
    )

    const updateDraft = <K extends keyof SurveyDefinition>(key: K, value: SurveyDefinition[K]) => {
        setDraftSurvey((current) => current ? { ...current, [key]: value } : current)
    }

    const updateQuestion = (questionId: string, updater: (question: SurveyQuestion) => SurveyQuestion) => {
        setDraftSurvey((current) => {
            if (!current) return current
            return {
                ...current,
                questions: current.questions.map((question) => question.id === questionId ? updater(question) : question),
            }
        })
    }

    const createSurvey = async (templateType: SurveyTemplateType) => {
        if (!user) return

        setIsSavingSurvey(true)
        try {
            const headers = await getAuthHeaders()
            const response = await fetch("/api/surveys", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    chatbotId: targetUserId,
                    templateType,
                }),
            })

            if (!response.ok) throw new Error("Survey could not be created")
            const data = await response.json()
            const nextSurvey = data.survey as SurveyDefinition
            const nextSurveys = [nextSurvey, ...surveys]
            setSurveys(nextSurveys)
            setSelectedSurveyId(nextSurvey.id)
            setDraftSurvey(cloneSurvey(nextSurvey))
            setAnalytics(null)
            toast({
                title: "Anket oluşturuldu",
                description: "Yeni anket taslağı hazırlandı.",
            })
        } catch (error) {
            console.error(error)
            toast({
                title: "Anket oluşturulamadı",
                description: "Şablon üzerinden yeni anket yaratılırken hata oluştu.",
                variant: "destructive",
            })
        } finally {
            setIsSavingSurvey(false)
        }
    }

    const saveSurvey = async () => {
        if (!draftSurvey || !user) return

        setIsSavingSurvey(true)
        try {
            const headers = await getAuthHeaders()
            const isExisting = surveys.some((survey) => survey.id === draftSurvey.id)
            const response = await fetch(isExisting ? `/api/surveys/${draftSurvey.id}` : "/api/surveys", {
                method: isExisting ? "PATCH" : "POST",
                headers,
                body: JSON.stringify({
                    ...draftSurvey,
                    chatbotId: targetUserId,
                }),
            })

            if (!response.ok) throw new Error("Survey could not be saved")
            const data = await response.json()
            const savedSurvey = data.survey as SurveyDefinition
            setSurveys((current) => {
                const existingIndex = current.findIndex((survey) => survey.id === savedSurvey.id)
                if (existingIndex === -1) return [savedSurvey, ...current]
                const next = [...current]
                next[existingIndex] = savedSurvey
                return next
            })
            setDraftSurvey(cloneSurvey(savedSurvey))
            setSelectedSurveyId(savedSurvey.id)
            await loadAnalytics(savedSurvey.id)
            toast({
                title: "Anket kaydedildi",
                description: "Değişiklikler başarıyla saklandı.",
            })
        } catch (error) {
            console.error(error)
            toast({
                title: "Kayıt başarısız",
                description: "Anket kaydedilirken hata oluştu.",
                variant: "destructive",
            })
        } finally {
            setIsSavingSurvey(false)
        }
    }

    const saveModuleSettings = async () => {
        if (!user) return

        setIsSavingModule(true)
        try {
            const headers = await getAuthHeaders()
            const response = await fetch("/api/console/settings", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    chatbotId: targetUserId,
                    userSettings: {
                        enableSurveyManager,
                    },
                    chatbotSettings: {
                        enableSurveyManager,
                        surveyModuleConfig: moduleConfig,
                    },
                }),
            })

            if (!response.ok) throw new Error("Module settings could not be saved")
            toast({
                title: "Modül ayarları güncellendi",
                description: "Genel anket modülü tercihleri kaydedildi.",
            })
        } catch (error) {
            console.error(error)
            toast({
                title: "Ayarlar kaydedilemedi",
                description: "Modül ayarları yazılırken hata oluştu.",
                variant: "destructive",
            })
        } finally {
            setIsSavingModule(false)
        }
    }

    const publishSurvey = async () => {
        if (!selectedSurveyId || !user) return
        setIsSavingSurvey(true)
        try {
            const headers = await getAuthHeaders()
            const response = await fetch(`/api/surveys/${selectedSurveyId}/publish`, {
                method: "POST",
                headers,
            })
            if (!response.ok) throw new Error("Survey could not be published")
            await loadData()
            toast({
                title: "Anket yayına alındı",
                description: "Anket artık aktif kanallarda cevap toplayabilir.",
            })
        } catch (error) {
            console.error(error)
            toast({
                title: "Yayınlama başarısız",
                description: "Anket yayına alınırken hata oluştu.",
                variant: "destructive",
            })
        } finally {
            setIsSavingSurvey(false)
        }
    }

    const closeSurvey = async () => {
        if (!selectedSurveyId || !user) return
        setIsSavingSurvey(true)
        try {
            const headers = await getAuthHeaders()
            const response = await fetch(`/api/surveys/${selectedSurveyId}/close`, {
                method: "POST",
                headers,
            })
            if (!response.ok) throw new Error("Survey could not be closed")
            await loadData()
            toast({
                title: "Anket kapatıldı",
                description: "Anket yeni cevap alımına kapatıldı.",
            })
        } catch (error) {
            console.error(error)
            toast({
                title: "Kapatma başarısız",
                description: "Anket kapatılırken hata oluştu.",
                variant: "destructive",
            })
        } finally {
            setIsSavingSurvey(false)
        }
    }

    const deleteSurvey = async () => {
        if (!selectedSurveyId || !user || !confirm("Bu anketi kalıcı olarak silmek istediğinize emin misiniz?")) return
        setIsSavingSurvey(true)
        try {
            const headers = await getAuthHeaders()
            const response = await fetch(`/api/surveys/${selectedSurveyId}`, {
                method: "DELETE",
                headers,
            })
            if (!response.ok) throw new Error("Survey could not be deleted")
            await loadData()
            toast({
                title: "Anket silindi",
                description: "Anket ve bağlı tüm yanıtlar sistemden kaldırıldı.",
            })
        } catch (error) {
            console.error(error)
            toast({
                title: "Silme başarısız",
                description: "Anket silinirken hata oluştu.",
                variant: "destructive",
            })
        } finally {
            setIsSavingSurvey(false)
        }
    }

    const exportSurvey = async (format: "csv" | "xlsx") => {
        if (!selectedSurveyId || !user) return
        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/surveys/${selectedSurveyId}/export?format=${format}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) throw new Error("Export could not be generated")

            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const anchor = document.createElement("a")
            anchor.href = url
            anchor.download = `survey-export.${format}`
            anchor.click()
            URL.revokeObjectURL(url)
        } catch (error) {
            console.error(error)
            toast({
                title: "Dışa aktarım başarısız",
                description: "Veri dosyası oluşturulamadı.",
                variant: "destructive",
            })
        }
    }

    if (isLoading) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-zinc-400">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="text-sm tracking-wide">Modül Yükleniyor...</p>
            </div>
        )
    }

    return (
        <div className="mx-auto w-full max-w-[1400px] space-y-6 pt-8 pb-12">
            {/* Page Header */}
            <motion.section
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6"
            >
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                                <BarChart3 className="h-3.5 w-3.5" />
                                Survey Manager
                            </div>
                            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">Anket & Geri Bildirim</h2>
                            <p className="max-w-2xl text-sm leading-relaxed text-zinc-500">
                                Markanız için gelişmiş anketler oluşturun, public sayfalarda veya widget CTA ile yayınlayın ve değerli içgörüleri gerçek zamanlı olarak analiz edin.
                            </p>
                        </div>
                        {isSuperAdmin && (
                            <div className="inline-block rounded-md bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-600">
                                tenant: {targetUserId}
                            </div>
                        )}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            className="rounded-md"
                            onClick={saveModuleSettings}
                            disabled={isSavingModule}
                        >
                            {isSavingModule ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings className="mr-2 h-4 w-4" />}
                            Modül Ayarları
                        </Button>
                        <Button
                            className="rounded-md bg-zinc-900 text-white hover:bg-zinc-800"
                            onClick={saveSurvey}
                            disabled={!draftSurvey || isSavingSurvey}
                        >
                            {isSavingSurvey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Anketi Kaydet
                        </Button>
                    </div>
                </div>
            </motion.section>

            <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
                {/* Left Column: List & Settings */}
                <div className="space-y-6">
                    <Card className="rounded-xl border-zinc-200 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold">Anket Listesi</CardTitle>
                            <CardDescription className="text-xs">Şablonlardan oluşturun veya var olanları yönetin</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-2.5">
                                {TEMPLATE_OPTIONS.map((template) => (
                                    <Button
                                        key={template.id}
                                        variant="outline"
                                        size="sm"
                                        className="h-auto justify-start rounded-md border-zinc-200/70 px-3 py-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                                        onClick={() => createSurvey(template.id)}
                                        disabled={isSavingSurvey}
                                    >
                                        <LayoutTemplate className="mr-2 h-3.5 w-3.5 text-zinc-400" />
                                        {template.label}
                                    </Button>
                                ))}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                    <span>Mevcut Anketler</span>
                                    <Badge variant="secondary" className="rounded-md">{surveys.length}</Badge>
                                </div>
                                {surveys.length === 0 && (
                                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 py-8 text-center text-sm text-zinc-500">
                                        <FileText className="mb-2 h-6 w-6 text-zinc-300" />
                                        <p>Henüz anket oluşturulmadı</p>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <AnimatePresence mode="popLayout">
                                        {surveys.map((survey) => {
                                            const isSelected = survey.id === selectedSurveyId
                                            return (
                                                <motion.button
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    key={survey.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedSurveyId(survey.id)
                                                        setDraftSurvey(cloneSurvey(survey))
                                                        void loadAnalytics(survey.id)
                                                    }}
                                                    className={`group relative flex w-full flex-col gap-2 rounded-md border p-3 text-left transition-colors duration-200 ${
                                                        isSelected
                                                            ? "border-zinc-900 bg-white"
                                                            : "border-zinc-200/60 bg-white hover:border-zinc-300 hover:bg-zinc-50/50"
                                                    }`}
                                                >
                                                    <div className="flex w-full items-start justify-between gap-3">
                                                        <div className="space-y-1 pr-2">
                                                            <p className={`truncate text-sm font-medium leading-none ${isSelected ? "text-zinc-900" : "text-zinc-700 group-hover:text-zinc-900"}`}>
                                                                {survey.title}
                                                            </p>
                                                            <p className="truncate text-[11px] font-mono text-zinc-500">{survey.slug}</p>
                                                        </div>
                                                        <Badge variant={survey.status === "published" ? "default" : "secondary"} className="shrink-0 rounded-md text-[10px] font-semibold uppercase tracking-wider">
                                                            {survey.status}
                                                        </Badge>
                                                    </div>
                                                    {survey.channels.length > 0 && (
                                                        <div className="flex flex-wrap items-center gap-1.5 opacity-70 transition-opacity group-hover:opacity-100">
                                                            {survey.channels.map(ch => (
                                                                <span key={ch} className="text-[10px] font-medium text-zinc-500">
                                                                    {ch}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </motion.button>
                                            )
                                        })}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden rounded-xl border-zinc-200 shadow-sm">
                        <CardHeader className="border-b border-zinc-100 pb-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 space-y-1">
                                    <CardTitle className="text-base font-semibold tracking-tight">Modül Ayarları</CardTitle>
                                    <CardDescription className="text-xs leading-5">
                                        Aktivasyon, widget CTA ve varsayılan anket onay metinleri.
                                    </CardDescription>
                                </div>
                                <Badge variant={enableSurveyManager ? "default" : "secondary"} className="shrink-0 rounded-md text-[10px] uppercase tracking-wider">
                                    {enableSurveyManager ? "Aktif" : "Pasif"}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="divide-y divide-zinc-100 p-0">
                            <section className="space-y-4 p-5">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="space-y-1">
                                        <Label htmlFor="survey-module-enabled" className="text-sm font-medium text-zinc-900">
                                            Modül Durumu
                                        </Label>
                                        <p className="text-xs leading-5 text-zinc-500">
                                            Anket modülünü tenant paneli ve widget ayarları için kullanılabilir yapar.
                                        </p>
                                    </div>
                                    <Switch id="survey-module-enabled" checked={enableSurveyManager} onCheckedChange={setEnableSurveyManager} />
                                </div>
                            </section>

                            <section className="space-y-4 p-5">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="space-y-1">
                                        <Label htmlFor="survey-widget-cta" className="text-sm font-medium text-zinc-900">
                                            Widget CTA Gösterimi
                                        </Label>
                                        <p className="text-xs leading-5 text-zinc-500">
                                            Widget içinde giriş alanının üstünde “Ankete Katıl” hızlı aksiyonunu gösterir.
                                        </p>
                                    </div>
                                    <Switch
                                        id="survey-widget-cta"
                                        checked={moduleConfig.showCta}
                                        onCheckedChange={(checked) => setModuleConfig((current) => ({ ...current, showCta: checked }))}
                                    />
                                </div>

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="space-y-1">
                                        <Label htmlFor="survey-widget-auto-open" className="text-sm font-medium text-zinc-900">
                                            Sayfa Yüklenince Anketi Aç
                                        </Label>
                                        <p className="text-xs leading-5 text-zinc-500">
                                            Widget sayfa yüklendiğinde otomatik açılır ve aktif anket doğrudan gösterilir.
                                        </p>
                                    </div>
                                    <Switch
                                        id="survey-widget-auto-open"
                                        checked={moduleConfig.autoOpenOnLoad}
                                        onCheckedChange={(checked) => setModuleConfig((current) => ({ ...current, autoOpenOnLoad: checked }))}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="survey-widget-active-survey" className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                        Aktif Widget Anketi
                                    </Label>
                                    <select
                                        id="survey-widget-active-survey"
                                        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-800 outline-none transition-colors focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
                                        value={moduleConfig.widgetActiveSurveyId || "none"}
                                        disabled={publishedWidgetSurveys.length === 0}
                                        onChange={(event) => setModuleConfig((current) => ({
                                            ...current,
                                            widgetActiveSurveyId: event.target.value === "none" ? null : event.target.value,
                                        }))}
                                    >
                                        <option value="none">
                                            {publishedWidgetSurveys.length === 0 ? "Yayında widget anketi yok" : "Seçili anket yok"}
                                        </option>
                                        {publishedWidgetSurveys.map((survey) => (
                                            <option key={survey.id} value={survey.id}>{survey.title}</option>
                                        ))}
                                    </select>
                                    <p className="text-[11px] leading-5 text-zinc-500">
                                        Sadece yayında olan ve kanalında Chat Widget seçili anketler listelenir.
                                    </p>
                                </div>
                            </section>

                            <section className="space-y-4 p-5">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-zinc-900">Varsayılan Aydınlatma</p>
                                    <p className="text-xs leading-5 text-zinc-500">
                                        Yeni oluşturulan anketlerde kullanılacak KVKK başlığı, açıklaması ve onay etiketi.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="survey-default-consent-title" className="text-xs font-medium text-zinc-600">Başlık</Label>
                                        <Input
                                            id="survey-default-consent-title"
                                            className="rounded-md border-zinc-200 bg-white"
                                            value={moduleConfig.defaultConsentTitle}
                                            onChange={(event) => setModuleConfig((current) => ({ ...current, defaultConsentTitle: event.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="survey-default-consent-text" className="text-xs font-medium text-zinc-600">Metin</Label>
                                        <Textarea
                                            id="survey-default-consent-text"
                                            rows={4}
                                            className="resize-none rounded-md border-zinc-200 bg-white"
                                            value={moduleConfig.defaultConsentText}
                                            onChange={(event) => setModuleConfig((current) => ({ ...current, defaultConsentText: event.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="survey-default-consent-checkbox" className="text-xs font-medium text-zinc-600">Onay Kutusu Etiketi</Label>
                                        <Input
                                            id="survey-default-consent-checkbox"
                                            className="rounded-md border-zinc-200 bg-white"
                                            value={moduleConfig.defaultConsentCheckboxLabel}
                                            onChange={(event) => setModuleConfig((current) => ({ ...current, defaultConsentCheckboxLabel: event.target.value }))}
                                        />
                                    </div>
                                </div>
                            </section>

                            <div className="bg-zinc-50/70 px-5 py-3 text-xs leading-5 text-zinc-500">
                                Değişiklikleri yayınlamak için üstteki “Modül Ayarları” butonuyla kaydedin.
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Builder & Analytics */}
                <div className="space-y-6">
                    {!draftSurvey ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex min-h-[500px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-8 text-center"
                        >
                            <div className="rounded-full bg-white p-4 shadow-sm">
                                <LayoutTemplate className="h-6 w-6 text-zinc-300" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-base font-medium text-zinc-900">Anket Düzenleyici</h3>
                                <p className="max-w-sm text-sm text-zinc-500">
                                    Düzenlemek için soldaki listeden bir anket seçin veya yeni bir şablon ile başlayın.
                                </p>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            {/* Survey Context Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className="rounded-md px-2 py-0.5 font-mono text-[11px] text-zinc-600">
                                        {draftSurvey.templateType}
                                    </Badge>
                                    <Badge className="rounded-md px-2 py-0.5 text-[11px]" variant={draftSurvey.status === "published" ? "default" : "secondary"}>
                                        {draftSurvey.status === "published" ? "Yayında" : "Taslak"}
                                    </Badge>
                                    {draftSurvey.channels.includes("widget") && (
                                        <Badge variant="outline" className="rounded-md px-2 py-0.5 text-[11px] text-zinc-600">widget</Badge>
                                    )}
                                    {draftSurvey.channels.includes("publicPage") && (
                                        <Badge variant="outline" className="rounded-md px-2 py-0.5 text-[11px] text-zinc-600">public</Badge>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button variant="outline" size="sm" className="rounded-md border-zinc-200 hover:bg-zinc-50" onClick={() => exportSurvey("csv")} disabled={!selectedSurveyId}>
                                        <Download className="mr-2 h-3.5 w-3.5" /> CSV
                                    </Button>
                                    <Button variant="outline" size="sm" className="rounded-md border-zinc-200 hover:bg-zinc-50" onClick={() => exportSurvey("xlsx")} disabled={!selectedSurveyId}>
                                        <Download className="mr-2 h-3.5 w-3.5" /> XLSX
                                    </Button>
                                    <div className="mx-1 h-5 w-px bg-zinc-200" />
                                    <Button size="sm" className="rounded-md bg-zinc-900 text-white hover:bg-zinc-800" onClick={publishSurvey} disabled={isSavingSurvey || draftSurvey.status === "published"}>
                                        <Send className="mr-2 h-3.5 w-3.5" /> Yayınla
                                    </Button>
                                    <Button variant="outline" size="sm" className="rounded-md border-zinc-200 text-zinc-700 hover:bg-zinc-50" onClick={closeSurvey} disabled={isSavingSurvey || draftSurvey.status !== "published"}>
                                        Durdur
                                    </Button>
                                    <Button variant="destructive" size="sm" className="rounded-md" onClick={deleteSurvey} disabled={isSavingSurvey}>
                                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Sil
                                    </Button>
                                </div>
                            </div>

                            <Tabs defaultValue="builder" className="space-y-4">
                                <TabsList className="grid h-10 w-full grid-cols-4">
                                    <TabsTrigger value="builder" className="rounded-md">
                                        <LayoutTemplate className="mr-2 h-4 w-4" /> Builder
                                    </TabsTrigger>
                                    <TabsTrigger value="questions" className="rounded-md">
                                        <LayoutTemplate className="mr-2 h-4 w-4" /> Sorular
                                    </TabsTrigger>
                                    <TabsTrigger value="analytics" className="rounded-md">
                                        <PieChart className="mr-2 h-4 w-4" /> İstatistikler
                                    </TabsTrigger>
                                    <TabsTrigger value="responses" className="rounded-md">
                                        <Users className="mr-2 h-4 w-4" /> Yanıtlar
                                    </TabsTrigger>
                                </TabsList>

                                <div className="rounded-xl border border-zinc-200 bg-white">
                                    <TabsContent value="builder" className="m-0 p-4 outline-none md:p-5">
                                        <div className="space-y-6">
                                            {/* General Settings */}
                                            <section className="space-y-4">
                                                <div>
                                                    <h3 className="text-base font-semibold text-zinc-900">Genel Bilgiler</h3>
                                                    <p className="text-sm text-zinc-500">Anketinizin temel kimliği ve sunum kanalları.</p>
                                                </div>
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <div className="space-y-2 md:col-span-2">
                                                        <Label className="text-sm font-medium text-zinc-700">Anket Başlığı</Label>
                                                        <Input
                                                            className="rounded-md focus-visible:ring-1 focus-visible:ring-zinc-400"
                                                            value={draftSurvey.title}
                                                            onChange={(event) => updateDraft("title", event.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-2 md:col-span-2">
                                                        <Label className="text-sm font-medium text-zinc-700">İç Açıklama (Size Özel)</Label>
                                                        <Textarea
                                                            rows={2}
                                                            className="resize-none rounded-md focus-visible:ring-1 focus-visible:ring-zinc-400"
                                                            value={draftSurvey.description}
                                                            onChange={(event) => updateDraft("description", event.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-2 md:col-span-2">
                                                        <Label className="text-sm font-medium text-zinc-700">URL Slug</Label>
                                                        <Input
                                                            className="rounded-md font-mono text-sm focus-visible:ring-1 focus-visible:ring-zinc-400"
                                                            value={draftSurvey.slug}
                                                            onChange={(event) => updateDraft("slug", event.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-3 rounded-md border border-zinc-200 p-4 md:col-span-2">
                                                        <Label className="text-sm font-medium text-zinc-700">Yayın Kanalları</Label>
                                                        <div className="flex flex-wrap gap-4">
                                                            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-700 transition-opacity hover:opacity-80">
                                                                <Checkbox
                                                                    className="h-4 w-4 rounded-sm"
                                                                    checked={draftSurvey.channels.includes("publicPage")}
                                                                    onCheckedChange={(checked) => updateDraft(
                                                                        "channels",
                                                                        checked
                                                                            ? Array.from(new Set([...draftSurvey.channels, "publicPage"]))
                                                                            : draftSurvey.channels.filter((item) => item !== "publicPage")
                                                                    )}
                                                                />
                                                                Public Sayfa
                                                            </label>
                                                            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-700 transition-opacity hover:opacity-80">
                                                                <Checkbox
                                                                    className="h-4 w-4 rounded-sm"
                                                                    checked={draftSurvey.channels.includes("widget")}
                                                                    onCheckedChange={(checked) => updateDraft(
                                                                        "channels",
                                                                        checked
                                                                            ? Array.from(new Set([...draftSurvey.channels, "widget"]))
                                                                            : draftSurvey.channels.filter((item) => item !== "widget")
                                                                    )}
                                                                />
                                                                Chat Widget
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </section>

                                            <div className="h-px w-full bg-zinc-100" />

                                            {/* Intro & Outro */}
                                            <section className="space-y-4">
                                                <div>
                                                    <h3 className="text-base font-semibold text-zinc-900">Karşılama ve Teşekkür</h3>
                                                    <p className="text-sm text-zinc-500">Katılımcıların göreceği giriş ve bitiş ekranı metinleri.</p>
                                                </div>
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <div className="space-y-4 rounded-md border border-zinc-200 bg-white p-4">
                                                        <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                                                            <span className="font-mono text-xs font-semibold text-zinc-400">01</span>
                                                            <h4 className="text-sm font-medium text-zinc-900">Giriş Ekranı</h4>
                                                        </div>
                                                        <div className="space-y-3 pt-1">
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs text-zinc-500 uppercase tracking-wide">Başlık</Label>
                                                                <Input
                                                                    className="rounded-md"
                                                                    value={draftSurvey.introTitle}
                                                                    onChange={(event) => updateDraft("introTitle", event.target.value)}
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs text-zinc-500 uppercase tracking-wide">Metin</Label>
                                                                <Textarea
                                                                    rows={3}
                                                                    className="resize-none rounded-md"
                                                                    value={draftSurvey.introText}
                                                                    onChange={(event) => updateDraft("introText", event.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4 rounded-md border border-zinc-200 bg-white p-4">
                                                        <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                                                            <span className="font-mono text-xs font-semibold text-zinc-400">02</span>
                                                            <h4 className="text-sm font-medium text-zinc-900">Bitiş Ekranı</h4>
                                                        </div>
                                                        <div className="space-y-3 pt-1">
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs text-zinc-500 uppercase tracking-wide">Başlık</Label>
                                                                <Input
                                                                    className="rounded-md"
                                                                    value={draftSurvey.thankYouTitle}
                                                                    onChange={(event) => updateDraft("thankYouTitle", event.target.value)}
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs text-zinc-500 uppercase tracking-wide">Metin</Label>
                                                                <Textarea
                                                                    rows={3}
                                                                    className="resize-none rounded-md"
                                                                    value={draftSurvey.thankYouText}
                                                                    onChange={(event) => updateDraft("thankYouText", event.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </section>

                                            <div className="h-px w-full bg-zinc-100" />

                                            {/* Consent & Contact */}
                                            <section className="space-y-4">
                                                <div>
                                                    <h3 className="text-base font-semibold text-zinc-900">KVKK ve İletişim</h3>
                                                    <p className="text-sm text-zinc-500">Bu ankete özel aydınlatma metni ve iletişim toplama adımı.</p>
                                                </div>

                                                <div className="grid gap-6 md:grid-cols-2">
                                                    <div className="space-y-4 rounded-md border border-zinc-200 p-4">
                                                        <h4 className="text-sm font-medium text-zinc-900">Aydınlatma Metni</h4>
                                                        <div className="space-y-3">
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs text-zinc-500">Başlık</Label>
                                                                <Input
                                                                    className="rounded-md bg-white"
                                                                    value={draftSurvey.consent.title}
                                                                    onChange={(event) => updateDraft("consent", { ...draftSurvey.consent, title: event.target.value })}
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs text-zinc-500">Metin</Label>
                                                                <Textarea
                                                                    rows={3}
                                                                    className="resize-none rounded-md bg-white"
                                                                    value={draftSurvey.consent.body}
                                                                    onChange={(event) => updateDraft("consent", { ...draftSurvey.consent, body: event.target.value })}
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs text-zinc-500">Onay Kutusu</Label>
                                                                <Input
                                                                    className="rounded-md bg-white"
                                                                    value={draftSurvey.consent.checkboxLabel}
                                                                    onChange={(event) => updateDraft("consent", { ...draftSurvey.consent, checkboxLabel: event.target.value })}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4 rounded-md border border-zinc-200 p-4">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="text-sm font-medium text-zinc-900">İletişim Bilgileri Toplama</h4>
                                                            <Switch
                                                                checked={draftSurvey.contactCapture.enabled}
                                                                onCheckedChange={(checked) => updateDraft("contactCapture", { ...draftSurvey.contactCapture, enabled: checked })}
                                                            />
                                                        </div>

                                                        <AnimatePresence>
                                                            {draftSurvey.contactCapture.enabled && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, height: 0 }}
                                                                    animate={{ opacity: 1, height: "auto" }}
                                                                    exit={{ opacity: 0, height: 0 }}
                                                                    className="space-y-4 overflow-hidden"
                                                                >
                                                                    <div className="space-y-3 pt-2">
                                                                        <div className="space-y-1.5">
                                                                            <Label className="text-xs text-zinc-500">Giriş Başlığı</Label>
                                                                            <Input
                                                                                className="rounded-md bg-white"
                                                                                value={draftSurvey.contactCapture.title || ""}
                                                                                onChange={(event) => updateDraft("contactCapture", { ...draftSurvey.contactCapture, title: event.target.value })}
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-1.5">
                                                                            <Label className="text-xs text-zinc-500">Açıklama</Label>
                                                                            <Input
                                                                                className="rounded-md bg-white"
                                                                                value={draftSurvey.contactCapture.description || ""}
                                                                                onChange={(event) => updateDraft("contactCapture", { ...draftSurvey.contactCapture, description: event.target.value })}
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    <div className="space-y-2 pt-2">
                                                                        <Label className="text-xs font-medium text-zinc-900">Alanlar</Label>
                                                                        {([
                                                                            ["nameEnabled", "nameRequired", "Ad Soyad"],
                                                                            ["emailEnabled", "emailRequired", "E-posta"],
                                                                            ["phoneEnabled", "phoneRequired", "Telefon"],
                                                                        ] as const).map(([enabledKey, requiredKey, label]) => (
                                                                            <div key={enabledKey} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2.5">
                                                                                <div className="flex items-center gap-3">
                                                                                    <Switch
                                                                                        checked={Boolean(draftSurvey.contactCapture[enabledKey])}
                                                                                        onCheckedChange={(checked) => updateDraft("contactCapture", {
                                                                                            ...draftSurvey.contactCapture,
                                                                                            [enabledKey]: checked,
                                                                                            [requiredKey]: checked ? draftSurvey.contactCapture[requiredKey] : false,
                                                                                        })}
                                                                                    />
                                                                                    <span className="text-sm font-medium text-zinc-700">{label}</span>
                                                                                </div>
                                                                                <label className={`flex items-center gap-2 text-xs transition-opacity ${draftSurvey.contactCapture[enabledKey] ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                                                                    <Checkbox
                                                                                        className="h-3.5 w-3.5 rounded-sm"
                                                                                        checked={Boolean(draftSurvey.contactCapture[requiredKey])}
                                                                                        disabled={!draftSurvey.contactCapture[enabledKey]}
                                                                                        onCheckedChange={(checked) => updateDraft("contactCapture", {
                                                                                            ...draftSurvey.contactCapture,
                                                                                            [requiredKey]: Boolean(checked),
                                                                                        })}
                                                                                    />
                                                                                    Zorunlu
                                                                                </label>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                </div>
                                            </section>

                                        </div>
                                    </TabsContent>

                                    <TabsContent value="questions" className="m-0 p-4 outline-none md:p-5">
                                                {/* Questions */}
                                                <section className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h3 className="text-base font-semibold text-zinc-900">Sorular</h3>
                                                        <p className="text-sm text-zinc-500">Anket sorularını buradan yönetin.</p>
                                                    </div>
                                                    <Button
                                                        className="rounded-md bg-zinc-900 text-white hover:bg-zinc-800"
                                                        onClick={() => setDraftSurvey((current) => current ? { ...current, questions: [...current.questions, createQuestion()] } : current)}
                                                    >
                                                        <Plus className="mr-2 h-4 w-4" /> Yeni Soru
                                                    </Button>
                                                </div>

                                                <div className="space-y-4">
                                                    <AnimatePresence mode="popLayout">
                                                        {draftSurvey.questions.map((question, index) => (
                                                            <motion.div
                                                                layout
                                                                initial={{ opacity: 0, y: 8 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.95 }}
                                                                key={question.id}
                                                                className="group rounded-md border border-zinc-200 bg-white"
                                                            >
                                                                <div className="flex flex-col gap-4 p-4 sm:flex-row">
                                                                    <div className="flex flex-1 flex-col gap-4">
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="font-mono text-xs font-semibold text-zinc-400">
                                                                                    {index + 1}
                                                                                </div>
                                                                                <Badge variant="secondary" className="rounded-md px-2 py-0.5 text-[10px] text-zinc-600">
                                                                                    {QUESTION_TYPE_OPTIONS.find(opt => opt.id === question.type)?.label || question.type}
                                                                                </Badge>
                                                                            </div>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8 rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-600"
                                                                                onClick={() => setDraftSurvey((current) => current ? {
                                                                                    ...current,
                                                                                    questions: current.questions.filter((item) => item.id !== question.id),
                                                                                } : current)}
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </Button>
                                                                        </div>

                                                                        <div className="grid gap-4 md:grid-cols-2">
                                                                            <div className="space-y-2 md:col-span-2">
                                                                                <Input
                                                                                    className="h-10 rounded-md border-zinc-200 text-base font-medium focus-visible:ring-1 focus-visible:ring-zinc-400"
                                                                                    placeholder="Soru metni..."
                                                                                    value={question.title}
                                                                                    onChange={(event) => updateQuestion(question.id, (current) => ({ ...current, title: event.target.value }))}
                                                                                />
                                                                            </div>

                                                                            <div className="space-y-1.5">
                                                                                <Label className="text-xs text-zinc-500 uppercase tracking-wide">Soru Tipi</Label>
                                                                                <select
                                                                                    className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm font-medium outline-none transition-colors focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5"
                                                                                    value={question.type}
                                                                                    onChange={(event) => updateQuestion(question.id, (current) => ({
                                                                                        ...current,
                                                                                        type: event.target.value as SurveyQuestion["type"],
                                                                                        options: ["singleChoice", "multiChoice"].includes(event.target.value)
                                                                                            ? (current.options && current.options.length > 0 ? current.options : ["Seçenek 1", "Seçenek 2"])
                                                                                            : undefined,
                                                                                    }))}
                                                                                >
                                                                                    {QUESTION_TYPE_OPTIONS.map((option) => (
                                                                                        <option key={option.id} value={option.id}>{option.label}</option>
                                                                                    ))}
                                                                                </select>
                                                                            </div>

                                                                            <div className="space-y-1.5">
                                                                                <Label className="text-xs text-zinc-500 uppercase tracking-wide">Demografik Key (Opsiyonel)</Label>
                                                                                <Input
                                                                                    className="h-9 rounded-md text-sm"
                                                                                    placeholder="örn: age, gender"
                                                                                    value={question.demographicKey || ""}
                                                                                    onChange={(event) => updateQuestion(question.id, (current) => ({ ...current, demographicKey: event.target.value }))}
                                                                                />
                                                                            </div>

                                                                            <div className="space-y-1.5 md:col-span-2">
                                                                                <Label className="text-xs text-zinc-500 uppercase tracking-wide">Alt Açıklama (Opsiyonel)</Label>
                                                                                <Textarea
                                                                                    rows={1}
                                                                                    className="min-h-[36px] resize-none rounded-md py-2 text-sm"
                                                                                    placeholder="Soruyla ilgili ek bilgi..."
                                                                                    value={question.description || ""}
                                                                                    onChange={(event) => updateQuestion(question.id, (current) => ({ ...current, description: event.target.value }))}
                                                                                />
                                                                            </div>

                                                                            <div className="flex flex-wrap items-center gap-4 md:col-span-2">
                                                                                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-700">
                                                                                    <Checkbox
                                                                                        className="h-4 w-4 rounded-sm"
                                                                                        checked={question.required}
                                                                                        onCheckedChange={(checked) => updateQuestion(question.id, (current) => ({ ...current, required: Boolean(checked) }))}
                                                                                    />
                                                                                    Zorunlu
                                                                                </label>
                                                                                {(question.type === "singleChoice" || question.type === "multiChoice") && (
                                                                                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-700">
                                                                                        <Checkbox
                                                                                            className="h-4 w-4 rounded-sm"
                                                                                            checked={question.allowOther === true}
                                                                                            onCheckedChange={(checked) => updateQuestion(question.id, (current) => ({ ...current, allowOther: Boolean(checked) }))}
                                                                                        />
                                                                                        &apos;Diğer&apos; seçeneği
                                                                                    </label>
                                                                                )}
                                                                            </div>

                                                                            {(question.type === "singleChoice" || question.type === "multiChoice") && (
                                                                                <div className="space-y-2 rounded-md border border-zinc-200 p-3 md:col-span-2 mt-2">
                                                                                    <Label className="text-[10px] font-semibold text-zinc-700 uppercase tracking-wide flex items-center gap-1.5">
                                                                                        <GripVertical className="h-3 w-3 text-zinc-400" /> Seçenekler (Satır satır)
                                                                                    </Label>
                                                                                    <Textarea
                                                                                        rows={4}
                                                                                        className="resize-none rounded-md border-zinc-200 bg-white font-mono text-sm"
                                                                                        value={(question.options || []).join("\n")}
                                                                                        onChange={(event) => updateQuestion(question.id, (current) => ({
                                                                                            ...current,
                                                                                            options: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean),
                                                                                        }))}
                                                                                    />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </AnimatePresence>
                                                    {draftSurvey.questions.length === 0 && (
                                                        <div className="rounded-lg border border-dashed border-zinc-300 py-8 text-center text-sm text-zinc-500">
                                                            Henüz soru eklenmedi.
                                                        </div>
                                                    )}
                                                </div>
                                                </section>
                                    </TabsContent>

                                    <TabsContent value="analytics" className="m-0 p-4 outline-none md:p-6">
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-zinc-900">İstatistikler</h3>
                                                    <p className="text-sm text-zinc-500">Toplanan yanıtların analizi.</p>
                                                </div>
                                                <Button variant="outline" size="sm" className="rounded-md" onClick={() => loadAnalytics(selectedSurveyId)} disabled={isLoadingAnalytics}>
                                                    {isLoadingAnalytics ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                    Yenile
                                                </Button>
                                            </div>

                                            {isLoadingAnalytics && (
                                                <div className="flex h-32 items-center justify-center rounded-xl border border-zinc-100 bg-zinc-50 text-zinc-500">
                                                    <Loader2 className="h-6 w-6 animate-spin" />
                                                </div>
                                            )}

                                            {!isLoadingAnalytics && analytics && (
                                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                                    <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-5">
                                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
                                                            <BarChart3 className="h-6 w-6" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Toplam Katılım</p>
                                                            <p className="text-3xl font-bold tracking-tight text-zinc-900">{analytics.aggregate.totalResponses}</p>
                                                        </div>
                                                    </div>

                                                    <div className="grid gap-4 md:grid-cols-2">
                                                        {draftSurvey.questions.map((question, idx) => {
                                                            const stat = analytics.aggregate.questionStats?.[question.id]
                                                            return (
                                                                <div key={question.id} className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white">
                                                                    <div className="border-b border-zinc-100 bg-zinc-50/50 p-4">
                                                                        <div className="mb-1.5 flex items-center gap-2">
                                                                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-200 text-[9px] font-bold text-zinc-700">S{idx + 1}</span>
                                                                            <Badge variant="outline" className="text-[9px] rounded-md uppercase tracking-wider">{question.type}</Badge>
                                                                        </div>
                                                                        <p className="text-sm font-medium text-zinc-900 leading-snug">{question.title}</p>
                                                                    </div>
                                                                    <div className="flex-1 p-4">
                                                                        {stat?.optionCounts ? (
                                                                            <div className="space-y-3">
                                                                                {Object.entries(stat.optionCounts).map(([option, count]) => {
                                                                                    const total = analytics.aggregate.totalResponses || 1;
                                                                                    const percent = Math.round((count / total) * 100);
                                                                                    return (
                                                                                        <div key={option} className="space-y-1.5">
                                                                                            <div className="flex items-center justify-between text-xs">
                                                                                                <span className="font-medium text-zinc-700 truncate pr-4">{option}</span>
                                                                                                <span className="text-zinc-900 font-bold">{count} <span className="text-zinc-400 font-normal text-[10px]">({percent}%)</span></span>
                                                                                            </div>
                                                                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                                                                                                <motion.div
                                                                                                    initial={{ width: 0 }}
                                                                                                    animate={{ width: `${percent}%` }}
                                                                                                    transition={{ duration: 1, ease: "easeOut" }}
                                                                                                    className="h-full bg-zinc-900 rounded-full"
                                                                                                />
                                                                                            </div>
                                                                                        </div>
                                                                                    )
                                                                                })}
                                                                            </div>
                                                                        ) : stat?.numericSummary ? (
                                                                            <div className="grid grid-cols-2 gap-2">
                                                                                <div className="rounded-lg bg-zinc-50 p-3 text-center">
                                                                                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Ortalama</p>
                                                                                    <p className="mt-1 text-xl font-bold text-zinc-900">{stat.numericSummary.average.toFixed(1)}</p>
                                                                                </div>
                                                                                <div className="rounded-lg bg-zinc-50 p-3 text-center">
                                                                                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Yanıt Adedi</p>
                                                                                    <p className="mt-1 text-xl font-bold text-zinc-900">{stat.numericSummary.count}</p>
                                                                                </div>
                                                                                <div className="rounded-lg bg-zinc-50 p-3 text-center">
                                                                                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide">En Düşük</p>
                                                                                    <p className="mt-1 text-base font-semibold text-zinc-700">{stat.numericSummary.min}</p>
                                                                                </div>
                                                                                <div className="rounded-lg bg-zinc-50 p-3 text-center">
                                                                                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide">En Yüksek</p>
                                                                                    <p className="mt-1 text-base font-semibold text-zinc-700">{stat.numericSummary.max}</p>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                                                                                Bu soru için henüz analiz verisi yok.
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="responses" className="m-0 p-4 outline-none md:p-6">
                                        <div className="space-y-6">
                                            <div>
                                                <h3 className="text-lg font-semibold text-zinc-900">Ham Yanıtlar</h3>
                                                <p className="text-sm text-zinc-500">Katılımcı bazlı bireysel kayıtlar.</p>
                                            </div>

                                            {analytics?.responses?.length ? (
                                                <div className="space-y-4">
                                                    {analytics.responses.map((response) => (
                                                        <div key={response.id} className="rounded-xl border border-zinc-200 bg-white p-4 md:p-5">
                                                            <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-100 text-sm font-bold text-zinc-600">
                                                                        {(response.contact.name || "A").charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-semibold text-zinc-900">{response.contact.name || "Anonim Katılımcı"}</p>
                                                                        <p className="text-[11px] text-zinc-500">{new Date(response.createdAt || "").toLocaleString("tr-TR")}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-1.5 text-xs">
                                                                    <Badge variant="outline" className="bg-zinc-50 rounded-md uppercase tracking-wider text-[9px]">{response.metadata.source}</Badge>
                                                                    {response.contact.email && <span className="text-zinc-600">{response.contact.email}</span>}
                                                                    {response.contact.phone && <span className="text-zinc-600">{response.contact.phone}</span>}
                                                                </div>
                                                            </div>

                                                            <div className="grid gap-3 md:grid-cols-2">
                                                                {response.answers.map((answer) => (
                                                                    <div key={`${response.id}-${answer.questionId}`} className="rounded-lg bg-zinc-50/80 p-3 border border-zinc-100">
                                                                        <p className="mb-1 text-[10px] font-medium text-zinc-500 uppercase tracking-wide line-clamp-1" title={answer.questionTitle}>{answer.questionTitle}</p>
                                                                        <p className="text-sm font-medium text-zinc-900">
                                                                            {Array.isArray(answer.value)
                                                                                ? answer.value.join(", ")
                                                                                : String(answer.value ?? "Yanıt yok")}
                                                                            {answer.otherText && <span className="ml-1 text-zinc-500 font-normal">({answer.otherText})</span>}
                                                                        </p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 py-12 text-center text-sm text-zinc-500">
                                                    <Users className="mb-2 h-8 w-8 text-zinc-300" />
                                                    <p>Henüz yanıt bulunmuyor.</p>
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    )
}
