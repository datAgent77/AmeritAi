"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { ProductLauncher } from "@/components/product-launcher"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { CookieSidebar } from "@/components/cookie/cookie-sidebar"

function getFallbackHref(entitlements: { chatbot?: boolean; omniChannel?: boolean }) {
    if (entitlements.chatbot) return "/console/chatbot"
    if (entitlements.omniChannel) return "/omni"
    return "/login"
}

export function CookieAppShell({ children }: { children: React.ReactNode }) {
    const { loading, user, role, productEntitlements } = useAuth()
    const router = useRouter()
    const canAccess = Boolean(user) && (role === "SUPER_ADMIN" || productEntitlements.cookieConsent)

    useEffect(() => {
        if (loading) return
        if (!user) {
            router.replace("/login")
            return
        }
        if (!canAccess) {
            router.replace(getFallbackHref(productEntitlements))
        }
    }, [canAccess, loading, productEntitlements, router, user])

    if (loading || !user || !canAccess) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full bg-[#f4f6f8] text-foreground">
                <CookieSidebar />

                <div className="flex flex-col flex-1 min-w-0">
                    <header className="sticky top-0 z-40 flex h-16 items-center border-b bg-background px-4 shadow-sm">
                        <SidebarTrigger />
                        <div className="ml-2 text-sm font-semibold">Cookie</div>
                        <div className="ml-auto flex items-center gap-2">
                            <ProductLauncher />
                            <Button asChild variant="outline" size="sm">
                                <a href="/console/settings/account">Hesap</a>
                            </Button>
                        </div>
                    </header>

                    <main className="flex-1">
                        <div className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8 lg:py-8">{children}</div>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    )
}
