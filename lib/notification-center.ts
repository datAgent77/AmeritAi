export type NotificationType = "chat" | "appointment" | "lead" | "system"
export type NotificationCategory = "conversations" | "pipeline" | "billing" | "workspace"
export type NotificationKind = "chat" | "appointment" | "lead" | "handoff" | "billing" | "admin" | "system"

export interface NotificationRecord {
    id: string
    type: NotificationType
    title: string
    message: string
    timestamp: Date
    isNew: boolean
    data?: Record<string, unknown>
}

export interface NotificationDestination {
    category: NotificationCategory
    href: string
    kind: NotificationKind
}

const BILLING_NOTIFICATION_TYPES = new Set([
    "invoice_reminder",
    "payment_due",
    "payment_overdue",
    "trial_expired",
    "upgrade_request",
])

function appendQueryParams(pathname: string, params: Record<string, unknown>) {
    const searchParams = new URLSearchParams()

    for (const [key, value] of Object.entries(params)) {
        if (value === null || value === undefined) continue

        const normalized = String(value).trim()
        if (!normalized) continue

        searchParams.set(key, normalized)
    }

    const query = searchParams.toString()
    return query ? `${pathname}?${query}` : pathname
}

export function resolveNotificationDestination(
    notification: NotificationRecord,
    options: { isSuperAdmin: boolean }
): NotificationDestination {
    const notificationType = String(notification.data?.notificationType || "")

    if (notification.type === "chat") {
        return {
            category: "conversations",
            href: appendQueryParams("/console/chatbot/chats", {
                sessionId: notification.data?.sessionId,
            }),
            kind: "chat",
        }
    }

    if (notification.type === "appointment") {
        return {
            category: "pipeline",
            href: appendQueryParams("/console/appointments", {
                appointmentId: notification.data?.appointmentId,
            }),
            kind: "appointment",
        }
    }

    if (notification.type === "lead") {
        return {
            category: "pipeline",
            href: appendQueryParams("/console/chatbot/leads", {
                leadId: notification.data?.leadId,
                sessionId: notification.data?.sessionId,
                name: notification.data?.name,
                email: notification.data?.email,
                phone: notification.data?.phone,
            }),
            kind: "lead",
        }
    }

    if (notificationType === "human_handoff_request") {
        return {
            category: "conversations",
            href: appendQueryParams("/console/chatbot/chats", {
                sessionId: notification.data?.callbackId || notification.data?.sessionId,
            }),
            kind: "handoff",
        }
    }

    if (notificationType === "appointment_created") {
        return {
            category: "pipeline",
            href: "/console/appointments",
            kind: "appointment",
        }
    }

    if (BILLING_NOTIFICATION_TYPES.has(notificationType)) {
        return {
            category: "billing",
            href: "/console/settings/subscription",
            kind: "billing",
        }
    }

    if (options.isSuperAdmin || notification.data?.userId) {
        return {
            category: "workspace",
            href: "/admin",
            kind: "admin",
        }
    }

    return {
        category: "workspace",
        href: "/console/chatbot",
        kind: "system",
    }
}
