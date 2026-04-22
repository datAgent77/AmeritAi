import { describe, expect, test } from "vitest"
import { buildMessengerDMMergePayload } from "@/lib/integrations/messenger/setup"

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

        expect(payload.messenger.appId).toBe("884857684580168")
        expect(payload.messenger.appSecretRef).toBe("tenant-secret")
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

        expect(payload.messenger.appId).toBe("884857684580168")
        expect(payload.messenger.appSecretRef).toBe("tenant-secret")
        expect(payload.metaSetup.secrets.appId).toBe("884857684580168")
        expect(payload.metaSetup.secrets.appSecret).toBe("tenant-secret")
    })
})
