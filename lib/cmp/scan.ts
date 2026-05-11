export type ScannedCookie = {
  name: string
  raw: string
  domain?: string
  path?: string
  expires?: string
  maxAge?: string
  sameSite?: string
  secure?: boolean
  httpOnly?: boolean
}

function splitSetCookieHeader(value: string) {
  const parts: string[] = []
  let start = 0
  let inExpires = false

  for (let i = 0; i < value.length; i++) {
    const ch = value[i]
    if (ch === ",") {
      const segment = value.slice(start, i)
      if (!inExpires) {
        parts.push(segment)
        start = i + 1
      }
    }

    if (ch === "=") {
      const key = value.slice(Math.max(start, i - 8), i).toLowerCase()
      if (key.endsWith("expires")) inExpires = true
    }
    if (inExpires && ch === ";") {
      inExpires = false
    }
  }

  parts.push(value.slice(start))
  return parts.map((p) => p.trim()).filter(Boolean)
}

export function normalizeSetCookieHeaders(headers: string[]) {
  const out: string[] = []
  for (const h of headers) {
    if (!h) continue
    const trimmed = h.trim()
    if (!trimmed) continue
    if (trimmed.includes(",") && trimmed.toLowerCase().includes("expires=")) {
      out.push(...splitSetCookieHeader(trimmed))
    } else {
      out.push(trimmed)
    }
  }
  return out
}

export function parseSetCookie(header: string): ScannedCookie | null {
  const raw = header.trim()
  if (!raw) return null
  const segments = raw.split(";").map((s) => s.trim()).filter(Boolean)
  const [first, ...attrs] = segments
  const eqIndex = first.indexOf("=")
  if (eqIndex <= 0) return null
  const name = first.slice(0, eqIndex).trim()
  if (!name) return null

  const cookie: ScannedCookie = { name, raw }
  for (const attr of attrs) {
    const [kRaw, ...rest] = attr.split("=")
    const key = kRaw.trim().toLowerCase()
    const value = rest.join("=").trim()
    if (key === "domain") cookie.domain = value
    else if (key === "path") cookie.path = value
    else if (key === "expires") cookie.expires = value
    else if (key === "max-age") cookie.maxAge = value
    else if (key === "samesite") cookie.sameSite = value
    else if (key === "secure") cookie.secure = true
    else if (key === "httponly") cookie.httpOnly = true
  }
  return cookie
}

export function parseSetCookieHeaders(headers: string[]) {
  return normalizeSetCookieHeaders(headers)
    .map(parseSetCookie)
    .filter((c): c is ScannedCookie => Boolean(c))
}
