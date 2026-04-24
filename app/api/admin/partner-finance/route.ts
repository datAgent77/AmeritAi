import { NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { listManagedAccountsForViewer } from "@/lib/management/accounts"
import { listPartners } from "@/lib/management/partners"
import type { ManagementAccountRecord, ManagementPartnerRecord } from "@/lib/management/types"
import { isSuperAdminRole } from "@/lib/user-roles"

export const dynamic = "force-dynamic"

function incrementCounter(bucket: Record<string, number>, key: string) {
    bucket[key] = (bucket[key] || 0) + 1
}

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
        const callerSnapshot = await adminDb.collection("users").doc(decoded.uid).get()
        const callerRole = callerSnapshot.data()?.role
        const tokenRole = (decoded as any)?.role

        if (!isSuperAdminRole(callerRole) && !isSuperAdminRole(tokenRole)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const [partners, accountResult] = await Promise.all([
            listPartners(adminDb, { includeArchived: false }),
            listManagedAccountsForViewer({
                adminDb,
                viewerId: decoded.uid,
                viewerRole: "SUPER_ADMIN",
                includeArchived: false,
            }),
        ])

        const accounts = accountResult.accounts
        const levelBreakdown: Record<string, number> = {}
        const planBreakdown: Record<string, number> = {}
        const partnerAccountMap = new Map<string, ManagementAccountRecord[]>()

        partners.forEach((partner: ManagementPartnerRecord) => incrementCounter(levelBreakdown, partner.partnerLevel))
        accounts.forEach((account) => {
            incrementCounter(planBreakdown, account.planId || "starter")
            const partnerId = account.partnerId || account.agencyId || ""
            if (!partnerId) return
            const existing = partnerAccountMap.get(partnerId) || []
            existing.push(account)
            partnerAccountMap.set(partnerId, existing)
        })

        const partnerRows = partners.map((partner: ManagementPartnerRecord) => {
            const linkedAccounts = partnerAccountMap.get(partner.id) || []
            const linkedPlanBreakdown = linkedAccounts.reduce<Record<string, number>>((acc, account) => {
                incrementCounter(acc, account.planId || "starter")
                return acc
            }, {})

            return {
                ...partner,
                tenantCount: linkedAccounts.length,
                activeTenantCount: linkedAccounts.filter((account) => account.isActive).length,
                planBreakdown: linkedPlanBreakdown,
            }
        })

        return NextResponse.json({
            summary: {
                totalPartners: partners.length,
                totalTenants: accounts.length,
                levelBreakdown,
                planBreakdown,
            },
            partners: partnerRows,
        })
    } catch (error: any) {
        console.error("Partner finance route error:", error)
        return NextResponse.json({ error: error?.message || "Failed to load partner finance" }, { status: 500 })
    }
}
