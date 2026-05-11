import { describe, expect, test, vi } from "vitest"
import { POST } from "./route"

vi.mock("@/lib/firebase-admin", () => ({
  getAdminAuth: vi.fn(),
  getAdminDb: vi.fn(),
  getAdminStorage: vi.fn(),
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

vi.mock("@/lib/email-service", () => ({
  sendCmpConsentsBackupEmail: vi.fn().mockResolvedValue(true),
}))

function createDoc(data: any) {
  return {
    exists: Boolean(data),
    data: () => data,
  }
}

function createAdminDb() {
  const addMock = vi.fn().mockResolvedValue(undefined)
  const setMock = vi.fn().mockResolvedValue(undefined)

  return {
    __addMock: addMock,
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
            get: vi.fn().mockResolvedValue(createDoc({ backupEmail: "ops@example.com" })),
          }),
        }
      }

      if (name === "cmp_consent_backup_history") {
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(
              createDoc({
                tenantId: "u1",
                storedObjectPath: "cmp-backups/consents/u1/file.csv",
                fromDate: "2026-01-01",
                toDate: "2026-01-06",
                attachmentFilename: "cmp_consents_2026-01-01_2026-01-06.csv",
                recipientEmail: "old@example.com",
                consentCount: 2,
              })
            ),
          }),
          add: addMock,
        }
      }

      if (name === "cmp_consent_backup_runs") {
        return {
          doc: vi.fn().mockReturnValue({
            set: setMock,
          }),
        }
      }

      return {}
    }),
  }
}

describe("POST /api/cmp/backups/resend", () => {
  test("resends from storage and records history", async () => {
    const { getAdminAuth, getAdminDb, getAdminStorage } = await import("@/lib/firebase-admin")
    ;(getAdminAuth as any).mockReturnValue({ verifyIdToken: vi.fn().mockResolvedValue({ uid: "u1" }) })
    const db = createAdminDb()
    ;(getAdminDb as any).mockReturnValue(db)
    ;(getAdminStorage as any).mockReturnValue({
      bucket: vi.fn().mockReturnValue({
        file: vi.fn().mockReturnValue({
          download: vi.fn().mockResolvedValue([Buffer.from("a,b\n1,2", "utf8")]),
        }),
      }),
    })

    const req = new Request("http://localhost/api/cmp/backups/resend", {
      method: "POST",
      headers: { Authorization: "Bearer test", "Content-Type": "application/json" },
      body: JSON.stringify({ historyId: "h1" }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect((db as any).__addMock).toHaveBeenCalled()
    expect((db as any).__setMock).toHaveBeenCalled()
  })
})

