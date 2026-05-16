import { describe, expect, test } from "vitest"
import { buildMessengerDMMergePayload, getMessengerPageAccessToken, getMessengerPageId } from "@/lib/integrations/messenger/setup"
import { encryptToken } from "@/lib/omni/token-cipher"

const TEST_KEY = Array.from({ length: 4 }, () => "0123456789abcdef").join("")

function withKey(fn: () => void) {
    const original = process.env.TOKEN_CIPHER_KEY
    process.env.TOKEN_CIPHER_KEY = TEST_KEY
    try {
        fn()
    } finally {
        if (original !== undefined) {
            process.env.TOKEN_CIPHER_KEY = original
        } else {
            delete process.env.TOKEN_CIPHER_KEY
        }
    }
}

describe("buildMessengerDMMergePayload", () => {
    test("prefers active metaSetup app credentials over stale messenger credentials", () => {
        const payload = buildMessengerDMMergePayload({
            omniConfig: {
                metaSetup: {
                    secrets: {
                        appId: "884857684580168",
                        appSecret: "tenant-secret",
                    },
                },
                messenger: {
                    appId: "1360518625883692",
                    appSecretRef: "legacy-secret",
                },
            } as any,
            pageId: "page-1",
            pageName: "Demo Page",
            accessToken: "user-token",
            pageAccessToken: "page-token",
        })

        expect(payload.messenger?.appId).toBe("884857684580168")
        expect(payload.messenger?.appSecretRef).toBe("tenant-secret")
    })

    test("stores explicit tenant app credentials in both messenger and meta setup payloads", () => {
        const payload = buildMessengerDMMergePayload({
            omniConfig: {
                messenger: {
                    verifyToken: "verify-1",
                },
            } as any,
            appId: "884857684580168",
            appSecret: "tenant-secret",
            pageId: "page-1",
            pageName: "Demo Page",
            accessToken: "user-token",
            pageAccessToken: "page-token",
        })

        expect(payload.messenger?.appId).toBe("884857684580168")
        expect(payload.messenger?.appSecretRef).toBe("tenant-secret")
        expect(payload.metaSetup?.secrets?.appId).toBe("884857684580168")
        expect(payload.metaSetup?.secrets?.appSecret).toBe("tenant-secret")
    })

    test("prefers messenger DM page credentials for outbound delivery", () => {
        withKey(() => {
            const omniConfig = {
                metaSetup: {
                    secrets: {
                        accessToken: encryptToken("user-token"),
                    },
                },
                messenger: {
                    pageId: "legacy-page",
                    accessTokenRef: encryptToken("legacy-page-token"),
                },
                messengerDM: {
                    pageId: "live-page",
                    accessTokenRef: encryptToken("live-page-token"),
                },
            } as any

            expect(getMessengerPageId(omniConfig)).toBe("live-page")
            expect(getMessengerPageAccessToken(omniConfig)).toBe("live-page-token")
        })
    })

    test("falls back to meta setup user token when page token is missing", () => {
        withKey(() => {
            const omniConfig = {
                metaSetup: {
                    secrets: {
                        accessToken: encryptToken("user-token"),
                    },
                },
                messengerDM: {
                    pageId: "live-page",
                    accessTokenRef: null,
                },
            } as any

            expect(getMessengerPageAccessToken(omniConfig)).toBe("user-token")
        })
    })
})
