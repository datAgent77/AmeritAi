"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { ThemeProvider } from "next-themes"
import { AuthGuard } from "@/components/auth-guard"
import { SiteHeader } from "@/components/site-header"
import { OmniSidebar } from "@/components/omni-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { useAuth } from "@/context/AuthContext"
import { OmniAccountProvider } from "@/context/OmniAccountContext"

function OmniLayoutContent({ children }: { children: React.ReactNode }) {
    const { enableOmniChannel, loading, role } = useAuth()
    const router = useRouter()

    const canAccess = role === "SUPER_ADMIN" || enableOmniChannel

    useEffect(() => {
        if (!loading && !canAccess) {
            router.replace("/platform/products")
        }
    }, [canAccess, loading, router])

    if (loading || !canAccess) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <ThemeProvider forcedTheme="light" attribute="class" storageKey="console-theme" enableSystem={false} disableTransitionOnChange>
            <OmniAccountProvider>
                <SidebarProvider>
                    <div className="flex min-h-screen w-full bg-[#f4f6f8]">
                        <OmniSidebar />
                        <div className="flex min-w-0 flex-1 flex-col">
                            <SiteHeader />
                            <main className="flex-1 overflow-y-auto">
                                {children}
                            </main>
                        </div>
                    </div>
                </SidebarProvider>
            </OmniAccountProvider>
        </ThemeProvider>
    )
}

export default function OmniLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthGuard>
            <OmniLayoutContent>{children}</OmniLayoutContent>
        </AuthGuard>
    )
}
