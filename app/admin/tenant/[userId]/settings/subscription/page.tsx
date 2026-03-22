"use client"
import SubscriptionPage from "@/app/console/settings/subscription/page"
import { useAuth } from "@/context/AuthContext"
import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"

export default function TenantSubscriptionPage() {
    const { role } = useAuth()
    const params = useParams()
    const router = useRouter()

    useEffect(() => {
        if (!role) return
        if (role && role !== "SUPER_ADMIN") {
            router.replace(`/admin/tenant/${params.userId}/settings/ai`)
        }
    }, [role, router, params.userId])

    if (!role) {
        return null
    }

    if (role !== "SUPER_ADMIN") {
        return null
    }

    return <SubscriptionPage />
}
