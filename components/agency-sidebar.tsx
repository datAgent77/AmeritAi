"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import {
    BadgePercent,
    Check,
    Globe,
    Handshake,
    LayoutDashboard,
    LifeBuoy,
    LogOut,
    ShieldCheck,
    GraduationCap,
    Users,
} from "lucide-react"
import { signOut } from "firebase/auth"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { auth } from "@/lib/firebase"
import { cn } from "@/lib/utils"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type PartnerContext = {
    name: string
    logoUrl: string | null
}

export function AgencySidebar() {
    const pathname = usePathname() || ""
    const router = useRouter()
    const { user } = useAuth()
    const { t, language, setLanguage } = useLanguage()
    const [partnerContext, setPartnerContext] = useState<PartnerContext | null>(null)

    useEffect(() => {
        let cancelled = false

        const loadPartnerContext = async () => {
            if (!user) {
                setPartnerContext(null)
                return
            }

            try {
                const token = await user.getIdToken()
                const response = await fetch("/api/management/viewer-context", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })

                if (!response.ok) {
                    throw new Error("Failed to load partner context")
                }

                const data = await response.json()
                if (cancelled) return

                setPartnerContext({
                    name: data?.partner?.partnerName || data?.partner?.agencyName || user.displayName || user.email || "Partner",
                    logoUrl: data?.partner?.partnerLogoUrl || null,
                })
            } catch (error) {
                if (cancelled) return
                setPartnerContext({
                    name: user.displayName || user.email || "Partner",
                    logoUrl: null,
                })
            }
        }

        loadPartnerContext()
        return () => {
            cancelled = true
        }
    }, [user])

    const handleLogout = async () => {
        await signOut(auth)
        router.push("/login")
    }

    const navigateToOverview = () => {
        router.push("/agency")
    }

    const navigateToCustomers = () => {
        router.push("/agency/end-users")
    }

    const navigateToPartnership = () => {
        router.push("/agency/partnership")
    }

    const navigateToTraining = () => {
        router.push("/agency/training")
    }

    const navigateToHelpCenter = () => {
        router.push("/agency/help-center")
    }

    const isOverviewActive = pathname === "/agency"
    const isCustomersActive = pathname === "/agency/end-users" || pathname.startsWith("/agency/end-users/")
    const isPartnershipActive = pathname === "/agency/partnership" || pathname.startsWith("/agency/partnership/")
    const isTrainingActive = pathname === "/agency/training" || pathname.startsWith("/agency/training/")
    const isHelpCenterActive = pathname === "/agency/help-center" || pathname.startsWith("/agency/help-center/")

    return (
        <Sidebar collapsible="icon" className="!top-0 !h-screen border-r-0 bg-[#000000] text-white z-40" variant="sidebar">
            <SidebarHeader className="!h-16 !p-0 flex items-center justify-center border-b border-white/10 bg-[#000000]">
                <div className="flex items-center gap-2 h-full px-4 w-full group-data-[collapsible=icon]:hidden">
                    <Image
                        src="/vion-logo-icon-white.png"
                        alt="AmeritAI"
                        width={28}
                        height={28}
                        className="h-7 w-7 object-contain"
                        priority
                    />
                    <span className="font-bold text-xl tracking-tight leading-none text-white">AmeritAI</span>
                </div>
                <div className="hidden items-center justify-center h-full w-full group-data-[collapsible=icon]:flex">
                    <Image
                        src="/vion-logo-icon-white.png"
                        alt="AmeritAI"
                        width={28}
                        height={28}
                        className="h-7 w-7 object-contain"
                        priority
                    />
                </div>
            </SidebarHeader>

            <SidebarContent className="bg-[#000000] px-2 py-2 gap-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-700">
                <div className="px-2 py-3 group-data-[collapsible=icon]:hidden">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                            <ShieldCheck className="size-3.5" />
                            {t("agencyPortal")}
                        </div>
                        <p className="mt-2 text-sm text-zinc-200">
                            {t("agencyPortalDesc")}
                        </p>
                    </div>
                </div>

                <SidebarMenu className="mb-2">
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            isActive={isOverviewActive}
                            onClick={navigateToOverview}
                            className={cn(
                                "w-full justify-start gap-3 px-3 h-10 transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
                                "hover:bg-white/10 hover:text-white",
                                isOverviewActive
                                    ? "bg-white/15 text-white shadow-sm"
                                    : "text-zinc-400 group-hover:text-white"
                            )}
                        >
                            <LayoutDashboard className={cn("size-4", isOverviewActive ? "text-white" : "text-zinc-400 group-hover:text-white")} />
                            <span className="font-medium text-[14px] group-data-[collapsible=icon]:hidden">{t("overview")}</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            isActive={isCustomersActive}
                            onClick={navigateToCustomers}
                            className={cn(
                                "w-full justify-start gap-3 px-3 h-10 transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
                                "hover:bg-white/10 hover:text-white",
                                isCustomersActive
                                    ? "bg-white/15 text-white shadow-sm"
                                    : "text-zinc-400 group-hover:text-white"
                            )}
                        >
                            <Users className={cn("size-4", isCustomersActive ? "text-white" : "text-zinc-400 group-hover:text-white")} />
                            <span className="font-medium text-[14px] group-data-[collapsible=icon]:hidden">{t("endUsers")}</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            isActive={isPartnershipActive}
                            onClick={navigateToPartnership}
                            className={cn(
                                "w-full justify-start gap-3 px-3 h-10 transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
                                "hover:bg-white/10 hover:text-white",
                                isPartnershipActive
                                    ? "bg-white/15 text-white shadow-sm"
                                    : "text-zinc-400 group-hover:text-white"
                            )}
                        >
                            <BadgePercent className={cn("size-4", isPartnershipActive ? "text-white" : "text-zinc-400 group-hover:text-white")} />
                            <span className="font-medium text-[14px] group-data-[collapsible=icon]:hidden">{t("agencyPartnership")}</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            isActive={isTrainingActive}
                            onClick={navigateToTraining}
                            className={cn(
                                "w-full justify-start gap-3 px-3 h-10 transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
                                "hover:bg-white/10 hover:text-white",
                                isTrainingActive
                                    ? "bg-white/15 text-white shadow-sm"
                                    : "text-zinc-400 group-hover:text-white"
                            )}
                        >
                            <GraduationCap className={cn("size-4", isTrainingActive ? "text-white" : "text-zinc-400 group-hover:text-white")} />
                            <span className="font-medium text-[14px] group-data-[collapsible=icon]:hidden">{t("training") || "Eğitim"}</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            isActive={isHelpCenterActive}
                            onClick={navigateToHelpCenter}
                            className={cn(
                                "w-full justify-start gap-3 px-3 h-10 transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
                                "hover:bg-white/10 hover:text-white",
                                isHelpCenterActive
                                    ? "bg-white/15 text-white shadow-sm"
                                    : "text-zinc-400 group-hover:text-white"
                            )}
                        >
                            <LifeBuoy className={cn("size-4", isHelpCenterActive ? "text-white" : "text-zinc-400 group-hover:text-white")} />
                            <span className="font-medium text-[14px] group-data-[collapsible=icon]:hidden">{t("footerHelp") || "Yardım Merkezi"}</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>

            <SidebarFooter className="bg-[#000000] border-t border-white/10 p-2">
                <SidebarMenu className="mt-1">
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-white/10 hover:bg-white/5 text-white"
                                >
                                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-zinc-800 text-white font-bold">
                                        {user?.email?.[0]?.toUpperCase() || "P"}
                                    </div>
                                    <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                                        <span className="truncate font-semibold">{user?.displayName || partnerContext?.name || t("agency")}</span>
                                        <span className="truncate text-xs text-zinc-400">{user?.email}</span>
                                    </div>
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-64 rounded-xl p-0 z-[200]"
                                side="right"
                                align="end"
                                sideOffset={24}
                                alignOffset={24}
                            >
                                <div className="border-b p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex aspect-square size-10 items-center justify-center rounded-full bg-indigo-500 text-lg font-bold text-white">
                                            {user?.email?.[0]?.toUpperCase() || "P"}
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="truncate text-sm font-semibold">{user?.displayName || partnerContext?.name || t("agency")}</span>
                                            <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-1">
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger className="cursor-pointer px-2 py-2.5">
                                            <div className="flex items-center gap-3">
                                                <Globe className="size-4 text-muted-foreground" />
                                                <span className="text-sm font-medium">{t('language') || "Language"}</span>
                                            </div>
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent className="w-48">
                                            <DropdownMenuItem onClick={() => setLanguage("en")} className="cursor-pointer">
                                                <div className="flex w-full items-center justify-between">
                                                    <span>English</span>
                                                    {language === "en" ? <Check className="size-4" /> : null}
                                                </div>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setLanguage("es")} className="cursor-pointer">
                                                <div className="flex w-full items-center justify-between">
                                                    <span>Español</span>
                                                    {language === "es" ? <Check className="size-4" /> : null}
                                                </div>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setLanguage("tr")} className="cursor-pointer">
                                                <div className="flex w-full items-center justify-between">
                                                    <span>Türkçe</span>
                                                    {language === "tr" ? <Check className="size-4" /> : null}
                                                </div>
                                            </DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                    <DropdownMenuItem onClick={navigateToOverview} className="cursor-pointer px-2 py-2.5">
                                        <div className="flex items-center gap-3">
                                            <LayoutDashboard className="size-4 text-muted-foreground" />
                                            <span className="text-sm font-medium">{t("overview")}</span>
                                        </div>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={navigateToCustomers} className="cursor-pointer px-2 py-2.5">
                                        <div className="flex items-center gap-3">
                                            <Users className="size-4 text-muted-foreground" />
                                            <span className="text-sm font-medium">{t("endUsers")}</span>
                                        </div>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={navigateToPartnership} className="cursor-pointer px-2 py-2.5">
                                        <div className="flex items-center gap-3">
                                            <Handshake className="size-4 text-muted-foreground" />
                                            <span className="text-sm font-medium">{t("agencyPartnership")}</span>
                                        </div>
                                    </DropdownMenuItem>
                                </div>
                                <div className="border-t p-1">
                                    <DropdownMenuItem
                                        onClick={handleLogout}
                                        className="cursor-pointer px-2 py-2.5 text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950/20"
                                    >
                                        <LogOut className="mr-2 h-4 w-4 text-red-600" />
                                        <span className="text-sm font-medium">{t('logout') || "Çıkış Yap"}</span>
                                    </DropdownMenuItem>
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
