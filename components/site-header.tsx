"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { useAuth } from "@/context/AuthContext"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button, buttonVariants } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, LogOut, Settings, LayoutDashboard, Globe, Check, Bell } from "lucide-react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

import { Breadcrumbs } from "@/components/breadcrumbs"
import { NotificationBell } from "@/components/notification-bell"

import { LanguageSwitcher } from "@/components/language-switcher"
import { useLanguage } from "@/context/LanguageContext"
import { ProductLauncher } from "@/components/product-launcher"
import Image from "next/image"

export function SiteHeader({ showSidebarTrigger = true }: { showSidebarTrigger?: boolean }) {
    const { user, role } = useAuth()
    const { t, language, setLanguage } = useLanguage()
    const router = useRouter()
    const { toast } = useToast()

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

    const getInitials = (email: string) => {
        return email?.substring(0, 2).toUpperCase() || "U"
    }

    return (
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-6 shadow-sm w-full">
            <div className="flex items-center gap-2">
                {showSidebarTrigger && <SidebarTrigger />}
                <Breadcrumbs />
            </div>

            {/* Mobile Logo Centered */}
            <div className="absolute left-1/2 -translate-x-1/2 md:hidden">
                <Image
                    src="/vion-logo-icon-dark.png"
                    alt="Vion"
                    width={32}
                    height={32}
                    className="w-8 h-8"
                />
            </div>
            <div className="ml-auto flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/widget-test?id=${user?.uid}`, "_blank")}
                    className="hidden md:flex items-center gap-2"
                >
                    {t('widgetTest') || "Widget Test"}
                </Button>
                <NotificationBell />
            </div>
        </header>
    )
}
