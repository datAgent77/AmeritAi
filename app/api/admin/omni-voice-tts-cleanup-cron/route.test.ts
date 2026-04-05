import { beforeEach, describe, expect, test, vi } from "vitest"
import { GET } from "./route"
import { getAdminStorage } from "@/lib/firebase-admin"

vi.mock("@/lib/firebase-admin", () => ({
    getAdminStorage: vi.fn(),
}))

describe("GET /api/admin/omni-voice-tts-cleanup-cron", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        process.env.CRON_SECRET = "cron-secret"
    })

    test("rejects invalid cron secret", async () => {
        const response = await GET(new Request("https://preview.example.com/api/admin/omni-voice-tts-cleanup-cron?secret=wrong"))
        expect(response.status).toBe(401)
    })

    test("deletes expired voice tts cache objects", async () => {
        const deleteMock = vi.fn().mockResolvedValue(undefined)
        vi.mocked(getAdminStorage).mockReturnValue({
            bucket: vi.fn().mockReturnValue({
                getFiles: vi.fn().mockResolvedValue([
                    [
                        {
                            name: "omni/voice-tts/tenant-1/expired.mp3",
                            metadata: { metadata: { ttlAt: String(Date.now() - 1000) } },
                            delete: deleteMock,
                        },
                        {
                            name: "omni/voice-tts/tenant-1/fresh.mp3",
                            metadata: { metadata: { ttlAt: String(Date.now() + 60_000) } },
                            delete: vi.fn(),
                        },
                    ],
                ]),
            }),
        } as any)

        const response = await GET(new Request("https://preview.example.com/api/admin/omni-voice-tts-cleanup-cron?secret=cron-secret"))
        expect(response.status).toBe(200)
        expect(deleteMock).toHaveBeenCalledTimes(1)
        expect(await response.json()).toEqual(
            expect.objectContaining({
                ok: true,
                expired: 1,
                deleted: 1,
            })
        )
    })
})
