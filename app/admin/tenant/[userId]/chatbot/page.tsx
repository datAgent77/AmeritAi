import { getAdminDb } from "@/lib/firebase-admin"
import { TenantDashboardClient } from "./dashboard-client"

export const dynamic = "force-dynamic"

export default async function TenantDashboardPage({ params }: { params: { userId: string } }) {
    let companyName = ""

    try {
        const adminDb = getAdminDb()
        if (adminDb) {
            const userDoc = await adminDb.collection("users").doc(params.userId).get()
            if (userDoc.exists) {
                const userData = userDoc.data()
                companyName = userData?.companyName || userData?.displayName || ""
            }
        }
    } catch (error) {
        console.error("Error fetching tenant details:", error)
    }

    return (
        <TenantDashboardClient
            userId={params.userId}
            companyName={companyName}
        />
    )
}
