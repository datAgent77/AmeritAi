import { NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { acceptPublishedContract, getContractGateStatus, type ContractTemplateType } from "@/lib/contracts"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    try {
        const adminAuth = getAdminAuth()
        const adminDb = getAdminDb()

        if (!adminAuth || !adminDb) {
            return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 })
        }

        const authHeader = req.headers.get("authorization")
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const token = authHeader.split("Bearer ")[1]
        const decoded = await adminAuth.verifyIdToken(token)
        const body = await req.json().catch(() => ({}))
        const requestedType = typeof body?.type === "string" ? body.type as ContractTemplateType : null
        const gate = await getContractGateStatus(adminDb, { userId: decoded.uid })
        const typeToAccept = requestedType || gate.requiredType

        if (!typeToAccept) {
            return NextResponse.json({ error: "No contract requires acceptance for this user" }, { status: 400 })
        }

        const acceptance = await acceptPublishedContract(adminDb, {
            userId: decoded.uid,
            role: gate.role,
            type: typeToAccept,
        })

        return NextResponse.json({ success: true, acceptance })
    } catch (error: any) {
        console.error("Contracts accept route error:", error)
        return NextResponse.json({ error: error?.message || "Failed to accept contract" }, { status: 500 })
    }
}
