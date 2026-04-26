"use client"

import { useAuth } from "@/context/AuthContext"
import { TenantManagement } from "@/components/tenant-management"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

export default function TenantsPage() {
    const { user, role, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        console.log("TenantsPage: Auth state check", { loading, user: user?.email, role })
        if (!loading) {
            if (!user) {
                console.log("TenantsPage: No user, redirecting to home")
                router.push("/")
            } else if (role !== "SUPER_ADMIN" && role !== "TENANT_ADMIN") {
                console.log("TenantsPage: Unauthorized role for tenants page, redirecting to dashboard")
                router.push("/dashboard")
            }
        }
    }, [user, role, loading, router])

    if (loading) {
        return (
            <div className="flex flex-col h-full items-center justify-center p-8 gap-4">
                <Loader2 className="h-8 w-8 animate-spin" />
                <div className="text-xs text-muted-foreground font-mono">
                    <p>Auth Loading: {loading.toString()}</p>
                    <p>User: {user?.email || 'null'}</p>
                    <p>Role: {role || 'null'}</p>
                </div>
            </div>
        )
    }

    if (!user || (role !== "SUPER_ADMIN" && role !== "TENANT_ADMIN")) {
        return null
    }

    return (
        <div className="p-8">
            <TenantManagement />
        </div>
    )
}
