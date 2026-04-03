import { beforeEach, describe, expect, test, vi } from "vitest";
import { POST } from "./route";
import { getAdminDb } from "@/lib/firebase-admin";
import { generateOmniVoiceTurn } from "@/lib/omni/assistant-core";
import { logOmniAuditEvent } from "@/lib/omni/audit-log";
import { upsertOmniContactMemory } from "@/lib/omni/memory";
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

vi.mock("@/lib/omni/assistant-core", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/assistant-core")>("@/lib/omni/assistant-core");
    return {
        ...actual,
        generateOmniVoiceTurn: vi.fn(),
    };
});

vi.mock("@/lib/omni/audit-log", () => ({
    logOmniAuditEvent: vi.fn(),
}));

vi.mock("@/lib/omni/memory", () => ({
    upsertOmniContactMemory: vi.fn(),
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
    contactKey?: string | null;
    assistantProfileId?: string | null;
    channelMeta?: Record<string, unknown>;
    messages?: Array<Record<string, unknown>>;
};

function createAdminDb(options?: {
    session?: SessionRecord | null;
    voiceNumber?: Record<string, unknown>;
}) {
    const session = options?.session;
    const voiceNumber = options?.voiceNumber || {
        defaultLocale: "tr-TR",
        ttsVoice: "alice",
        callbackEnabled: true,
    };

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

            if (name === "voice_numbers") {
                return {
                    doc: vi.fn().mockImplementation(() => ({
                        get: vi.fn().mockResolvedValue({
                            exists: true,
                            data: () => voiceNumber,
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
            "x-twilio-signature": "twilio-test",
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
    vi.mocked(generateOmniVoiceTurn).mockResolvedValue({
        rawResponse: "Size yardimci olabilirim.",
        spokenResponse: "Size yardimci olabilirim.",
        shouldOfferCallback: false,
        assistantProfileId: "omni-default",
    } as any);
});

describe("POST /api/omni/channels/voice/turn", () => {
    test("returns the last assistant message when a duplicate turn callback is received", async () => {
        vi.mocked(getAdminDb).mockReturnValue(
            createAdminDb({
                session: {
                    id: "voice-CA321",
                    contactKey: "+905550001122",
                    messages: [
                        { role: "user", content: "Merhaba" },
                        { role: "assistant", content: "Size yardimci olabilirim." },
                    ],
                    channelMeta: {
                        locale: "tr-TR",
                    },
                },
            }) as any
        );
        vi.mocked(claimOmniWebhookEvent).mockResolvedValue({
            duplicate: true,
            record: { id: "replay-turn-1" },
        } as any);

        const response = await POST(
            createRequest("http://localhost/api/omni/channels/voice/turn?chatbotId=tenant-1&sessionId=voice-CA321&voiceNumberId=line-1", {
                CallSid: "CA321",
                From: "+905550001122",
                SpeechResult: "Tekrar merhaba",
            })
        );

        expect(response.status).toBe(200);
        const xml = await response.text();
        expect(xml).toContain("Size yardimci olabilirim.");
        expect(generateOmniVoiceTurn).not.toHaveBeenCalled();
        expect(logOmniAuditEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                channel: "voice",
                eventType: "voice.webhook_replay",
                result: "success",
            })
        );
    });

    test("creates a callback ticket when empty speech capture is repeated and callback is enabled", async () => {
        vi.mocked(getAdminDb).mockReturnValue(
            createAdminDb({
                session: {
                    id: "voice-CA777",
                    contactKey: "+905550001122",
                    messages: [],
                },
                voiceNumber: {
                    defaultLocale: "tr-TR",
                    ttsVoice: "alice",
                    callbackEnabled: true,
                },
            }) as any
        );
        vi.mocked(claimOmniWebhookEvent).mockResolvedValue({
            duplicate: false,
            record: { id: "turn-claim-1" },
        } as any);

        const response = await POST(
            createRequest("http://localhost/api/omni/channels/voice/turn?chatbotId=tenant-1&sessionId=voice-CA777&voiceNumberId=line-1&empty=1", {
                CallSid: "CA777",
                From: "+905550001122",
            })
        );

        expect(response.status).toBe(200);
        const xml = await response.text();
        expect(xml).toContain("Sizi duyamadim");
        expect(xml).toContain("<Hangup/>");
        expect(upsertCallbackRequest).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                id: "voice-CA777",
                chatbotId: "tenant-1",
                contactKey: "+905550001122",
                sourceChannel: "voice",
                resolutionStatus: "waiting",
            })
        );
        expect(upsertOmniSession).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                sessionId: "voice-CA777",
                chatbotId: "tenant-1",
                handoffStatus: "callback_requested",
                lastDisposition: "callback_requested",
            })
        );
        expect(generateOmniVoiceTurn).not.toHaveBeenCalled();
        expect(upsertOmniContactMemory).not.toHaveBeenCalled();
    });

    test("persists awaiting_repeat when speech capture is empty on the first prompt", async () => {
        vi.mocked(getAdminDb).mockReturnValue(
            createAdminDb({
                session: {
                    id: "voice-CA889",
                    contactKey: "+905550001122",
                    assistantProfileId: "voice-default",
                    channelMeta: {
                        noSpeechCount: 0,
                    },
                    messages: [],
                },
            }) as any
        );
        vi.mocked(claimOmniWebhookEvent).mockResolvedValue({
            duplicate: false,
            record: { id: "turn-claim-2" },
        } as any);

        const response = await POST(
            createRequest("http://localhost/api/omni/channels/voice/turn?chatbotId=tenant-1&sessionId=voice-CA889&voiceNumberId=line-1", {
                CallSid: "CA889",
                From: "+905550001122",
            })
        );

        expect(response.status).toBe(200);
        const xml = await response.text();
        expect(xml).toContain("Lutfen tekrar eder misiniz");
        expect(upsertOmniSession).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                sessionId: "voice-CA889",
                lastDisposition: "awaiting_repeat",
                channelMeta: expect.objectContaining({
                    noSpeechCount: 1,
                    voiceNumberId: "line-1",
                }),
            })
        );
        expect(logOmniAuditEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                channel: "voice",
                eventType: "voice.empty_speech",
                result: "success",
            })
        );
    });

    test("falls back safely when voice turn generation fails", async () => {
        vi.mocked(getAdminDb).mockReturnValue(
            createAdminDb({
                session: {
                    id: "voice-CA990",
                    contactKey: "+905550001122",
                    assistantProfileId: "voice-sales",
                    messages: [],
                    channelMeta: {
                        locale: "tr-TR",
                    },
                },
            }) as any
        );
        vi.mocked(claimOmniWebhookEvent).mockResolvedValue({
            duplicate: false,
            record: { id: "turn-claim-3" },
        } as any);
        vi.mocked(generateOmniVoiceTurn).mockRejectedValue(new Error("AI unavailable"));

        const response = await POST(
            createRequest("http://localhost/api/omni/channels/voice/turn?chatbotId=tenant-1&sessionId=voice-CA990&voiceNumberId=line-1", {
                CallSid: "CA990",
                From: "+905550001122",
                SpeechResult: "Siparisim nerede",
            })
        );

        expect(response.status).toBe(200);
        const xml = await response.text();
        expect(xml).toContain("geri arama talebi birakabilirsiniz");
        expect(logOmniAuditEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                channel: "voice",
                eventType: "voice.turn_error",
                result: "error",
            })
        );
        expect(upsertOmniSession).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                sessionId: "voice-CA990",
                lastDisposition: "assistant_fallback",
                assistantProfileId: "voice-sales",
            })
        );
    });
});
