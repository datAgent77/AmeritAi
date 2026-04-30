"use client"
import { useRouter, useParams } from "next/navigation"
import { useEffect } from "react"
import { useAuth } from "@/context/AuthContext"

export default function TenantSettingsPage() {
    const router = useRouter()
    const params = useParams()
    const { role } = useAuth()

    useEffect(() => {
        if (!role) return
        if (params.userId) {
            const target = role === "SUPER_ADMIN" || role === "AGENCY_ADMIN" ? "customer-admin" : "ai"
            router.replace(`/admin/tenant/${params.userId}/settings/${target}`)
        }
    }, [router, params.userId, role])

    return null
}
