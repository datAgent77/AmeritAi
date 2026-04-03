import { beforeEach, describe, expect, test, vi } from "vitest"
import { POST } from "./route"
import { authorizeOmniRequest } from "@/lib/omni/server-utils"
import { createNotification } from "@/lib/notification-service"
import { sendUpgradeRequestToAdmin } from "@/lib/email-service"

vi.mock("firebase-admin/firestore", () => ({
    FieldValue: {
        serverTimestamp: vi.fn(() => "server-timestamp"),
    },
}))

vi.mock("@/lib/omni/server-utils", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/server-utils")>("@/lib/omni/server-utils")
    return {
        ...actual,
        authorizeOmniRequest: vi.fn(),
    }
})

vi.mock("@/lib/notification-service", () => ({
    createNotification: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/email-service", () => ({
    sendUpgradeRequestToAdmin: vi.fn().mockResolvedValue(true),
}))

function createDoc(data: Record<string, unknown>) {
    return {
        exists: true,
        data: () => data,
    }
}

describe("/api/omni/account-center/subscription", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test("creates omni upgrade request", async () => {
        const add = vi.fn().mockResolvedValue({ id: "upgrade-1" })
        const set = vi.fn().mockResolvedValue(undefined)
        const adminDb = {
            collection: vi.fn((name: string) => {
                if (name === "upgrade_requests") {
                    return { add }
                }
                return {
                    doc: vi.fn(() => ({
                        get: vi.fn().mockResolvedValue(createDoc({ email: "owner@example.com", companyName: "Acme", planId: "starter" })),
                        set,
                    })),
                    where: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue({ docs: [{ id: "super-1" }] }),
                    }),
                }
            }),
        }

        vi.mocked(authorizeOmniRequest).mockResolvedValue({ ok: true, adminDb, callerUid: "super-1", isSuperAdmin: true, isAgencyAdmin: false } as any)

        const response = await POST(new Request("https://example.com/api/omni/account-center/subscription", {
            method: "POST",
            body: JSON.stringify({ chatbotId: "tenant-1", targetPlan: "growth" }),
        }))

        expect(response.status).toBe(200)
        expect(sendUpgradeRequestToAdmin).toHaveBeenCalled()
        expect(add).toHaveBeenCalled()
        expect(set).toHaveBeenCalled()
        expect(createNotification).toHaveBeenCalled()
        const payload = await response.json()
        expect(payload.lastUpgradeRequest.source).toBe("omni")
    })
})
