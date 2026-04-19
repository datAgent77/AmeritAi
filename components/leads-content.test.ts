import { describe, expect, test } from "vitest"
import { buildLeadChatHref, leadHasExpandableDetails, type Lead } from "./leads-content"

describe("leads content helpers", () => {
    test("builds a chat link only when the lead is attached to a session", () => {
        expect(buildLeadChatHref("sess-1")).toBe("/console/chatbot/chats?sessionId=sess-1")
        expect(buildLeadChatHref(null)).toBeNull()
    })

    test("keeps legacy leads non-expandable while exposing linked identity details", () => {
        const legacyLead: Lead = {
            id: "lead-1",
            name: "Legacy",
            email: "",
            phone: "",
            source: "Initial Lead Form",
            createdAt: new Date().toISOString(),
        }

        const linkedLead: Lead = {
            ...legacyLead,
            id: "lead-2",
            sourceSessionId: "sess-2",
            contactKey: "customer@example.com",
        }

        expect(leadHasExpandableDetails(legacyLead)).toBe(false)
        expect(leadHasExpandableDetails(linkedLead)).toBe(true)
    })
})
