import { describe, expect, test } from "vitest"
import { resolveNotificationDestination, type NotificationRecord } from "@/lib/notification-center"

function createNotification(overrides: Partial<NotificationRecord> = {}): NotificationRecord {
    return {
        id: "notification-1",
        type: "system",
        title: "Notification",
        message: "Notification body",
        timestamp: new Date("2026-04-22T11:00:00.000Z"),
        isNew: true,
        data: {},
        ...overrides,
    }
}

describe("resolveNotificationDestination", () => {
    test("routes chat notifications into the selected conversation", () => {
        const destination = resolveNotificationDestination(
            createNotification({
                type: "chat",
                data: { sessionId: "session-123" },
            }),
            { isSuperAdmin: false }
        )

        expect(destination).toEqual({
            category: "conversations",
            href: "/console/chatbot/chats?sessionId=session-123",
            kind: "chat",
        })
    })

    test("routes lead notifications into the matching lead detail seed", () => {
        const destination = resolveNotificationDestination(
            createNotification({
                type: "lead",
                data: {
                    leadId: "lead-9",
                    sessionId: "session-9",
                    name: "Kemal Etikan",
                    email: "kemal@example.com",
                },
            }),
            { isSuperAdmin: false }
        )

        expect(destination).toEqual({
            category: "pipeline",
            href: "/console/chatbot/leads?leadId=lead-9&sessionId=session-9&name=Kemal+Etikan&email=kemal%40example.com",
            kind: "lead",
        })
    })

    test("routes human handoff system notifications back into the source chat", () => {
        const destination = resolveNotificationDestination(
            createNotification({
                data: {
                    notificationType: "human_handoff_request",
                    callbackId: "session-77",
                },
            }),
            { isSuperAdmin: false }
        )

        expect(destination).toEqual({
            category: "conversations",
            href: "/console/chatbot/chats?sessionId=session-77",
            kind: "handoff",
        })
    })

    test("routes billing notifications into subscription settings", () => {
        const destination = resolveNotificationDestination(
            createNotification({
                data: {
                    notificationType: "payment_due",
                },
            }),
            { isSuperAdmin: false }
        )

        expect(destination).toEqual({
            category: "billing",
            href: "/console/settings/subscription",
            kind: "billing",
        })
    })

    test("routes admin notifications into admin workspace for super admins", () => {
        const destination = resolveNotificationDestination(createNotification(), {
            isSuperAdmin: true,
        })

        expect(destination).toEqual({
            category: "workspace",
            href: "/admin",
            kind: "admin",
        })
    })
})
