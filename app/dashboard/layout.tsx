import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AuthGuard } from "@/components/auth-guard"
import { SiteHeader } from "@/components/site-header"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AuthGuard>
            <SidebarProvider>
                <div className="flex flex-col h-screen w-full bg-[#f4f6f8]">
                    <SiteHeader />
                    <div className="flex flex-1 overflow-hidden">
                        <AppSidebar className="!top-16 !h-[calc(100svh-4rem)]" />
                        <main className="flex-1 overflow-auto p-4">
                            {children}
                        </main>
                    </div>
                </div>
            </SidebarProvider>
        </AuthGuard>
    )
}
