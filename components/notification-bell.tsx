"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowRight, Bell, Calendar, Check, CreditCard, MessageCircle, ShieldCheck, UserRoundPlus, Volume2, VolumeX } from "lucide-react"
import { useRouter } from "next/navigation"
import { collection, doc, getDocs, limit, onSnapshot, orderBy, query, updateDoc, where } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useSidebar } from "@/components/ui/sidebar"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { db } from "@/lib/firebase"
import {
    resolveNotificationDestination,
    type NotificationCategory,
    type NotificationKind,
    type NotificationRecord,
} from "@/lib/notification-center"
import { cn } from "@/lib/utils"

type NotificationFilter = "all" | NotificationCategory

function getNotificationVisual(kind: NotificationKind, isTr: boolean) {
    switch (kind) {
        case "chat":
            return {
                actionLabel: isTr ? "Sohbeti aç" : "Open chat",
                badgeLabel: isTr ? "Sohbet" : "Chat",
                icon: <MessageCircle className="h-4 w-4" />,
            }
        case "handoff":
            return {
                actionLabel: isTr ? "Talebi aç" : "Open handoff",
                badgeLabel: isTr ? "Aktarma" : "Handoff",
                icon: <UserRoundPlus className="h-4 w-4" />,
            }
        case "appointment":
            return {
                actionLabel: isTr ? "Randevuyu aç" : "Open appointment",
                badgeLabel: isTr ? "Randevu" : "Appointment",
                icon: <Calendar className="h-4 w-4" />,
            }
        case "lead":
            return {
                actionLabel: isTr ? "Lead detayını aç" : "Open lead",
                badgeLabel: "Lead",
                icon: <UserRoundPlus className="h-4 w-4" />,
            }
        case "billing":
            return {
                actionLabel: isTr ? "Faturayı aç" : "Open billing",
                badgeLabel: isTr ? "Fatura" : "Billing",
                icon: <CreditCard className="h-4 w-4" />,
            }
        case "admin":
            return {
                actionLabel: isTr ? "Yönetimi aç" : "Open admin",
                badgeLabel: isTr ? "Yönetim" : "Admin",
                icon: <ShieldCheck className="h-4 w-4" />,
            }
        default:
            return {
                actionLabel: isTr ? "Detayı aç" : "Open details",
                badgeLabel: isTr ? "Sistem" : "System",
                icon: <Bell className="h-4 w-4" />,
            }
    }
}

function getFilterLabel(filter: NotificationFilter, isTr: boolean) {
    if (filter === "all") return isTr ? "Tumu" : "All"
    if (filter === "conversations") return isTr ? "Sohbet" : "Conversations"
    if (filter === "pipeline") return "Pipeline"
    if (filter === "billing") return isTr ? "Faturalama" : "Billing"
    return isTr ? "Yonetim" : "Workspace"
}

function getFilterIcon(filter: NotificationFilter) {
    if (filter === "all") return <Bell className="h-3.5 w-3.5" />
    if (filter === "conversations") return <MessageCircle className="h-3.5 w-3.5" />
    if (filter === "pipeline") return <Calendar className="h-3.5 w-3.5" />
    if (filter === "billing") return <CreditCard className="h-3.5 w-3.5" />
    return <ShieldCheck className="h-3.5 w-3.5" />
}

export function NotificationBell() {
    const { user, role } = useAuth()
    const { language, t } = useLanguage()
    const router = useRouter()
    const { isMobile } = useSidebar()
    const isTr = language === "tr"

    const [notifications, setNotifications] = useState<NotificationRecord[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [soundEnabled, setSoundEnabled] = useState(true)
    const [isOpen, setIsOpen] = useState(false)
    const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all")
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const previousIdsRef = useRef<Set<string>>(new Set())

    const isSuperAdmin = role === "SUPER_ADMIN"

    const parseNotificationTimestamp = (rawValue: unknown): Date => {
        if (!rawValue) return new Date()
        if (rawValue instanceof Date) return rawValue
        if (typeof (rawValue as { toDate?: () => Date })?.toDate === "function") {
            return (rawValue as { toDate: () => Date }).toDate()
        }

        const parsed = new Date(String(rawValue))
        return Number.isNaN(parsed.getTime()) ? new Date() : parsed
    }

    useEffect(() => {
        audioRef.current = new Audio("/sound/notification.mp3")
        audioRef.current.volume = 0.5

        const savedPref = localStorage.getItem("notificationSoundEnabled")
        if (savedPref !== null) {
            setSoundEnabled(savedPref === "true")
        }
    }, [])

    const playNotificationSound = useCallback(() => {
        if (!soundEnabled || !audioRef.current) return

        audioRef.current.currentTime = 0
        audioRef.current.play().catch((error) => {
            console.log("Could not play notification sound:", error)
        })
    }, [soundEnabled])

    const showBrowserNotification = useCallback((title: string, body: string, tag: string = "notification") => {
        if (!("Notification" in window) || Notification.permission !== "granted") return

        const browserNotification = new Notification(title, {
            body,
            icon: "/exai-logo-dark.png",
            badge: "/exai-logo-dark.png",
            tag,
        })

        browserNotification.onclick = () => {
            window.focus()
            browserNotification.close()
        }
    }, [])

    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission()
        }
    }, [])

    const fetchAllNotifications = useCallback(async () => {
        if (!user?.uid) return

        const results: NotificationRecord[] = []
        let hasNewTotal = false

        try {
            const sessionsRef = collection(db, "chatbots", user.uid, "sessions")
            const chatQ = query(sessionsRef, orderBy("updatedAt", "desc"), limit(20))
            const chatSnap = await getDocs(chatQ)

            chatSnap.docs.forEach((docSnap) => {
                const data = docSnap.data()
                const messages = data.messages || []
                const lastMessage = messages[messages.length - 1]
                if (!lastMessage || lastMessage.role !== "user") return
                if (data.unreadByAdmin === false) return

                const timestamp = data.updatedAt?.toDate() || new Date()
                const notifId = `chat_${docSnap.id}`
                const isNew = !previousIdsRef.current.has(notifId)

                results.push({
                    id: notifId,
                    type: "chat",
                    title: data.userName || data.userEmail || "Anonim Kullanici",
                    message: lastMessage.content?.substring(0, 100) + (lastMessage.content?.length > 100 ? "..." : "") || "",
                    timestamp,
                    isNew,
                    data: { sessionId: docSnap.id },
                })

                if (isNew && previousIdsRef.current.size > 0) hasNewTotal = true
                previousIdsRef.current.add(notifId)
            })
        } catch {
            // Ignore chat notification errors to avoid breaking the bell.
        }

        try {
            const appointmentsRef = collection(db, "appointments")
            const appQ = query(
                appointmentsRef,
                where("chatbotId", "==", user.uid),
                where("status", "==", "pending"),
                orderBy("createdAt", "desc"),
                limit(10)
            )
            const appSnap = await getDocs(appQ)

            appSnap.docs.forEach((docSnap) => {
                const data = docSnap.data()
                const timestamp = data.createdAt?.toDate() || new Date()
                const notifId = `appointment_${docSnap.id}`
                const isNew = !previousIdsRef.current.has(notifId)

                results.push({
                    id: notifId,
                    type: "appointment",
                    title: isTr ? "Yeni Randevu Talebi" : "New appointment request",
                    message: `${data.customerName || (isTr ? "Musteri" : "Customer")} - ${data.date} ${data.time}`,
                    timestamp,
                    isNew,
                    data: {
                        appointmentId: docSnap.id,
                        name: data.customerName,
                        email: data.customerEmail,
                        phone: data.customerPhone,
                    },
                })

                if (isNew && previousIdsRef.current.size > 0) hasNewTotal = true
                previousIdsRef.current.add(notifId)
            })
        } catch {
            // Ignore appointment notification errors to avoid breaking the bell.
        }

        try {
            const leadsRef = collection(db, "leads")
            const leadQ = query(leadsRef, where("chatbotId", "==", user.uid), orderBy("createdAt", "desc"), limit(10))
            const leadSnap = await getDocs(leadQ)

            leadSnap.docs.forEach((docSnap) => {
                const data = docSnap.data()
                const timestamp = data.createdAt?.toDate() || new Date()
                const notifId = `lead_${docSnap.id}`
                const isNew = !previousIdsRef.current.has(notifId)
                const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

                if (timestamp < oneDayAgo) return

                results.push({
                    id: notifId,
                    type: "lead",
                    title: isTr ? "Yeni Lead" : "New lead",
                    message: `${data.name || (isTr ? "Anonim" : "Anonymous")} - ${data.email || data.phone || ""}`,
                    timestamp,
                    isNew,
                    data: {
                        leadId: docSnap.id,
                        sessionId: data.sessionId || null,
                        name: data.name || "",
                        email: data.email || "",
                        phone: data.phone || "",
                    },
                })

                if (isNew && previousIdsRef.current.size > 0) hasNewTotal = true
                previousIdsRef.current.add(notifId)
            })
        } catch {
            // Ignore lead notification errors to avoid breaking the bell.
        }

        try {
            const notificationsRef = collection(db, "notifications")
            const notificationsQ = query(notificationsRef, where("userId", "==", user.uid))
            const notificationsSnap = await getDocs(notificationsQ)

            notificationsSnap.docs.forEach((docSnap) => {
                const data = docSnap.data() as Record<string, unknown>
                const timestamp = parseNotificationTimestamp(data.createdAt)
                const notifId = `system_notification_${docSnap.id}`
                const isUnread = data.isRead !== true
                const isFresh = !previousIdsRef.current.has(notifId)

                results.push({
                    id: notifId,
                    type: "system",
                    title: String(data.title || (isTr ? "Sistem Bildirimi" : "System notification")),
                    message: String(data.message || ""),
                    timestamp,
                    isNew: isUnread,
                    data: {
                        ...((data.metadata as Record<string, unknown>) || {}),
                        notificationDocId: docSnap.id,
                        notificationType: data.type || "general",
                    },
                })

                if (isFresh && isUnread && previousIdsRef.current.size > 0) {
                    hasNewTotal = true
                }
                previousIdsRef.current.add(notifId)
            })
        } catch {
            // Ignore stored notification errors to avoid breaking the bell.
        }

        if (isSuperAdmin) {
            try {
                const usersRef = collection(db, "users")
                const systemQ = query(usersRef, where("isActive", "==", false), orderBy("createdAt", "desc"), limit(10))
                const systemSnap = await getDocs(systemQ)

                systemSnap.docs.forEach((docSnap) => {
                    const data = docSnap.data()
                    const timestamp = data.createdAt ? new Date(String(data.createdAt)) : new Date()
                    const notifId = `system_tenant_${docSnap.id}`
                    const isNew = !previousIdsRef.current.has(notifId)

                    results.push({
                        id: notifId,
                        type: "system",
                        title: isTr ? "Yeni Tenant Kaydi" : "New tenant registration",
                        message: `${data.fullName || data.email} - ${isTr ? "Onay bekliyor" : "Awaiting approval"}`,
                        timestamp,
                        isNew,
                        data: { userId: docSnap.id },
                    })

                    if (isNew && previousIdsRef.current.size > 0) hasNewTotal = true
                    previousIdsRef.current.add(notifId)
                })
            } catch {
                // Ignore super admin notification errors to avoid breaking the bell.
            }
        }

        const nextNotifications = results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        setNotifications(nextNotifications)

        if (hasNewTotal) {
            playNotificationSound()
            const newestNotification = nextNotifications[0]
            if (newestNotification) {
                showBrowserNotification(newestNotification.title, newestNotification.message, newestNotification.id)
            }
        }
    }, [isSuperAdmin, isTr, playNotificationSound, showBrowserNotification, user?.uid])

    useEffect(() => {
        if (!user?.uid) return

        fetchAllNotifications()
        const interval = setInterval(fetchAllNotifications, 30000)

        return () => clearInterval(interval)
    }, [fetchAllNotifications, user?.uid])

    useEffect(() => {
        if (!user?.uid) return

        const notificationsQ = query(collection(db, "notifications"), where("userId", "==", user.uid))
        const unsubscribe = onSnapshot(notificationsQ, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type !== "added") return

                const data = change.doc.data() as Record<string, unknown>
                const notifId = `system_notification_${change.doc.id}`
                const isUnread = data.isRead !== true

                if (isUnread && previousIdsRef.current.has(notifId) === false && previousIdsRef.current.size > 0) {
                    playNotificationSound()
                }

                fetchAllNotifications()
            })
        })

        return () => unsubscribe()
    }, [fetchAllNotifications, playNotificationSound, user?.uid])

    useEffect(() => {
        setUnreadCount(notifications.filter((notification) => notification.isNew).length)
    }, [notifications])

    const markNotificationAsRead = async (notification: NotificationRecord) => {
        if (!user?.uid) return

        setNotifications((previous) =>
            previous.map((current) => (current.id === notification.id ? { ...current, isNew: false } : current))
        )

        if (notification.type === "chat" && notification.data?.sessionId) {
            try {
                await updateDoc(doc(db, "chatbots", user.uid, "sessions", String(notification.data.sessionId)), {
                    unreadByAdmin: false,
                })
            } catch (error) {
                console.error(error)
            }
        }

        if (notification.type === "system" && notification.data?.notificationDocId) {
            try {
                await updateDoc(doc(db, "notifications", String(notification.data.notificationDocId)), {
                    isRead: true,
                })
            } catch (error) {
                console.error(error)
            }
        }
    }

    const handleNotificationClick = async (notification: NotificationRecord) => {
        const destination = resolveNotificationDestination(notification, { isSuperAdmin })
        setIsOpen(false)
        await markNotificationAsRead(notification)
        router.push(destination.href)
    }

    const markAllAsRead = async () => {
        const unreadNotifications = notifications.filter((notification) => notification.isNew)
        if (unreadNotifications.length === 0) return

        setNotifications((previous) => previous.map((notification) => ({ ...notification, isNew: false })))

        await Promise.allSettled(
            unreadNotifications.map(async (notification) => {
                if (!user?.uid) return

                if (notification.type === "chat" && notification.data?.sessionId) {
                    await updateDoc(doc(db, "chatbots", user.uid, "sessions", String(notification.data.sessionId)), {
                        unreadByAdmin: false,
                    })
                    return
                }

                if (notification.type === "system" && notification.data?.notificationDocId) {
                    await updateDoc(doc(db, "notifications", String(notification.data.notificationDocId)), {
                        isRead: true,
                    })
                }
            })
        )
    }

    const toggleSound = () => {
        const nextValue = !soundEnabled
        setSoundEnabled(nextValue)
        localStorage.setItem("notificationSoundEnabled", String(nextValue))
    }

    const formatTimeAgo = (date: Date) => {
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return t("justNow") || (isTr ? "Simdi" : "Just now")
        if (diffMins < 60) return `${diffMins}${t("minutesAgo") || (isTr ? "dk once" : "m ago")}`
        if (diffHours < 24) return `${diffHours}${t("hoursAgo") || (isTr ? "sa once" : "h ago")}`
        return `${diffDays}${t("daysAgo") || (isTr ? "g once" : "d ago")}`
    }

    const resolvedNotifications = notifications.map((notification) => ({
        destination: resolveNotificationDestination(notification, { isSuperAdmin }),
        notification,
    }))

    const counts: Record<NotificationFilter, number> = {
        all: resolvedNotifications.length,
        conversations: 0,
        pipeline: 0,
        billing: 0,
        workspace: 0,
    }

    for (const entry of resolvedNotifications) {
        counts[entry.destination.category] += 1
    }

    const filteredNotifications =
        activeFilter === "all"
            ? resolvedNotifications
            : resolvedNotifications.filter((entry) => entry.destination.category === activeFilter)

    const filterOptions: NotificationFilter[] = ["all", "conversations", "pipeline", "billing", "workspace"]

    if (!user) return null

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 ? (
                        <Badge
                            variant="destructive"
                            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center p-0 text-[10px]"
                        >
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                    ) : null}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                sideOffset={10}
                className={cn(
                    "w-[420px] overflow-hidden rounded-xl border bg-popover p-0 shadow-lg",
                    isMobile && "h-[calc(100vh-64px)] w-screen rounded-none border-x-0 border-b-0"
                )}
            >
                <div className="flex flex-col gap-3 p-4 pb-3 border-b">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <DropdownMenuLabel className="p-0 text-base font-semibold leading-none tracking-tight">
                                {t("notifications") || (isTr ? "Bildirimler" : "Notifications")}
                            </DropdownMenuLabel>
                            <p className="text-sm text-muted-foreground">
                                {unreadCount > 0
                                    ? isTr
                                        ? `${unreadCount} okunmamış bildirim`
                                        : `${unreadCount} unread notifications`
                                    : isTr
                                        ? "Tüm bildirimler görüldü"
                                        : "Everything is caught up"}
                            </p>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={toggleSound}
                                title={soundEnabled ? (isTr ? "Sesi kapat" : "Mute") : isTr ? "Sesi aç" : "Unmute"}
                            >
                                {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-600" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={markAllAsRead}
                                disabled={unreadCount === 0}
                                title={isTr ? "Tümünü okundu yap" : "Mark all read"}
                            >
                                <Check className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {filterOptions.map((filter) => {
                            const isActive = activeFilter === filter
                            return (
                                <button
                                    key={filter}
                                    onClick={() => setActiveFilter(filter)}
                                    className={cn(
                                        "inline-flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                                        isActive
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                    )}
                                >
                                    {getFilterLabel(filter, isTr)}
                                    <span className={cn(
                                        "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                                        isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background text-muted-foreground"
                                    )}>
                                        {counts[filter]}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                <ScrollArea className={cn("h-[550px]", isMobile && "h-[calc(100vh-160px)]")}>
                    {filteredNotifications.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                <Bell className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium">
                                {isTr ? "Bu kategoride bildirim yok" : "No notifications in this category"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {isTr ? "Yeni olaylar burada listelenecek." : "New activity will appear here."}
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {filteredNotifications.map(({ notification, destination }) => {
                                const visual = getNotificationVisual(destination.kind, isTr)

                                return (
                                    <button
                                        key={notification.id}
                                        onClick={() => void handleNotificationClick(notification)}
                                        className={cn(
                                            "group relative flex items-start gap-4 border-b p-4 text-left text-sm transition-colors hover:bg-muted/50 last:border-0",
                                            notification.isNew && "bg-muted/20"
                                        )}
                                    >
                                        {notification.isNew && (
                                            <span className="absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary" />
                                        )}
                                        
                                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted border border-border/50 text-foreground">
                                            {visual.icon}
                                        </div>

                                        <div className="grid flex-1 gap-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-medium leading-none">
                                                    {notification.title}
                                                </span>
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {formatTimeAgo(notification.timestamp)}
                                                </span>
                                            </div>
                                            <p className="line-clamp-2 text-xs text-muted-foreground mt-0.5">
                                                {notification.message}
                                            </p>
                                            <div className="mt-1.5 flex items-center gap-2">
                                                <span className="inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted/50">
                                                    {visual.badgeLabel}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors flex items-center gap-1">
                                                    {visual.actionLabel}
                                                    <ArrowRight className="h-3 w-3" />
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
