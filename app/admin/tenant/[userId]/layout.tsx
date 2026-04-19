import { TenantLayoutClient } from "./tenant-layout-client"
import { getAdminAuth } from "@/lib/firebase-admin"

export default async function TenantConsoleLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: { userId: string }
}) {
    let tenantEmail: string | undefined
    try {
        const adminAuth = getAdminAuth()
        if (adminAuth) {
            const userRecord = await adminAuth.getUser(params.userId)
            tenantEmail = userRecord.email || undefined
        }
    } catch {
        // silently fall back to showing userId
    }

    return (
        <TenantLayoutClient userId={params.userId} initialEmail={tenantEmail}>
            {children}
        </TenantLayoutClient>
    )
}
