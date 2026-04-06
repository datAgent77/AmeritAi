import type { UserRole } from "@/lib/user-roles"
import {
    DEFAULT_PARTNER_LEVEL,
    type PartnerCapabilities,
    type PartnerLevel,
    type ResolvedPartnerBranding,
} from "@/lib/management/types"

export const PARTNER_LEVELS: PartnerLevel[] = ["partner", "solution_partner", "strategic_partner"]

export function isPartnerLevel(value: unknown): value is PartnerLevel {
    return value === "partner" || value === "solution_partner" || value === "strategic_partner"
}

export function resolvePartnerLevel(value: unknown): PartnerLevel {
    return isPartnerLevel(value) ? value : DEFAULT_PARTNER_LEVEL
}

export function resolvePartnerCapabilities(level: PartnerLevel): PartnerCapabilities {
    const canCreateManagedAccounts = level !== "partner"
    const canAccessManagedAccountWorkspace = level !== "partner"
    const canAssignManagedAccounts = level !== "partner"
    const canSwitchOmniAccounts = level !== "partner"
    const canUsePartnerBranding = level === "strategic_partner"

    return {
        canCreateManagedAccounts,
        canAccessManagedAccountWorkspace,
        canAssignManagedAccounts,
        canSwitchOmniAccounts,
        canUsePartnerBranding,
    }
}

export function getPartnerLevelLabel(level?: PartnerLevel | null) {
    if (level === "strategic_partner") return "Strategic Partner"
    if (level === "partner") return "Partner"
    return "Solution Partner"
}

export function resolvePartnerName(data: any, fallbackId?: string | null) {
    return data?.agencyName || data?.partnerName || data?.email || fallbackId || null
}

export function resolvePartnerBranding(input: {
    viewerRole: UserRole
    viewerPartnerId?: string | null
    viewerPartnerName?: string | null
    viewerPartnerLevel?: PartnerLevel | null
    viewerPartnerLogoUrl?: string | null
    linkedPartnerId?: string | null
    linkedPartnerName?: string | null
    linkedPartnerLevel?: PartnerLevel | null
    linkedPartnerLogoUrl?: string | null
}): ResolvedPartnerBranding {
    const placement: ResolvedPartnerBranding["placement"] = "header-right"

    if (
        input.viewerRole === "AGENCY_ADMIN" &&
        input.viewerPartnerLevel === "strategic_partner" &&
        typeof input.viewerPartnerLogoUrl === "string" &&
        input.viewerPartnerLogoUrl.trim()
    ) {
        return {
            show: true,
            partnerId: input.viewerPartnerId || undefined,
            partnerName: input.viewerPartnerName || undefined,
            logoUrl: input.viewerPartnerLogoUrl.trim(),
            placement,
        }
    }

    if (
        input.viewerRole !== "SUPER_ADMIN" &&
        input.linkedPartnerLevel === "strategic_partner" &&
        typeof input.linkedPartnerLogoUrl === "string" &&
        input.linkedPartnerLogoUrl.trim()
    ) {
        return {
            show: true,
            partnerId: input.linkedPartnerId || undefined,
            partnerName: input.linkedPartnerName || undefined,
            logoUrl: input.linkedPartnerLogoUrl.trim(),
            placement,
        }
    }

    return { show: false, placement }
}
