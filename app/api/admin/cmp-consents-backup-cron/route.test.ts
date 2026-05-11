import { describe, expect, test, beforeEach } from "vitest"
import { GET } from "./route"

beforeEach(() => {
  process.env.CRON_SECRET = "test-secret"
  delete process.env.CMP_CONSENTS_BACKUP_ENABLED
})

describe("GET /api/admin/cmp-consents-backup-cron", () => {
  test("rejects invalid secret", async () => {
    const response = await GET(new Request("http://localhost/api/admin/cmp-consents-backup-cron?secret=wrong"))
    expect(response.status).toBe(401)
  })

  test("skips when disabled", async () => {
    process.env.CMP_CONSENTS_BACKUP_ENABLED = "false"
    const response = await GET(new Request("http://localhost/api/admin/cmp-consents-backup-cron?secret=test-secret"))
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json?.skipped).toBe(true)
  })
})

