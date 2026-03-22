import { TenantDashboardClient } from "./dashboard-client"

export const dynamic = "force-dynamic"

export default async function TenantDashboardPage({ params }: { params: { userId: string } }) {
    return (
        <TenantDashboardClient
            userId={params.userId}
        />
    )
}
