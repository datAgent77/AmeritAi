import { beforeEach, describe, expect, test, vi } from "vitest";
import { POST } from "./route";
import { getAdminDb } from "@/lib/firebase-admin";
import { logOmniAuditEvent } from "@/lib/omni/audit-log";
import { claimOmniWebhookEvent } from "@/lib/omni/replay-protection";
import {
    getOmniChannelConfig,
    normalizeVoiceIntegrationConfig,
    upsertCallbackRequest,
    upsertOmniSession,
    verifyTwilioWebhookSignature,
} from "@/lib/omni/server-utils";

vi.mock("@/lib/firebase-admin", () => ({
    getAdminDb: vi.fn(),
}));

vi.mock("@/lib/omni/audit-log", () => ({
    logOmniAuditEvent: vi.fn(),
}));

vi.mock("@/lib/omni/replay-protection", () => ({
    claimOmniWebhookEvent: vi.fn(),
}));

vi.mock("@/lib/omni/server-utils", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/server-utils")>("@/lib/omni/server-utils");
    return {
        ...actual,
        getOmniChannelConfig: vi.fn(),
        normalizeVoiceIntegrationConfig: vi.fn(),
        upsertCallbackRequest: vi.fn(),
        upsertOmniSession: vi.fn(),
        verifyTwilioWebhookSignature: vi.fn(),
    };
});

type SessionRecord = {
    id: string;
    chatbotId: string;
    contactKey?: string | null;
    handoffStatus?: string | null;
    assistantProfileId?: string | null;
    visitorName?: string | null;
    channelMeta?: Record<string, unknown>;
    messages?: Array<Record<string, unknown>>;
};

function createAdminDb(options?: {
    session?: SessionRecord | null;
    callbackExists?: boolean;
}) {
    const session = options?.session;
    const callbackExists = options?.callbackExists !== false;

    return {
        collection: vi.fn().mockImplementation((name: string) => {
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

            if (name === "callback_requests") {
                return {
                    doc: vi.fn().mockImplementation(() => ({
                        get: vi.fn().mockResolvedValue({
                            exists: callbackExists,
                            data: () => (callbackExists ? { id: "callback-1" } : null),
                        }),
                    })),
                };
            }

            throw new Error(`Unexpected collection: ${name}`);
        }),
    };
}

function createRequest(url: string, params: Record<string, string>) {
    return new Request(url, {
        method: "POST",
        headers: {
            "content-type": "application/x-www-form-urlencoded",
            "x-twilio-signature": "test-signature",
        },
        body: new URLSearchParams(params).toString(),
    });
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOmniChannelConfig).mockResolvedValue({
        voiceIntegration: {
            authToken: "auth-token",
        },
    } as any);
    vi.mocked(normalizeVoiceIntegrationConfig).mockReturnValue({
        authToken: "auth-token",
    } as any);
    vi.mocked(verifyTwilioWebhookSignature).mockReturnValue(true);
});

describe("POST /api/omni/channels/voice/status", () => {
    test("ignores duplicate voice status callbacks", async () => {
        vi.mocked(getAdminDb).mockReturnValue(
            createAdminDb({
                session: {
                    id: "voice-CA123",
                    chatbotId: "tenant-1",
                    contactKey: "+905550001122",
                    assistantProfileId: "voice-sales",
                    channelMeta: {
                        callbackId: "callback-1",
                        voiceNumberId: "voice-number-1",
                    },
                },
            }) as any
        );
        vi.mocked(claimOmniWebhookEvent).mockResolvedValue({
            duplicate: true,
            record: { id: "replay-1" },
        } as any);

        const response = await POST(
            createRequest("http://localhost/api/omni/channels/voice/status", {
                CallSid: "CA123",
                CallStatus: "completed",
                CallDuration: "45",
            })
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ ok: true, ignored: true });
        expect(upsertOmniSession).not.toHaveBeenCalled();
        expect(upsertCallbackRequest).not.toHaveBeenCalled();
        expect(logOmniAuditEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                channel: "voice",
                eventType: "voice.webhook_replay",
                result: "success",
            })
        );
    });

    test("updates session and callback resolution when a call completes", async () => {
        vi.mocked(getAdminDb).mockReturnValue(
            createAdminDb({
                session: {
                    id: "voice-CA999",
                    chatbotId: "tenant-1",
                    contactKey: "+905550001122",
                    visitorName: "Ayse",
                    handoffStatus: "callback_requested",
                    assistantProfileId: "voice-support",
                    channelMeta: {
                        callbackId: "callback-voice-1",
                        voiceNumberId: "voice-number-1",
                    },
                    messages: [
                        { role: "user", content: "Merhaba" },
                        { role: "assistant", content: "Size yardimci oluyorum." },
                    ],
                },
            }) as any
        );
        vi.mocked(claimOmniWebhookEvent).mockResolvedValue({
            duplicate: false,
            record: { id: "claim-1" },
        } as any);

        const response = await POST(
            createRequest("http://localhost/api/omni/channels/voice/status?callbackId=callback-voice-1", {
                CallSid: "CA999",
                CallStatus: "completed",
                CallDuration: "90",
            })
        );

        expect(response.status).toBe(200);
        expect(upsertOmniSession).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                sessionId: "voice-CA999",
                chatbotId: "tenant-1",
                lastDisposition: "completed",
                assistantProfileId: "voice-support",
                channelMeta: expect.objectContaining({
                    callSid: "CA999",
                    callbackId: "callback-voice-1",
                    voiceNumberId: "voice-number-1",
                    normalizedDisposition: "completed",
                }),
            })
        );
        expect(upsertCallbackRequest).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                id: "callback-voice-1",
                chatbotId: "tenant-1",
                contactKey: "+905550001122",
                status: "resolved",
                resolutionStatus: "completed",
                activeCallSid: "CA999",
                voiceNumberId: "voice-number-1",
            })
        );
        expect(logOmniAuditEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                channel: "voice",
                eventType: "voice.call_status",
                result: "success",
            })
        );
    });

    test("maps no-answer to missed disposition and keeps callback pending", async () => {
        vi.mocked(getAdminDb).mockReturnValue(
            createAdminDb({
                session: {
                    id: "voice-CA555",
                    chatbotId: "tenant-1",
                    contactKey: "+905550001122",
                    handoffStatus: "callback_requested",
                    channelMeta: {
                        callbackId: "callback-voice-2",
                        voiceNumberId: "voice-number-2",
                        locale: "tr-TR",
                    },
                    messages: [],
                },
            }) as any
        );
        vi.mocked(claimOmniWebhookEvent).mockResolvedValue({
            duplicate: false,
            record: { id: "claim-2" },
        } as any);

        const response = await POST(
            createRequest("http://localhost/api/omni/channels/voice/status?callbackId=callback-voice-2", {
                CallSid: "CA555",
                CallStatus: "no-answer",
                CallDuration: "0",
            })
        );

        expect(response.status).toBe(200);
        expect(upsertOmniSession).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                sessionId: "voice-CA555",
                lastDisposition: "missed",
                channelMeta: expect.objectContaining({
                    voiceNumberId: "voice-number-2",
                    normalizedDisposition: "missed",
                }),
            })
        );
        expect(upsertCallbackRequest).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                id: "callback-voice-2",
                chatbotId: "tenant-1",
                status: "pending",
                resolutionStatus: "waiting",
            })
        );
        expect(logOmniAuditEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                channel: "voice",
                eventType: "voice.call_status",
                result: "error",
            })
        );
    });
});
