"use client"

import { useParams, useRouter } from "next/navigation"
import { Users, LogOut, Shield, Home, Settings, CreditCard } from "lucide-react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import Link from "next/link"

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarFooter,
    SidebarRail,
} from "@/components/ui/sidebar"

// Menu items for Super Admin
const items = [
    {
        title: "Tenants",
        url: "/admin",
        icon: Users,
    },
]

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const router = useRouter()
    const params = useParams()
    const { toast } = useToast()
    const { user, role } = useAuth()
    const { t } = useLanguage()

    // Check if we are in tenant detail view
    const userId = params?.userId as string

    const handleLogout = async () => {
        try {
            await signOut(auth)
            router.push("/")
            toast({
                title: "Logged out",
                description: "You have been successfully logged out.",
            })
        } catch (error) {
            console.error("Logout error:", error)
            toast({
                title: "Error",
                description: "Failed to log out.",
                variant: "destructive",
            })
        }
    }

    return (
        <Sidebar collapsible="icon" className="!top-16 !h-[calc(100svh-4rem)] border-r" {...props}>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Super Admin Panel</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild>
                                        <Link href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {userId && (
                    <>
                        <SidebarGroup>
                            <SidebarGroupLabel>Tenant Management</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild>
                                            <Link href={`/admin/tenant/${userId}?tab=settings`}>
                                                <Settings />
                                                <span>Assistant Settings</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>

                        {role === 'SUPER_ADMIN' && (
                            <SidebarGroup>
                                <SidebarGroupLabel>{t('administration') || 'Yönetim'}</SidebarGroupLabel>
                                <SidebarGroupContent>
                                    <SidebarMenu>
                                        <SidebarMenuItem>
                                            <SidebarMenuButton asChild>
                                                <Link href={`/admin/tenant/${userId}/settings/customer-admin`}>
                                                    <CreditCard />
                                                    <span>{t('customerAdmin') || 'Abonelik yönetimi'}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>
                        )}
                    </>
                )}
            </SidebarContent>
            <SidebarFooter>
                {/* Optional footer content */}
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
