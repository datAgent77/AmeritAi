import { NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import {
    getDefaultContractTemplate,
    listContractVersions,
    listPublishedContracts,
    publishContractVersion,
    type ContractTemplateType,
} from "@/lib/contracts"
import { isSuperAdminRole } from "@/lib/user-roles"

export const dynamic = "force-dynamic"

const CONTRACT_TYPES: ContractTemplateType[] = ["tenantAgreement", "partnerAgreement", "kvkkDefault"]

async function requireSuperAdmin(req: Request) {
    const adminAuth = getAdminAuth()
    const adminDb = getAdminDb()

    if (!adminAuth || !adminDb) {
        return { ok: false as const, response: NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 }) }
    }

    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
        return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
    }

    const token = authHeader.split("Bearer ")[1]
    const decoded = await adminAuth.verifyIdToken(token)
    const callerSnapshot = await adminDb.collection("users").doc(decoded.uid).get()
    const callerRole = callerSnapshot.data()?.role
    const tokenRole = (decoded as any)?.role

    if (!isSuperAdminRole(callerRole) && !isSuperAdminRole(tokenRole)) {
        return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
    }

    return { ok: true as const, adminDb, callerUid: decoded.uid }
}

export async function GET(req: Request) {
    const authz = await requireSuperAdmin(req)
    if (!authz.ok) return authz.response

    try {
        const published = await listPublishedContracts(authz.adminDb)
        const versions = Object.fromEntries(
            await Promise.all(
                CONTRACT_TYPES.map(async (type) => [type, await listContractVersions(authz.adminDb, type, 5)] as const)
            )
        ) as Record<ContractTemplateType, Awaited<ReturnType<typeof listContractVersions>>>

        const defaults = Object.fromEntries(CONTRACT_TYPES.map((type) => [type, getDefaultContractTemplate(type)])) as Record<ContractTemplateType, ReturnType<typeof getDefaultContractTemplate>>

        return NextResponse.json({ published, versions, defaults })
    } catch (error: any) {
        console.error("Contracts templates GET error:", error)
        return NextResponse.json({ error: error?.message || "Failed to load contract templates" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const authz = await requireSuperAdmin(req)
    if (!authz.ok) return authz.response

    try {
        const body = await req.json()
        const type = typeof body?.type === "string" ? body.type : ""

        if (!CONTRACT_TYPES.includes(type as ContractTemplateType)) {
            return NextResponse.json({ error: "Invalid contract type" }, { status: 400 })
        }

        const published = await publishContractVersion(authz.adminDb, {
            type: type as ContractTemplateType,
            title: typeof body?.title === "string" ? body.title : undefined,
            text: typeof body?.text === "string" ? body.text : undefined,
            createdBy: authz.callerUid,
        })

        return NextResponse.json({ success: true, contract: published })
    } catch (error: any) {
        console.error("Contracts templates POST error:", error)
        return NextResponse.json({ error: error?.message || "Failed to publish contract template" }, { status: 500 })
    }
}
