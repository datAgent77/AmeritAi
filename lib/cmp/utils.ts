import { createHash, randomUUID } from "crypto"

export function sha256Hex(input: string) {
  return createHash("sha256").update(input).digest("hex")
}

export function stableStringify(value: unknown): string {
  if (value === null) return "null"
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`
  }
  return JSON.stringify(value)
}

export function nowIso() {
  return new Date().toISOString()
}

export function newId(prefix: string) {
  return `${prefix}_${randomUUID()}`
}

export function cleanString(value: unknown, maxLength = 200) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

export function cleanHostname(value: unknown) {
  const raw = cleanString(value, 200)
  return raw.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase()
}

export function parseIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for")
  if (!forwarded) return ""
  return forwarded.split(",")[0]?.trim() || ""
}

export function parseUserAgent(req: Request) {
  return req.headers.get("user-agent") || ""
}
