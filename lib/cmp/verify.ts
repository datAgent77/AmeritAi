import { resolveTxt } from "dns/promises"

export type CmpVerificationMethod = "dns_txt" | "http_file"

export function getDnsVerificationRecord(hostname: string) {
  return `_vion-cmp.${hostname}`
}

export function dnsTxtContainsToken(records: string[][], token: string) {
  const flat = records.flat().map((value) => value.trim())
  return flat.some((value) => value === token || value === `vion-cmp=${token}`)
}

export async function verifyDnsTxt(hostname: string, token: string) {
  const record = getDnsVerificationRecord(hostname)
  const records = await resolveTxt(record)
  return dnsTxtContainsToken(records, token)
}

export function httpBodyMatchesToken(body: string, token: string) {
  return body.trim() === token
}
