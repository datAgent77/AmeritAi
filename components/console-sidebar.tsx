"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    MessageSquare,
    Users,
    Settings,
    UserCircle,
    Database,
    Plug,
    BarChart3,
    LogOut,
    Package,
    ArrowLeft,
    Zap,
    GraduationCap,
    Grid,
    Shield,
    CreditCard,
    Code,
    Bell,
    ChevronRight,
    ChevronDown,
    Globe,
    Check,
    Building2,
    Inbox,
    Activity,
    Utensils,
    FileText
} from "lucide-react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { PricingModal } from "./billing/pricing-modal"
import { useState } from "react"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    useSidebar,
} from "@/components/ui/sidebar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"

interface ConsoleSidebarProps {
    targetUserId?: string
    targetEmail?: string
    sectorId?: string
}

export function ConsoleSidebar({ targetUserId, targetEmail, sectorId }: ConsoleSidebarProps) {
    const pathname = usePathname() || ""
    const router = useRouter()
    const { t, language, setLanguage } = useLanguage()
    const {
        user,
        role,
        enableLeadCollection
    } = useAuth()
    const { isMobile } = useSidebar()
    const [showPricing, setShowPricing] = useState(false)

    // Build link based on whether we're in super admin mode (targetUserId provided)
    const buildLink = (path: string) => {
        if (targetUserId) {
            return path.replace('/console/', `/admin/tenant/${targetUserId}/`)
        }
        return path
    }

    // Check if current path matches
    const isActive = (path: string) => {
        if (targetUserId) {
            const adminPath = path.replace('/console/', `/admin/tenant/${targetUserId}/`)
            return pathname === adminPath || pathname.startsWith(adminPath + '/')
        }
        return pathname === path || pathname.startsWith(path + '/')
    }

    const handleLogout = async () => {
        await signOut(auth)
        router.push("/login")
    }

    // Top-level overview item (outside groups)
    const overviewItem = {
        title: t('overview') || "Genel Bakış",
        icon: LayoutDashboard,
        href: "/console/chatbot",
        active: pathname === "/console/chatbot" || (pathname === buildLink("/console/chatbot"))
    }

    const tenantGroups = [
        {
            label: "Build",
            items: [
                {
                    title: t('training') || "Training",
                    icon: GraduationCap, // or BookOpen
                    href: "/console/knowledge",
                    active: isActive("/console/knowledge")
                },
                {
                    title: t('modules') || "Modules",
                    icon: Grid,
                    href: "/console/modules",
                    active: isActive("/console/modules")
                },

            ]
        },
        {
            label: "Connect",
            items: [
                {
                    title: t('widgetSettings') || "Web Widget",
                    icon: MessageSquare,
                    href: "/console/chatbot/widget",
                    active: isActive("/console/chatbot/widget")
                },
                {
                    title: t('integrations') || "Integrations",
                    icon: Plug,
                    href: "/console/chatbot/integration",
                    active: isActive("/console/chatbot/integration")
                }
            ]
        },
        {
            label: "Grow",
            items: [
                {
                    title: t('chats') || "Inbox", // Label change for clarity
                    icon: Inbox,
                    href: "/console/chatbot/chats",
                    active: isActive("/console/chatbot/chats")
                },
                {
                    title: t('leads') || "Shopper Intelligence",
                    icon: Users,
                    href: "/console/chatbot/leads",
                    active: isActive("/console/chatbot/leads")
                },
                {
                    title: t('reports') || "Analytics",
                    icon: BarChart3,
                    href: "/console/chatbot/analytics",
                    active: isActive("/console/chatbot/analytics")
                }
            ]
        }
    ]

    // Special items that don't fit groups or are conditional
    const specialItems = [
        // Restaurant Menu
        ...(sectorId === 'restaurant' ? [{
            title: t('menu') || "Menu & QR",
            icon: Utensils,
            href: "/console/menu",
            active: isActive("/console/menu")
        }] : []),
    ]

    return (
        <>
            <Sidebar collapsible="icon" className="!top-0 !h-screen border-r-0 bg-[#000000] text-white z-40" variant="sidebar">
                <SidebarHeader className="!h-16 !p-0 flex items-center justify-center border-b border-white/10 bg-[#000000]">
                    {/* Expanded state: logo left-aligned */}
                    <div className="flex items-center h-full px-4 w-full group-data-[collapsible=icon]:hidden">
                        <Image
                            src="/vion-logo-text-light.png"
                            alt="Vion"
                            width={80}
                            height={24}
                            className="h-6 w-auto object-contain"
                            priority
                        />
                    </div>
                    {/* Collapsed state: icon centered */}
                    <div className="hidden items-center justify-center h-full w-full group-data-[collapsible=icon]:flex">
                        <Image
                            src="/vion-logo-icon-white.png"
                            alt="Vion"
                            width={32}
                            height={32}
                            className="h-8 w-8 object-contain"
                            priority
                        />
                    </div>
                </SidebarHeader>

                <SidebarContent className="bg-[#000000] px-2 py-4">
                    {/* Super Admin Back Button */}
                    {targetUserId && (
                        <SidebarMenu className="mb-4">
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    size="lg"
                                    onClick={() => router.push("/admin")}
                                    className="bg-white/5 hover:bg-white/10 text-white"
                                >
                                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-white text-black">
                                        <ArrowLeft className="size-4" />
                                    </div>
                                    <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                                        <span className="truncate font-semibold">{t('backToTenants')}</span>
                                        <span className="truncate text-xs text-white/70">{targetEmail || targetUserId}</span>
                                    </div>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    )}

                    {/* TOP OVERVIEW ITEM (Outside Groups) */}
                    <SidebarMenu className="mb-2">
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={overviewItem.active}
                                className={cn(
                                    "w-full justify-start gap-3 px-3 h-10 transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
                                    "hover:bg-white/10 hover:text-white",
                                    overviewItem.active
                                        ? "bg-white/15 text-white shadow-sm"
                                        : "text-zinc-400 group-hover:text-white"
                                )}
                            >
                                <Link href={buildLink(overviewItem.href)}>
                                    <overviewItem.icon className={cn("size-4 transition-colors", overviewItem.active ? "text-white" : "text-zinc-400 group-hover:text-white")} />
                                    <span className="font-medium text-[14px] group-data-[collapsible=icon]:hidden">{overviewItem.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>

                    {/* TENANT NAVIGATION GROUPS */}
                    {tenantGroups.map((group) => (
                        <SidebarGroup key={group.label} className="group-data-[collapsible=icon]:p-0">
                            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden text-zinc-500 font-semibold uppercase tracking-wider text-xs px-2 mb-1">
                                {group.label}
                            </SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {group.items.map((item) => (
                                        <SidebarMenuItem key={item.href}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={item.active}
                                                className={cn(
                                                    "w-full justify-start gap-3 px-3 h-10 transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
                                                    "hover:bg-white/10 hover:text-white",
                                                    item.active
                                                        ? "bg-white/15 text-white shadow-sm"
                                                        : "text-zinc-400 group-hover:text-white"
                                                )}
                                            >
                                                <Link href={buildLink(item.href)}>
                                                    <item.icon className={cn("size-4 transition-colors", item.active ? "text-white" : "text-zinc-400 group-hover:text-white")} />
                                                    <span className="font-medium text-[14px] group-data-[collapsible=icon]:hidden">{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    ))}

                    {/* Special Items (Restaurant Menu etc.) */}
                    {specialItems.length > 0 && (
                        <SidebarGroup>
                            <SidebarMenu>
                                {specialItems.map((item) => (
                                    <SidebarMenuItem key={item.href}>
                                        <SidebarMenuButton asChild isActive={item.active} className="...">
                                            <Link href={buildLink(item.href)}>
                                                <item.icon className="size-4" />
                                                <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroup>
                    )}

                    {/* Super Admin Administration Section */}
                    {(role === 'SUPER_ADMIN' && !targetUserId) && (
                        <>
                            <div className="px-3 py-2 mt-4 mb-2 group-data-[collapsible=icon]:hidden">
                                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                    {t('administration') || "Administration"}
                                </h2>
                            </div>

                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === "/admin"}
                                        className={cn(
                                            "w-full justify-start gap-3 px-3 h-10 transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
                                            "hover:bg-white/10 hover:text-white",
                                            pathname === "/admin"
                                                ? "bg-white/15 text-white shadow-sm"
                                                : "text-zinc-400 group-hover:text-white"
                                        )}
                                    >
                                        <Link href="/admin">
                                            <Building2 className={cn("size-4", pathname === "/admin" ? "text-white" : "text-zinc-400 group-hover:text-white")} />
                                            <span className="font-medium text-[14px] group-data-[collapsible=icon]:hidden">{t('tenants') || "Tenants"}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                {/* ... other admin links ... */}
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === "/admin/requests"}
                                        className={cn(
                                            "w-full justify-start gap-3 px-3 h-10 transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
                                            "hover:bg-white/10 hover:text-white",
                                            pathname === "/admin/requests"
                                                ? "bg-white/15 text-white shadow-sm"
                                                : "text-zinc-400 group-hover:text-white"
                                        )}
                                    >
                                        <Link href="/admin/requests">
                                            <Inbox className={cn("size-4", pathname === "/admin/requests" ? "text-white" : "text-zinc-400 group-hover:text-white")} />
                                            <span className="font-medium text-[14px] group-data-[collapsible=icon]:hidden">{t('moduleRequests') || "Requests"}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === "/platform/super-admin/resources"}
                                        className={cn(
                                            "w-full justify-start gap-3 px-3 h-10 transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
                                            "hover:bg-white/10 hover:text-white",
                                            pathname === "/platform/super-admin/resources"
                                                ? "bg-white/15 text-white shadow-sm"
                                                : "text-zinc-400 group-hover:text-white"
                                        )}
                                    >
                                        <Link href="/platform/super-admin/resources">
                                            <Activity className={cn("size-4", pathname === "/platform/super-admin/resources" ? "text-white" : "text-zinc-400 group-hover:text-white")} />
                                            <span className="font-medium text-[14px] group-data-[collapsible=icon]:hidden">{t('resourceView') || "Resources"}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname.startsWith("/admin/content")}
                                        className={cn(
                                            "w-full justify-start gap-3 px-3 h-10 transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
                                            "hover:bg-white/10 hover:text-white",
                                            pathname.startsWith("/admin/content")
                                                ? "bg-white/15 text-white shadow-sm"
                                                : "text-zinc-400 group-hover:text-white"
                                        )}
                                    >
                                        <Link href="/admin/content/blog">
                                            <FileText className={cn("size-4", pathname.startsWith("/admin/content") ? "text-white" : "text-zinc-400 group-hover:text-white")} />
                                            <span className="font-medium text-[14px] group-data-[collapsible=icon]:hidden">{t('contentManagement') || "Content & CMS"}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </>
                    )}

                    {/* Settings Link (Outside Groups) */}
                    <SidebarGroup className="mt-auto group-data-[collapsible=icon]:p-0">
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={isActive("/console/settings")}
                                    className={cn(
                                        "w-full justify-start gap-3 px-3 h-10 transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
                                        "hover:bg-white/10 hover:text-white",
                                        isActive("/console/settings")
                                            ? "bg-white/15 text-white shadow-sm"
                                            : "text-zinc-400 group-hover:text-white"
                                    )}
                                >
                                    <Link href={buildLink("/console/settings")}>
                                        <Settings className="size-4" />
                                        <span className="font-medium text-[14px] group-data-[collapsible=icon]:hidden">{t('settings')}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroup>
                </SidebarContent>

                <SidebarFooter className="bg-[#000000] border-t border-white/10 p-2">
                    <SidebarMenu className="gap-1">
                        {/* Profile / User */}
                        <SidebarMenuItem>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <SidebarMenuButton
                                        size="lg"
                                        className="data-[state=open]:bg-white/10 hover:bg-white/5 text-white"
                                    >
                                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-zinc-800 text-white font-bold">
                                            {user?.email?.[0].toUpperCase() || 'U'}
                                        </div>
                                        <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                                            <span className="truncate font-semibold">{user?.displayName || 'User'}</span>
                                            <span className="truncate text-xs text-zinc-400">{user?.email}</span>
                                        </div>
                                    </SidebarMenuButton>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    className="w-64 rounded-xl p-0 z-[200]"
                                    side={isMobile ? "top" : "right"}
                                    align={isMobile ? "center" : "end"}
                                    sideOffset={isMobile ? 0 : 24}
                                    alignOffset={isMobile ? 0 : 24}
                                >
                                    <div className="p-4 border-b">
                                        <div className="flex items-center gap-3">
                                            <div className="flex aspect-square size-10 items-center justify-center rounded-full bg-indigo-500 text-white font-bold text-lg">
                                                {user?.email?.[0].toUpperCase() || 'U'}
                                            </div>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="truncate font-semibold text-sm">{user?.displayName || 'User'}</span>
                                                <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-2 border-b bg-muted/30">
                                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Partnership
                                        </div>
                                        <DropdownMenuItem disabled className="px-2 py-2 cursor-pointer">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center size-8 rounded-full bg-gray-100 dark:bg-zinc-800">
                                                    <Shield className="size-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">Partner Program</span>
                                                    <span className="text-xs text-muted-foreground">Perfect for solution providers</span>
                                                </div>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => router.push("/console/settings/developers")} className="px-2 py-2 cursor-pointer">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center size-8 rounded-full bg-gray-100 dark:bg-zinc-800">
                                                    <Code className="size-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">Developer Program</span>
                                                    <span className="text-xs text-muted-foreground">Build and monetize apps</span>
                                                </div>
                                            </div>
                                        </DropdownMenuItem>
                                    </div>

                                    <div className="p-1">
                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger className="px-2 py-2.5 cursor-pointer">
                                                <div className="flex items-center gap-3">
                                                    <Globe className="size-4 text-muted-foreground" />
                                                    <span className="font-medium text-sm">{t('language') || "Language"}</span>
                                                </div>
                                            </DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent className="w-48">
                                                <DropdownMenuItem onClick={() => setLanguage('en')} className="cursor-pointer">
                                                    <div className="flex items-center justify-between w-full">
                                                        <span>English</span>
                                                        {language === 'en' && <Check className="size-4" />}
                                                    </div>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setLanguage('tr')} className="cursor-pointer">
                                                    <div className="flex items-center justify-between w-full">
                                                        <span>Türkçe</span>
                                                        {language === 'tr' && <Check className="size-4" />}
                                                    </div>
                                                </DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>
                                        <DropdownMenuItem onClick={() => router.push("/console/settings/subscription")} className="px-2 py-2.5 cursor-pointer">
                                            <div className="flex items-center gap-3 w-full">
                                                <CreditCard className="size-4 text-black dark:text-white" />
                                                <span className="flex-1 font-medium text-sm">{t('subscription') || "Subscription"}</span>
                                            </div>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem onClick={() => router.push("/console/settings/notifications")} className="px-2 py-2.5 cursor-pointer">
                                            <div className="flex items-center gap-3">
                                                <Bell className="size-4 text-muted-foreground" />
                                                <span className="font-medium text-sm">{t('notificationSettings') || "Notifications"}</span>
                                            </div>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem onClick={() => router.push("/console/settings/company")} className="px-2 py-2.5 cursor-pointer">
                                            <div className="flex items-center gap-3">
                                                <Users className="size-4 text-muted-foreground" />
                                                <span className="font-medium text-sm">{t('companyDetails') || "Company details"}</span>
                                            </div>
                                        </DropdownMenuItem>
                                    </div>

                                    <div className="p-1 border-t">
                                        <DropdownMenuItem onClick={handleLogout} className="px-2 py-2.5 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20">
                                            <LogOut className="mr-2 h-4 w-4" />
                                            <span className="font-medium text-sm">{t('logout')}</span>
                                        </DropdownMenuItem>
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
                <SidebarRail />
            </Sidebar>

            <PricingModal
                isOpen={showPricing}
                onClose={() => setShowPricing(false)}
                currentPlan="free"
            />
        </>
    )
}
