import { NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { getContractGateStatus, listPublishedContracts } from "@/lib/contracts"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
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
        const userSnapshot = await adminDb.collection("users").doc(decoded.uid).get()
        const role = typeof userSnapshot.data()?.role === "string" ? userSnapshot.data()?.role : null

        const [gate, published] = await Promise.all([
            getContractGateStatus(adminDb, { userId: decoded.uid, role }),
            listPublishedContracts(adminDb),
        ])

        return NextResponse.json({
            role: gate.role,
            required: {
                type: gate.requiredType,
                contract: gate.contract,
                accepted: gate.accepted,
                requiresAcceptance: gate.requiresAcceptance,
            },
            published,
        })
    } catch (error: any) {
        console.error("Contracts current route error:", error)
        return NextResponse.json({ error: error?.message || "Failed to load contracts" }, { status: 500 })
    }
}
