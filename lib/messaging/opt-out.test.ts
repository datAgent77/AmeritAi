import { describe, expect, test, vi } from "vitest"
import {
    classifyConsentKeyword,
    isOptOutMessage,
    isOptInMessage,
    getOptOutConfirmation,
    getOptInConfirmation,
    buildOptOutDocId,
    isOptedOut,
    recordOptOut,
    recordOptIn,
    OPT_OUT_COLLECTION,
    type MinimalAdminDb,
} from "@/lib/messaging/opt-out"

describe("consent keyword classification", () => {
    test("detects English opt-out keywords (exact and within a sentence)", () => {
        expect(classifyConsentKeyword("STOP")).toBe("opt_out")
        expect(classifyConsentKeyword("stop")).toBe("opt_out")
        expect(classifyConsentKeyword("Please STOP texting me")).toBe("opt_out")
        expect(classifyConsentKeyword("UNSUBSCRIBE")).toBe("opt_out")
        expect(isOptOutMessage("cancel")).toBe(true)
    })

    test("detects Turkish and Spanish opt-out keywords", () => {
        expect(classifyConsentKeyword("DUR")).toBe("opt_out")
        expect(classifyConsentKeyword("durdur")).toBe("opt_out")
        expect(classifyConsentKeyword("İPTAL")).toBe("opt_out") // dotted-I folds to i
        expect(classifyConsentKeyword("ALTO")).toBe("opt_out")
        expect(classifyConsentKeyword("cancelar")).toBe("opt_out")
    })

    test("detects opt-in keywords", () => {
        expect(classifyConsentKeyword("START")).toBe("opt_in")
        expect(classifyConsentKeyword("başla")).toBe("opt_in")
        expect(classifyConsentKeyword("iniciar")).toBe("opt_in")
        expect(isOptInMessage("YES")).toBe(true)
    })

    test("does not misfire on substrings or normal messages", () => {
        expect(classifyConsentKeyword("stopwatch")).toBe(null)
        expect(classifyConsentKeyword("I want to know your hours")).toBe(null)
        expect(classifyConsentKeyword("")).toBe(null)
        expect(classifyConsentKeyword("can you start the order tomorrow and tell me more")).toBe("opt_in")
    })

    test("opt-out wins when both appear", () => {
        expect(classifyConsentKeyword("start then stop")).toBe("opt_out")
    })
})

describe("confirmation copy", () => {
    test("returns localized opt-out confirmations with English fallback", () => {
        expect(getOptOutConfirmation("en")).toMatch(/unsubscribed/i)
        expect(getOptOutConfirmation("tr")).toMatch(/iptal/i)
        expect(getOptOutConfirmation("es")).toMatch(/cancel/i)
        expect(getOptOutConfirmation("de")).toBe(getOptOutConfirmation("en"))
        expect(getOptOutConfirmation(null)).toBe(getOptOutConfirmation("en"))
    })

    test("opt-in confirmations are localized", () => {
        expect(getOptInConfirmation("en")).toMatch(/re-subscribed/i)
        expect(getOptInConfirmation("tr")).toMatch(/abone/i)
        expect(getOptInConfirmation("es")).toMatch(/suscrib/i)
    })
})

describe("doc id", () => {
    test("is deterministic and sanitizes unsafe characters", () => {
        expect(buildOptOutDocId("bot1", "whatsapp", "+1 555 000")).toBe("bot1__whatsapp__+1_555_000")
        expect(buildOptOutDocId("a/b", "sms", "c d")).toBe("a_b__sms__c_d")
    })
})

function makeFakeDb() {
    const store = new Map<string, any>()
    const db: MinimalAdminDb & { store: Map<string, any> } = {
        store,
        collection(name: string) {
            return {
                doc(id: string) {
                    const key = `${name}/${id}`
                    return {
                        async get() {
                            return { exists: store.has(key), data: () => store.get(key) }
                        },
                        async set(data: any, options?: { merge?: boolean }) {
                            const prev = options?.merge ? store.get(key) || {} : {}
                            store.set(key, { ...prev, ...data })
                        },
                    }
                },
            }
        },
    }
    return db
}

describe("opt-out persistence", () => {
    test("records and reads opt-out / opt-in state", async () => {
        const db = makeFakeDb()
        const id = { chatbotId: "bot1", channel: "whatsapp" as const, contactKey: "+15550001" }

        expect(await isOptedOut(db, id)).toBe(false)

        await recordOptOut(db, id, { source: "test", keyword: "stop" })
        expect(await isOptedOut(db, id)).toBe(true)
        const stored = db.store.get(`${OPT_OUT_COLLECTION}/${buildOptOutDocId("bot1", "whatsapp", "+15550001")}`)
        expect(stored.optedOut).toBe(true)
        expect(stored.lastKeyword).toBe("stop")

        await recordOptIn(db, id, { source: "test", keyword: "start" })
        expect(await isOptedOut(db, id)).toBe(false)
    })

    test("isOptedOut is safe with null db or missing identity", async () => {
        expect(await isOptedOut(null, { chatbotId: "b", channel: "sms", contactKey: "x" })).toBe(false)
        const db = makeFakeDb()
        expect(await isOptedOut(db, { chatbotId: "", channel: "sms", contactKey: "" })).toBe(false)
    })

    test("opt-out for one channel does not affect another", async () => {
        const db = makeFakeDb()
        await recordOptOut(db, { chatbotId: "bot1", channel: "whatsapp", contactKey: "u1" })
        expect(await isOptedOut(db, { chatbotId: "bot1", channel: "whatsapp", contactKey: "u1" })).toBe(true)
        expect(await isOptedOut(db, { chatbotId: "bot1", channel: "instagram", contactKey: "u1" })).toBe(false)
    })
})
