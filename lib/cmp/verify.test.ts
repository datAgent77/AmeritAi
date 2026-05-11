import { describe, expect, test } from "vitest"
import { dnsTxtContainsToken, getDnsVerificationRecord, httpBodyMatchesToken } from "@/lib/cmp/verify"

describe("cmp verification helpers", () => {
  test("builds dns verification record", () => {
    expect(getDnsVerificationRecord("example.com")).toBe("_vion-cmp.example.com")
  })

  test("dns txt matching supports raw token and key=value", () => {
    const token = "vfy_123"
    expect(dnsTxtContainsToken([["something"], [token]], token)).toBe(true)
    expect(dnsTxtContainsToken([[`vion-cmp=${token}`]], token)).toBe(true)
    expect(dnsTxtContainsToken([["vion-cmp=other"]], token)).toBe(false)
  })

  test("http file matches token after trim", () => {
    expect(httpBodyMatchesToken("  tok\n", "tok")).toBe(true)
  })
})

