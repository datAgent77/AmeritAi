"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarRail,
} from "@/components/ui/sidebar"
import {
    Package,
    Users,
    LogOut
} from "lucide-react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"

import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"

export function PlatformSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const { role } = useAuth()
    const { language } = useLanguage()
    const p = (tr: string, en: string, es: string) => (language === "tr" ? tr : language === "es" ? es : en)

    const handleLogout = async () => {
        await signOut(auth)
        router.push("/login")
    }

    const menuItems = [
        {
            title: p("Ürünler", "Products", "Productos"),
            href: "/platform/products",
            icon: Package
        },
        {
            title: p("Kiracılar", "Tenants", "Inquilinos"),
            href: "/platform/tenants",
            icon: Users
        }
    ]

    return (
        <Sidebar collapsible="icon" className="!top-16 !h-[calc(100svh-4rem)] border-r">
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Platform</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={pathname === "/platform"}>
                                    <Link href="/platform">
                                        <Package className="h-4 w-4" />
                                        <span>{p("Genel Bakış", "Overview", "Resumen")}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {role === 'SUPER_ADMIN' && (
                    <SidebarGroup>
                        <SidebarGroupLabel>{p("Kiracılar", "Tenants", "Inquilinos")}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={pathname === "/platform/tenants"}>
                                        <Link href="/platform/tenants">
                                            <Users className="h-4 w-4" />
                                            <span>{p("Kiracı Listesi", "Tenant List", "Lista de inquilinos")}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={handleLogout}>
                            <LogOut className="h-4 w-4" />
                            <span>{p("Çıkış Yap", "Sign out", "Cerrar sesión")}</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
