"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ConsoleSidebar } from "@/components/console-sidebar"
import { LanguageProvider } from "@/context/LanguageContext"
import { AnnouncementBanner } from "@/components/announcement-banner"

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, role, loading } = useAuth()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/")
            } else if (role !== "SUPER_ADMIN") {
                router.push("/dashboard")
            }
        }
    }, [user, role, loading, router])

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (!user || role !== "SUPER_ADMIN") {
        return null
    }

    // Check if we are in the tenant detail view (e.g., /admin/tenant/[userId])
    // The path should contain /admin/tenant/ and have a segment after it
    const isTenantDetail = pathname && pathname.startsWith("/admin/tenant/") && pathname.split("/").length > 3

    // Check if we are in the content management page
    const isContentPage = pathname && pathname.startsWith("/admin/content")

    // For tenant detail pages, let the nested layout handle everything
    if (isTenantDetail) {
        return <>{children}</>
    }

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full bg-[#f4f6f8]">
                {/* Sidebar - full height on left */}
                <ConsoleSidebar />

                {/* Right side: Announcement + Header + Content */}
                <div className="flex flex-col flex-1 min-w-0">
                    <AnnouncementBanner />

                    {/* Header - only spans content area */}
                    <SiteHeader />

                    {/* Main Content */}
                    <main className={`flex-1 overflow-y-auto w-full ${isContentPage ? 'p-0' : 'p-8'}`}>
                        <div className="w-full">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    )
}
