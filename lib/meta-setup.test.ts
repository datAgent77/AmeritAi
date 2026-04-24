import { afterEach, describe, expect, test, vi } from "vitest"
import {
    autoSelectMetaAssets,
    buildMetaOAuthScopes,
    buildMetaSetupStatus,
    discoverMetaAssets,
    selectInstagramPage,
    selectMessengerPage,
    selectWhatsAppPhone,
} from "@/lib/meta-setup"

describe("meta setup helpers", () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    test("buildMetaSetupStatus maps messenger and platform app states", () => {
        const status = buildMetaSetupStatus({
            origin: "https://preview.example.com",
            legacyIntegrations: {
                messenger: { connected: true },
            },
            omniConfig: {
                metaSetup: {
                    stage: "go_live",
                    selectedChannels: ["instagram", "messenger", "whatsapp"],
                    oauth: {
                        connectionMode: "platform_meta_app",
                    },
                    discovery: {
                        pages: [
                            {
                                id: "page-1",
                                name: "Demo Page",
                                instagramAccount: { id: "ig-1", username: "demo", name: "Demo" },
                                messagingEligible: true,
                            },
                        ],
                        whatsappBusinesses: [],
                        errors: { instagram: null, messenger: null, whatsapp: "Manual fallback" },
                    },
                },
                instagram: {
                    enabled: true,
                    pageId: "page-1",
                    accountId: "ig-1",
                    accessTokenRef: "token",
                    verifyToken: "verify-1",
                    webhookStatus: "pending",
                    setupStatus: "ready_for_live",
                    setupStage: "go_live",
                    connectionMode: "platform_meta_app",
                },
                messenger: {
                    enabled: true,
                    pageId: "page-1",
                    accessTokenRef: "token",
                    verifyToken: "verify-1",
                    webhookStatus: "connected",
                    setupStatus: "live",
                    setupStage: "live",
                    connectionMode: "platform_meta_app",
                },
                whatsapp: {
                    enabled: false,
                },
            },
        })

        expect(status.wizard.connectionMode).toBe("platform_meta_app")
        expect(status.channels.instagram.readyForLive).toBe(true)
        expect(status.channels.messenger.connected).toBe(true)
        expect(status.channels.messenger.webhookUrl).toBe("https://preview.example.com/api/omni/channels/messenger/webhook")
    })

    test("discoverMetaAssets returns shared pages and whatsapp businesses", async () => {
        vi.stubGlobal(
            "fetch",
            vi
                .fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        data: [
                            {
                                id: "page-1",
                                name: "Demo Page",
                                access_token: "page-token",
                                tasks: ["MESSAGING"],
                                instagram_business_account: {
                                    id: "ig-1",
                                    username: "demo-shop",
                                    name: "Demo Shop",
                                },
                            },
                        ],
                    }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        data: [
                            {
                                id: "business-1",
                                name: "Business One",
                                owned_whatsapp_business_accounts: [{ id: "waba-1", name: "WABA One" }],
                            },
                        ],
                    }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        data: [
                            {
                                id: "phone-1",
                                display_phone_number: "+90 555 000 00 00",
                                verified_name: "Demo",
                            },
                        ],
                    }),
                })
        )

        const result = await discoverMetaAssets("meta-token")

        expect(result.pages).toEqual([
            {
                id: "page-1",
                name: "Demo Page",
                pageAccessToken: "page-token",
                messagingEligible: true,
                instagramAccount: {
                    id: "ig-1",
                    username: "demo-shop",
                    name: "Demo Shop",
                },
            },
        ])
        expect(result.whatsappBusinesses[0]?.phoneNumbers[0]?.displayNumber).toBe("+90 555 000 00 00")
        expect(result.errors.instagram).toBeNull()
        expect(result.errors.messenger).toBeNull()
        expect(result.errors.whatsapp).toBeNull()
    })

    test("autoSelectMetaAssets reuses same page for instagram and messenger", () => {
        const selection = autoSelectMetaAssets(
            {
                pages: [
                    {
                        id: "page-1",
                        name: "Demo Page",
                        messagingEligible: true,
                        instagramAccount: { id: "ig-1", username: "demo", name: "Demo" },
                    },
                ],
                whatsappBusinesses: [
                    {
                        id: "waba-1",
                        name: "WABA",
                        phoneNumbers: [{ id: "phone-1", displayNumber: "+90 555 000 00 00", verifiedName: "Demo" }],
                    },
                ],
                errors: { instagram: null, messenger: null, whatsapp: null },
            },
            ["instagram", "messenger", "whatsapp"]
        )

        expect(selection.instagramPage?.id).toBe("page-1")
        expect(selection.messengerPage?.id).toBe("page-1")
        expect(selection.whatsappPhone?.id).toBe("phone-1")
    })

    test("buildMetaOAuthScopes only requests selected channel permissions", () => {
        expect(buildMetaOAuthScopes(["messenger", "whatsapp"])).toEqual([
            "business_management",
            "pages_show_list",
            "pages_manage_metadata",
            "pages_messaging",
            "whatsapp_business_management",
            "whatsapp_business_messaging",
        ])

        expect(buildMetaOAuthScopes(["instagram"])).toEqual([
            "business_management",
            "pages_show_list",
            "instagram_basic",
            "instagram_manage_messages",
            "pages_manage_metadata",
            "pages_messaging",
        ])
    })

    test("select helpers return matching discovery items", () => {
        const discovery = {
            pages: [
                {
                    id: "page-1",
                    name: "Demo Page",
                    pageAccessToken: "page-token",
                    messagingEligible: true,
                    instagramAccount: { id: "ig-1", username: "demo", name: "Demo" },
                },
            ],
            whatsappBusinesses: [
                {
                    id: "waba-1",
                    name: "Business One",
                    phoneNumbers: [
                        {
                            id: "phone-1",
                            displayNumber: "+90 555 000 00 00",
                            verifiedName: "Demo",
                        },
                    ],
                },
            ],
        }

        expect(selectInstagramPage(discovery, "page-1")?.instagramAccount?.id).toBe("ig-1")
        expect(selectMessengerPage(discovery, "page-1")?.id).toBe("page-1")
        expect(selectWhatsAppPhone(discovery, "waba-1", "phone-1").phoneNumber?.displayNumber).toBe("+90 555 000 00 00")
    })
})
