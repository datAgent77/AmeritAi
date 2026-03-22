"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { AuthGuard } from "@/components/auth-guard"

function AgencyLayoutContent({ children }: { children: React.ReactNode }) {
    const { user, role, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (loading) return
        if (!user) {
            router.push("/login")
            return
        }

        if (role === "SUPER_ADMIN") {
            router.push("/admin")
            return
        }

        if (role !== "AGENCY_ADMIN") {
            router.push("/console/chatbot")
        }
    }, [user, role, loading, router])

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (!user || role !== "AGENCY_ADMIN") {
        return null
    }

    return (
        <div className="min-h-screen bg-[#f4f6f8]">
            <SiteHeader showSidebarTrigger={false} />
            <main className="p-8">
                {children}
            </main>
        </div>
    )
}

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthGuard>
            <AgencyLayoutContent>{children}</AgencyLayoutContent>
        </AuthGuard>
    )
}
