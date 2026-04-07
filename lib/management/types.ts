import type { UserRole } from "@/lib/user-roles"

export type PartnerLevel = "partner" | "solution_partner" | "strategic_partner"

export const DEFAULT_PARTNER_LEVEL: PartnerLevel = "solution_partner"

export interface PartnerCapabilities {
    canCreateManagedAccounts: boolean
    canAccessManagedAccountWorkspace: boolean
    canAssignManagedAccounts: boolean
    canSwitchOmniAccounts: boolean
    canUsePartnerBranding: boolean
}

export interface ResolvedPartnerBranding {
    show: boolean
    partnerId?: string
    partnerName?: string
    logoUrl?: string
    placement: "header-right"
}

export interface ManagementPartnerRecord {
    id: string
    email?: string | null
    partnerName?: string | null
    agencyName?: string | null
    firstName?: string | null
    lastName?: string | null
    phone?: string | null
    isActive: boolean
    isArchived: boolean
    omniEnabledAccounts: number
    customerCount: number
    createdAt?: string | null
    partnerLevel: PartnerLevel
    partnerLogoUrl?: string | null
    commissionRate?: number | null
    commissionModel?: string | null
    commissionNotes?: string | null
    payoutScheduleDays?: number | null
    agreementVersion?: string | null
    agreementAcceptedAt?: string | null
    programPolicyUrl?: string | null
    capabilities: PartnerCapabilities
}

export interface ManagementAccountRecord {
    id: string
    email?: string | null
    companyName?: string | null
    firstName?: string | null
    lastName?: string | null
    phone?: string | null
    industry?: string | null
    partnerId?: string | null
    partnerName?: string | null
    agencyId?: string | null
    agencyName?: string | null
    partnerLevel?: PartnerLevel | null
    partnerLogoUrl?: string | null
    isActive: boolean
    isArchived: boolean
    omniEnabled: boolean
    createdAt?: string | null
    planId?: string | null
    subscriptionStatus?: string | null
    subscriptionBillingPeriod?: string | null
}

export interface ViewerManagementContext {
    viewerId: string
    viewerRole: UserRole
    partner?: ManagementPartnerRecord | null
    capabilities: PartnerCapabilities
    resolvedPartnerBranding: ResolvedPartnerBranding
}
