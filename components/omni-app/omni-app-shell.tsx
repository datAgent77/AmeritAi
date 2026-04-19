"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { ThemeProvider } from "next-themes"
import { Button } from "@/components/ui/button"
import { OmniAccountProvider } from "@/context/OmniAccountContext"
import { useAuth } from "@/context/AuthContext"
import { OmniAppHeader } from "@/components/omni-app/omni-app-header"
import { OmniAppSidebar } from "@/components/omni-app/omni-app-sidebar"

function OmniAppAccessGuard({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() || "/omni/app"
    const router = useRouter()
    const { loading, user, role, enableOmniChannel } = useAuth()

    const canAccess = Boolean(user) && (role === "SUPER_ADMIN" || role === "AGENCY_ADMIN" || role === "TENANT_ADMIN" || enableOmniChannel)

    useEffect(() => {
        if (!loading && !user) {
            router.replace(`/omni/login?redirect=${encodeURIComponent(pathname)}`)
        }
    }, [loading, pathname, router, user])

    if (loading || (!user && pathname.startsWith("/omni/app"))) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-900">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
        )
    }

    if (!canAccess) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 text-zinc-900">
                <div className="w-full max-w-xl rounded-[24px] border border-zinc-200 bg-white p-10 text-center shadow-sm">
                    <div className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-4">Access required</div>
                    <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">This account cannot open Omni yet.</h1>
                    <p className="mt-4 text-base leading-relaxed text-zinc-600">
                        Omni is separated from Console, but access is still entitlement-based. Use Console to manage account entitlements and product access.
                    </p>
                    <div className="mt-10 flex flex-wrap justify-center gap-3">
                        <Button asChild className="rounded-full bg-zinc-900 text-white hover:bg-zinc-800 transition-all h-12 px-8">
                            <a href="/console/chatbot">Open Console</a>
                        </Button>
                        <Button asChild variant="outline" className="rounded-full border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-all h-12 px-8 shadow-sm">
                            <a href="/platform/products">View products</a>
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return <>{children}</>
}

export function OmniAppShell({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider forcedTheme="light" attribute="class" storageKey="omni-app-theme" enableSystem={false} disableTransitionOnChange>
            <OmniAppAccessGuard>
                <OmniAccountProvider>
                    <div className="min-h-screen bg-zinc-50 text-zinc-900 selection:bg-zinc-200">
                        <div className="mx-auto flex min-h-screen max-w-[1600px] gap-4 px-3 py-3 lg:px-4">
                            <OmniAppSidebar />
                            <div className="flex min-w-0 flex-1 flex-col gap-4">
                                <OmniAppHeader />
                                <main className="min-w-0 flex-1 rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm md:p-6 lg:p-8 overflow-hidden relative">
                                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#f4f4f5_1px,transparent_1px),linear-gradient(to_bottom,#f4f4f5_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-50 pointer-events-none" />
                                    <div className="relative z-10 h-full">
                                        {children}
                                    </div>
                                </main>
                            </div>
                        </div>
                    </div>
                </OmniAccountProvider>
            </OmniAppAccessGuard>
        </ThemeProvider>
    )
}
