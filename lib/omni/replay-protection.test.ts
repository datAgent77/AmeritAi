import { describe, expect, test } from "vitest"
import { claimOmniWebhookEvent } from "@/lib/omni/replay-protection"

function createReplayStore() {
    const collections = new Map<string, Map<string, any>>()

    const getCollection = (name: string) => {
        if (!collections.has(name)) {
            collections.set(name, new Map())
        }
        return collections.get(name)!
    }

    return {
        collection(name: string) {
            const bucket = getCollection(name)
            return {
                doc(id: string) {
                    return {
                        async create(payload: any) {
                            if (bucket.has(id)) {
                                throw new Error("already-exists")
                            }
                            bucket.set(id, payload)
                        },
                        async get() {
                            const value = bucket.get(id)
                            return {
                                exists: value !== undefined,
                                data: () => value,
                                id,
                            }
                        },
                    }
                },
            }
        },
    }
}

describe("omni replay protection", () => {
    test("claims a fresh event once and marks the second claim as duplicate", async () => {
        const adminDb = createReplayStore()

        const first = await claimOmniWebhookEvent(adminDb, {
            chatbotId: "tenant-1",
            channel: "whatsapp",
            source: "api/omni/channels/whatsapp/webhook",
            eventKey: "message:123",
            metadata: {
                sessionId: "session-1",
            },
        })

        const second = await claimOmniWebhookEvent(adminDb, {
            chatbotId: "tenant-1",
            channel: "whatsapp",
            source: "api/omni/channels/whatsapp/webhook",
            eventKey: "message:123",
            metadata: {
                sessionId: "session-1",
            },
        })

        expect(first.duplicate).toBe(false)
        expect(second.duplicate).toBe(true)
        expect(first.record.id).toBe(second.record.id)
        expect(second.record.channel).toBe("whatsapp")
    })

    test("uses channel and tenant in the event identity", async () => {
        const adminDb = createReplayStore()

        const whatsapp = await claimOmniWebhookEvent(adminDb, {
            chatbotId: "tenant-1",
            channel: "whatsapp",
            source: "a",
            eventKey: "same-key",
        })

        const instagram = await claimOmniWebhookEvent(adminDb, {
            chatbotId: "tenant-1",
            channel: "instagram",
            source: "b",
            eventKey: "same-key",
        })

        expect(whatsapp.duplicate).toBe(false)
        expect(instagram.duplicate).toBe(false)
        expect(whatsapp.record.id).not.toBe(instagram.record.id)
    })
})
