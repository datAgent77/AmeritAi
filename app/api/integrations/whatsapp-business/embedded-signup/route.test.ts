import { beforeEach, describe, expect, test, vi } from "vitest"

import { POST } from "./route"
import { authorizeIntegrationAccess } from "@/lib/integration-plan-access"
import { getAdminDb } from "@/lib/firebase-admin"
import { createOAuthState } from "@/lib/oauth-state"
import { buildMetaOAuthUrl } from "@/lib/integrations/meta-shared/oauth"
import { mergeOmniChannelConfig } from "@/lib/omni/server-utils"

vi.mock("@/lib/integration-plan-access", () => ({
    authorizeIntegrationAccess: vi.fn(),
}))

vi.mock("@/lib/firebase-admin", () => ({
    getAdminDb: vi.fn(),
}))

vi.mock("@/lib/oauth-state", () => ({
    createOAuthState: vi.fn(),
}))

vi.mock("@/lib/integrations/meta-shared/oauth", () => ({
    buildMetaOAuthUrl: vi.fn(),
}))

vi.mock("@/lib/meta-setup", () => ({
    generateMetaVerifyToken: vi.fn(() => "verify-token"),
    isMetaPlatformAppAvailable: vi.fn(() => false),
}))

vi.mock("@/lib/omni/server-utils", () => ({
    getPublicAppOrigin: vi.fn(() => "http://localhost"),
    mergeOmniChannelConfig: vi.fn(),
}))

function createAdminDb(config: Record<string, unknown> = {}) {
    return {
        collection: vi.fn().mockImplementation((name: string) => {
            if (name !== "omni_channel_configs") {
                throw new Error(`Unexpected collection: ${name}`)
            }
            return {
                doc: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue({
                        data: () => config,
                    }),
                }),
            }
        }),
    }
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authorizeIntegrationAccess).mockResolvedValue({
        ok: true,
    } as any)
    vi.mocked(getAdminDb).mockReturnValue(createAdminDb() as any)
    vi.mocked(createOAuthState).mockResolvedValue("state-123")
    vi.mocked(buildMetaOAuthUrl).mockReturnValue("https://meta.example/oauth")
    vi.mocked(mergeOmniChannelConfig).mockResolvedValue({} as any)
})

describe("POST /api/integrations/whatsapp-business/embedded-signup", () => {
    test("returns 400 when only appId is provided", async () => {
        const response = await POST(
            new Request("http://localhost/api/integrations/whatsapp-business/embedded-signup", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    chatbotId: "tenant-1",
                    appId: "custom-app-id",
                }),
            })
        )

        expect(response.status).toBe(400)
        const payload = await response.json()
        expect(payload.error).toContain("App ID ve App Secret")
        expect(mergeOmniChannelConfig).not.toHaveBeenCalled()
        expect(createOAuthState).not.toHaveBeenCalled()
    })

    test("stores tenant credentials and uses tenant app config", async () => {
        vi.mocked(mergeOmniChannelConfig).mockResolvedValue({
            metaSetup: {
                secrets: {
                    appId: "tenant-app-id",
                    appSecret: "tenant-app-secret",
                },
            },
        } as any)

        const response = await POST(
            new Request("http://localhost/api/integrations/whatsapp-business/embedded-signup", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    chatbotId: "tenant-1",
                    returnPath: "/console/chatbot/integration",
                    appId: "tenant-app-id",
                    appSecret: "tenant-app-secret",
                }),
            })
        )

        expect(response.status).toBe(200)
        expect(mergeOmniChannelConfig).toHaveBeenCalledWith(
            expect.anything(),
            "tenant-1",
            expect.objectContaining({
                metaSetup: expect.objectContaining({
                    secrets: expect.objectContaining({
                        appId: "tenant-app-id",
                        appSecret: "tenant-app-secret",
                    }),
                }),
            })
        )
        expect(createOAuthState).toHaveBeenCalledWith(expect.objectContaining({
            chatbotId: "tenant-1",
            appConfigSource: "tenant",
            apiKey: "tenant-app-id",
            apiSecret: "tenant-app-secret",
        }))
        expect(buildMetaOAuthUrl).toHaveBeenCalledWith(expect.objectContaining({
            appConfig: expect.objectContaining({
                appId: "tenant-app-id",
                appSecret: "tenant-app-secret",
            }),
        }))
    })

    test("returns 400 when tenant credentials are absent", async () => {
        const response = await POST(
            new Request("http://localhost/api/integrations/whatsapp-business/embedded-signup", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    chatbotId: "tenant-1",
                }),
            })
        )

        expect(response.status).toBe(400)
        const payload = await response.json()
        expect(payload.error).toContain("platform uygulaması")
        expect(createOAuthState).not.toHaveBeenCalled()
        expect(buildMetaOAuthUrl).not.toHaveBeenCalled()
    })
})
