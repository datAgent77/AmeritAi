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
    const { role, user, userData, loading } = useAuth()
    const router = useRouter()
    const [accessState, setAccessState] = useState<"checking" | "allowed" | "denied">("checking")

    // Use initialEmail if provided, otherwise it will just show the ID
    const targetEmail = initialEmail || userId

    useEffect(() => {
        if (loading) return

        if (!role || !user) {
            setAccessState("denied")
            router.push("/login")
            return
        }

        if (role === "SUPER_ADMIN") {
            setAccessState("allowed")
            return
        }

        if (role === "AGENT") {
            const assignedTenantId = typeof userData?.agentTenantId === "string" ? userData.agentTenantId.trim() : ""
            if (userData?.isActive !== false && assignedTenantId && assignedTenantId === userId) {
                setAccessState("allowed")
                return
            }
            setAccessState("denied")
            router.push("/console/chatbot")
            return
        }

        if (role !== "AGENCY_ADMIN") {
            setAccessState("denied")
            router.push("/console/chatbot")
            return
        }

        let cancelled = false
        const verifyAgencyCustomerAccess = async () => {
            try {
                const token = await user.getIdToken()
                const response = await fetch(`/api/agency/verify-access?targetUserId=${encodeURIComponent(userId)}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })

                if (!response.ok) {
                    throw new Error("agency_customer_access_denied")
                }

                if (cancelled) return
                setAccessState("allowed")
            } catch {
                if (cancelled) return
                setAccessState("denied")
                router.push("/agency")
            }
        }

        verifyAgencyCustomerAccess()
        return () => {
            cancelled = true
        }
    }, [role, user, userData, loading, userId, router])

    if (loading || accessState === "checking") {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (accessState !== "allowed") {
        return null
    }

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
