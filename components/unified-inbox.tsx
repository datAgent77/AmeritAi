"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { format, isValid } from "date-fns"
import { useRouter, useSearchParams } from "next/navigation"
import { Bot, CalendarDays, EyeOff, Info, Instagram, Loader2, MessageCircle, MessageSquare, Monitor, PhoneCall, RefreshCw, Search, Send, Star, User } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { AssistantTrainingCorrectionDialog } from "@/components/knowledge/assistant-training-correction-dialog"

function formatVionDateTime(value: Date, language: string, options?: Intl.DateTimeFormatOptions) {
    return new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-US", options).format(value)
}

// Control tokens the AI emits to trigger widget UI (forms, handoff). In the live
// widget these render an actual form; in the transcript we hide the raw token and
// show a small badge instead.
const TRANSCRIPT_CONTROL_TOKENS: Record<string, { tr: string; en: string; es: string }> = {
    "[SHOW_LEAD_FORM]": { tr: "📋 Lead formu gösterildi", en: "📋 Lead form shown", es: "📋 Formulario de contacto mostrado" },
    "[SHOW_BOOKING_FORM]": { tr: "📅 Randevu formu gösterildi", en: "📅 Booking form shown", es: "📅 Formulario de reserva mostrado" },
    "[SHOW_HANDOFF_FORM]": { tr: "🙋 Temsilciye aktarım formu gösterildi", en: "🙋 Handoff form shown", es: "🙋 Formulario de transferencia mostrado" },
    "[CALL_STAFF]": { tr: "🔔 Personel çağrıldı", en: "🔔 Staff called", es: "🔔 Personal notificado" },
}

function renderTranscriptContent(content: string, language: string) {
    if (typeof content !== "string") return { text: content as any, badges: [] as string[] }
    let text = content
    const badges: string[] = []
    for (const [token, labels] of Object.entries(TRANSCRIPT_CONTROL_TOKENS)) {
        if (text.includes(token)) {
            text = text.split(token).join("").trim()
            badges.push(language === "tr" ? labels.tr : language === "es" ? labels.es : labels.en)
        }
    }
    return { text, badges }
}

function getVionChannelLabel(language: string, channel: string) {
    const labels = {
        tr: {
            all: "Tüm kanallar",
            web: "Web",
            telegram: "Telegram",
            whatsapp: "WhatsApp",
            instagram: "Instagram",
            messenger: "Messenger",
            voice: "Ses",
        },
        en: {
            all: "All channels",
            web: "Web",
            telegram: "Telegram",
            whatsapp: "WhatsApp",
            instagram: "Instagram",
            messenger: "Messenger",
            voice: "Voice",
        },
    }
    const copy = language === "tr" ? labels.tr : labels.en
    return copy[channel as keyof typeof copy] || channel
}

function VionStateShell({ title, description }: { title: string; description?: string }) {
    return (
        <div className="flex h-full min-h-[320px] items-center justify-center rounded-lg border border-border/70 bg-card/95 p-8 text-center">
            <div className="max-w-sm space-y-2">
                <div className="text-sm font-semibold text-foreground">{title}</div>
                {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
            </div>
        </div>
    )
}

interface ChatSession {
    id: string
    chatbotId: string
    createdAt: any
    messages: any[]
    lastMessage?: string
    lastMessageTime?: any
    isPaused?: boolean
    isFavorite?: boolean
    isHidden?: boolean
    channel?: string
    visitorEmail?: string | null
    visitorName?: string | null
    contactKey?: string | null
    canonicalContactId?: string | null
    channelMeta?: Record<string, any> | null
    transcriptSummary?: string | null
    lastDisposition?: string | null
    assistantProfileId?: string | null
}

interface UnifiedInboxProps {
    userId: string
    showOmniFeatures?: boolean
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

function toIsoOrNull(value: any): string | null {
    const ms = toMillis(value)
    if (!ms) return null
    return new Date(ms).toISOString()
}

function normalizeSessionMessage(message: any) {
    return {
        ...message,
        createdAt: toIsoOrNull(message?.createdAt) || message?.createdAt || null,
    }
}

function normalizeSessionRecord(id: string, data: Record<string, any>): ChatSession {
    const rawMessages = Array.isArray(data.messages) ? data.messages : []
    const messages = rawMessages.map(normalizeSessionMessage)
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null
    const createdAtIso = toIsoOrNull(data.createdAt) || data.createdAt || null
    const lastMessageTimeIso = toIsoOrNull(lastMessage?.createdAt) || createdAtIso

    return {
        id,
        chatbotId: data.chatbotId,
        createdAt: createdAtIso,
        messages,
        lastMessage: lastMessage?.content || "",
        lastMessageTime: lastMessageTimeIso,
        isPaused: data.isPaused || false,
        isFavorite: data.isFavorite === true,
        isHidden: data.isHidden === true,
        visitorEmail: data.visitorEmail || null,
        visitorName: data.visitorName || null,
        channel: data.channel || "web",
        contactKey: data.contactKey || null,
        canonicalContactId: data.canonicalContactId || null,
        channelMeta: data.channelMeta || null,
        transcriptSummary: data.transcriptSummary || null,
        lastDisposition: data.lastDisposition || null,
        assistantProfileId: data.assistantProfileId || null,
    }
}

function formatPhoneLike(value?: string | null) {
    if (!value) return null
    return value.startsWith("+") ? value : `+${value}`
}

function fallbackSessionKey(sessionId: string) {
    const parts = sessionId.split("-")
    if (parts.length <= 1) return sessionId
    return parts.slice(2).join("-") || parts.slice(1).join("-")
}

export function UnifiedInbox({ userId, showOmniFeatures = true }: UnifiedInboxProps) {
    const { language, t } = useLanguage()
    const { user, hasOmniPermission } = useAuth()
    const { toast } = useToast()
    const router = useRouter()
    const searchParams = useSearchParams()
    const urlSessionId = searchParams?.get("sessionId")
    const [sessions, setSessions] = useState<ChatSession[]>([])
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [replyText, setReplyText] = useState("")
    const [isSending, setIsSending] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [channelFilter, setChannelFilter] = useState<string>("all")
    const [visibilityFilter, setVisibilityFilter] = useState<"visible" | "favorites" | "hidden" | "all">("visible")
    const [isTogglingPause, setIsTogglingPause] = useState(false)
    const [isUpdatingSessionFlags, setIsUpdatingSessionFlags] = useState(false)
    const [isCreatingCallback, setIsCreatingCallback] = useState(false)
    const [isCreatingLead, setIsCreatingLead] = useState(false)
    const [isSessionDetailsOpen, setIsSessionDetailsOpen] = useState(false)
    const [trainingDraft, setTrainingDraft] = useState<{
        question: string
        wrongAnswer: string
        sourceSessionId?: string
        sourceMessageId?: string
    } | null>(null)

    const scrollRef = useRef<HTMLDivElement>(null)

    const getAuthHeaders = async (withContentType: boolean = false): Promise<Record<string, string>> => {
        if (!user) {
            throw new Error("Unauthorized")
        }

        const token = await user.getIdToken()
        const headers: Record<string, string> = {
            Authorization: `Bearer ${token}`,
        }
        if (withContentType) {
            headers["Content-Type"] = "application/json"
        }
        return headers
    }

    const getPreviousUserQuestion = (messages: any[], index: number) => {
        for (let i = index - 1; i >= 0; i--) {
            if (messages[i]?.role === "user" && typeof messages[i]?.content === "string") {
                return messages[i].content
            }
        }
        return ""
    }

    const formatDateSafe = (dateVal: any, formatStr: string) => {
        if (!dateVal) return ""
        try {
            const date = new Date(dateVal)
            if (!isValid(date)) return ""
            if (formatStr === "PP p" || formatStr === "HH:mm") {
                return formatVionDateTime(
                    date,
                    language,
                    formatStr === "HH:mm"
                        ? { hour: "2-digit", minute: "2-digit" }
                        : { dateStyle: "medium", timeStyle: "short" }
                )
            }
            return format(date, formatStr)
        } catch {
            return ""
        }
    }

    const resolveSessionChannel = (session: ChatSession) => {
        if (session.channel === "voice" || session.channel === "instagram" || session.channel === "messenger" || session.channel === "whatsapp") {
            return session.channel
        }
        if (session.id.startsWith("telegram-")) return "telegram"
        if (session.id.startsWith("whatsapp-")) return "whatsapp"
        if (session.id.startsWith("instagram-")) return "instagram"
        if (session.id.startsWith("messenger-")) return "messenger"
        if (session.id.startsWith("voice-")) return "voice"
        return "web"
    }

    const getChannelIcon = (session: ChatSession) => {
        const channel = resolveSessionChannel(session)
        if (channel === "telegram") return <Send className="h-4 w-4 text-sky-500" />
        if (channel === "whatsapp") return <MessageCircle className="h-4 w-4 text-green-500" />
        if (channel === "instagram") return <Instagram className="h-4 w-4 text-pink-500" />
        if (channel === "messenger") return <MessageSquare className="h-4 w-4 text-blue-500" />
        if (channel === "voice") return <PhoneCall className="h-4 w-4 text-violet-500" />
        return <Monitor className="h-4 w-4 text-gray-500" />
    }

    const getChannelName = (session: ChatSession) => {
        return getVionChannelLabel(language, resolveSessionChannel(session))
    }

    const getSessionDisplayName = useCallback((session: ChatSession) => {
        const channel = resolveSessionChannel(session)
        if (channel === "telegram") return session.visitorName || t("omni.inbox.user.telegram")
        if (channel === "whatsapp") return session.visitorName || formatPhoneLike(session.contactKey) || formatPhoneLike(fallbackSessionKey(session.id)) || t("omni.inbox.user.whatsapp")
        if (channel === "instagram") return session.visitorName || session.channelMeta?.instagramHandle || session.contactKey || t("omni.inbox.user.instagram")
        if (channel === "messenger") return session.visitorName || session.channelMeta?.pageName || session.contactKey || "Messenger User"
        if (channel === "voice") return session.visitorName || formatPhoneLike(session.contactKey) || t("omni.inbox.user.voice")
        return session.visitorName || session.visitorEmail || t("omni.inbox.user.web")
    }, [t])

    const isLiveConversation = (session: ChatSession) => {
        const lastMessage = Array.isArray(session.messages) && session.messages.length > 0
            ? session.messages[session.messages.length - 1]
            : null
        const lastRole = typeof lastMessage?.role === "string" ? lastMessage.role : ""
        const lastActivityMs = toMillis(session.lastMessageTime || session.createdAt)
        const isRecent = lastActivityMs > 0 && (Date.now() - lastActivityMs) <= (3 * 60 * 1000)
        return isRecent && (lastRole === "user" || lastRole === "agent")
    }

    const fetchSessions = useCallback(async (background: boolean = false) => {
        if (!userId || !user) return

        if (background) {
            setIsRefreshing(true)
        } else {
            setIsLoading(true)
        }

        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/chat-sessions?chatbotId=${userId}&limit=80`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            if (!response.ok) {
                throw new Error("Failed to fetch sessions")
            }
            const data = await response.json()
            setSessions(data.sessions || [])
        } catch (error) {
            console.error("Error fetching sessions:", error)
            toast({
                title: t("omni.inbox.toast.loadFailed.title"),
                description: t("omni.inbox.toast.loadFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
            setIsRefreshing(false)
        }
    }, [t, toast, user, userId])

    useEffect(() => {
        if (!userId || !user) return

        setIsLoading(true)
        const sessionsQuery = query(
            collection(db, "chat_sessions"),
            where("chatbotId", "==", userId)
        )

        const unsubscribe = onSnapshot(
            sessionsQuery,
            (snapshot) => {
                const realtimeSessions = snapshot.docs
                    .map((doc) => normalizeSessionRecord(doc.id, doc.data() as Record<string, any>))
                    .sort((a, b) => toMillis(b.lastMessageTime) - toMillis(a.lastMessageTime))

                setSessions(realtimeSessions)
                setIsLoading(false)
                setIsRefreshing(false)
            },
            async (error) => {
                console.error("Realtime chat session listener failed:", error)
                await fetchSessions(false)
            }
        )

        return () => unsubscribe()
    }, [fetchSessions, userId, user])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [selectedSessionId, sessions])

    const selectedSession = sessions.find((session) => session.id === selectedSessionId)
    const selectedChannel = selectedSession ? resolveSessionChannel(selectedSession) : null
    const canReply = selectedChannel !== "voice"
    const canManualReply = canReply && Boolean(selectedSession?.isPaused)
    const canOpenOmniOperations = showOmniFeatures && hasOmniPermission("operations.view")

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!replyText.trim() || !selectedSessionId || !user || !canManualReply) return

        setIsSending(true)
        try {
            const response = await fetch("/api/admin/send-message", {
                method: "POST",
                headers: await getAuthHeaders(true),
                body: JSON.stringify({
                    sessionId: selectedSessionId,
                    chatbotId: userId,
                    content: replyText,
                }),
            })

            if (!response.ok) {
                const data = await response.json().catch(() => null)
                throw new Error(data?.error || "Failed to send message")
            }

            setReplyText("")
        } catch (error) {
            console.error("Error sending message:", error)
            toast({
                title: t("omni.inbox.toast.replyFailed.title"),
                description: error instanceof Error ? error.message : t("omni.inbox.toast.replyFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsSending(false)
        }
    }

    const handleTogglePause = async () => {
        if (!selectedSessionId || !selectedSession || !user) return

        setIsTogglingPause(true)
        const newStatus = !selectedSession.isPaused

        try {
            const response = await fetch("/api/admin/toggle-pause", {
                method: "POST",
                headers: await getAuthHeaders(true),
                body: JSON.stringify({
                    sessionId: selectedSessionId,
                    chatbotId: userId,
                    isPaused: newStatus,
                }),
            })

            if (!response.ok) {
                throw new Error("Failed to toggle pause")
            }

            setSessions((prevSessions) =>
                prevSessions.map((session) =>
                    session.id === selectedSessionId
                        ? { ...session, isPaused: newStatus }
                        : session
                )
            )
        } catch (error) {
            console.error("Error toggling pause:", error)
            toast({
                title: t("omni.inbox.toast.pauseFailed.title"),
                description: t("omni.inbox.toast.pauseFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsTogglingPause(false)
        }
    }

    const updateSessionFlag = async (
        sessionId: string,
        flag: "isFavorite" | "isHidden",
        value: boolean
    ) => {
        if (!user) return
        const endpoint = flag === "isFavorite" ? "/api/admin/set-favorite" : "/api/admin/set-hidden"
        const requestKey = flag === "isFavorite" ? "isFavorite" : "isHidden"
        setIsUpdatingSessionFlags(true)
        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: await getAuthHeaders(true),
                body: JSON.stringify({
                    sessionId,
                    chatbotId: userId,
                    [requestKey]: value,
                }),
            })
            if (!response.ok) {
                throw new Error("Failed to update session")
            }
            setSessions((prevSessions) =>
                prevSessions.map((session) =>
                    session.id === sessionId
                        ? { ...session, [flag]: value }
                        : session
                )
            )
        } catch (error) {
            console.error("Error updating session flag:", error)
            toast({
                title: language === "tr" ? "Sohbet güncellenemedi" : "Failed to update chat",
                description: language === "tr" ? "Lütfen tekrar deneyin." : "Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsUpdatingSessionFlags(false)
        }
    }

    const handleCreateCallback = async () => {
        if (!selectedSession || !user) return

        setIsCreatingCallback(true)
        try {
            const response = await fetch("/api/omni/callbacks", {
                method: "POST",
                headers: await getAuthHeaders(true),
                body: JSON.stringify({
                    chatbotId: userId,
                    contactKey: selectedSession.contactKey || null,
                    canonicalContactId: selectedSession.canonicalContactId || null,
                    displayName: getSessionDisplayName(selectedSession),
                    sourceSessionId: selectedSession.id,
                    sourceChannel: resolveSessionChannel(selectedSession),
                    notes: selectedSession.transcriptSummary || selectedSession.lastMessage || null,
                }),
            })

            if (!response.ok) {
                throw new Error("Failed to create callback")
            }

            const data = await response.json().catch(() => null)

            toast({
                title: t("omni.inbox.toast.callbackCreated.title"),
                description: t("omni.inbox.toast.callbackCreated.description"),
            })
            if (data?.request?.id) {
                router.push(`/omni/operations/callback-queue?callbackId=${encodeURIComponent(data.request.id)}`)
            }
        } catch (error) {
            console.error("Error creating callback:", error)
            toast({
                title: t("omni.inbox.toast.callbackFailed.title"),
                description: t("omni.inbox.toast.callbackFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsCreatingCallback(false)
        }
    }

    const handleOpenContact = () => {
        if (!selectedSession) return

        const contactKey = selectedSession.contactKey || selectedSession.visitorEmail || ""
        const phone = formatPhoneLike(selectedSession.contactKey || "")
        const params = new URLSearchParams()
        if (selectedSession.canonicalContactId) {
            params.set("contactId", selectedSession.canonicalContactId)
        }
        if (contactKey) {
            params.set("contactKey", contactKey)
        }
        if (phone) {
            params.set("phone", phone)
        }
        router.push(`/omni/operations/contacts?${params.toString()}`)
    }

    const buildSessionActionSeed = (session: ChatSession) => {
        const channel = resolveSessionChannel(session)
        const contactKey = session.contactKey || session.visitorEmail || ""
        const normalizedPhone =
            channel === "voice" || channel === "whatsapp"
                ? formatPhoneLike(session.contactKey || fallbackSessionKey(session.id))
                : null
        const email = session.visitorEmail || (contactKey.includes("@") ? contactKey : "")

        return {
            channel,
            contactKey,
            phone: normalizedPhone || "",
            email,
            name: session.visitorName || "",
            canonicalContactId: session.canonicalContactId || "",
        }
    }

    const handleCreateLead = async () => {
        if (!selectedSession || !user) return

        setIsCreatingLead(true)
        try {
            const seed = buildSessionActionSeed(selectedSession)
            const response = await fetch("/api/omni/actions/execute", {
                method: "POST",
                headers: await getAuthHeaders(true),
                body: JSON.stringify({
                    chatbotId: userId,
                    actionId: "create_lead",
                    sourceChannel: seed.channel,
                    sourceSessionId: selectedSession.id,
                    contactKey: seed.contactKey || seed.phone || seed.email || null,
                    canonicalContactId: seed.canonicalContactId || null,
                    payload: {
                        name: seed.name || "Anonymous",
                        email: seed.email || "",
                        phone: seed.phone || "",
                        source: `Inbox ${getChannelName(selectedSession)}`,
                    },
                }),
            })

            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.error || "Failed to create lead")
            }

            toast({
                title: t("omni.inbox.toast.leadCreated.title"),
                description: t("omni.inbox.toast.leadCreated.description"),
            })

            const params = new URLSearchParams()
            if (data?.result?.record?.id) {
                params.set("leadId", data.result.record.id)
            }
            if (seed.contactKey) {
                params.set("contactKey", seed.contactKey)
            }
            router.push(`/omni/operations/leads?${params.toString()}`)
        } catch (error) {
            console.error("Error creating lead:", error)
            toast({
                title: t("omni.inbox.toast.leadFailed.title"),
                description: error instanceof Error ? error.message : t("omni.inbox.toast.leadFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsCreatingLead(false)
        }
    }

    const handleOpenAppointment = () => {
        if (!selectedSession) return

        const seed = buildSessionActionSeed(selectedSession)
        const params = new URLSearchParams()
        params.set("sessionId", selectedSession.id)
        if (selectedSession.canonicalContactId) params.set("contactId", selectedSession.canonicalContactId)
        if (seed.contactKey) params.set("contactKey", seed.contactKey)
        if (seed.name) params.set("name", seed.name)
        if (seed.email) params.set("email", seed.email)
        if (seed.phone) params.set("phone", seed.phone)

        router.push(`/omni/operations/appointments?${params.toString()}`)
    }

    const filteredSessions = useMemo(() => {
        return sessions.filter((session) => {
            const channel = resolveSessionChannel(session)
            const matchesChannel = channelFilter === "all" ? true : channel === channelFilter
            const matchesVisibility =
                visibilityFilter === "all"
                    ? true
                    : visibilityFilter === "favorites"
                        ? session.isFavorite === true
                        : visibilityFilter === "hidden"
                            ? session.isHidden === true
                            : session.isHidden !== true
            const haystack = [
                session.id,
                session.lastMessage,
                session.contactKey,
                session.visitorName,
                getSessionDisplayName(session),
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()

            const matchesSearch = haystack.includes(searchTerm.toLowerCase())
            return matchesChannel && matchesVisibility && matchesSearch
        })
    }, [sessions, channelFilter, visibilityFilter, searchTerm, getSessionDisplayName])

    useEffect(() => {
        if (filteredSessions.length === 0) {
            setSelectedSessionId(null)
            return
        }

        if (urlSessionId && filteredSessions.some((session) => session.id === urlSessionId)) {
            if (selectedSessionId !== urlSessionId) {
                setSelectedSessionId(urlSessionId)
            }
            return
        }

        if (!selectedSessionId || !filteredSessions.some((session) => session.id === selectedSessionId)) {
            setSelectedSessionId(filteredSessions[0].id)
        }
    }, [filteredSessions, selectedSessionId, urlSessionId])

    const handleSessionSelect = (id: string) => {
        setSelectedSessionId(id)
        const currentUrl = new URL(window.location.href)
        currentUrl.searchParams.set("sessionId", id)
        window.history.replaceState({}, "", currentUrl.toString())
    }

    if (isLoading) {
        return (
            <VionStateShell
                title={language === "tr" ? "Yükleniyor" : "Loading"}
                description={language === "tr" ? "Sohbetler hazırlanıyor." : "Preparing conversations."}
            />
        )
    }

    const selectedSessionMessageCount = selectedSession?.messages?.length ?? 0
    const selectedSessionLastActivity = selectedSession?.lastMessageTime || selectedSession?.createdAt || null

    const sessionMetaSummary = selectedSession?.channelMeta
        ? Object.values(selectedSession.channelMeta).filter(Boolean).join(" • ")
        : t("omni.common.notAvailable")

    return (
        <>
        <div className="grid h-full min-h-0 gap-5 overflow-hidden xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[380px_minmax(0,1fr)]">
            <div className="relative z-10 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-border/70 bg-card/95 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
                <div className="space-y-3 border-b border-border/70 bg-white/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                            <div className="text-sm font-semibold text-foreground">{t("omni.inbox.sidebar.sessions")}</div>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                {filteredSessions.length} {language === "tr" ? "oturum" : "sessions"} • {channelFilter === "all" ? getVionChannelLabel(language, "all") : getVionChannelLabel(language, channelFilter)}
                            </div>
                        </div>
                        <Badge variant="outline" className="h-6 rounded-full bg-white/80 px-2.5 text-[11px]">
                            {filteredSessions.length}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative min-w-0 flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder={t("searchChats")}
                                className="h-9 rounded-md bg-white pl-9 text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-md bg-white/80"
                            onClick={() => fetchSessions(true)}
                            disabled={isRefreshing}
                            aria-label={t("omni.dashboard.refresh")}
                            type="button"
                        >
                            {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        </Button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {showOmniFeatures ? (
                            <select
                                aria-label={t("omni.inbox.filter.allChannels")}
                                className="flex h-9 min-w-0 rounded-md border border-input bg-white px-3 py-2 text-sm"
                                value={channelFilter}
                                onChange={(e) => setChannelFilter(e.target.value)}
                            >
                                <option value="all">{t("omni.inbox.filter.allChannels")}</option>
                                <option value="web">{getVionChannelLabel(language, "web")}</option>
                                <option value="telegram">{getVionChannelLabel(language, "telegram")}</option>
                                <option value="whatsapp">{getVionChannelLabel(language, "whatsapp")}</option>
                                <option value="instagram">{getVionChannelLabel(language, "instagram")}</option>
                                <option value="voice">{getVionChannelLabel(language, "voice")}</option>
                            </select>
                        ) : (
                            <div className="flex h-9 min-w-0 items-center rounded-md border border-input bg-white px-3 py-2 text-sm text-muted-foreground">
                                {t("omni.inbox.filter.allChannels")}
                            </div>
                        )}
                        <select
                            aria-label={language === "tr" ? "Gorunum filtresi" : "Visibility filter"}
                            className="flex h-9 min-w-0 rounded-md border border-input bg-white px-3 py-2 text-sm"
                            value={visibilityFilter}
                            onChange={(e) => setVisibilityFilter(e.target.value as "visible" | "favorites" | "hidden" | "all")}
                        >
                            <option value="visible">{language === "tr" ? "Gorunen" : "Visible"}</option>
                            <option value="favorites">{language === "tr" ? "Favoriler" : "Favorites"}</option>
                            <option value="hidden">{language === "tr" ? "Gizlenenler" : "Hidden"}</option>
                            <option value="all">{language === "tr" ? "Tum Sohbetler" : "All Chats"}</option>
                        </select>
                    </div>
                </div>
                <ScrollArea className="min-h-0 flex-1 overflow-x-hidden">
                    <div className="space-y-2 p-2.5 pr-4">
                        {filteredSessions.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
                                {t("noConversationsFound")}
                            </div>
                        ) : (
                            filteredSessions.map((session) => {
                                const isSelected = selectedSessionId === session.id
                                const isLive = isLiveConversation(session)
                                return (
                                    <button
                                        key={session.id}
                                        type="button"
                                        aria-pressed={isSelected}
                                        onClick={() => handleSessionSelect(session.id)}
                                        className={cn(
                                            "flex w-full min-w-0 items-start gap-3 overflow-hidden rounded-md border border-transparent px-3 py-2.5 text-left transition-all",
                                            isSelected
                                                ? "border-primary/25 bg-primary/5 shadow-sm"
                                                : "border-border/60 bg-white/80 hover:border-border hover:bg-muted/30"
                                        )}
                                    >
                                        <div className="relative h-9 w-9 flex-shrink-0">
                                            <Avatar className="h-9 w-9 border bg-white">
                                                <AvatarFallback className="bg-gray-100 text-gray-500">
                                                    <User className="h-4 w-4" />
                                                </AvatarFallback>
                                            </Avatar>
                                            {isLive ? (
                                                <span
                                                    className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-sm"
                                                    aria-label={language === "tr" ? "Aktif konuşma" : "Active conversation"}
                                                    title={language === "tr" ? "Aktif konuşma" : "Active conversation"}
                                                />
                                            ) : null}
                                        </div>
                                        <div className="min-w-0 flex-1 overflow-hidden">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-semibold text-foreground">{getSessionDisplayName(session)}</div>
                                                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-white px-2 py-0.5">
                                                            {getChannelIcon(session)}
                                                            {getChannelName(session)}
                                                        </span>
                                                        {session.isPaused ? (
                                                            <Badge variant="secondary" className="h-5 rounded-full bg-amber-100 px-2 text-[10px] text-amber-700 hover:bg-amber-100">
                                                                {t("omni.inbox.badge.paused")}
                                                            </Badge>
                                                        ) : null}
                                                        {isLive ? (
                                                            <Badge variant="secondary" className="h-5 rounded-full bg-emerald-100 px-2 text-[10px] text-emerald-700 hover:bg-emerald-100">
                                                                <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                                {language === "tr" ? "Aktif" : "Active"}
                                                            </Badge>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-1">
                                                    <button
                                                        type="button"
                                                        className={cn(
                                                            "inline-flex h-6 w-6 items-center justify-center rounded-md border transition-colors",
                                                            session.isFavorite
                                                                ? "border-amber-200 bg-amber-50 text-amber-600"
                                                                : "border-border/70 bg-white text-muted-foreground hover:bg-muted/30"
                                                        )}
                                                        onClick={(event) => {
                                                            event.stopPropagation()
                                                            void updateSessionFlag(session.id, "isFavorite", !session.isFavorite)
                                                        }}
                                                        aria-label={session.isFavorite
                                                            ? (language === "tr" ? "Favoriden cikar" : "Remove from favorites")
                                                            : (language === "tr" ? "Favorilere ekle" : "Add to favorites")}
                                                        disabled={isUpdatingSessionFlags}
                                                    >
                                                        <Star className={cn("h-3.5 w-3.5", session.isFavorite ? "fill-current" : "")} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={cn(
                                                            "inline-flex h-6 w-6 items-center justify-center rounded-md border transition-colors",
                                                            session.isHidden
                                                                ? "border-slate-300 bg-slate-100 text-slate-600"
                                                                : "border-border/70 bg-white text-muted-foreground hover:bg-muted/30"
                                                        )}
                                                        onClick={(event) => {
                                                            event.stopPropagation()
                                                            void updateSessionFlag(session.id, "isHidden", !session.isHidden)
                                                        }}
                                                        aria-label={session.isHidden
                                                            ? (language === "tr" ? "Sohbeti goster" : "Show chat")
                                                            : (language === "tr" ? "Sohbeti gizle" : "Hide chat")}
                                                        disabled={isUpdatingSessionFlags}
                                                    >
                                                        <EyeOff className="h-3.5 w-3.5" />
                                                    </button>
                                                    <span className="whitespace-nowrap pl-1 pt-0.5 text-[10px] text-muted-foreground">{formatDateSafe(session.lastMessageTime, "HH:mm")}</span>
                                                </div>
                                            </div>
                                            <p className="mt-1.5 line-clamp-2 break-words text-[13px] leading-5 text-muted-foreground">{session.lastMessage || t("noMessages")}</p>
                                        </div>
                                    </button>
                                )
                            })
                        )}
                    </div>
                </ScrollArea>
            </div>

            <div className="relative z-0 min-h-0 min-w-0 overflow-hidden rounded-lg border border-border/70 bg-card/95 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
                {selectedSession ? (
                    <div className="flex h-full min-h-0 flex-col">
                        <div className="sticky top-0 z-10 space-y-3 border-b border-border/70 bg-white/95 p-4 backdrop-blur-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-3">
                                    <Avatar className="h-11 w-11 border bg-white">
                                        <AvatarFallback className="bg-primary/10 text-primary">{selectedSession.id.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="min-w-0 truncate text-base font-semibold text-foreground">{getSessionDisplayName(selectedSession)}</h3>
                                            {selectedSession.isFavorite ? (
                                                <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-50 text-amber-700">
                                                    <Star className="h-3.5 w-3.5 fill-current" />
                                                    {language === "tr" ? "Favori" : "Favorite"}
                                                </Badge>
                                            ) : null}
                                            {isLiveConversation(selectedSession) ? (
                                                <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700">
                                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"></span>
                                                    {language === "tr" ? "Canli Konusma" : "Live Conversation"}
                                                </Badge>
                                            ) : null}
                                            {selectedSession.isPaused ? (
                                                <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-50 text-amber-700">
                                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500"></span>
                                                    {t("aiPaused")}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                                    {t("aiActive")}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                            <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-white px-2.5 py-1">
                                                {getChannelIcon(selectedSession)}
                                                {getChannelName(selectedSession)}
                                            </span>
                                            <span className="inline-flex items-center rounded-full border border-border/70 bg-white px-2.5 py-1">
                                                {selectedSessionMessageCount} {t("omni.inbox.section.messages")}
                                            </span>
                                            <span className="inline-flex items-center rounded-full border border-border/70 bg-white px-2.5 py-1">
                                                {t("omni.inbox.section.lastUpdated")}: {selectedSessionLastActivity ? formatDateSafe(selectedSessionLastActivity, "PP p") : t("omni.common.notAvailable")}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <Button
                                        variant={selectedSession.isFavorite ? "default" : "outline"}
                                        size="sm"
                                        className={cn("rounded-lg", selectedSession.isFavorite ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-white/80")}
                                        onClick={() => updateSessionFlag(selectedSession.id, "isFavorite", !selectedSession.isFavorite)}
                                        disabled={isUpdatingSessionFlags}
                                    >
                                        <Star className={cn("mr-2 h-4 w-4", selectedSession.isFavorite ? "fill-current" : "")} />
                                        {selectedSession.isFavorite
                                            ? (language === "tr" ? "Favoriden Cikar" : "Unfavorite")
                                            : (language === "tr" ? "Favorile" : "Favorite")}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-lg bg-white/80"
                                        onClick={() => updateSessionFlag(selectedSession.id, "isHidden", !selectedSession.isHidden)}
                                        disabled={isUpdatingSessionFlags}
                                    >
                                        <EyeOff className="mr-2 h-4 w-4" />
                                        {selectedSession.isHidden
                                            ? (language === "tr" ? "Goster" : "Unhide")
                                            : (language === "tr" ? "Gizle" : "Hide")}
                                    </Button>
                                    <Button
                                        variant={selectedSession.isPaused ? "default" : "outline"}
                                        size="sm"
                                        className={cn("rounded-lg", selectedSession.isPaused ? "bg-green-600 hover:bg-green-700" : "bg-white/80")}
                                        onClick={handleTogglePause}
                                        disabled={isTogglingPause}
                                    >
                                        {isTogglingPause ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        {selectedSession.isPaused ? t("resumeAi") : t("pauseAi")}
                                    </Button>

                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex flex-wrap gap-2">
                                    {canOpenOmniOperations ? (
                                        <>
                                            <Button variant="outline" size="sm" className="rounded-lg bg-white/80" onClick={handleOpenContact} disabled={!selectedSession.contactKey && !selectedSession.visitorEmail}>
                                                {t("omni.inbox.action.openContact")}
                                            </Button>
                                            <Button variant="outline" size="sm" className="rounded-lg bg-white/80" onClick={handleOpenAppointment}>
                                                <CalendarDays className="mr-2 h-4 w-4" />
                                                {t("omni.inbox.action.createAppointment")}
                                            </Button>
                                            <Button variant="outline" size="sm" className="rounded-lg bg-white/80" onClick={handleCreateLead} disabled={isCreatingLead}>
                                                {isCreatingLead ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                {t("omni.inbox.action.createLead")}
                                            </Button>
                                            <Button variant="outline" size="sm" className="rounded-lg bg-white/80" onClick={handleCreateCallback} disabled={isCreatingCallback}>
                                                {isCreatingCallback ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                {t("omni.inbox.action.createCallback")}
                                            </Button>
                                        </>
                                    ) : null}
                                    {showOmniFeatures ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 rounded-full bg-white/80 px-3 text-xs"
                                            onClick={() => setIsSessionDetailsOpen(true)}
                                            type="button"
                                        >
                                            <Info className="mr-1.5 h-3.5 w-3.5" />
                                            {t("omni.pageInfo.button")}
                                        </Button>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 space-y-4 overflow-y-auto bg-muted/10 p-4" ref={scrollRef}>
                            {selectedSession.transcriptSummary ? (
                                <div className="rounded-lg border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-900">
                                    <span className="font-medium">{t("omni.inbox.transcriptSummary")}:</span> {selectedSession.transcriptSummary}
                                </div>
                            ) : null}
                            {selectedSession.messages?.map((msg: any, index: number) => (
                                <div key={index} className={`flex max-w-[88%] gap-3 ${msg.role === "assistant" || msg.role === "agent" ? "ml-auto flex-row-reverse" : ""}`}>
                                    <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border text-xs ${msg.role === "assistant" || msg.role === "agent" ? "border-primary bg-primary text-primary-foreground" : "border-border/60 bg-white text-gray-600"}`}>
                                        {msg.role === "assistant" || msg.role === "agent" ? "AI" : "U"}
                                    </div>
                                    <div className="space-y-1">
                                        <div className={`rounded-lg p-3 text-sm shadow-sm ${msg.role === "assistant" || msg.role === "agent" ? "rounded-tr-md bg-primary text-primary-foreground" : "rounded-tl-md border border-border/60 bg-white text-gray-800"}`}>
                                            {(() => {
                                                const { text, badges } = renderTranscriptContent(msg.content, language)
                                                return (
                                                    <>
                                                        {text ? <span className="whitespace-pre-wrap">{text}</span> : null}
                                                        {badges.length > 0 ? (
                                                            <div className={`flex flex-wrap gap-1 ${text ? "mt-2" : ""}`}>
                                                                {badges.map((b, i) => (
                                                                    <span key={i} className="inline-flex items-center rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-medium opacity-90">
                                                                        {b}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : null}
                                                    </>
                                                )
                                            })()}
                                            {msg.role === "assistant" ? (
                                                <div className="mt-2 flex justify-end">
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        size="sm"
                                                        className="h-7 gap-1 bg-white/90 px-2 text-xs text-gray-900 hover:bg-white"
                                                        onClick={() => setTrainingDraft({
                                                            question: getPreviousUserQuestion(selectedSession.messages || [], index),
                                                            wrongAnswer: msg.content || "",
                                                            sourceSessionId: selectedSession.id,
                                                            sourceMessageId: msg.id,
                                                        })}
                                                    >
                                                        <Bot className="h-3.5 w-3.5" />
                                                        {t("assistantTrainAnswer") || "Cevabı Eğit"}
                                                    </Button>
                                                </div>
                                            ) : null}
                                        </div>
                                        <div className={`text-[10px] text-muted-foreground ${msg.role === "assistant" || msg.role === "agent" ? "text-right" : "text-left"}`}>
                                            {formatDateSafe(msg.createdAt, "HH:mm")}
                                            {msg.isHuman ? <span className="ml-1 font-medium text-blue-600">({t("omni.inbox.admin")})</span> : null}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="sticky bottom-0 z-10 space-y-3 border-t border-border/70 bg-white/95 p-4 backdrop-blur-sm">
                            {canReply ? (
                                <div className="space-y-2">
                                    <form onSubmit={handleSendMessage} className="flex gap-2">
                                        <Input
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            placeholder={canManualReply ? t("typeReply") : t("omni.inbox.pauseToReply")}
                                            className="h-11 flex-1 rounded-lg bg-white"
                                            disabled={isSending || !canManualReply}
                                        />
                                        <Button
                                            type="submit"
                                            className="h-11 rounded-lg"
                                            disabled={isSending || !replyText.trim() || !canManualReply}
                                            aria-label={t("omni.inbox.action.sendReply")}
                                        >
                                            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                        </Button>
                                    </form>
                                    <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                                        {canManualReply ? (
                                            <>
                                                <span>{t("omni.inbox.replyHint").replace("{channel}", getChannelName(selectedSession))}</span>
                                                <span className="font-medium text-amber-600">({t("omni.inbox.aiPausedHint")})</span>
                                            </>
                                        ) : (
                                            <span>{t("omni.inbox.pauseToReplyHint")}</span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                                    {t("omni.inbox.voiceReplyDisabled.before")} <span className="font-medium text-foreground">{t("omni.inbox.action.createCallback")}</span> {t("omni.inbox.voiceReplyDisabled.after")}
                                </div>
                            )}

                        </div>
                    </div>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center p-8 text-muted-foreground">
                        <MessageSquare className="mb-4 h-12 w-12 opacity-20" />
                        <h3 className="mb-1 text-lg font-medium text-gray-900">{t("selectConversation")}</h3>
                        <p className="max-w-xs text-center text-sm">{t("selectConversationDescription")}</p>
                    </div>
                )}
            </div>
        </div>
        {selectedSession && showOmniFeatures ? (
            <Dialog open={isSessionDetailsOpen} onOpenChange={setIsSessionDetailsOpen}>
                <DialogContent className="max-w-3xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
                    <DialogHeader className="border-b border-border/70 bg-white/90 px-8 pt-8 pb-4 shrink-0 text-left">
                        <DialogTitle>{t("omni.inbox.section.sessionDetails")}</DialogTitle>
                        <DialogDescription>{t("omni.inbox.sessionDetailsDescription")}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3 px-8 py-6 flex-1 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("omni.inbox.meta.contact")}</p>
                            <p className="mt-1 break-words font-medium text-foreground">{selectedSession.contactKey || selectedSession.visitorEmail || t("omni.inbox.unknown")}</p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("omni.inbox.meta.disposition")}</p>
                            <p className="mt-1 break-words font-medium text-foreground">{selectedSession.lastDisposition || t("omni.inbox.active")}</p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("omni.inbox.meta.assistantProfile")}</p>
                            <p className="mt-1 break-words font-medium text-foreground">{selectedSession.assistantProfileId || t("omni.inbox.defaultProfile")}</p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("omni.common.sourceSession")}</p>
                            <p className="mt-1 break-all font-medium text-foreground">{selectedSession.id}</p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("omni.inbox.section.lastUpdated")}</p>
                            <p className="mt-1 break-words font-medium text-foreground">{selectedSessionLastActivity ? formatDateSafe(selectedSessionLastActivity, "PP p") : t("omni.common.notAvailable")}</p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("omni.inbox.meta.channelMeta")}</p>
                            <p className="mt-1 break-words font-medium text-foreground">{sessionMetaSummary}</p>
                        </div>
                        {selectedSession.transcriptSummary ? (
                            <div className="rounded-lg border border-violet-100 bg-violet-50 p-4 text-sm text-violet-950 sm:col-span-2 xl:col-span-3">
                                <p className="text-xs uppercase tracking-wide text-violet-700">{t("omni.inbox.transcriptSummary")}</p>
                                <p className="mt-1 leading-6">{selectedSession.transcriptSummary}</p>
                            </div>
                        ) : null}
                    </div>
                </DialogContent>
            </Dialog>
        ) : null}
        <AssistantTrainingCorrectionDialog
            open={!!trainingDraft}
            onOpenChange={(open) => !open && setTrainingDraft(null)}
            userId={userId}
            question={trainingDraft?.question || ""}
            wrongAnswer={trainingDraft?.wrongAnswer || ""}
            sourceSessionId={trainingDraft?.sourceSessionId}
            sourceMessageId={trainingDraft?.sourceMessageId}
        />
        </>
    )
}
