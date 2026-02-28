"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { recordAuthDebug } from "@/lib/auth-debug"

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!loading && !user) {
            recordAuthDebug("auth_guard_redirect_login")
            router.push("/login")
        }
    }, [user, loading, router])

    if (loading) {
        // ... (existing loading spinner)
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
            </div>
        )
    }

    if (!user) {
        return null
    }

    return <>{children}</>
}
