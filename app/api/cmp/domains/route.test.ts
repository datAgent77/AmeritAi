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

function createAdminDb(domains: any[]) {
  return {
    collection: vi.fn().mockImplementation((name: string) => {
      if (name === "users") {
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(
              createDoc({ productEntitlements: { cookieConsent: true }, role: "USER" })
            ),
          }),
        }
      }
      if (name === "cmp_domains") {
        return {
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                docs: domains.map((d) => ({ id: d.id, data: () => d.data })),
              }),
            }),
          }),
        }
      }
      return {}
    }),
  }
}

describe("/api/cmp/domains", () => {
  test("GET returns 401 without bearer token", async () => {
    const { getAdminAuth, getAdminDb } = await import("@/lib/firebase-admin")
    ;(getAdminAuth as any).mockReturnValue({ verifyIdToken: vi.fn() })
    ;(getAdminDb as any).mockReturnValue(createAdminDb([]))

    const res = await GET(new Request("http://localhost/api/cmp/domains"))
    expect(res.status).toBe(401)
  })

  test("GET returns domains for authorized user", async () => {
    const { getAdminAuth, getAdminDb } = await import("@/lib/firebase-admin")
    ;(getAdminAuth as any).mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: "u1" }),
    })
    ;(getAdminDb as any).mockReturnValue(
      createAdminDb([
        { id: "dom_1", data: { tenantId: "u1", name: "Example", primaryHostname: "example.com", updatedAt: "2026-01-01T00:00:00.000Z" } },
      ])
    )

    const req = new Request("http://localhost/api/cmp/domains", {
      headers: { Authorization: "Bearer test" },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.domains)).toBe(true)
    expect(json.domains[0].primaryHostname).toBe("example.com")
  })
})

