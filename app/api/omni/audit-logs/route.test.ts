import { beforeEach, describe, expect, test, vi } from "vitest";
import { GET } from "./route";
import { authorizeOmniRequest } from "@/lib/omni/server-utils";

vi.mock("@/lib/omni/server-utils", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/server-utils")>("@/lib/omni/server-utils");
    return {
        ...actual,
        authorizeOmniRequest: vi.fn(),
    };
});

function createDoc(id: string, data: Record<string, unknown>) {
    return {
        id,
        data: () => data,
    };
}

function createAdminDb() {
    const logs = [
        {
            id: "log-1",
            chatbotId: "tenant-1",
            channel: "voice",
            eventType: "voice.webhook_signature",
            result: "denied",
            source: "api/omni/channels/voice/inbound",
            message: "Invalid signature",
            createdAt: "2026-03-28T10:00:00.000Z",
        },
        {
            id: "log-2",
            chatbotId: "tenant-1",
            channel: "voice",
            eventType: "voice.test_call",
            result: "success",
            source: "api/omni/channels/voice/test-call",
            message: "Test call initiated",
            createdAt: "2026-03-28T10:05:00.000Z",
        },
        {
            id: "log-3",
            chatbotId: "tenant-1",
            channel: "whatsapp",
            eventType: "whatsapp.auto_reply",
            result: "success",
            source: "api/omni/channels/whatsapp/webhook",
            message: "Reply delivered",
            createdAt: "2026-03-28T10:10:00.000Z",
        },
    ];

    return {
        collection: vi.fn().mockImplementation((name: string) => {
            if (name !== "omni_audit_logs") {
                throw new Error(`Unexpected collection: ${name}`);
            }

            return {
                where(field: string, _op: string, value: unknown) {
                    const filtered = logs.filter((item) => item[field as keyof typeof item] === value);
                    return {
                        where(nextField: string, _nextOp: string, nextValue: unknown) {
                            const nextFiltered = filtered.filter((item) => item[nextField as keyof typeof item] === nextValue);
                            return {
                                limit() {
                                    return {
                                        async get() {
                                            return {
                                                docs: nextFiltered.map((item) => createDoc(item.id, item)),
                                            };
                                        },
                                    };
                                },
                            };
                        },
                        limit() {
                            return {
                                async get() {
                                    return {
                                        docs: filtered.map((item) => createDoc(item.id, item)),
                                    };
                                },
                            };
                        },
                    };
                },
            };
        }),
    };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("GET /api/omni/audit-logs", () => {
    test("filters by channel, result, and event prefix", async () => {
        vi.mocked(authorizeOmniRequest).mockResolvedValue({
            ok: true,
            adminDb: createAdminDb(),
            callerUid: "tenant-1",
            isSuperAdmin: false,
            isAgencyAdmin: false,
        } as any);

        const response = await GET(
            new Request(
                "http://localhost/api/omni/audit-logs?chatbotId=tenant-1&channel=voice&result=success&eventPrefix=voice.test_"
            )
        );

        expect(response.status).toBe(200);
        const payload = await response.json();
        expect(payload.logs).toHaveLength(1);
        expect(payload.logs[0].eventType).toBe("voice.test_call");
        expect(payload.logs[0].result).toBe("success");
    });

    test("returns 400 when chatbotId is missing", async () => {
        const response = await GET(new Request("http://localhost/api/omni/audit-logs?channel=voice"));
        expect(response.status).toBe(400);
    });
});
