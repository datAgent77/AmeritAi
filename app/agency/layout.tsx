"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { AuthGuard } from "@/components/auth-guard"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AgencySidebar } from "@/components/agency-sidebar"

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
        <SidebarProvider>
            <div className="flex min-h-screen w-full bg-[#f4f6f8]">
                <AgencySidebar />
                <div className="flex min-w-0 flex-1 flex-col">
                    <SiteHeader showProductLauncher={false} showNotifications forcePartnerBranding />
                    <main className="flex-1 min-w-0 px-6 py-8 lg:px-8">
                        {children}
                    </main>
                </div>
            </div>
        </SidebarProvider>
    )
}

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthGuard>
            <AgencyLayoutContent>{children}</AgencyLayoutContent>
        </AuthGuard>
    )
}
