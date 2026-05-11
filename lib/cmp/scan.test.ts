import { describe, expect, test } from "vitest"
import { parseSetCookieHeaders } from "@/lib/cmp/scan"

describe("cmp scan cookie parsing", () => {
  test("parses multiple set-cookie headers", () => {
    const parsed = parseSetCookieHeaders([
      "a=1; Path=/; HttpOnly; SameSite=Lax",
      "b=2; Domain=example.com; Secure",
    ])
    expect(parsed.length).toBe(2)
    expect(parsed[0].name).toBe("a")
    expect(parsed[0].httpOnly).toBe(true)
    expect(parsed[1].name).toBe("b")
    expect(parsed[1].secure).toBe(true)
    expect(parsed[1].domain).toBe("example.com")
  })

  test("splits combined header with Expires comma", () => {
    const parsed = parseSetCookieHeaders([
      "a=1; Expires=Wed, 21 Oct 2015 07:28:00 GMT; Path=/, b=2; Path=/",
    ])
    expect(parsed.length).toBe(2)
    expect(parsed[0].name).toBe("a")
    expect(parsed[0].expires).toContain("21 Oct 2015")
    expect(parsed[1].name).toBe("b")
  })
})

