"use client"
import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"

export default function TenantSubscriptionPage() {
    const params = useParams()
    const router = useRouter()

    useEffect(() => {
        router.replace(`/admin/tenant/${params.userId}/settings/customer-admin`)
    }, [router, params.userId])

    return null
}
