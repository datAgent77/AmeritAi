import { TenantLayoutClient } from "./tenant-layout-client"

export default async function TenantConsoleLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: { userId: string }
}) {
    return (
        <TenantLayoutClient userId={params.userId}>
            {children}
        </TenantLayoutClient>
    )
}
