export type CmpDomain = {
  id: string
  name: string
  primaryHostname: string
  cookieDomain?: string | null
  status?: "active" | "paused"
}

export type CmpConfig = {
  bannerSettings?: {
    position?: "bottom" | "center"
    theme?: "light" | "dark"
    primaryColor?: string
  }
  preferenceSettings?: {
    revisitDays?: number
    categories?: {
      necessary?: { required?: boolean }
      analytics?: { enabled?: boolean }
      marketing?: { enabled?: boolean }
      functional?: { enabled?: boolean }
    }
  }
  publishedPolicyVersionId?: string | null
}

export type PolicyRow = {
  id: string
  status: "draft" | "published"
  language: string
  contentHash: string
  publishedAt?: string | null
  createdAt?: string
  content?: {
    title?: string
    bannerDescription?: string
    policyUrl?: string | null
    controllerName?: string
    controllerEmail?: string
    controllerAddress?: string
    controllerPhone?: string
    dpoEmail?: string
    purposesText?: string
    legalBasesText?: string
    recipientsText?: string
    transfersText?: string
    retentionText?: string
    rightsText?: string
    dsarText?: string
    vendors?: Array<{
      name: string
      domain: string
      category: "necessary" | "analytics" | "marketing" | "functional"
      purpose: string
      privacyUrl: string | null
    }>
  }
}

export type HostRow = {
  id: string
  hostname: string
  status: "pending" | "verified"
  method: "dns_txt" | "http_file"
  token: string
  verifiedAt?: string | null
  lastCheckedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export type DerivedConfig = {
  bannerPosition: "bottom" | "center"
  bannerTheme: "light" | "dark"
  primaryColor: string
  revisitDays: number
  analyticsEnabled: boolean
  marketingEnabled: boolean
  functionalEnabled: boolean
  publishedPolicyVersionId: string | null
}
