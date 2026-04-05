"use client"

import { SiteHeader } from "@/components/site-header"
import { LanguageProvider } from "@/context/LanguageContext"
import { AuthGuard } from "@/components/auth-guard"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ConsoleSidebar } from "@/components/console-sidebar"
import { ThemeProvider } from "next-themes"

export default function PlatformLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AuthGuard>
            <ThemeProvider forcedTheme="light" attribute="class" storageKey="console-theme" enableSystem={false} disableTransitionOnChange>
                <LanguageProvider>
                    <SidebarProvider>
                        <div className="flex min-h-screen w-full bg-[#f4f6f8]">
                            <ConsoleSidebar />
                            <div className="flex min-w-0 flex-1 flex-col">
                                <SiteHeader />
                                <main className="relative flex-1 overflow-y-auto bg-[#f4f6f8]">
                                    <div className="mx-auto max-w-7xl p-8">
                                        {children}
                                    </div>
                                </main>
                            </div>
                        </div>
                    </SidebarProvider>
                </LanguageProvider>
            </ThemeProvider>
        </AuthGuard>
    )
}
