import { cleanString } from "@/lib/cmp/utils"

export type CmpVendor = {
  name: string
  domain: string
  category: "necessary" | "analytics" | "marketing" | "functional"
  purpose: string
  privacyUrl: string | null
}

export type CmpPolicyContent = {
  title: string
  bannerDescription: string
  policyUrl: string | null

  controllerName: string
  controllerEmail: string
  controllerAddress: string
  controllerPhone: string
  dpoEmail: string

  purposesText: string
  legalBasesText: string
  recipientsText: string
  transfersText: string
  retentionText: string
  rightsText: string
  dsarText: string

  vendors: CmpVendor[]
}

function cleanVendorCategory(value: unknown) {
  if (value === "necessary" || value === "analytics" || value === "marketing" || value === "functional") return value
  return "analytics" as const
}

export function buildCmpPolicyContent(input: {
  body: any
  fallback?: Partial<CmpPolicyContent> | null
}): CmpPolicyContent {
  const fallback = input.fallback || {}
  const body = input.body || {}

  const title = cleanString(body?.title, 120) || cleanString(fallback.title, 120) || "Çerez Aydınlatma Metni"
  const bannerDescription = cleanString(body?.bannerDescription, 1200) || cleanString(fallback.bannerDescription, 1200) || ""
  const policyUrlRaw = cleanString(body?.policyUrl, 500) || cleanString(fallback.policyUrl, 500)
  const policyUrl = policyUrlRaw ? policyUrlRaw : null

  const controllerName = cleanString(body?.controllerName, 200) || cleanString(fallback.controllerName, 200) || ""
  const controllerEmail = cleanString(body?.controllerEmail, 200) || cleanString(fallback.controllerEmail, 200) || ""
  const controllerAddress = cleanString(body?.controllerAddress, 400) || cleanString(fallback.controllerAddress, 400) || ""
  const controllerPhone = cleanString(body?.controllerPhone, 80) || cleanString(fallback.controllerPhone, 80) || ""
  const dpoEmail = cleanString(body?.dpoEmail, 200) || cleanString(fallback.dpoEmail, 200) || ""

  const purposesText = cleanString(body?.purposesText, 4000) || cleanString(fallback.purposesText, 4000) || ""
  const legalBasesText = cleanString(body?.legalBasesText, 4000) || cleanString(fallback.legalBasesText, 4000) || ""
  const recipientsText = cleanString(body?.recipientsText, 4000) || cleanString(fallback.recipientsText, 4000) || ""
  const transfersText = cleanString(body?.transfersText, 4000) || cleanString(fallback.transfersText, 4000) || ""
  const retentionText = cleanString(body?.retentionText, 2000) || cleanString(fallback.retentionText, 2000) || ""
  const rightsText = cleanString(body?.rightsText, 4000) || cleanString(fallback.rightsText, 4000) || ""
  const dsarText = cleanString(body?.dsarText, 2000) || cleanString(fallback.dsarText, 2000) || ""

  const rawVendors = Array.isArray(body?.vendors) ? body.vendors : Array.isArray(fallback.vendors) ? fallback.vendors : []
  const vendors = rawVendors
    .slice(0, 50)
    .map((v: any) => {
      const name = cleanString(v?.name, 120)
      const domain = cleanString(v?.domain, 200)
      const purpose = cleanString(v?.purpose, 500)
      const privacyUrlRaw = cleanString(v?.privacyUrl, 500)
      const privacyUrl = privacyUrlRaw ? privacyUrlRaw : null
      return {
        name,
        domain,
        category: cleanVendorCategory(v?.category),
        purpose,
        privacyUrl,
      }
    })
    .filter((v: CmpVendor) => v.name && v.domain)

  return {
    title,
    bannerDescription,
    policyUrl,
    controllerName,
    controllerEmail,
    controllerAddress,
    controllerPhone,
    dpoEmail,
    purposesText,
    legalBasesText,
    recipientsText,
    transfersText,
    retentionText,
    rightsText,
    dsarText,
    vendors,
  }
}

export function validatePolicyForPublish(content: Partial<CmpPolicyContent> | null | undefined) {
  const c = content || {}

  const missing: string[] = []
  if (!c.policyUrl) missing.push("policyUrl")
  if (!c.controllerName) missing.push("controllerName")
  if (!c.controllerEmail) missing.push("controllerEmail")
  if (!c.purposesText) missing.push("purposesText")
  if (!c.legalBasesText) missing.push("legalBasesText")
  if (!c.recipientsText) missing.push("recipientsText")
  if (!c.transfersText) missing.push("transfersText")
  if (!c.retentionText) missing.push("retentionText")
  if (!c.rightsText) missing.push("rightsText")
  if (!c.dsarText) missing.push("dsarText")

  return { ok: missing.length === 0, missing }
}

