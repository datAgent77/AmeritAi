import { beforeEach, describe, expect, test, vi } from "vitest";
import { POST } from "./route";
import { getAdminDb } from "@/lib/firebase-admin";
import { dispatchOmniWhatsAppMessage } from "@/lib/omni/channel-dispatch";
import { executeOmniAction } from "@/lib/omni/action-execution";
import { generateOmniTextTurn } from "@/lib/omni/assistant-core";
import { maybeExecuteOmniAutoActions } from "@/lib/omni/auto-actions";
import { logOmniAuditEvent } from "@/lib/omni/audit-log";
import { upsertOmniContactMemory } from "@/lib/omni/memory";
import { claimOmniWebhookEvent } from "@/lib/omni/replay-protection";
import { resolveGuidedSkillTurn } from "@/lib/guided-skills/engine";
import { upsertContactGraph, upsertOmniSession, verifyMetaWebhookSignature } from "@/lib/omni/server-utils";

vi.mock("@/lib/firebase-admin", () => ({
    getAdminDb: vi.fn(),
}));

vi.mock("@/lib/omni/channel-dispatch", () => ({
    dispatchOmniWhatsAppMessage: vi.fn(),
}));

vi.mock("@/lib/omni/action-execution", () => ({
    executeOmniAction: vi.fn(),
}));

vi.mock("@/lib/omni/assistant-core", () => ({
    generateOmniTextTurn: vi.fn(),
}));

vi.mock("@/lib/omni/auto-actions", () => ({
    maybeExecuteOmniAutoActions: vi.fn(),
}));

vi.mock("@/lib/omni/audit-log", () => ({
    logOmniAuditEvent: vi.fn(),
}));

vi.mock("@/lib/omni/memory", () => ({
    upsertOmniContactMemory: vi.fn(),
}));

vi.mock("@/lib/omni/replay-protection", () => ({
    claimOmniWebhookEvent: vi.fn(),
}));

vi.mock("@/lib/guided-skills/engine", () => ({
    resolveGuidedSkillTurn: vi.fn(),
}));

vi.mock("@/lib/omni/server-utils", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/server-utils")>("@/lib/omni/server-utils");
    return {
        ...actual,
        upsertContactGraph: vi.fn(),
        upsertOmniSession: vi.fn(),
        verifyMetaWebhookSignature: vi.fn(),
    };
});

type SessionDoc = {
    id: string;
    messages?: Array<Record<string, unknown>>;
    visitorName?: string | null;
    visitorEmail?: string | null;
    assistantProfileId?: string | null;
    channelMeta?: Record<string, unknown>;
};

function createConfigSnapshot(config: Record<string, unknown>) {
    return {
        empty: false,
        docs: [
            {
                id: "tenant-1",
                data: () => config,
            },
        ],
    };
}

function createAdminDb(options?: {
    config?: Record<string, unknown>;
    session?: SessionDoc | null;
}) {
    const config = options?.config || {
        chatbotId: "tenant-1",
        whatsapp: {
            enabled: true,
            defaultReplyMode: "assistant",
            phoneNumberId: "phone-1",
            appSecretRef: "secret",
        },
    };

    const session = options?.session;

    return {
        collection: vi.fn().mockImplementation((name: string) => {
            if (name === "omni_channel_configs") {
                return {
                    where: vi.fn().mockImplementation((field: string, _op: string, value: unknown) => ({
                        limit: vi.fn().mockReturnValue({
                            get: vi.fn().mockResolvedValue(
                                field === "whatsapp.phoneNumberId" && value === "phone-1"
                                    ? createConfigSnapshot(config)
                                    : { empty: true, docs: [] }
                            ),
                        }),
                    })),
                };
            }

            if (name === "chat_sessions") {
                return {
                    doc: vi.fn().mockImplementation((id: string) => ({
                        get: vi.fn().mockResolvedValue({
                            exists: Boolean(session && session.id === id),
                            data: () => (session && session.id === id ? session : null),
                        }),
                    })),
                };
            }

            throw new Error(`Unexpected collection: ${name}`);
        }),
    };
}

function createWhatsAppPayload(messageOverrides?: Record<string, unknown>) {
    return {
        entry: [
            {
                changes: [
                    {
                        value: {
                            metadata: {
                                phone_number_id: "phone-1",
                                display_phone_number: "+90 555 000 11 22",
                            },
                            messages: [
                                {
                                    id: "wamid-1",
                                    from: "+905550001122",
                                    timestamp: "1710000000",
                                    text: {
                                        body: "Merhaba, geri arar misiniz?",
                                    },
                                    ...messageOverrides,
                                },
                            ],
                        },
                    },
                ],
            },
        ],
    };
}

function createRequest(body: Record<string, unknown>) {
    return new Request("http://localhost/api/omni/channels/whatsapp/webhook", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-hub-signature-256": "sha256=test",
        },
        body: JSON.stringify(body),
    });
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(upsertContactGraph).mockResolvedValue({
        id: "contact-1",
        contactKey: "+905550001122",
    } as any);
    vi.mocked(resolveGuidedSkillTurn).mockResolvedValue({
        handled: false,
        guidedTextMenu: null,
        nextState: null,
    } as any);
});

describe("POST /api/omni/channels/whatsapp/webhook", () => {
    test("rejects invalid Meta signature", async () => {
        vi.mocked(getAdminDb).mockReturnValue(createAdminDb() as any);
        vi.mocked(verifyMetaWebhookSignature).mockReturnValue(false);

        const response = await POST(createRequest(createWhatsAppPayload()));

        expect(response.status).toBe(403);
        expect(logOmniAuditEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                channel: "whatsapp",
                eventType: "whatsapp.webhook_signature",
                result: "denied",
            })
        );
        expect(claimOmniWebhookEvent).not.toHaveBeenCalled();
    });

    test("ignores replayed webhook events before processing the message", async () => {
        vi.mocked(getAdminDb).mockReturnValue(createAdminDb() as any);
        vi.mocked(verifyMetaWebhookSignature).mockReturnValue(true);
        vi.mocked(claimOmniWebhookEvent).mockResolvedValue({
            duplicate: true,
            record: { id: "replay-1" },
        } as any);

        const response = await POST(createRequest(createWhatsAppPayload()));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ received: true });
        expect(generateOmniTextTurn).not.toHaveBeenCalled();
        expect(dispatchOmniWhatsAppMessage).not.toHaveBeenCalled();
        expect(upsertContactGraph).not.toHaveBeenCalled();
        expect(logOmniAuditEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                channel: "whatsapp",
                eventType: "whatsapp.webhook_replay",
                result: "success",
            })
        );
    });

    test("sends guided replies before invoking the assistant runtime", async () => {
        vi.mocked(getAdminDb).mockReturnValue(
            createAdminDb({
                session: {
                    id: "whatsapp-phone-1-+905550001122",
                    messages: [],
                    visitorName: "Ayse",
                    visitorEmail: "ayse@example.com",
                    assistantProfileId: "legacy-profile",
                    channelMeta: {},
                },
            }) as any
        );
        vi.mocked(verifyMetaWebhookSignature).mockReturnValue(true);
        vi.mocked(claimOmniWebhookEvent).mockResolvedValue({
            duplicate: false,
            record: { id: "claim-guided-1" },
        } as any);
        vi.mocked(resolveGuidedSkillTurn).mockResolvedValue({
            handled: true,
            assistantContent: "Select a ticket",
            guidedTextMenu: "Select a ticket\n\n1. TK123",
            nextState: {
                skillId: "flight-ops",
                stepId: "ticket",
                selections: {},
                channel: "whatsapp",
                status: "active",
                startedAt: "2026-03-30T10:00:00.000Z",
                updatedAt: "2026-03-30T10:00:00.000Z",
            },
            lastDisposition: "guided_skill_step",
        } as any);
        vi.mocked(dispatchOmniWhatsAppMessage).mockResolvedValue({
            messageId: "wa-guided-1",
        } as any);

        const response = await POST(createRequest(createWhatsAppPayload()));

        expect(response.status).toBe(200);
        expect(generateOmniTextTurn).not.toHaveBeenCalled();
        expect(dispatchOmniWhatsAppMessage).toHaveBeenCalledWith(
            expect.anything(),
            "tenant-1",
            expect.anything(),
            "Select a ticket\n\n1. TK123",
            expect.anything()
        );
        expect(upsertOmniSession).toHaveBeenLastCalledWith(
            expect.anything(),
            expect.objectContaining({
                guidedSkillState: expect.objectContaining({
                    skillId: "flight-ops",
                    stepId: "ticket",
                }),
                lastDisposition: "guided_skill_step",
            })
        );
    });

    test("processes auto-reply flow and persists the selected assistant profile", async () => {
        vi.mocked(getAdminDb).mockReturnValue(
            createAdminDb({
                session: {
                    id: "whatsapp-phone-1-+905550001122",
                    messages: [],
                    visitorName: "Ayse",
                    visitorEmail: "ayse@example.com",
                    assistantProfileId: "legacy-profile",
                    channelMeta: {},
                },
            }) as any
        );
        vi.mocked(verifyMetaWebhookSignature).mockReturnValue(true);
        vi.mocked(claimOmniWebhookEvent).mockResolvedValue({
            duplicate: false,
            record: { id: "claim-1" },
        } as any);
        vi.mocked(generateOmniTextTurn).mockResolvedValue({
            rawResponse: "Merhaba",
            replyText: "Merhaba",
            shouldOfferCallback: true,
            assistantProfileId: "sales-profile",
        } as any);
        vi.mocked(maybeExecuteOmniAutoActions).mockResolvedValue({
            disposition: "lead_created",
            createdLeadId: "lead-1",
            createdAppointmentId: null,
        } as any);
        vi.mocked(dispatchOmniWhatsAppMessage).mockResolvedValue({
            messageId: "wa-out-1",
        } as any);

        const response = await POST(createRequest(createWhatsAppPayload()));

        expect(response.status).toBe(200);
        expect(generateOmniTextTurn).toHaveBeenCalledWith(
            expect.objectContaining({
                chatbotId: "tenant-1",
                channel: "whatsapp",
                contactKey: "+905550001122",
            })
        );
        expect(executeOmniAction).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                actionId: "create_callback_request",
                sourceChannel: "whatsapp",
            })
        );
        expect(dispatchOmniWhatsAppMessage).toHaveBeenCalledWith(
            expect.anything(),
            "tenant-1",
            expect.anything(),
            "Merhaba Geri arama talebinizi kaydettim.",
            expect.anything()
        );

        const sessionCalls = vi.mocked(upsertOmniSession).mock.calls;
        expect(sessionCalls).toHaveLength(2);
        expect(sessionCalls[1]?.[1]).toEqual(
            expect.objectContaining({
                assistantProfileId: "sales-profile",
                handoffStatus: "callback_requested",
                lastDisposition: "callback_requested",
            })
        );
        expect(upsertOmniContactMemory).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                chatbotId: "tenant-1",
                contactKey: "+905550001122",
                assistantReply: "Merhaba Geri arama talebinizi kaydettim.",
                lastDisposition: "callback_requested",
            })
        );
        expect(logOmniAuditEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                channel: "whatsapp",
                eventType: "whatsapp.auto_reply",
                result: "success",
            })
        );
    });
});
