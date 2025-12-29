import { getAdminDb } from "@/lib/firebase-admin"
import { TenantLayoutClient } from "./tenant-layout-client"

export default async function TenantConsoleLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: { userId: string }
}) {
    let userEmail = ""

    try {
        const adminDb = getAdminDb();
        if (adminDb) {
            const userDoc = await adminDb.collection("users").doc(params.userId).get()
            if (userDoc.exists) {
                userEmail = userDoc.data()?.email || ""
            }
        }
    } catch (error) {
        console.error("Error fetching tenant details:", error)
    }

    return (
        <TenantLayoutClient userId={params.userId} initialEmail={userEmail}>
            {children}
        </TenantLayoutClient>
    )
}
