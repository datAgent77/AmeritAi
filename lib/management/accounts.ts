import { resolvePartnerBranding } from "@/lib/management/access"
import { getPartnerDoc, getPartnersByIds } from "@/lib/management/partners"
import type { ManagementAccountRecord, ResolvedPartnerBranding } from "@/lib/management/types"
import { toIsoOrNull } from "@/lib/omni/server-utils"

function resolveOmniEnabled(data: any) {
    return data?.enableOmniChannel === true || data?.productEntitlements?.omniChannel === true || data?.productEntitlements?.chatbot === true
}

function resolvePlanId(data: any) {
    const value = data?.subscription?.planId || data?.planId || data?.plan || data?.entitlements?.planId
    return typeof value === "string" && value.trim() ? value.trim() : null
}

function serializeManagedAccountDoc(doc: any, partnerMap: Map<string, any>): ManagementAccountRecord {
    const data = doc.data ? doc.data() || {} : doc || {}
    const partnerId = typeof data.agencyId === "string" ? data.agencyId : null
    const partner = partnerId ? partnerMap.get(partnerId) || null : null
    const planId = resolvePlanId(data)
    const subscriptionStatus =
        typeof data.subscription?.status === "string" && data.subscription.status.trim()
            ? data.subscription.status.trim()
            : typeof data.subscriptionStatus === "string" && data.subscriptionStatus.trim()
              ? data.subscriptionStatus.trim()
              : null
    const subscriptionBillingPeriod =
        typeof data.subscription?.billingPeriod === "string" && data.subscription.billingPeriod.trim()
            ? data.subscription.billingPeriod.trim()
            : null

    return {
        id: doc.id || data.id,
        email: data.email || "",
        companyName: data.companyName || "",
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        phone: data.phone || "",
        industry: data.industry || "",
        partnerId,
        partnerName: partner?.partnerName || null,
        agencyId: partnerId,
        agencyName: partner?.partnerName || null,
        partnerLevel: partner?.partnerLevel || null,
        partnerLogoUrl: partner?.partnerLogoUrl || null,
        isActive: data.isActive !== false,
        isArchived: data.isArchived === true,
        omniEnabled: resolveOmniEnabled(data),
        createdAt: toIsoOrNull(data.createdAt),
        planId,
        subscriptionStatus,
        subscriptionBillingPeriod,
    }
}

export async function listManagedAccountsForViewer(input: {
    adminDb: any
    viewerId: string
    viewerRole: "SUPER_ADMIN" | "AGENCY_ADMIN" | "TENANT_ADMIN" | "USER"
    canSwitchOmniAccounts?: boolean
    includeArchived?: boolean
}) {
    const includeArchived = input.includeArchived === true
    let accountDocs: any[] = []

    if (input.viewerRole === "SUPER_ADMIN") {
        const snapshot = await input.adminDb.collection("users").where("role", "==", "TENANT_ADMIN").get()
        accountDocs = snapshot.docs
    } else if (input.viewerRole === "AGENCY_ADMIN") {
        const snapshot = await input.adminDb.collection("users").where("role", "==", "TENANT_ADMIN").where("agencyId", "==", input.viewerId).get()
        accountDocs = snapshot.docs
    } else {
        const ownDoc = await input.adminDb.collection("users").doc(input.viewerId).get()
        accountDocs = ownDoc.exists ? [ownDoc] : []
    }

    const partnerMap = await getPartnersByIds(
        input.adminDb,
        accountDocs
            .map((doc: any) => {
                const data = doc.data() || {}
                return typeof data.agencyId === "string" ? data.agencyId : null
            })
            .filter(Boolean)
    )

    const accounts = accountDocs
        .map((doc: any) => serializeManagedAccountDoc(doc, partnerMap))
        .filter((account) => (includeArchived ? true : !account.isArchived))
        .sort((left, right) => String(left.companyName || left.email || left.id).localeCompare(String(right.companyName || right.email || right.id)))

    return {
        accounts,
        meta: {
            canSwitchAccounts: input.viewerRole === "SUPER_ADMIN" ? true : input.viewerRole === "AGENCY_ADMIN" ? input.canSwitchOmniAccounts === true : false,
        },
    }
}

export async function assignManagedAccountPartner(input: {
    adminDb: any
    tenantId: string
    partnerId: string | null
    assignedBy: string | null
}) {
    const assignedAt = input.partnerId ? new Date().toISOString() : null
    await input.adminDb.collection("users").doc(input.tenantId).set({
        agencyId: input.partnerId || null,
        agencyAssignedAt: assignedAt,
        agencyAssignedBy: input.partnerId ? input.assignedBy : null,
    }, { merge: true })
}

export async function resolveManagedAccountPartnerBranding(adminDb: any, managedAccountId: string) {
    const partner = await getLinkedPartnerForManagedAccount(adminDb, managedAccountId)
    if (!partner) {
        return { show: false, placement: "header-right" } satisfies ResolvedPartnerBranding
    }

    return resolvePartnerBranding({
        viewerRole: "TENANT_ADMIN",
        linkedPartnerId: partner.id,
        linkedPartnerName: partner.partnerName || null,
        linkedPartnerLevel: partner.partnerLevel,
        linkedPartnerLogoUrl: partner.partnerLogoUrl || null,
    })
}

export async function getLinkedPartnerForManagedAccount(adminDb: any, managedAccountId: string) {
    const snapshot = await adminDb.collection("users").doc(managedAccountId).get()
    if (!snapshot.exists) {
        return null
    }

    const data = snapshot.data() || {}
    const partnerId = typeof data.agencyId === "string" ? data.agencyId : null
    if (!partnerId) {
        return null
    }

    return getPartnerDoc(adminDb, partnerId)
}
