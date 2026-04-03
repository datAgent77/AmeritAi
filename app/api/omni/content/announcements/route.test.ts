import { beforeEach, describe, expect, test, vi } from "vitest"
import { GET, POST } from "./route"
import { authorizeOmniContentAdminRequest, getAnnouncementSettings, saveAnnouncementSettings } from "@/lib/omni/content-admin"

vi.mock("@/lib/omni/content-admin", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/content-admin")>("@/lib/omni/content-admin")
    return {
        ...actual,
        authorizeOmniContentAdminRequest: vi.fn(),
        getAnnouncementSettings: vi.fn(),
        saveAnnouncementSettings: vi.fn(),
    }
})

describe("/api/omni/content/announcements", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test("GET returns announcement payload", async () => {
        vi.mocked(authorizeOmniContentAdminRequest).mockResolvedValue({ ok: true } as any)
        vi.mocked(getAnnouncementSettings).mockResolvedValue({
            isActive: true,
            message: "Scheduled maintenance",
            updatedAt: "2026-03-28T10:00:00.000Z",
            updatedBy: "admin@example.com",
        })

        const response = await GET(new Request("https://example.com/api/omni/content/announcements"))
        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.announcement.isActive).toBe(true)
    })

    test("POST saves announcement payload", async () => {
        vi.mocked(authorizeOmniContentAdminRequest).mockResolvedValue({ ok: true, callerUid: "super-admin-1" } as any)
        vi.mocked(saveAnnouncementSettings).mockResolvedValue({
            isActive: false,
            message: "Paused",
            updatedAt: "2026-03-28T10:10:00.000Z",
            updatedBy: "super-admin-1",
        })

        const response = await POST(
            new Request("https://example.com/api/omni/content/announcements", {
                method: "POST",
                body: JSON.stringify({ isActive: false, message: "Paused" }),
            })
        )

        expect(response.status).toBe(200)
        expect(saveAnnouncementSettings).toHaveBeenCalledWith({
            isActive: false,
            message: "Paused",
            updatedBy: "super-admin-1",
        })
    })
})
