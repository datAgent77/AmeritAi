"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
    CreditCard,
    Bell,
    ChevronRight,
    Globe,
    Check,
    Building2,
    Inbox,
    Calendar,
    Activity,
    Utensils,
    FileText,
    Rocket,
    LifeBuoy,
    Gift
} from "lucide-react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { PricingModal } from "@/components/pricing-modal"
import { isGamificationModuleEnabled } from "@/lib/gamification/access"
import { useEffect, useState } from "react"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
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
    daysLeft?: number
    planId?: string
    isTrial?: boolean
}

export function ConsoleSidebar({ targetUserId, targetEmail, sectorId, daysLeft, planId, isTrial = false }: ConsoleSidebarProps) {
    const pathname = usePathname() || ""
    const normalizedPathname = pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname
    const router = useRouter()
    const { t, language, setLanguage } = useLanguage()
    const {
        user,
        role,
        userData,
        enableLeadCollection,
        enableDigitalWaiter
    } = useAuth()
    const { isMobile } = useSidebar()
    const [showPricing, setShowPricing] = useState(false)
    const [isHumanHandoffEnabled, setIsHumanHandoffEnabled] = useState(false)
    const [isLeadCollectionEnabled, setIsLeadCollectionEnabled] = useState(false)
    const [isDigitalWaiterEnabled, setIsDigitalWaiterEnabled] = useState(false)
    const [isAppointmentsEnabled, setIsAppointmentsEnabled] = useState(false)
    const [isGamificationEnabled, setIsGamificationEnabled] = useState(false)
    const isAgentUser = role === "AGENT"
    const isAgenciesAdminRoute =
        normalizedPathname === "/admin/agencies" ||
        normalizedPathname.startsWith("/admin/agency/")
    const isEndUsersAdminRoute =
        normalizedPathname === "/admin/end-users" ||
        normalizedPathname.startsWith("/admin/tenant/")

    useEffect(() => {
        const loadTenantModuleStatus = async () => {
            if (!user) return
            try {
                const assignedTenantId = typeof userData?.agentTenantId === "string" ? userData.agentTenantId.trim() : ""
                const chatbotId = targetUserId || (isAgentUser ? assignedTenantId : user.uid)
                if (!chatbotId) return
                const token = await user.getIdToken()
                const response = await fetch(`/api/console/settings?chatbotId=${chatbotId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (!response.ok) return
                const data = await response.json()
                setIsHumanHandoffEnabled(data.enableHumanHandoff === true)
                setIsLeadCollectionEnabled(data.enableLeadCollection === true || data.enableLeadFinder === true || data.productEntitlements?.leadFinder === true)
                setIsDigitalWaiterEnabled(data.enableDigitalWaiter === true)
                setIsAppointmentsEnabled(data.enableAppointments === true)
                setIsGamificationEnabled(isGamificationModuleEnabled(data, data))
            } catch (error) {
                console.error("Failed to load tenant module status:", error)
            }
        }

        loadTenantModuleStatus()
    }, [targetUserId, user, userData, isAgentUser])

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

    // Super admins keep a global admin dashboard at `/admin`.
    // Tenant-scoped chatbot menus only make sense while viewing a specific tenant.
    const showGlobalAdminOverview = role === "SUPER_ADMIN" && !targetUserId
    const showChatbotMenus = role !== "SUPER_ADMIN" || !!targetUserId
    const canViewTenantSettings = !!targetUserId && (role === "SUPER_ADMIN" || role === "AGENCY_ADMIN")

    // Top-level overview item (outside groups)
    const overviewHref = targetUserId
        ? buildLink("/console/chatbot")
        : role === "SUPER_ADMIN"
            ? "/admin"
            : "/console/chatbot"
    const isOverviewActive = targetUserId
        ? pathname === buildLink("/console/chatbot")
        : role === "SUPER_ADMIN"
            ? normalizedPathname === "/admin"
            : pathname === "/console/chatbot"
    const overviewItem = {
        title: t('overview') || "Genel Bakış",
        icon: LayoutDashboard,
        href: overviewHref,
        active: isOverviewActive
    }
    const isAgentsActive = isActive("/console/agents")
    const isSkillsActive = isActive("/console/modules") && !isAgentsActive
    const canShowLeadCollection = targetUserId
        ? isLeadCollectionEnabled
        : (enableLeadCollection ||
            isLeadCollectionEnabled ||
            userData?.enableLeadCollection === true ||
            userData?.enableLeadFinder === true ||
            userData?.productEntitlements?.leadFinder === true)

    const canShowAppointments = targetUserId ? isAppointmentsEnabled : (userData?.enableAppointments === true || isAppointmentsEnabled)
    const canShowDigitalWaiter = targetUserId ? isDigitalWaiterEnabled : (enableDigitalWaiter === true || isDigitalWaiterEnabled)
    const canShowGamification = targetUserId
        ? isGamificationEnabled
        : (isGamificationModuleEnabled(null, userData) || isGamificationEnabled)

    const tenantGroups = [
// ... unchanged ...
        {
            label: t('build') || "Build",
            items: [
                {
                    title: t('training') || "Training",
                    icon: GraduationCap, // or BookOpen
                    href: "/console/knowledge",
                    active: isActive("/console/knowledge")
                },
                {
                    title: t('skills') || "Skills",
                    icon: Grid,
                    href: "/console/modules",
                    active: isSkillsActive
                },
                ...((isHumanHandoffEnabled || isAgentsActive) ? [{
                    title: t('agents') || "Agents",
                    icon: Users,
                    href: "/console/agents",
                    active: isAgentsActive
                }] : []),

            ]
        },
        {
            label: t('connect') || "Connect",
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
            label: t('grow') || "Grow",
            items: [
                {
                    title: t('chats') || "Inbox", // Label change for clarity
                    icon: Inbox,
                    href: "/console/chatbot/chats",
                    active: isActive("/console/chatbot/chats")
                },
                ...(canShowAppointments ? [{
                    title: t('appointments') || "Appointments",
                    icon: Calendar,
                    href: "/console/appointments",
                    active: isActive("/console/appointments")
                }] : []),
                ...(canShowLeadCollection ? [{
                    title: t('leads') || "Müşteri Adayları",
                    icon: Users,
                    href: "/console/chatbot/leads",
                    active: isActive("/console/chatbot/leads")
                }] : []),
                ...(canShowGamification ? [{
                    title: t('participantsWinners') || "Katılımcılar & Kazananlar",
                    icon: Gift,
                    href: "/console/gamification-winners",
                    active: isActive("/console/gamification-winners")
                }] : []),
                {
                    title: t('reports') || "Analytics",
                    icon: BarChart3,
                    href: "/console/chatbot/analytics",
                    active: isActive("/console/chatbot/analytics")
                },
                ...(canShowDigitalWaiter ? [{
                    title: t('modules.digitalWaiter') || "Dijital Garson",
                    icon: Utensils,
                    href: "/console/digital-waiter",
                    active: isActive("/console/digital-waiter")
                }] : [])
            ]
        },
        ...(canViewTenantSettings ? [{
            label: t('settings') || "Ayarlar",
            items: [
                {
                    title: t('subscription') || "Abonelik",
                    icon: CreditCard,
                    href: "/console/settings/customer-admin",
                    active: isActive("/console/settings/customer-admin")
                },
                {
                    title: t('aiConfiguration') || "AI Yapılandırması",
                    icon: Settings,
                    href: "/console/settings/ai",
                    active: isActive("/console/settings/ai")
                },
                {
                    title: t('notificationSettings') || "Bildirimler",
                    icon: Bell,
                    href: "/console/settings/notifications",
                    active: isActive("/console/settings/notifications")
                },
                ...(role === "SUPER_ADMIN" ? [{
                    title: t('accountSettings') || "Hesap Ayarları",
                    icon: UserCircle,
                    href: "/console/settings/account",
                    active: isActive("/console/settings/account")
                }] : [])
            ]
        }] : []),
        {
            label: language === "tr" ? "Destek" : "Support",
            items: [
                {
                    title: t('footerHelp') || "Help Center",
                    icon: LifeBuoy,
                    href: "/console/help-center",
                    active: isActive("/console/help-center")
                }
            ]
        }
    ]
    const hiddenForAgent = new Set([
        "/console/knowledge",
        "/console/modules",
        "/console/agents",
        "/console/chatbot/widget",
        "/console/chatbot/integration",
    ])
    const visibleTenantGroups = isAgentUser
        ? tenantGroups
            .map((group) => ({
                ...group,
                items: group.items.filter((item) => !hiddenForAgent.has(item.href)),
            }))
            .filter((group) => group.items.length > 0)
        : tenantGroups

    // Special items that don't fit groups or are conditional
    const specialItems = [
// ... unchanged ...
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
                            width={76}
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
                            width={30}
                            height={30}
                            className="h-[30px] w-[30px] object-contain"
                            priority
                        />
                    </div>
                </SidebarHeader>

                <SidebarContent className="bg-[#000000] px-2 py-1.5 gap-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-700">
                    {/* Super Admin Back Button */}
                    {targetUserId && (
                        <SidebarMenu className="mb-4">
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    size="lg"
                                    onClick={() => router.push(role === "AGENCY_ADMIN" ? "/agency" : "/admin/end-users")}
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

                    {showGlobalAdminOverview && (
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
                                    <Link href={overviewItem.href}>
                                        <overviewItem.icon className={cn("size-4 transition-colors", overviewItem.active ? "text-white" : "text-zinc-400 group-hover:text-white")} />
                                        <span className="font-medium text-[14px] group-data-[collapsible=icon]:hidden">{overviewItem.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    )}

                    {showChatbotMenus && (
                        <>
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
                            {visibleTenantGroups.map((group) => (
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
                        </>
                    )}

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
                                        isActive={isAgenciesAdminRoute}
                                        className={cn(
                                            "w-full justify-start gap-3 px-3 h-10 transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
                                            "hover:bg-white/10 hover:text-white",
                                            isAgenciesAdminRoute
                                                ? "bg-white/15 text-white shadow-sm"
                                                : "text-zinc-400 group-hover:text-white"
                                        )}
                                    >
                                        <Link href="/admin/agencies">
                                            <Building2 className={cn("size-4", isAgenciesAdminRoute ? "text-white" : "text-zinc-400 group-hover:text-white")} />
                                            <span className="font-medium text-[14px] group-data-[collapsible=icon]:hidden">{t('agencies') || "Partnerler"}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={isEndUsersAdminRoute}
                                        className={cn(
                                            "w-full justify-start gap-3 px-3 h-10 transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
                                            "hover:bg-white/10 hover:text-white",
                                            isEndUsersAdminRoute
                                                ? "bg-white/15 text-white shadow-sm"
                                                : "text-zinc-400 group-hover:text-white"
                                        )}
                                    >
                                        <Link href="/admin/end-users">
                                            <Users className={cn("size-4", isEndUsersAdminRoute ? "text-white" : "text-zinc-400 group-hover:text-white")} />
                                            <span className="font-medium text-[14px] group-data-[collapsible=icon]:hidden">{t('endUsers') || "Son Kullanıcılar"}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                {/* ... other admin links ... */}
                                {/* Removed Module Requests Link */}
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
                                {/* Removed Subscription Management Link */}
                            </SidebarMenu>
                        </>
                    )}

                    {/* Settings Link Removed */}
                </SidebarContent>

                <SidebarFooter className="bg-[#000000] border-t border-white/10 p-2">
                    {/* Trial / Upgrade Status (Only for users on free/trial plan, not paid users) */}
                    {(() => {
                        // Show banner only if:
                        // - planId is loaded (non-empty) to avoid flicker during initial load
                        // - isTrial is explicitly true
                        // - NOT in super-admin tenant view
                        // - user is NOT a SUPER_ADMIN
                        const shouldShowBanner = !!planId && !targetUserId && isTrial && role !== 'SUPER_ADMIN'
                        
                        if (!shouldShowBanner) return null
                        
                        return (
                            <div className="mx-2 mt-4 mb-2 p-3 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/10 group-data-[collapsible=icon]:hidden">
                                <div className="flex items-center gap-2 mb-2">
                                    <Rocket className="w-4 h-4 text-violet-400" />
                                    <span className="text-xs font-semibold text-white">
                                        {planId ? `${planId.charAt(0).toUpperCase() + planId.slice(1)} ${t('trial') || 'Deneme'}` : (t('freeTrial') || 'Ücretsiz Deneme')}
                                    </span>
                                </div>
                                
                                {daysLeft !== undefined && daysLeft <= 14 && (
                                    <div className="mb-3">
                                        <div className="text-xs text-zinc-400 mb-1">{t('daysRemaining') || 'Days Remaining'}:</div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 flex-1 bg-zinc-800 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full ${daysLeft < 3 ? 'bg-red-500' : 'bg-violet-500'}`} 
                                                    style={{ width: `${Math.max(0, (daysLeft / 14) * 100)}%` }}
                                                />
                                            </div>
                                            <span className={`text-xs font-bold ${daysLeft < 3 ? 'text-red-400' : 'text-white'}`}>
                                                {Math.max(0, daysLeft)}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={() => setShowPricing(true)}
                                    className="w-full py-2 px-3 bg-white text-black text-xs font-bold rounded-lg hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Zap className="w-3.5 h-3.5 fill-black" />
                                    {t('upgradePlan') || 'Upgrade Plan'}
                                </button>
                            </div>
                        )
                    })()}

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
                                            <span className="truncate font-semibold">{user?.displayName || t('user') || 'Kullanıcı'}</span>
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
                                                <span className="truncate font-semibold text-sm">{user?.displayName || t('user') || 'Kullanıcı'}</span>
                                                <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                                            </div>
                                        </div>
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
                                        <DropdownMenuItem onClick={() => router.push("/console/settings/account")} className="px-2 py-2.5 cursor-pointer">
                                            <div className="flex items-center gap-3 w-full">
                                                <UserCircle className="size-4 text-muted-foreground" />
                                                <span className="flex-1 font-medium text-sm">{t('accountSettings') || "Hesap Ayarları"}</span>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => router.push("/console/settings/subscription")} className="px-2 py-2.5 cursor-pointer">
                                            <div className="flex items-center gap-3 w-full">
                                                <CreditCard className="size-4 text-black dark:text-white" />
                                                <span className="flex-1 font-medium text-sm">{t('viewPlan') || "Planı Göster"}</span>
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

                                        {/* Subscription Management - Super Admin Only */}
                                        {role === 'SUPER_ADMIN' && (
                                            <DropdownMenuItem onClick={() => router.push("/admin/end-users")} className="px-2 py-2.5 cursor-pointer">
                                                <div className="flex items-center gap-3">
                                                    <Package className="size-4 text-muted-foreground" />
                                                    <span className="font-medium text-sm">{t('subscriptionManagement') || "Abonelik Yönetimi"}</span>
                                                </div>
                                            </DropdownMenuItem>
                                        )}
                                    </div>

                                    <div className="p-1 border-t">
                                        <DropdownMenuItem onClick={handleLogout} className="px-2 py-2.5 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20">
                                            <LogOut className="mr-2 h-4 w-4 text-red-600" />
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
                currentPlanId={planId || 'starter'}
            />
        </>
    )
}
