import { describe, expect, test } from "vitest"
import { getOmniContactMemory, upsertOmniContactMemory } from "@/lib/omni/memory"
import { upsertContactGraph } from "@/lib/omni/server-utils"

function createDocStore() {
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
                        async get() {
                            const value = bucket.get(id)
                            return {
                                exists: value !== undefined,
                                data: () => value,
                                id,
                            }
                        },
                        async set(payload: any, options?: { merge?: boolean }) {
                            const existing = bucket.get(id)
                            bucket.set(id, options?.merge && existing ? { ...existing, ...payload } : payload)
                        },
                    }
                },
            }
        },
    }
}

describe("omni contact memory", () => {
    test("stores preferences, issues, recent topics, and summary", async () => {
        const adminDb = createDocStore()

        await upsertOmniContactMemory(adminDb, {
            chatbotId: "tenant-1",
            contactKey: "+90 555 000 11 22",
            displayName: "Ayse",
            channel: "whatsapp",
            sourceSessionId: "session-1",
            preferredLanguage: "tr",
            userMessage: "Kirmizi renk tercih ediyorum. Siparisimde sorun var, lutfen geri arayin.",
            assistantReply: "Kirmizi urun seceneklerine bakiyorum ve geri arama talebinizi kaydettim.",
            lastDisposition: "callback_requested",
        })

        const memory = await getOmniContactMemory(adminDb, "tenant-1", "+905550001122")

        expect(memory).not.toBeNull()
        expect(memory?.displayName).toBe("Ayse")
        expect(memory?.preferredLanguage).toBe("tr")
        expect(memory?.preferences).toEqual(expect.arrayContaining(["Kirmizi renk tercih ediyorum"]))
        expect(memory?.openIssues).toEqual(expect.arrayContaining(["Siparisimde sorun var, lutfen geri arayin", "Callback requested"]))
        expect(memory?.recentTopics?.length).toBeGreaterThan(0)
        expect(memory?.summary).toContain("Preferences:")
        expect(memory?.summary).toContain("Open issues:")
    })

    test("respects disabled memory setting", async () => {
        const adminDb = createDocStore()

        const result = await upsertOmniContactMemory(adminDb, {
            chatbotId: "tenant-1",
            contactKey: "user-42",
            displayName: "Test User",
            channel: "instagram",
            userMessage: "Ben mavi urunleri seviyorum.",
            assistantReply: "Not aldim.",
            settings: {
                enabled: false,
            },
        })

        expect(result).toBeNull()
        const memory = await getOmniContactMemory(adminDb, "tenant-1", "user-42")
        expect(memory).toBeNull()
    })

    test("resolves shared memory across channel aliases when canonical contact is linked", async () => {
        const adminDb = createDocStore()

        const instagramContact = await upsertContactGraph(adminDb, {
            chatbotId: "tenant-1",
            channel: "instagram",
            contactKey: "sender-1",
            displayName: "Ayse",
            instagramHandle: "sender-1",
        })

        await upsertContactGraph(adminDb, {
            chatbotId: "tenant-1",
            channel: "voice",
            canonicalContactId: instagramContact.id || null,
            contactKey: "+905550001122",
            displayName: "Ayse",
            verifiedPhone: "+905550001122",
        })

        await upsertOmniContactMemory(adminDb, {
            chatbotId: "tenant-1",
            contactKey: "sender-1",
            canonicalContactId: instagramContact.id || null,
            displayName: "Ayse",
            channel: "instagram",
            userMessage: "Kargo durumumu merak ediyorum.",
            assistantReply: "Kontrol edip size bilgi verecegim.",
        })

        const memory = await getOmniContactMemory(adminDb, "tenant-1", "+905550001122", {
            channel: "voice",
        })

        expect(memory).not.toBeNull()
        expect(memory?.canonicalContactId).toBe(instagramContact.id)
        expect(memory?.displayName).toBe("Ayse")
        expect(memory?.recentTopics?.some((topic) => topic.includes("Kargo durumumu"))).toBe(true)
    })

    test("merges memory from linked canonical contacts after a manual merge", async () => {
        const adminDb = createDocStore()

        const sourceContact = await upsertContactGraph(adminDb, {
            chatbotId: "tenant-1",
            channel: "instagram",
            contactKey: "sender-2",
            displayName: "Merve",
            instagramHandle: "sender-2",
        })

        const targetContact = await upsertContactGraph(adminDb, {
            chatbotId: "tenant-1",
            channel: "voice",
            contactKey: "+905551234567",
            displayName: "Merve",
            verifiedPhone: "+905551234567",
        })

        await adminDb.collection("contact_graph").doc(sourceContact.id || "").set(
            {
                mergedInto: targetContact.id,
            },
            { merge: true }
        )
        await adminDb.collection("contact_graph").doc(targetContact.id || "").set(
            {
                linkedContactIds: [sourceContact.id],
            },
            { merge: true }
        )

        await upsertOmniContactMemory(adminDb, {
            chatbotId: "tenant-1",
            contactKey: "sender-2",
            canonicalContactId: sourceContact.id || null,
            displayName: "Merve",
            channel: "instagram",
            userMessage: "Bugun mavi elbiseleri merak ediyorum.",
            assistantReply: "Mavi elbiseleri listeleyebilirim.",
        })

        await upsertOmniContactMemory(adminDb, {
            chatbotId: "tenant-1",
            contactKey: "+905551234567",
            canonicalContactId: targetContact.id || null,
            displayName: "Merve",
            channel: "voice",
            userMessage: "Siparisimde sorun var, beni geri arayin.",
            assistantReply: "Destek talebinizi not ettim.",
            lastDisposition: "callback_requested",
        })

        const memory = await getOmniContactMemory(adminDb, "tenant-1", "+905551234567", {
            channel: "voice",
        })

        expect(memory).not.toBeNull()
        expect(memory?.canonicalContactId).toBe(targetContact.id)
        expect(memory?.recentTopics?.some((item) => item.includes("mavi elbiseleri"))).toBe(true)
        expect(memory?.openIssues?.some((item) => item.includes("Callback requested"))).toBe(true)
        expect(memory?.recentTopics?.length).toBeGreaterThan(1)
    })
})
