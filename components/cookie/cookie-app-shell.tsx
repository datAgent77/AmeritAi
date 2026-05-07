"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Cookie, Loader2 } from "lucide-react"
import { ProductLauncher } from "@/components/product-launcher"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"

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
        <div className="min-h-screen bg-[#f4f6f8] text-foreground">
            <header className="sticky top-0 z-40 flex h-16 items-center border-b bg-background px-6 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-muted">
                        <Cookie className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="text-sm font-semibold leading-none">Cookie</div>
                        <div className="mt-1 text-xs text-muted-foreground">Consent Management</div>
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <ProductLauncher />
                    <Button asChild variant="outline" size="sm">
                        <a href="/console/settings/account">Hesap</a>
                    </Button>
                </div>
            </header>
            {children}
        </div>
    )
}
