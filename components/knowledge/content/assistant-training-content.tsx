"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { AssistantTrainingEntry, AssistantTrainingEntryType } from "@/lib/assistant-training"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, MessageSquare, Pencil, Play, Plus, RotateCcw, Save, Search, Sparkles, Trash2 } from "lucide-react"

type FormState = {
    type: AssistantTrainingEntryType
    status: "active" | "draft" | "inactive"
    question: string
    answer: string
    wrongAnswer: string
    rule: string
    language: string
    tags: string
    priority: number
    sourceSessionId?: string
    sourceMessageId?: string
}

type EvaluationMatch = {
    id: string
    type: AssistantTrainingEntryType
    question?: string
    answer?: string
    wrongAnswer?: string
    rule?: string
    priority?: number
    score: number
}

type AskedQuestion = {
    id: string
    question: string
    count: number
    lastAskedAt?: string | null
    lastAssistantAnswer?: string
    sourceSessionId?: string
    sourceMessageId?: string
}

type GeneratedRule = {
    id: string
    rule: string
    source?: "ai" | "fallback"
    saved?: boolean
}

interface AssistantTrainingContentProps {
    userId: string
}

const emptyForm: FormState = {
    type: "qa",
    status: "active",
    question: "",
    answer: "",
    wrongAnswer: "",
    rule: "",
    language: "auto",
    tags: "",
    priority: 3,
}

function toForm(entry: AssistantTrainingEntry): FormState {
    return {
        type: entry.type,
        status: entry.status,
        question: entry.question || "",
        answer: entry.answer || "",
        wrongAnswer: entry.wrongAnswer || "",
        rule: entry.rule || "",
        language: entry.language || "auto",
        tags: (entry.tags || []).join(", "),
        priority: entry.priority || 3,
        sourceSessionId: entry.sourceSessionId,
        sourceMessageId: entry.sourceMessageId,
    }
}

function formatDate(value: any) {
    if (!value) return "-"
    const date = value?.seconds ? new Date(value.seconds * 1000) : new Date(value)
    if (Number.isNaN(date.getTime())) return "-"
    return date.toLocaleDateString()
}

function toMillis(value: any): number {
    if (!value) return 0
    if (typeof value === "string" || typeof value === "number" || value instanceof Date) {
        const ms = new Date(value).getTime()
        return Number.isFinite(ms) ? ms : 0
    }
    if (typeof value?.toDate === "function") {
        const ms = value.toDate().getTime()
        return Number.isFinite(ms) ? ms : 0
    }
    if (typeof value?._seconds === "number") {
        return value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1_000_000)
    }
    if (typeof value?.seconds === "number") {
        return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1_000_000)
    }
    return 0
}

function normalizeQuestionKey(value: string) {
    return value
        .toLocaleLowerCase("tr")
        .replace(/[?!.,;:()[\]{}"'`]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
}

export function AssistantTrainingContent({ userId }: AssistantTrainingContentProps) {
    const { user } = useAuth()
    const { language } = useLanguage()
    const { toast } = useToast()
    const [entries, setEntries] = useState<AssistantTrainingEntry[]>([])
    const [form, setForm] = useState<FormState>(emptyForm)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isEvaluating, setIsEvaluating] = useState(false)
    const [isEvaluateModalOpen, setIsEvaluateModalOpen] = useState(false)
    const [evaluationQuestion, setEvaluationQuestion] = useState("")
    const [evaluationMatches, setEvaluationMatches] = useState<EvaluationMatch[]>([])
    const [askedQuestions, setAskedQuestions] = useState<AskedQuestion[]>([])
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(true)
    const [questionSearch, setQuestionSearch] = useState("")
    const [generatedRules, setGeneratedRules] = useState<GeneratedRule[]>([])
    const [generatedRuleSector, setGeneratedRuleSector] = useState("")
    const [isGeneratingRules, setIsGeneratingRules] = useState(false)
    const [isSavingGeneratedRules, setIsSavingGeneratedRules] = useState(false)

    const isTr = language === "tr"
    const copy = useMemo(() => ({
        title: isTr ? "Cevap Eğitimi" : "Response Training",
        description: isTr ? "Asistanın cevaplarını tenant'a özel kurallarla yönetin." : "Manage tenant-specific answer guidance.",
        addTitle: editingId ? (isTr ? "Eğitimi Düzenle" : "Edit Training") : (isTr ? "Yeni Eğitim Ekle" : "Add Training"),
        newTraining: isTr ? "Yeni Eğitim Ekle" : "Add Training",
        existing: isTr ? "Eğitim Kayıtları" : "Training Entries",
        type: isTr ? "Tür" : "Type",
        status: isTr ? "Durum" : "Status",
        language: isTr ? "Dil" : "Language",
        priority: isTr ? "Öncelik" : "Priority",
        tags: isTr ? "Etiketler" : "Tags",
        question: isTr ? "Soru" : "Question",
        answer: isTr ? "Tercih Edilen Cevap" : "Preferred Answer",
        wrongAnswer: isTr ? "Kaçınılacak Yanlış Cevap" : "Wrong Answer To Avoid",
        rule: isTr ? "Davranış Kuralı" : "Behavior Rule",
        save: isTr ? "Kaydet" : "Save",
        cancel: isTr ? "Vazgeç" : "Cancel",
        test: isTr ? "Test Et" : "Evaluate",
        testQuestion: isTr ? "Test sorusu" : "Test question",
        noRecords: isTr ? "Henüz cevap eğitimi eklenmedi." : "No response training added yet.",
        saved: isTr ? "Eğitim kaydedildi" : "Training saved",
        deleted: isTr ? "Eğitim silindi" : "Training deleted",
        failed: isTr ? "İşlem tamamlanamadı" : "Action failed",
        askedQuestions: isTr ? "Sorulmuş Sorular" : "Asked Questions",
        askedQuestionsHint: isTr ? "Chat geçmişindeki son kullanıcı sorularından eğitim kaydı başlatın." : "Start training from recent user questions in chat history.",
        questionSearch: isTr ? "Soru ara..." : "Search questions...",
        noAskedQuestions: isTr ? "Henüz sorulmuş soru bulunamadı." : "No asked questions found yet.",
        addQuestion: isTr ? "Soru-Cevap Ekle" : "Add Q&A",
        correctAnswer: isTr ? "Cevabı Düzelt" : "Correct Answer",
        askedCount: isTr ? "kez soruldu" : "asked",
        generateRules: isTr ? "AI ile Kural Üret" : "Generate Rules With AI",
        generatedRules: isTr ? "AI Kural Önerileri" : "AI Rule Suggestions",
        generatedRulesHint: isTr ? "Sektöre göre davranış kuralları üretin, sonra düzenleyip kaydedin." : "Generate sector-based behavior rules, then edit and save them.",
        useRule: isTr ? "Forma Al" : "Use",
        saveAllRules: isTr ? "Tümünü Kaydet" : "Save All",
        rulesGenerated: isTr ? "Kural önerileri üretildi" : "Rule suggestions generated",
        rulesSaved: isTr ? "Kurallar kaydedildi" : "Rules saved",
        noGeneratedRules: isTr ? "Bu tenant için yeni kural önerisi bulunamadı." : "No new rule suggestions found for this tenant.",
    }), [editingId, isTr])

    const fetchEntries = useCallback(async () => {
        if (!user || !userId) return
        setIsLoading(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/assistant-training?chatbotId=${encodeURIComponent(userId)}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!response.ok) throw new Error("Failed to fetch training entries")
            const data = await response.json()
            setEntries(data.entries || [])
        } catch (error) {
            console.error("Failed to fetch assistant training:", error)
            toast({ title: copy.failed, variant: "destructive" })
        } finally {
            setIsLoading(false)
        }
    }, [copy.failed, toast, user, userId])

    useEffect(() => {
        fetchEntries()
    }, [fetchEntries])

    const fetchAskedQuestions = useCallback(async () => {
        if (!user || !userId) {
            setIsLoadingQuestions(false)
            return
        }
        setIsLoadingQuestions(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/chat-sessions?chatbotId=${encodeURIComponent(userId)}&limit=120`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!response.ok) throw new Error("Failed to fetch chat sessions")
            const data = await response.json()
            const grouped = new Map<string, AskedQuestion & { lastAskedMs: number }>()

            for (const session of data.sessions || []) {
                const messages = Array.isArray(session.messages) ? session.messages : []
                messages.forEach((message: any, index: number) => {
                    if (message?.role !== "user" || typeof message?.content !== "string") return
                    const question = message.content.replace(/\s+/g, " ").trim()
                    if (question.length < 4) return

                    const key = normalizeQuestionKey(question)
                    if (!key) return

                    const followingAssistant = messages.slice(index + 1).find((item: any) => item?.role === "assistant" && typeof item?.content === "string")
                    const lastAskedMs = toMillis(message.createdAt) || toMillis(session.lastMessageTime) || toMillis(session.createdAt)
                    const existing = grouped.get(key)

                    if (!existing) {
                        grouped.set(key, {
                            id: key,
                            question,
                            count: 1,
                            lastAskedAt: lastAskedMs ? new Date(lastAskedMs).toISOString() : null,
                            lastAssistantAnswer: followingAssistant?.content || "",
                            sourceSessionId: session.id,
                            sourceMessageId: followingAssistant?.id || message.id || `${session.id}:${index}`,
                            lastAskedMs,
                        })
                        return
                    }

                    existing.count += 1
                    if (lastAskedMs >= existing.lastAskedMs) {
                        existing.question = question
                        existing.lastAskedAt = lastAskedMs ? new Date(lastAskedMs).toISOString() : existing.lastAskedAt
                        existing.lastAssistantAnswer = followingAssistant?.content || existing.lastAssistantAnswer
                        existing.sourceSessionId = session.id
                        existing.sourceMessageId = followingAssistant?.id || message.id || `${session.id}:${index}`
                        existing.lastAskedMs = lastAskedMs
                    }
                })
            }

            const nextQuestions = Array.from(grouped.values())
                .sort((a, b) => b.lastAskedMs - a.lastAskedMs)
                .slice(0, 40)
                .map((item) => ({
                    id: item.id,
                    question: item.question,
                    count: item.count,
                    lastAskedAt: item.lastAskedAt,
                    lastAssistantAnswer: item.lastAssistantAnswer,
                    sourceSessionId: item.sourceSessionId,
                    sourceMessageId: item.sourceMessageId,
                }))

            setAskedQuestions(nextQuestions)
        } catch (error) {
            console.error("Failed to fetch asked questions:", error)
            toast({ title: copy.failed, variant: "destructive" })
        } finally {
            setIsLoadingQuestions(false)
        }
    }, [copy.failed, toast, user, userId])

    useEffect(() => {
        fetchAskedQuestions()
    }, [fetchAskedQuestions])

    const resetForm = () => {
        setEditingId(null)
        setForm(emptyForm)
        setGeneratedRules([])
        setGeneratedRuleSector("")
        setIsFormOpen(false)
    }

    const openNewForm = () => {
        setEditingId(null)
        setForm(emptyForm)
        setGeneratedRules([])
        setGeneratedRuleSector("")
        setIsFormOpen(true)
    }

    const handleTypeChange = (value: string) => {
        setForm((prev) => ({
            ...prev,
            type: value as AssistantTrainingEntryType,
            priority: value === "correction" ? 5 : value === "rule" ? 4 : prev.priority,
        }))
    }

    const handleSave = async () => {
        if (!user) return
        setIsSaving(true)
        try {
            const token = await user.getIdToken()
            const payload = {
                chatbotId: userId,
                ...form,
                tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
            }
            const response = await fetch(editingId ? `/api/assistant-training/${editingId}` : "/api/assistant-training", {
                method: editingId ? "PATCH" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            })
            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data.error || "Failed to save")
            }
            toast({ title: copy.saved })
            resetForm()
            fetchEntries()
        } catch (error) {
            console.error("Failed to save assistant training:", error)
            toast({ title: copy.failed, variant: "destructive" })
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!user) return
        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/assistant-training/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!response.ok) throw new Error("Failed to delete")
            toast({ title: copy.deleted })
            fetchEntries()
        } catch (error) {
            console.error("Failed to delete assistant training:", error)
            toast({ title: copy.failed, variant: "destructive" })
        }
    }

    const handleEvaluate = async () => {
        if (!user || !evaluationQuestion.trim()) return
        setIsEvaluating(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/assistant-training/evaluate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    chatbotId: userId,
                    question: evaluationQuestion,
                    language: form.language || "auto",
                }),
            })
            if (!response.ok) throw new Error("Failed to evaluate")
            const data = await response.json()
            setEvaluationMatches(data.matches || [])
        } catch (error) {
            console.error("Failed to evaluate assistant training:", error)
            toast({ title: copy.failed, variant: "destructive" })
        } finally {
            setIsEvaluating(false)
        }
    }

    const handleGenerateRules = async () => {
        if (!user) return
        setIsGeneratingRules(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/assistant-training/generate-rules", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    chatbotId: userId,
                    language: form.language === "auto" ? language : form.language,
                }),
            })
            if (!response.ok) throw new Error("Failed to generate rules")

            const data = await response.json()
            const rules: GeneratedRule[] = (data.rules || [])
                .map((item: any, index: number) => ({
                    id: `${Date.now()}-${index}`,
                    rule: typeof item?.rule === "string" ? item.rule : "",
                    source: item?.source,
                    saved: false,
                }))
                .filter((item: GeneratedRule) => item.rule.trim())

            setGeneratedRules(rules)
            setGeneratedRuleSector(data.sectorName || "")
            setForm((prev) => ({
                ...prev,
                type: "rule",
                priority: prev.priority || 4,
                tags: prev.tags.trim() || "ai-generated, sector-rule",
            }))
            toast({ title: rules.length > 0 ? copy.rulesGenerated : copy.noGeneratedRules })
        } catch (error) {
            console.error("Failed to generate assistant rules:", error)
            toast({ title: copy.failed, variant: "destructive" })
        } finally {
            setIsGeneratingRules(false)
        }
    }

    const handleUseGeneratedRule = async (rule: GeneratedRule) => {
        if (!user) return
        
        // Forma al butonunu kaydet butonuna çevirip doğrudan veritabanına ekleyeceğiz
        const originalRuleText = form.rule; // Formdaki mevcut kuralı yedekle
        
        try {
            const token = await user.getIdToken()
            const payload = {
                chatbotId: userId,
                type: "rule",
                status: "active",
                rule: rule.rule,
                language: form.language || "auto",
                tags: (form.tags || "ai-generated, sector-rule").split(",").map((tag) => tag.trim()).filter(Boolean),
                priority: 4,
            }
            
            const response = await fetch("/api/assistant-training", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            })
            
            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data.error || "Failed to save")
            }
            
            // Başarılı olursa bu kuralı kaydedilmiş olarak işaretle
            setGeneratedRules((prev) => prev.map((item) => item.id === rule.id ? { ...item, saved: true } : item))
            toast({ title: copy.saved })
            fetchEntries() // Tabloyu güncelle
            
        } catch (error) {
            console.error("Failed to save generated rule:", error)
            toast({ title: copy.failed, variant: "destructive" })
        }
    }

    const handleSaveGeneratedRules = async () => {
        if (!user) return
        const unsavedRules = generatedRules.filter((item) => !item.saved && item.rule.trim())
        if (unsavedRules.length === 0) return

        setIsSavingGeneratedRules(true)
        try {
            const token = await user.getIdToken()
            const responses = await Promise.all(unsavedRules.map((item) => fetch("/api/assistant-training", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    chatbotId: userId,
                    type: "rule",
                    status: "active",
                    rule: item.rule,
                    language: "auto",
                    priority: 4,
                    tags: ["ai-generated", "sector-rule"],
                }),
            })))

            if (responses.some((response) => !response.ok)) {
                throw new Error("Failed to save generated rules")
            }

            setGeneratedRules((prev) => prev.map((item) => ({ ...item, saved: true })))
            toast({ title: copy.rulesSaved })
            fetchEntries()
        } catch (error) {
            console.error("Failed to save generated rules:", error)
            toast({ title: copy.failed, variant: "destructive" })
        } finally {
            setIsSavingGeneratedRules(false)
        }
    }

    const requiresQuestion = form.type !== "rule"
    const requiresAnswer = form.type === "qa" || form.type === "correction"
    const requiresRule = form.type === "rule"
    const canSave = requiresRule
        ? form.rule.trim().length > 0
        : form.question.trim().length > 0 && (!requiresAnswer || form.answer.trim().length > 0)
    const filteredAskedQuestions = useMemo(() => {
        const search = normalizeQuestionKey(questionSearch)
        if (!search) return askedQuestions
        return askedQuestions.filter((item) => normalizeQuestionKey(`${item.question} ${item.lastAssistantAnswer || ""}`).includes(search))
    }, [askedQuestions, questionSearch])

    const fillFromAskedQuestion = (item: AskedQuestion, type: "qa" | "correction") => {
        setEditingId(null)
        setForm({
            ...emptyForm,
            type,
            question: item.question,
            wrongAnswer: type === "correction" ? item.lastAssistantAnswer || "" : "",
            answer: "",
            priority: type === "correction" ? 5 : 3,
            sourceSessionId: item.sourceSessionId,
            sourceMessageId: item.sourceMessageId,
        })
        setIsFormOpen(true)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{copy.title}</h2>
                    <p className="text-muted-foreground">{copy.description}</p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsEvaluateModalOpen(true)}>
                        <Play className="mr-2 h-4 w-4" />
                        {copy.test}
                    </Button>
                    <Button className="w-full sm:w-auto" onClick={openNewForm}>
                        <Plus className="mr-2 h-4 w-4" />
                        {copy.newTraining}
                    </Button>
                </div>
            </div>

            <Dialog open={isFormOpen} onOpenChange={(open) => open ? setIsFormOpen(true) : resetForm()}>
                <DialogContent className="max-w-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
                    <DialogHeader className="px-8 pt-8 pb-4 shrink-0 border-b">
                        <DialogTitle>{copy.addTitle}</DialogTitle>
                    </DialogHeader>
                    <div id="assistant-training-form" className="space-y-4 px-8 py-6 overflow-y-auto flex-1">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2 sm:col-span-2">
                                <Label>{copy.type}</Label>
                                <Tabs value={form.type} onValueChange={handleTypeChange}>
                                    <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4 gap-1 p-1">
                                        <TabsTrigger value="qa" className="min-h-10 whitespace-normal px-3 text-center leading-tight">{isTr ? "Soru-Cevap" : "Q&A"}</TabsTrigger>
                                        <TabsTrigger value="correction" className="min-h-10 whitespace-normal px-3 text-center leading-tight">{isTr ? "Düzeltme" : "Correction"}</TabsTrigger>
                                        <TabsTrigger value="rule" className="min-h-10 whitespace-normal px-3 text-center leading-tight">{isTr ? "Kural" : "Rule"}</TabsTrigger>
                                        <TabsTrigger value="test_case" className="min-h-10 whitespace-normal px-3 text-center leading-tight">{isTr ? "Test" : "Test"}</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>
                            <div className="space-y-2">
                                <Label>{copy.status}</Label>
                                <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as FormState["status"] }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">{isTr ? "Aktif" : "Active"}</SelectItem>
                                        <SelectItem value="draft">{isTr ? "Taslak" : "Draft"}</SelectItem>
                                        <SelectItem value="inactive">{isTr ? "Pasif" : "Inactive"}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {requiresQuestion ? (
                            <div className="space-y-2">
                                <Label>{copy.question}</Label>
                                <Textarea
                                    value={form.question}
                                    onChange={(event) => setForm((prev) => ({ ...prev, question: event.target.value }))}
                                    className="min-h-[88px]"
                                />
                            </div>
                        ) : null}

                        {form.type === "correction" ? (
                            <div className="space-y-2">
                                <Label>{copy.wrongAnswer}</Label>
                                <Textarea
                                    value={form.wrongAnswer}
                                    onChange={(event) => setForm((prev) => ({ ...prev, wrongAnswer: event.target.value }))}
                                    className="min-h-[88px]"
                                />
                            </div>
                        ) : null}

                        {requiresAnswer || form.type === "test_case" ? (
                            <div className="space-y-2">
                                <Label>{copy.answer}</Label>
                                <Textarea
                                    value={form.answer}
                                    onChange={(event) => setForm((prev) => ({ ...prev, answer: event.target.value }))}
                                    className="min-h-[120px]"
                                />
                            </div>
                        ) : null}

                        {requiresRule ? (
                            <div className="space-y-2">
                                <Label>{copy.rule}</Label>
                                <Textarea
                                    value={form.rule}
                                    onChange={(event) => setForm((prev) => ({ ...prev, rule: event.target.value }))}
                                    className="min-h-[140px]"
                                />
                            </div>
                        ) : null}

                        {requiresRule ? (
                            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                                <div className="space-y-3">
                                    <div>
                                        <div className="text-sm font-medium">{copy.generatedRules}</div>
                                        <div className="text-xs text-muted-foreground">{copy.generatedRulesHint}</div>
                                    </div>
                                    <Button type="button" variant="outline" size="sm" className="w-full justify-center whitespace-nowrap" onClick={handleGenerateRules} disabled={isGeneratingRules}>
                                        {isGeneratingRules ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                        {copy.generateRules}
                                    </Button>
                                </div>

                                {generatedRuleSector ? (
                                    <Badge variant="secondary" className="w-fit">{generatedRuleSector}</Badge>
                                ) : null}

                                {generatedRules.length > 0 ? (
                                    <div className="space-y-2">
                                        {generatedRules.map((item) => (
                                            <div key={item.id} className="rounded-md border bg-background p-3 text-sm">
                                                <div className="text-muted-foreground">{item.rule}</div>
                                                <div className="mt-2 flex justify-end gap-2">
                                                    <Button 
                                                        type="button" 
                                                        variant={item.saved ? "secondary" : "ghost"} 
                                                        size="sm" 
                                                        onClick={() => !item.saved && handleUseGeneratedRule(item)}
                                                        disabled={item.saved}
                                                        className={item.saved ? "opacity-50" : ""}
                                                    >
                                                        {item.saved ? (isTr ? "Eklendi" : "Added") : (isTr ? "Ekle" : "Add")}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="flex justify-end">
                                            <Button type="button" size="sm" onClick={handleSaveGeneratedRules} disabled={isSavingGeneratedRules || generatedRules.every((item) => item.saved)}>
                                                {isSavingGeneratedRules ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                                {copy.saveAllRules}
                                            </Button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>{copy.language}</Label>
                                <Select value={form.language} onValueChange={(value) => setForm((prev) => ({ ...prev, language: value }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto">Auto</SelectItem>
                                        <SelectItem value="tr">Türkçe</SelectItem>
                                        <SelectItem value="en">English</SelectItem>
                                        <SelectItem value="de">Deutsch</SelectItem>
                                        <SelectItem value="fr">Français</SelectItem>
                                        <SelectItem value="es">Español</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{copy.priority}</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={5}
                                    value={form.priority}
                                    onChange={(event) => setForm((prev) => ({ ...prev, priority: Number(event.target.value) }))}
                                />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <Label>{copy.tags}</Label>
                                <Input
                                    value={form.tags}
                                    onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
                                    placeholder={isTr ? "randevu, fiyat" : "booking, pricing"}
                                />
                            </div>
                        </div>
                    </div>
                    
                    <DialogFooter className="px-8 py-6 shrink-0 border-t bg-muted/20">
                        {editingId ? (
                            <Button variant="outline" className="w-full sm:w-auto" onClick={resetForm}>
                                <RotateCcw className="mr-2 h-4 w-4" />
                                {copy.cancel}
                            </Button>
                        ) : null}
                        <Button className="w-full sm:w-auto" onClick={handleSave} disabled={isSaving || !canSave}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {copy.save}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isEvaluateModalOpen} onOpenChange={setIsEvaluateModalOpen}>
                <DialogContent className="max-w-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
                    <DialogHeader className="px-8 pt-8 pb-4 shrink-0 border-b">
                        <DialogTitle>{copy.test}</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
                        <div className="flex gap-2">
                            <Input
                                value={evaluationQuestion}
                                onChange={(event) => setEvaluationQuestion(event.target.value)}
                                placeholder={copy.testQuestion}
                            />
                            <Button onClick={handleEvaluate} disabled={isEvaluating || !evaluationQuestion.trim()}>
                                {isEvaluating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                            </Button>
                        </div>
                        {evaluationMatches.length > 0 ? (
                            <div className="space-y-3">
                                <div className="text-sm font-medium text-muted-foreground mb-2">
                                    {isTr ? "Bulunan eşleşmeler:" : "Found matches:"}
                                </div>
                                {evaluationMatches.map((match) => (
                                    <div key={match.id} className="rounded-lg border p-4 text-sm bg-card shadow-sm flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Badge variant={match.type === "correction" ? "destructive" : match.type === "rule" ? "default" : "secondary"}>
                                                    {match.type}
                                                </Badge>
                                                {match.priority && (
                                                    <span className="text-xs text-muted-foreground">Öncelik: {match.priority}</span>
                                                )}
                                            </div>
                                            <Badge variant="outline" className="text-xs font-mono">
                                                Skor: {match.score.toFixed(2)}
                                            </Badge>
                                        </div>
                                        
                                        {match.question && (
                                            <div>
                                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Soru / Durum:</span>
                                                <div className="font-medium text-foreground mt-1">{match.question}</div>
                                            </div>
                                        )}
                                        
                                        {(match.answer || match.wrongAnswer || match.rule) && (
                                            <div className="bg-muted/40 p-3 rounded-md border">
                                                {match.rule ? (
                                                    <div>
                                                        <span className="text-xs font-semibold text-blue-600/80 uppercase tracking-wider mb-1 block">Davranış Kuralı:</span>
                                                        <div className="text-foreground">{match.rule}</div>
                                                    </div>
                                                ) : match.type === "correction" ? (
                                                    <div className="flex flex-col gap-2">
                                                        {match.wrongAnswer && (
                                                            <div>
                                                                <span className="text-xs font-semibold text-red-600/80 uppercase tracking-wider mb-1 block">Kaçınılacak Yanıt:</span>
                                                                <div className="text-foreground line-through opacity-70">{match.wrongAnswer}</div>
                                                            </div>
                                                        )}
                                                        {match.answer && (
                                                            <div>
                                                                <span className="text-xs font-semibold text-green-600/80 uppercase tracking-wider mb-1 block">Doğru Yanıt:</span>
                                                                <div className="text-foreground">{match.answer}</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <span className="text-xs font-semibold text-green-600/80 uppercase tracking-wider mb-1 block">Önerilen Yanıt:</span>
                                                        <div className="text-foreground">{match.answer}</div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                </DialogContent>
            </Dialog>

            <div className="min-w-0 space-y-6">
                    <Card className="min-w-0">
                        <CardHeader>
                            <CardTitle>{copy.askedQuestions}</CardTitle>
                            <p className="text-sm text-muted-foreground">{copy.askedQuestionsHint}</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={questionSearch}
                                    onChange={(event) => setQuestionSearch(event.target.value)}
                                    placeholder={copy.questionSearch}
                                    className="pl-9"
                                />
                            </div>

                            {isLoadingQuestions ? (
                                <div className="flex items-center justify-center p-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : filteredAskedQuestions.length === 0 ? (
                                <div className="py-8 text-center text-sm text-muted-foreground">{copy.noAskedQuestions}</div>
                            ) : (
                                <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                                    {filteredAskedQuestions.map((item) => (
                                        <div key={item.id} className="rounded-lg border p-3">
                                            <div className="flex items-start gap-2">
                                                <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                                <div className="min-w-0 flex-1">
                                                    <div className="line-clamp-2 break-words text-sm font-medium">{item.question}</div>
                                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                        <span>{item.count} {copy.askedCount}</span>
                                                        <span>{formatDate(item.lastAskedAt)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {item.lastAssistantAnswer ? (
                                                <div className="mt-2 line-clamp-2 break-words rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                                                    {item.lastAssistantAnswer}
                                                </div>
                                            ) : null}
                                            <div className="mt-3 flex flex-wrap justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => fillFromAskedQuestion(item, "qa")}>
                                                    <Plus className="mr-2 h-3.5 w-3.5" />
                                                    {copy.addQuestion}
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => fillFromAskedQuestion(item, "correction")}
                                                    disabled={!item.lastAssistantAnswer}
                                                >
                                                    <RotateCcw className="mr-2 h-3.5 w-3.5" />
                                                    {copy.correctAnswer}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="min-w-0">
                        <CardHeader>
                            <CardTitle>{copy.existing}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex items-center justify-center p-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : entries.length === 0 ? (
                                <div className="py-10 text-center text-sm text-muted-foreground">{copy.noRecords}</div>
                            ) : (
                                <div className="overflow-hidden rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{copy.type}</TableHead>
                                                <TableHead>{copy.question}</TableHead>
                                                <TableHead>{copy.status}</TableHead>
                                                <TableHead>{copy.priority}</TableHead>
                                                <TableHead className="text-right">{isTr ? "Tarih" : "Date"}</TableHead>
                                                <TableHead className="w-24" />
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {entries.map((entry) => (
                                                <TableRow key={entry.id}>
                                                    <TableCell><Badge variant="outline">{entry.type}</Badge></TableCell>
                                                    <TableCell className="max-w-[360px]">
                                                        <div className="truncate font-medium">{entry.type === "rule" ? entry.rule : entry.question}</div>
                                                        <div className="truncate text-xs text-muted-foreground">{entry.answer || entry.wrongAnswer}</div>
                                                    </TableCell>
                                                    <TableCell>{entry.status}</TableCell>
                                                    <TableCell>{entry.priority}</TableCell>
                                                    <TableCell className="text-right text-xs text-muted-foreground">{formatDate(entry.updatedAt || entry.createdAt)}</TableCell>
                                                    <TableCell>
                                                        <div className="flex justify-end gap-1">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                                                setEditingId(entry.id)
                                                                setForm(toForm(entry))
                                                                setIsFormOpen(true)
                                                            }}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDelete(entry.id)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
            </div>
        </div>
    )
}
