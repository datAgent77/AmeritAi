"use client"
import { useRouter, useParams } from "next/navigation"
import { useEffect } from "react"

export default function TenantSettingsPage() {
    const router = useRouter()
    const params = useParams()

    useEffect(() => {
        if (params.userId) {
            router.replace(`/admin/tenant/${params.userId}/settings/subscription`)
        }
    }, [router, params.userId])

    return null
}
