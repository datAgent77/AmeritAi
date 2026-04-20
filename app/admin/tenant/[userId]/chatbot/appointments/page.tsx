import { redirect } from "next/navigation"

export default async function LegacyAdminTenantAppointmentsPage({
    params,
}: {
    params: Promise<{ userId: string }>
}) {
    const { userId } = await params
    redirect(`/admin/tenant/${userId}/appointments`)
}
