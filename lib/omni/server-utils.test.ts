import { beforeEach, describe, expect, test, vi } from "vitest"

const { authorizeTargetAccess, getAdminDb } = vi.hoisted(() => ({
    authorizeTargetAccess: vi.fn(),
    getAdminDb: vi.fn(),
}))

vi.mock("@/lib/api-auth", () => ({
    authorizeTargetAccess,
}))

vi.mock("@/lib/firebase-admin", () => ({
    getAdminDb,
}))

import { authorizeOmniRequest } from "@/lib/omni/server-utils"

function createAdminDb(userDocs: Record<string, any>) {
    return {
        collection(name: string) {
            if (name !== "users") {
                throw new Error(`Unexpected collection ${name}`)
            }

            return {
                doc(id: string) {
                    return {
                        async get() {
                            const value = userDocs[id]
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

describe("authorizeOmniRequest", () => {
    beforeEach(() => {
        vi.resetAllMocks()
    })

    test("denies non-super-admin requests when both chatbot and omni entitlements are disabled", async () => {
        authorizeTargetAccess.mockResolvedValue({
            ok: true,
            callerUid: "tenant-1",
            isSuperAdmin: false,
            isAgencyAdmin: false,
        })
        getAdminDb.mockReturnValue(
            createAdminDb({
                "tenant-1": {
                    enableChatbot: false,
                    enableOmniChannel: false,
                },
            })
        )

        const result = await authorizeOmniRequest(new Request("https://example.com"), "tenant-1")

        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.response.status).toBe(403)
        }
    })

    test("denies tenant requests when only chatbot entitlement is enabled", async () => {
        authorizeTargetAccess.mockResolvedValue({
            ok: true,
            callerUid: "tenant-1",
            isSuperAdmin: false,
            isAgencyAdmin: false,
        })
        getAdminDb.mockReturnValue(
            createAdminDb({
                "tenant-1": {
                    productEntitlements: {
                        chatbot: true,
                        omniChannel: false,
                    },
                },
            })
        )

        const result = await authorizeOmniRequest(new Request("https://example.com"), "tenant-1")

        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.response.status).toBe(403)
        }
    })

    test("allows super admin requests even when omni entitlement is disabled", async () => {
        authorizeTargetAccess.mockResolvedValue({
            ok: true,
            callerUid: "super-1",
            isSuperAdmin: true,
            isAgencyAdmin: false,
        })
        getAdminDb.mockReturnValue(
            createAdminDb({
                "tenant-1": {
                    enableOmniChannel: false,
                },
            })
        )

        const result = await authorizeOmniRequest(new Request("https://example.com"), "tenant-1")

        expect(result.ok).toBe(true)
    })
})
