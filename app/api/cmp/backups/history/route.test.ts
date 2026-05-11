import { describe, expect, test, vi } from "vitest"
import { GET } from "./route"

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

function createAdminDb(items: any[]) {
  return {
    collection: vi.fn().mockImplementation((name: string) => {
      if (name === "users") {
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(createDoc({ productEntitlements: { cookieConsent: true }, role: "USER" })),
          }),
        }
      }

      if (name === "cmp_consent_backup_history") {
        return {
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                docs: items.map((it) => ({ id: it.id, data: () => it.data })),
              }),
            }),
          }),
        }
      }

      return {}
    }),
  }
}

describe("GET /api/cmp/backups/history", () => {
  test("returns history sorted", async () => {
    const { getAdminAuth, getAdminDb } = await import("@/lib/firebase-admin")
    ;(getAdminAuth as any).mockReturnValue({ verifyIdToken: vi.fn().mockResolvedValue({ uid: "u1" }) })
    ;(getAdminDb as any).mockReturnValue(
      createAdminDb([
        { id: "h1", data: { tenantId: "u1", createdAt: "2026-01-01T00:00:00.000Z" } },
        { id: "h2", data: { tenantId: "u1", createdAt: "2026-02-01T00:00:00.000Z" } },
      ])
    )

    const req = new Request("http://localhost/api/cmp/backups/history?limit=10", {
      headers: { Authorization: "Bearer test" },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.items[0].id).toBe("h2")
  })
})

