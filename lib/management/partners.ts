import { resolvePartnerCapabilities, resolvePartnerLevel, resolvePartnerName } from "@/lib/management/access"
import type { ManagementPartnerRecord } from "@/lib/management/types"
import { toIsoOrNull } from "@/lib/omni/server-utils"

function serializePartnerDoc(doc: any, counts: { customerCount: number; omniEnabledAccounts: number }): ManagementPartnerRecord {
    const data = doc.data ? doc.data() || {} : doc || {}
    const partnerLevel = resolvePartnerLevel(data.partnerLevel)

    return {
        id: doc.id || data.id,
        email: data.email || "",
        partnerName: resolvePartnerName(data, doc.id),
        agencyName: data.agencyName || "",
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        phone: data.phone || "",
        isActive: data.isActive !== false,
        isArchived: data.isArchived === true,
        omniEnabledAccounts: counts.omniEnabledAccounts,
        customerCount: counts.customerCount,
        createdAt: toIsoOrNull(data.createdAt),
        partnerLevel,
        partnerLogoUrl: typeof data.partnerLogoUrl === "string" ? data.partnerLogoUrl : null,
        commissionRate: typeof data.commissionRate === "number" ? data.commissionRate : null,
        commissionModel: typeof data.commissionModel === "string" ? data.commissionModel : null,
        commissionNotes: typeof data.commissionNotes === "string" ? data.commissionNotes : null,
        payoutScheduleDays: typeof data.payoutScheduleDays === "number" ? data.payoutScheduleDays : null,
        agreementVersion: typeof data.agreementVersion === "string" ? data.agreementVersion : null,
        agreementAcceptedAt: toIsoOrNull(data.agreementAcceptedAt),
        programPolicyUrl: typeof data.programPolicyUrl === "string" ? data.programPolicyUrl : null,
        capabilities: resolvePartnerCapabilities(partnerLevel),
    }
}

export async function getPartnerDoc(adminDb: any, partnerId: string) {
    const snapshot = await adminDb.collection("users").doc(partnerId).get()
    if (!snapshot.exists) return null

    const data = snapshot.data() || {}
    const counts = await getPartnerCounts(adminDb, [partnerId])
    return serializePartnerDoc(snapshot, counts.get(partnerId) || { customerCount: 0, omniEnabledAccounts: 0 })
}

export async function getPartnersByIds(adminDb: any, partnerIds: string[]) {
    const ids = Array.from(new Set(partnerIds.filter(Boolean)))
    if (ids.length === 0) return new Map<string, ManagementPartnerRecord>()

    const docs = await Promise.all(ids.map((partnerId) => adminDb.collection("users").doc(partnerId).get()))
    const counts = await getPartnerCounts(adminDb, ids)
    const records = new Map<string, ManagementPartnerRecord>()

    docs.forEach((snapshot: any) => {
        if (!snapshot.exists) return
        records.set(snapshot.id, serializePartnerDoc(snapshot, counts.get(snapshot.id) || { customerCount: 0, omniEnabledAccounts: 0 }))
    })

    return records
}

async function getPartnerCounts(adminDb: any, partnerIds: string[]) {
    const ids = Array.from(new Set(partnerIds.filter(Boolean)))
    const counts = new Map<string, { customerCount: number; omniEnabledAccounts: number }>()

    if (ids.length === 0) return counts

    const tenantSnapshot = await adminDb.collection("users").where("role", "==", "TENANT_ADMIN").get()
    tenantSnapshot.docs.forEach((doc: any) => {
        const data = doc.data() || {}
        const partnerId = typeof data.agencyId === "string" ? data.agencyId : null
        if (!partnerId || !ids.includes(partnerId)) return

        const current = counts.get(partnerId) || { customerCount: 0, omniEnabledAccounts: 0 }
        current.customerCount += 1
        if (data.enableOmniChannel === true || data.productEntitlements?.omniChannel === true || data.productEntitlements?.chatbot === true) {
            current.omniEnabledAccounts += 1
        }
        counts.set(partnerId, current)
    })

    return counts
}

export async function listPartners(adminDb: any, options?: { includeArchived?: boolean }) {
    const includeArchived = options?.includeArchived === true
    const partnerSnapshot = await adminDb.collection("users").where("role", "==", "AGENCY_ADMIN").get()
    const counts = await getPartnerCounts(adminDb, partnerSnapshot.docs.map((doc: any) => doc.id))

    return partnerSnapshot.docs
        .map((doc: any) => serializePartnerDoc(doc, counts.get(doc.id) || { customerCount: 0, omniEnabledAccounts: 0 }))
        .filter((partner: ManagementPartnerRecord) => (includeArchived ? true : !partner.isArchived))
        .sort((left: ManagementPartnerRecord, right: ManagementPartnerRecord) => String(left.partnerName || left.email || left.id).localeCompare(String(right.partnerName || right.email || right.id)))
}
