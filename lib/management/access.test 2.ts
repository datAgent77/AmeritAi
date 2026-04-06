import { describe, expect, test } from "vitest"
import { getPartnerLevelLabel, resolvePartnerBranding, resolvePartnerCapabilities, resolvePartnerLevel } from "@/lib/management/access"

describe("management access helpers", () => {
    test("falls back legacy partner records to solution partner", () => {
        expect(resolvePartnerLevel(undefined)).toBe("solution_partner")
        expect(resolvePartnerLevel("legacy")).toBe("solution_partner")
    })

    test("resolves partner capabilities by level", () => {
        expect(resolvePartnerCapabilities("partner")).toMatchObject({
            canCreateManagedAccounts: false,
            canAccessManagedAccountWorkspace: false,
            canAssignManagedAccounts: false,
            canSwitchOmniAccounts: false,
            canUsePartnerBranding: false,
        })

        expect(resolvePartnerCapabilities("strategic_partner")).toMatchObject({
            canCreateManagedAccounts: true,
            canAccessManagedAccountWorkspace: true,
            canAssignManagedAccounts: true,
            canSwitchOmniAccounts: true,
            canUsePartnerBranding: true,
        })
    })

    test("shows own branding for strategic partners and linked branding for customer accounts", () => {
        expect(getPartnerLevelLabel("strategic_partner")).toBe("Strategic Partner")

        const viewerBranding = resolvePartnerBranding({
            viewerRole: "AGENCY_ADMIN",
            viewerPartnerId: "partner-1",
            viewerPartnerName: "North Partner",
            viewerPartnerLevel: "strategic_partner",
            viewerPartnerLogoUrl: "https://cdn.example.com/logo.png",
        })
        expect(viewerBranding).toMatchObject({
            show: true,
            partnerId: "partner-1",
            partnerName: "North Partner",
            logoUrl: "https://cdn.example.com/logo.png",
            placement: "header-right",
        })

        const linkedBranding = resolvePartnerBranding({
            viewerRole: "TENANT_ADMIN",
            linkedPartnerId: "partner-1",
            linkedPartnerName: "North Partner",
            linkedPartnerLevel: "strategic_partner",
            linkedPartnerLogoUrl: "https://cdn.example.com/logo.png",
        })
        expect(linkedBranding.show).toBe(true)

        const noBranding = resolvePartnerBranding({
            viewerRole: "TENANT_ADMIN",
        })
        expect(noBranding).toEqual({ show: false, placement: "header-right" })
    })
})
