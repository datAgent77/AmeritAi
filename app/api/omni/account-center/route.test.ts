import { beforeEach, describe, expect, test, vi } from "vitest"
import { GET, POST } from "./route"
import { authorizeOmniRequest } from "@/lib/omni/server-utils"

vi.mock("@/lib/omni/server-utils", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/server-utils")>("@/lib/omni/server-utils")
    return {
        ...actual,
        authorizeOmniRequest: vi.fn(),
    }
})

function createDoc(data: Record<string, unknown>) {
    return {
        exists: true,
        data: () => data,
    }
}

describe("/api/omni/account-center", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test("GET returns normalized account center payload", async () => {
        const userSet = vi.fn()
        const chatbotSet = vi.fn()
        const adminDb = {
            collection: vi.fn((name: string) => ({
                doc: vi.fn(() => ({
                    get: vi.fn().mockResolvedValue(
                        name === "users"
                            ? createDoc({ email: "owner@example.com", firstName: "Ada", lastName: "Lovelace", phone: "+90", companyWebsite: "https://acme.com", companyAddress: "Istanbul", planId: "growth", subscriptionStatus: "active", billingCycle: "annual" })
                            : createDoc({ companyName: "Acme", industry: "ecommerce" })
                    ),
                    set: name === "users" ? userSet : chatbotSet,
                })),
            })),
        }

        vi.mocked(authorizeOmniRequest).mockResolvedValue({ ok: true, adminDb, callerUid: "tenant-1", isSuperAdmin: false, isAgencyAdmin: false } as any)

        const response = await GET(new Request("https://example.com/api/omni/account-center?chatbotId=tenant-1"))
        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.personal.email).toBe("owner@example.com")
        expect(payload.company.companyName).toBe("Acme")
        expect(payload.subscription.planId).toBe("growth")
    })

    test("POST updates users and chatbots", async () => {
        const userSet = vi.fn().mockResolvedValue(undefined)
        const chatbotSet = vi.fn().mockResolvedValue(undefined)
        const adminDb = {
            collection: vi.fn((name: string) => ({
                doc: vi.fn(() => ({
                    get: vi.fn().mockResolvedValue(
                        name === "users"
                            ? createDoc({ email: "owner@example.com", firstName: "Ada", lastName: "Lovelace", phone: "+90", companyName: "Acme", companyWebsite: "https://acme.com", companyAddress: "Istanbul", industry: "ecommerce" })
                            : createDoc({ companyName: "Acme", industry: "ecommerce" })
                    ),
                    set: name === "users" ? userSet : chatbotSet,
                })),
            })),
        }

        vi.mocked(authorizeOmniRequest).mockResolvedValue({ ok: true, adminDb, callerUid: "tenant-1", isSuperAdmin: false, isAgencyAdmin: false } as any)

        const response = await POST(new Request("https://example.com/api/omni/account-center", {
            method: "POST",
            body: JSON.stringify({
                chatbotId: "tenant-1",
                personal: { firstName: "Grace", lastName: "Hopper", phone: "+1" },
                company: { companyName: "Acme 2", companyWebsite: "https://new.example", companyAddress: "Ankara", industry: "saas" },
            }),
        }))

        expect(response.status).toBe(200)
        expect(userSet).toHaveBeenCalled()
        expect(chatbotSet).toHaveBeenCalled()
    })
})
