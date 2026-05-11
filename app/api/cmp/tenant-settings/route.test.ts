import { describe, expect, test, vi } from "vitest"
import { GET, PUT } from "./route"

vi.mock("@/lib/firebase-admin", () => ({
  getAdminAuth: vi.fn(),
  getAdminDb: vi.fn(),
}))

vi.mock("@/lib/omni/workspace-access", () => ({
  resolveCookieConsentEnabled: vi.fn().mockReturnValue(true),
}))

vi.mock("@/lib/user-roles", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/user-roles")>()
  return {
    ...actual,
    isSuperAdminRole: vi.fn().mockReturnValue(false),
  }
})

vi.mock("@/lib/firebase-errors", () => ({
  shouldUseFirebaseOfflineFallback: vi.fn().mockReturnValue(false),
}))

function createDoc(data: any) {
  return {
    exists: Boolean(data),
    data: () => data,
  }
}

function createAdminDb(initialBackupEmail: string | null) {
  const settingsData: any = initialBackupEmail
    ? {
        backupEmail: initialBackupEmail,
        backupDeliveryMethod: "link",
        backupLinkTtlHours: 12,
        retentionDaysConsents: 30,
        retentionDaysBackups: 60,
      }
    : null
  const setMock = vi.fn().mockResolvedValue(undefined)

  return {
    __setMock: setMock,
    collection: vi.fn().mockImplementation((name: string) => {
      if (name === "users") {
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(createDoc({ productEntitlements: { cookieConsent: true }, role: "USER" })),
          }),
        }
      }

      if (name === "cmp_tenant_settings") {
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(createDoc(settingsData)),
            set: setMock,
          }),
        }
      }

      return {}
    }),
  }
}

describe("/api/cmp/tenant-settings", () => {
  test("GET returns 401 without bearer token", async () => {
    const { getAdminAuth, getAdminDb } = await import("@/lib/firebase-admin")
    ;(getAdminAuth as any).mockReturnValue({ verifyIdToken: vi.fn() })
    ;(getAdminDb as any).mockReturnValue(createAdminDb(null))

    const res = await GET(new Request("http://localhost/api/cmp/tenant-settings"))
    expect(res.status).toBe(401)
  })

  test("GET returns settings", async () => {
    const { getAdminAuth, getAdminDb } = await import("@/lib/firebase-admin")
    ;(getAdminAuth as any).mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: "u1" }),
    })
    ;(getAdminDb as any).mockReturnValue(createAdminDb("ops@example.com"))

    const req = new Request("http://localhost/api/cmp/tenant-settings", {
      headers: { Authorization: "Bearer test" },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.settings.backupEmail).toBe("ops@example.com")
    expect(json.settings.backupDeliveryMethod).toBe("link")
    expect(json.settings.backupLinkTtlHours).toBe(12)
    expect(json.settings.retentionDaysConsents).toBe(30)
    expect(json.settings.retentionDaysBackups).toBe(60)
  })

  test("PUT validates email and persists", async () => {
    const { getAdminAuth, getAdminDb } = await import("@/lib/firebase-admin")
    ;(getAdminAuth as any).mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: "u1" }),
    })
    const db = createAdminDb(null)
    ;(getAdminDb as any).mockReturnValue(db)

    const req = new Request("http://localhost/api/cmp/tenant-settings", {
      method: "PUT",
      headers: { Authorization: "Bearer test", "Content-Type": "application/json" },
      body: JSON.stringify({
        backupEmail: "ops@example.com",
        backupDeliveryMethod: "link",
        backupLinkTtlHours: 48,
        retentionDaysConsents: 90,
        retentionDaysBackups: 180,
      }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(200)
    expect((db as any).__setMock).toHaveBeenCalled()
  })
})
