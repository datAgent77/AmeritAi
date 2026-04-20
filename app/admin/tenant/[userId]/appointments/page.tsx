import { AppointmentsContent } from "@/components/appointments-content"

export default async function AdminTenantAppointmentsPage({
    params,
}: {
    params: Promise<{ userId: string }>
}) {
    const { userId } = await params
    return <AppointmentsContent targetUserId={userId} />
}
