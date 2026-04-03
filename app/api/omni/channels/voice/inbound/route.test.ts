import { beforeEach, describe, expect, test, vi } from "vitest";
import { POST } from "./route";
import { getAdminDb } from "@/lib/firebase-admin";
import { logOmniAuditEvent } from "@/lib/omni/audit-log";
import { renderVoicePrompt } from "@/lib/omni/voice-renderer";
import {
    getOmniChannelConfig,
    normalizeVoiceIntegrationConfig,
    upsertContactGraph,
    upsertOmniSession,
    verifyTwilioWebhookSignature,
} from "@/lib/omni/server-utils";

vi.mock("@/lib/firebase-admin", () => ({
    getAdminDb: vi.fn(),
}));

vi.mock("@/lib/omni/audit-log", () => ({
    logOmniAuditEvent: vi.fn(),
}));

vi.mock("@/lib/omni/voice-renderer", () => ({
    renderVoicePrompt: vi.fn().mockResolvedValue({
        twimlFragment: "<Play>https://cdn.example.com/voice.mp3</Play>",
        provider: "elevenlabs",
        fallbackUsed: false,
    }),
}));

vi.mock("@/lib/omni/server-utils", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/server-utils")>("@/lib/omni/server-utils");
    return {
        ...actual,
        getOmniChannelConfig: vi.fn(),
        normalizeVoiceIntegrationConfig: vi.fn(),
        upsertContactGraph: vi.fn(),
        upsertOmniSession: vi.fn(),
        verifyTwilioWebhookSignature: vi.fn(),
    };
});

function createAdminDb(options?: {
    paused?: boolean;
    empty?: boolean;
}) {
    const empty = options?.empty === true;
    const paused = options?.paused === true;

    return {
        collection: vi.fn().mockImplementation((name: string) => {
            if (name === "voice_numbers") {
                return {
                    where: vi.fn().mockImplementation((field: string, _op: string, value: unknown) => ({
                        limit: vi.fn().mockReturnValue({
                            get: vi.fn().mockResolvedValue(
                                !empty && field === "phoneNumber" && value === "+905551112233"
                                    ? {
                                          empty: false,
                                          docs: [
                                              {
                                                  id: "voice-line-1",
                                                  data: () => ({
                                                      chatbotId: "tenant-1",
                                                      phoneNumber: "+905551112233",
                                          defaultLocale: "tr-TR",
                                          ttsVoice: "alice",
                                          ttsProvider: "elevenlabs",
                                          elevenLabsVoiceId: "voice_123",
                                          greetingMessage: "Merhaba, size nasil yardimci olabilirim?",
                                          twilioNumberSid: "PN123",
                                          routingStatus: paused ? "paused" : "active",
                                                  }),
                                              },
                                          ],
                                      }
                                    : { empty: true, docs: [] }
                            ),
                        }),
                    })),
                };
            }

            throw new Error(`Unexpected collection: ${name}`);
        }),
    };
}

function createRequest(params: Record<string, string>) {
    return new Request("http://localhost/api/omni/channels/voice/inbound", {
        method: "POST",
        headers: {
            "content-type": "application/x-www-form-urlencoded",
            "x-twilio-signature": "twilio-signature",
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
        elevenLabsApiKeyRef: "env:ELEVENLABS_API_KEY",
    } as any);
});

describe("POST /api/omni/channels/voice/inbound", () => {
    test("rejects invalid Twilio signature", async () => {
        vi.mocked(getAdminDb).mockReturnValue(createAdminDb() as any);
        vi.mocked(verifyTwilioWebhookSignature).mockReturnValue(false);

        const response = await POST(
            createRequest({
                CallSid: "CA101",
                From: "+905550001122",
                Called: "+905551112233",
            })
        );

        expect(response.status).toBe(403);
        expect(logOmniAuditEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                channel: "voice",
                eventType: "voice.webhook_signature",
                result: "denied",
            })
        );
        expect(upsertOmniSession).not.toHaveBeenCalled();
        expect(upsertContactGraph).not.toHaveBeenCalled();
    });

    test("creates the voice session and returns greeting gather XML", async () => {
        vi.mocked(getAdminDb).mockReturnValue(createAdminDb() as any);
        vi.mocked(verifyTwilioWebhookSignature).mockReturnValue(true);

        const response = await POST(
            createRequest({
                CallSid: "CA202",
                From: "+905550001122",
                Called: "+905551112233",
                FromCity: "Istanbul",
            })
        );

        expect(response.status).toBe(200);
        const xml = await response.text();
        expect(xml).toContain("<Play>https://cdn.example.com/voice.mp3</Play>");
        expect(xml).toContain("<Gather");
        expect(xml).toContain("/api/omni/channels/voice/turn?");
        expect(renderVoicePrompt).toHaveBeenCalled();
        expect(upsertOmniSession).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                sessionId: "voice-CA202",
                chatbotId: "tenant-1",
                contactKey: "+905550001122",
                assistantProfileId: "omni-default",
            })
        );
        expect(upsertContactGraph).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                chatbotId: "tenant-1",
                channel: "voice",
                contactKey: "+905550001122",
                verifiedPhone: "+905550001122",
            })
        );
    });
});
