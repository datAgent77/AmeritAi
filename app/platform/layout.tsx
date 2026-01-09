"use client"

import { SiteHeader } from "@/components/site-header"
import { LanguageProvider } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { AuthGuard } from "@/components/auth-guard"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ConsoleSidebar } from "@/components/console-sidebar"

export default function PlatformLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, enableChatbot } = useAuth()

    return (
        <AuthGuard>
            <LanguageProvider>
                <SidebarProvider>
                    <div className="flex flex-col h-screen w-full bg-[#f4f6f8]">
                        <SiteHeader />
                        <div className="flex flex-1 overflow-hidden">
                            <ConsoleSidebar />
                            <main className="flex-1 overflow-y-auto w-full p-8">
                                <div className="max-w-7xl mx-auto p-4 md:p-0">
                                    {children}
                                </div>
                            </main>
                        </div>
                    </div>
                </SidebarProvider>
            </LanguageProvider>
        </AuthGuard>
    )
}
