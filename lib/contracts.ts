import { createHash } from "crypto"
import { isAgencyAdminRole, isTenantAdminRole, type UserRole } from "@/lib/user-roles"

export type ContractTemplateType = "tenantAgreement" | "partnerAgreement" | "kvkkDefault"

export interface ContractTemplateSeed {
    type: ContractTemplateType
    title: string
    text: string
}

export interface PublishedContractVersion {
    type: ContractTemplateType
    title: string
    text: string
    versionId: string
    versionHash: string
    createdAt: string | null
    createdBy: string | null
    publishedAt: string | null
    updatedAt: string | null
}

export interface ContractAcceptanceSummary {
    type: ContractTemplateType
    title: string
    versionId: string
    versionHash: string
    acceptedAt: string
}

export interface ContractGateStatus {
    role: UserRole | null
    requiredType: ContractTemplateType | null
    contract: PublishedContractVersion | null
    accepted: ContractAcceptanceSummary | null
    requiresAcceptance: boolean
}

const DEFAULT_CONTRACT_TEMPLATES: Record<ContractTemplateType, ContractTemplateSeed> = {
    tenantAgreement: {
        type: "tenantAgreement",
        title: "Tenant Service Agreement",
        text: [
            "By using the AmeritAI tenant console, you agree to the platform terms below.",
            "",
            "1. The platform may only be accessed by authorized users.",
            "2. Customer data and business content must be accurate, current, and shared within your authorized scope.",
            "3. AmeritAI may restrict the service in cases of unlawful, deceptive, or infringing use.",
            "4. The tenant administrator is responsible for properly managing its own users and integrations.",
            "5. Billing, plan limits, and data usage are applied according to the selected plan.",
            "",
            "NOTE: This is a placeholder template. Replace with your finalized, attorney-reviewed agreement before launch.",
        ].join("\n"),
    },
    partnerAgreement: {
        type: "partnerAgreement",
        title: "Partner Agreement",
        text: [
            "The AmeritAI partner system provides management and distribution tools for authorized partner accounts.",
            "",
            "1. The partner fulfills the commercial and operational responsibilities related to the tenant accounts it manages.",
            "2. Information visible through the platform may only be used by authorized team members and customers.",
            "3. Partner commission and plan views are for informational purposes only; final financial reconciliation is handled separately.",
            "4. Access to the partner console is contingent on acceptance of this agreement.",
            "",
            "NOTE: This is a placeholder template. Replace with your finalized, attorney-reviewed agreement before launch.",
        ].join("\n"),
    },
    kvkkDefault: {
        type: "kvkkDefault",
        title: "Privacy Notice",
        text: [
            "Before starting this chat, you acknowledge that your personal information may be processed by AmeritAI and the relevant business to provide the service, deliver support, and improve quality.",
            "",
            "By continuing, you confirm that you have read this privacy notice and consent to being contacted where necessary. You may opt out of messaging at any time by replying STOP.",
            "",
            "NOTE: This is a placeholder notice. Replace with your finalized, attorney-reviewed CCPA/CPRA privacy disclosure before launch.",
        ].join("\n"),
    },
}

function toIsoOrNull(value: any): string | null {
    if (!value) return null
    if (typeof value === "string") return value
    if (value instanceof Date) return value.toISOString()
    if (typeof value?.toDate === "function") return value.toDate().toISOString()
    if (typeof value?._seconds === "number") {
        return new Date(value._seconds * 1000).toISOString()
    }
    if (typeof value?.seconds === "number") {
        return new Date(value.seconds * 1000).toISOString()
    }
    return null
}

export function normalizeContractText(text?: string | null) {
    return String(text || "")
        .replace(/\r\n/g, "\n")
        .trim()
}

export function computeContractVersionHash(input: string) {
    return createHash("sha256").update(input).digest("hex").slice(0, 24)
}

export function getDefaultContractTemplate(type: ContractTemplateType): ContractTemplateSeed {
    return DEFAULT_CONTRACT_TEMPLATES[type]
}

export function getRequiredContractTypeForRole(role: UserRole | null | undefined): ContractTemplateType | null {
    if (isAgencyAdminRole(role)) return "partnerAgreement"
    if (isTenantAdminRole(role)) return "tenantAgreement"
    return null
}

function serializePublishedContractVersion(
    type: ContractTemplateType,
    templateData: Record<string, any>,
    versionData: Record<string, any>
): PublishedContractVersion {
    return {
        type,
        title: String(versionData.title || templateData.title || getDefaultContractTemplate(type).title),
        text: normalizeContractText(versionData.text || templateData.text || getDefaultContractTemplate(type).text),
        versionId: String(versionData.versionId || templateData.publishedVersionId || ""),
        versionHash: String(versionData.versionHash || templateData.versionHash || computeContractVersionHash(String(versionData.text || ""))),
        createdAt: toIsoOrNull(versionData.createdAt),
        createdBy: typeof versionData.createdBy === "string" ? versionData.createdBy : null,
        publishedAt: toIsoOrNull(templateData.publishedAt || versionData.publishedAt),
        updatedAt: toIsoOrNull(templateData.updatedAt || versionData.updatedAt),
    }
}

export async function getPublishedContract(adminDb: any, type: ContractTemplateType): Promise<PublishedContractVersion | null> {
    const templateRef = adminDb.collection("contract_templates").doc(type)
    const templateSnapshot = await templateRef.get()
    if (!templateSnapshot.exists) return null

    const templateData = templateSnapshot.data() || {}
    const publishedVersionId = typeof templateData.publishedVersionId === "string"
        ? templateData.publishedVersionId.trim()
        : ""

    if (!publishedVersionId) return null

    const versionSnapshot = await templateRef.collection("versions").doc(publishedVersionId).get()
    if (!versionSnapshot.exists) return null

    return serializePublishedContractVersion(type, templateData, versionSnapshot.data() || {})
}

export async function listPublishedContracts(adminDb: any) {
    const types: ContractTemplateType[] = ["tenantAgreement", "partnerAgreement", "kvkkDefault"]
    const pairs = await Promise.all(types.map(async (type) => [type, await getPublishedContract(adminDb, type)] as const))
    return Object.fromEntries(pairs) as Record<ContractTemplateType, PublishedContractVersion | null>
}

export async function listContractVersions(adminDb: any, type: ContractTemplateType, limit = 5): Promise<PublishedContractVersion[]> {
    const templateRef = adminDb.collection("contract_templates").doc(type)
    const [templateSnapshot, versionsSnapshot] = await Promise.all([
        templateRef.get(),
        templateRef.collection("versions").orderBy("createdAt", "desc").limit(limit).get(),
    ])

    const templateData = templateSnapshot.exists ? templateSnapshot.data() || {} : {}
    return versionsSnapshot.docs.map((doc: any) =>
        serializePublishedContractVersion(type, templateData, {
            ...(doc.data() || {}),
            versionId: doc.id,
        })
    )
}

export async function publishContractVersion(adminDb: any, params: {
    type: ContractTemplateType
    title?: string | null
    text?: string | null
    createdBy: string
}) {
    const seed = getDefaultContractTemplate(params.type)
    const title = String(params.title || seed.title).trim() || seed.title
    const text = normalizeContractText(params.text || seed.text) || seed.text
    const versionHash = computeContractVersionHash(`${params.type}:${title}:${text}`)
    const versionId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${versionHash.slice(0, 8)}`
    const now = new Date().toISOString()
    const templateRef = adminDb.collection("contract_templates").doc(params.type)
    const versionRef = templateRef.collection("versions").doc(versionId)

    await versionRef.set({
        type: params.type,
        title,
        text,
        versionId,
        versionHash,
        createdAt: now,
        createdBy: params.createdBy,
        publishedAt: now,
    })

    await templateRef.set({
        type: params.type,
        title,
        text,
        versionHash,
        publishedVersionId: versionId,
        publishedAt: now,
        updatedAt: now,
        updatedBy: params.createdBy,
    }, { merge: true })

    return {
        type: params.type,
        title,
        text,
        versionId,
        versionHash,
        createdAt: now,
        createdBy: params.createdBy,
        publishedAt: now,
        updatedAt: now,
    } satisfies PublishedContractVersion
}

export async function acceptPublishedContract(adminDb: any, params: {
    userId: string
    role?: UserRole | null
    type: ContractTemplateType
}) {
    const contract = await getPublishedContract(adminDb, params.type)
    if (!contract) {
        throw new Error("No published contract available for this type")
    }

    const acceptedAt = new Date().toISOString()
    const summary: ContractAcceptanceSummary = {
        type: params.type,
        title: contract.title,
        versionId: contract.versionId,
        versionHash: contract.versionHash,
        acceptedAt,
    }

    await adminDb.collection("contract_acceptances").doc(`${params.userId}:${params.type}:${contract.versionId}`).set({
        userId: params.userId,
        role: params.role || null,
        ...summary,
    }, { merge: true })

    const userSnapshot = await adminDb.collection("users").doc(params.userId).get()
    const userData = userSnapshot.exists ? userSnapshot.data() || {} : {}
    const existingAcceptance = (userData.contractAcceptance && typeof userData.contractAcceptance === "object")
        ? userData.contractAcceptance
        : {}

    await adminDb.collection("users").doc(params.userId).set({
        contractAcceptance: {
            ...existingAcceptance,
            [params.type]: summary,
        },
    }, { merge: true })

    return summary
}

export async function getContractGateStatus(adminDb: any, params: {
    userId: string
    role?: UserRole | null
}): Promise<ContractGateStatus> {
    const userSnapshot = await adminDb.collection("users").doc(params.userId).get()
    const userData = userSnapshot.exists ? userSnapshot.data() || {} : {}
    const role = params.role || (typeof userData.role === "string" ? userData.role as UserRole : null)
    const requiredType = getRequiredContractTypeForRole(role)

    if (!requiredType) {
        return {
            role,
            requiredType: null,
            contract: null,
            accepted: null,
            requiresAcceptance: false,
        }
    }

    const [contract] = await Promise.all([
        getPublishedContract(adminDb, requiredType),
    ])
    const accepted = userData.contractAcceptance?.[requiredType] || null
    const requiresAcceptance = Boolean(
        contract &&
        (!accepted || accepted.versionId !== contract.versionId || accepted.versionHash !== contract.versionHash)
    )

    return {
        role,
        requiredType,
        contract,
        accepted,
        requiresAcceptance,
    }
}
