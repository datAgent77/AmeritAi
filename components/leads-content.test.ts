import { describe, expect, test } from "vitest"
import {
    buildLeadChatHref,
    buildTenantLeadChatHref,
    getLeadSessionId,
    leadHasExpandableDetails,
    type Lead,
} from "./leads-content"

describe("leads content helpers", () => {
    test("builds a chat link only when the lead is attached to a session", () => {
        expect(buildLeadChatHref("sess-1")).toBe("/console/chatbot/chats?sessionId=sess-1")
        expect(buildLeadChatHref(null)).toBeNull()
    })

    test("builds tenant chat links for admin lead views", () => {
        expect(buildTenantLeadChatHref("tenant-1", "sess-1")).toBe("/admin/tenant/tenant-1/chatbot/chats?sessionId=sess-1")
        expect(buildTenantLeadChatHref("tenant-1", null)).toBeNull()
    })

    test("uses source session id when legacy session id is missing", () => {
        expect(getLeadSessionId({ sessionId: null, sourceSessionId: "source-session-1" })).toBe("source-session-1")
        expect(getLeadSessionId({ sessionId: "session-1", sourceSessionId: "source-session-1" })).toBe("session-1")
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
