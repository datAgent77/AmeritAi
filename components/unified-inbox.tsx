"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { format, isValid } from "date-fns"
import { useRouter } from "next/navigation"
import { CalendarDays, Instagram, Loader2, MessageCircle, MessageSquare, Monitor, PhoneCall, RefreshCw, Search, Send, User } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { formatOmniDateTime, getOmniChannelLabel } from "@/lib/omni/i18n"
import { OmniStateShell } from "@/components/omni/omni-ui"
import { cn } from "@/lib/utils"

interface ChatSession {
    id: string
    chatbotId: string
    createdAt: any
    messages: any[]
    lastMessage?: string
    lastMessageTime?: any
    isPaused?: boolean
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

export function UnifiedInbox({ userId }: UnifiedInboxProps) {
    const { language, t } = useLanguage()
    const { user } = useAuth()
    const { toast } = useToast()
    const router = useRouter()
    const [sessions, setSessions] = useState<ChatSession[]>([])
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [replyText, setReplyText] = useState("")
    const [isSending, setIsSending] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [channelFilter, setChannelFilter] = useState<string>("all")
    const [isTogglingPause, setIsTogglingPause] = useState(false)
    const [isCreatingCallback, setIsCreatingCallback] = useState(false)
    const [isCreatingLead, setIsCreatingLead] = useState(false)

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

    const formatDateSafe = (dateVal: any, formatStr: string) => {
        if (!dateVal) return ""
        try {
            const date = new Date(dateVal)
            if (!isValid(date)) return ""
            if (formatStr === "PP p" || formatStr === "HH:mm") {
                return formatOmniDateTime(
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
        if (session.channel === "voice" || session.channel === "instagram" || session.channel === "whatsapp") {
            return session.channel
        }
        if (session.id.startsWith("telegram-")) return "telegram"
        if (session.id.startsWith("whatsapp-")) return "whatsapp"
        if (session.id.startsWith("instagram-")) return "instagram"
        if (session.id.startsWith("voice-")) return "voice"
        return "web"
    }

    const getChannelIcon = (session: ChatSession) => {
        const channel = resolveSessionChannel(session)
        if (channel === "telegram") return <Send className="h-4 w-4 text-sky-500" />
        if (channel === "whatsapp") return <MessageCircle className="h-4 w-4 text-green-500" />
        if (channel === "instagram") return <Instagram className="h-4 w-4 text-pink-500" />
        if (channel === "voice") return <PhoneCall className="h-4 w-4 text-violet-500" />
        return <Monitor className="h-4 w-4 text-gray-500" />
    }

    const getChannelName = (session: ChatSession) => {
        return getOmniChannelLabel(t, resolveSessionChannel(session))
    }

    const getSessionDisplayName = (session: ChatSession) => {
        const channel = resolveSessionChannel(session)
        if (channel === "telegram") return session.visitorName || t("omni.inbox.user.telegram")
        if (channel === "whatsapp") return session.visitorName || formatPhoneLike(session.contactKey) || formatPhoneLike(fallbackSessionKey(session.id)) || t("omni.inbox.user.whatsapp")
        if (channel === "instagram") return session.visitorName || session.channelMeta?.instagramHandle || session.contactKey || t("omni.inbox.user.instagram")
        if (channel === "voice") return session.visitorName || formatPhoneLike(session.contactKey) || t("omni.inbox.user.voice")
        return session.visitorName || session.visitorEmail || t("omni.inbox.user.web")
    }

    const fetchSessions = async (background: boolean = false) => {
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
    }

    useEffect(() => {
        fetchSessions(false)
        const interval = setInterval(() => {
            fetchSessions(true)
        }, 15000)

        return () => clearInterval(interval)
    }, [userId, user])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [selectedSessionId, sessions])

    const selectedSession = sessions.find((session) => session.id === selectedSessionId)
    const selectedChannel = selectedSession ? resolveSessionChannel(selectedSession) : null
    const canReply = selectedChannel !== "voice"
    const canManualReply = canReply && Boolean(selectedSession?.isPaused)

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
            await fetchSessions(true)
            toast({
                title: t("omni.inbox.toast.replySent.title"),
                description: t("omni.inbox.toast.replySent.description").replace("{channel}", getChannelName(selectedSession!)),
            })
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
            return matchesChannel && matchesSearch
        })
    }, [sessions, channelFilter, searchTerm])

    useEffect(() => {
        if (filteredSessions.length === 0) {
            setSelectedSessionId(null)
            return
        }

        if (!selectedSessionId || !filteredSessions.some((session) => session.id === selectedSessionId)) {
            setSelectedSessionId(filteredSessions[0].id)
        }
    }, [filteredSessions, selectedSessionId])

    if (isLoading) {
        return <OmniStateShell title={t("omni.common.loading")} description={t("omni.inbox.toast.loadFailed.description")} />
    }

    const pausedSessionCount = filteredSessions.filter((session) => session.isPaused).length
    const selectedSessionMessageCount = selectedSession?.messages?.length ?? 0
    const selectedSessionLastActivity = selectedSession?.lastMessageTime || selectedSession?.createdAt || null

    return (
        <div className="grid h-[calc(100vh-12rem)] gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border/70 bg-card/95 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
                <div className="space-y-4 border-b border-border/70 bg-white/80 p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                            <div className="text-sm font-semibold text-foreground">{t("omni.inbox.sidebar.sessions")}</div>
                            <div className="text-sm text-muted-foreground">
                                {filteredSessions.length} {language === "tr" ? "oturum" : "sessions"} • {channelFilter === "all" ? (language === "tr" ? "tüm kanallar" : "all channels") : getOmniChannelLabel(t, channelFilter)}
                            </div>
                        </div>
                        <Badge variant="outline" className="rounded-full bg-white/80">
                            {filteredSessions.length}
                        </Badge>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t("searchChats")}
                            className="rounded-lg bg-white pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            aria-label={t("omni.inbox.filter.allChannels")}
                            className="flex h-10 flex-1 rounded-lg border border-input bg-white px-3 py-2 text-sm"
                            value={channelFilter}
                            onChange={(e) => setChannelFilter(e.target.value)}
                        >
                            <option value="all">{t("omni.inbox.filter.allChannels")}</option>
                            <option value="web">{getOmniChannelLabel(t, "web")}</option>
                            <option value="telegram">{getOmniChannelLabel(t, "telegram")}</option>
                            <option value="whatsapp">{getOmniChannelLabel(t, "whatsapp")}</option>
                            <option value="instagram">{getOmniChannelLabel(t, "instagram")}</option>
                            <option value="voice">{getOmniChannelLabel(t, "voice")}</option>
                        </select>
                        <Button
                            variant="outline"
                            size="icon"
                            className="rounded-lg bg-white/80"
                            onClick={() => fetchSessions(true)}
                            disabled={isRefreshing}
                            aria-label={t("omni.dashboard.refresh")}
                            type="button"
                        >
                            {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("omni.inbox.sidebar.visible")}</div>
                            <div className="mt-1 text-sm font-semibold text-foreground">{filteredSessions.length}</div>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("omni.inbox.sidebar.paused")}</div>
                            <div className="mt-1 text-sm font-semibold text-foreground">{pausedSessionCount}</div>
                        </div>
                    </div>
                </div>
                <ScrollArea className="flex-1">
                    <div className="space-y-2 p-3">
                        {filteredSessions.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
                                {t("noConversationsFound")}
                            </div>
                        ) : (
                            filteredSessions.map((session) => {
                                const isSelected = selectedSessionId === session.id
                                return (
                                    <button
                                        key={session.id}
                                        type="button"
                                        aria-pressed={isSelected}
                                        onClick={() => setSelectedSessionId(session.id)}
                                        className={cn(
                                            "flex w-full min-w-0 items-start gap-3 rounded-lg border border-transparent px-3 py-3 text-left transition-all",
                                            isSelected
                                                ? "border-primary/25 bg-primary/5 shadow-sm"
                                                : "border-border/60 bg-white/80 hover:border-border hover:bg-muted/30"
                                        )}
                                    >
                                        <Avatar className="h-10 w-10 flex-shrink-0 border bg-white">
                                            <AvatarFallback className="bg-gray-100 text-gray-500">
                                                <User className="h-5 w-5" />
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1 overflow-hidden">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-semibold text-foreground">{getSessionDisplayName(session)}</div>
                                                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-white px-2 py-0.5">
                                                            {getChannelIcon(session)}
                                                            {getChannelName(session)}
                                                        </span>
                                                        {session.isPaused ? (
                                                            <Badge variant="secondary" className="h-5 rounded-full bg-amber-100 px-2 text-[10px] text-amber-700 hover:bg-amber-100">
                                                                {t("omni.inbox.badge.paused")}
                                                            </Badge>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                <span className="whitespace-nowrap text-[11px] text-muted-foreground">{formatDateSafe(session.lastMessageTime, "HH:mm")}</span>
                                            </div>
                                            <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">{session.lastMessage || t("noMessages")}</p>
                                        </div>
                                    </button>
                                )
                            })
                        )}
                    </div>
                </ScrollArea>
            </div>

            <div className="min-h-0 overflow-hidden rounded-lg border border-border/70 bg-card/95 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
                {selectedSession ? (
                    <div className="flex h-full min-h-0 flex-col">
                        <div className="space-y-4 border-b border-border/70 bg-white/80 p-5">
                            <div className="flex items-start gap-3">
                                <Avatar className="h-12 w-12 border bg-white">
                                    <AvatarFallback className="bg-primary/10 text-primary">{selectedSession.id.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1 space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="min-w-0 truncate text-base font-semibold text-foreground">{getSessionDisplayName(selectedSession)}</h3>
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

                            <div className="space-y-2">
                                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                    {t("omni.inbox.section.quickActions")}
                                </div>
                                <div className="flex flex-wrap gap-2">
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
                                            {msg.content}
                                        </div>
                                        <div className={`text-[10px] text-muted-foreground ${msg.role === "assistant" || msg.role === "agent" ? "text-right" : "text-left"}`}>
                                            {formatDateSafe(msg.createdAt, "HH:mm")}
                                            {msg.isHuman ? <span className="ml-1 font-medium text-blue-600">({t("omni.inbox.admin")})</span> : null}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-4 border-t border-border/70 bg-white/80 p-4">
                            {canReply ? (
                                <div className="space-y-2">
                                    <form onSubmit={handleSendMessage} className="flex gap-2">
                                        <Input
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            placeholder={selectedSession?.isPaused ? t("typeReply") : t("pauseAiToReply")}
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
                                        <span>{t("omni.inbox.replyHint").replace("{channel}", getChannelName(selectedSession))}</span>
                                        {selectedSession.isPaused
                                            ? <span className="font-medium text-amber-600">({t("omni.inbox.aiPausedHint")})</span>
                                            : <span className="font-medium text-sky-700">({t("aiActiveReplyLockedHint")})</span>}
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                                    {t("omni.inbox.voiceReplyDisabled.before")} <span className="font-medium text-foreground">{t("omni.inbox.action.createCallback")}</span> {t("omni.inbox.voiceReplyDisabled.after")}
                                </div>
                            )}

                            <div className="space-y-3">
                                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                    {t("omni.inbox.section.sessionDetails")}
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("omni.inbox.meta.channelMeta")}</p>
                                        <p className="mt-1 break-words font-medium text-foreground">{selectedSession.channelMeta ? Object.values(selectedSession.channelMeta).filter(Boolean).join(" • ") : t("omni.common.notAvailable")}</p>
                                    </div>
                                </div>
                            </div>
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
    )
}
