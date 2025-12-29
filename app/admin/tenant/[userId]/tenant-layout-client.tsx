"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ConsoleSidebar } from "@/components/console-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Loader2 } from "lucide-react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { useAuth } from "@/context/AuthContext"
import { AnnouncementBanner } from "@/components/announcement-banner"

interface TenantLayoutClientProps {
    children: React.ReactNode
    userId: string
    initialEmail?: string
}

export function TenantLayoutClient({
    children,
    userId,
    initialEmail
}: TenantLayoutClientProps) {
    const { role } = useAuth()
    const router = useRouter()

    // Use initialEmail if provided, otherwise it will just show the ID
    const targetEmail = initialEmail || userId

    // Redirect non-super-admins
    useEffect(() => {
        if (role && role !== "SUPER_ADMIN") {
            router.push("/console/chatbot")
        }
    }, [role, router])

    // If role is not yet loaded, we might want to show a loader, 
    // but the checking checks for `role` existence. 
    // If role is null (loading), we might wait? 
    // Usually useAuth returns loading state too.
    // effective loading state is handled by the initial server fetch or auth context.

    // For now, render immediately. The AuthGuard typically handles protection, 
    // but here we have a specific role check.

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full bg-[#f4f6f8]">
                {/* Sidebar - full height on left */}
                <ConsoleSidebar
                    targetUserId={userId}
                    targetEmail={targetEmail}
                />

                {/* Right side: Announcement + Header + Content */}
                <div className="flex flex-col flex-1 min-w-0">
                    <AnnouncementBanner />

                    {/* Header - only spans content area */}
                    <SiteHeader />

                    <main className="flex-1 overflow-y-auto bg-[#f4f6f8]">
                        {children}
                    </main>
                </div>
            </div>
        </SidebarProvider>
    )
}
