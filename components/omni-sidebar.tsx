"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Building2, Check, ChevronDown, Globe, Loader2 } from "lucide-react"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    useSidebar,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/context/AuthContext"
import { useOmniAccount } from "@/context/OmniAccountContext"
import { useLanguage } from "@/context/LanguageContext"
import { cn } from "@/lib/utils"
import { getOmniNavGroups, getOmniTopLevelItems } from "@/lib/omni/navigation"

function getNavGroupsStorageKey(uid: string) {
    return `omni:nav-groups:${uid}`
}

function sanitizeGroupIds(ids: string[], validIds: string[]) {
    return Array.from(new Set(ids.filter((id) => validIds.includes(id))))
}

function isActivePath(pathname: string, href: string) {
    if (href === "/omni") {
        return pathname === "/omni"
    }

    return pathname === href || pathname.startsWith(`${href}/`)
}

function OmniNavButton({ href, title, icon: Icon, pathname }: { href: string; title: string; icon: any; pathname: string }) {
    const active = isActivePath(pathname, href)

    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild
                isActive={active}
                className={cn(
                    "h-10 rounded-xl text-white/70 hover:bg-white/5 hover:text-white data-[active=true]:bg-white/10 data-[active=true]:text-white"
                )}
                tooltip={title}
            >
                <Link href={href}>
                    <Icon className="h-4 w-4" />
                    <span>{title}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    )
}

export function OmniSidebar() {
    const pathname = usePathname() || "/omni"
    const router = useRouter()
    const { user, omniPermissions } = useAuth()
    const { isMobile, state } = useSidebar()
    const { language, setLanguage, t } = useLanguage()
    const { accounts, activeAccount, canSwitchAccounts, isLoading, selectAccount } = useOmniAccount()
    const topLevelItems = getOmniTopLevelItems(t, omniPermissions)
    const navGroups = getOmniNavGroups(t, omniPermissions)
    const userFallback = user?.displayName || t("omni.userMenu.userFallback")
    const navGroupIds = useMemo(() => navGroups.map((group) => group.id), [navGroups])
    const navGroupIdsKey = navGroupIds.join("|")
    const activeGroupId = useMemo(
        () => navGroups.find((group) => group.items.some((item) => isActivePath(pathname, item.href)))?.id || null,
        [navGroups, pathname]
    )
    const [openGroupIds, setOpenGroupIds] = useState<string[]>(navGroupIds)
    const [groupStateReady, setGroupStateReady] = useState(false)
    const isSidebarIconCollapsed = state === "collapsed"

    useEffect(() => {
        const defaultIds: string[] = [...navGroupIds]

        if (!user || typeof window === "undefined") {
            setOpenGroupIds(activeGroupId && !defaultIds.includes(activeGroupId) ? [...defaultIds, activeGroupId] : defaultIds)
            setGroupStateReady(true)
            return
        }

        let nextOpenIds: string[] = defaultIds

        try {
            const storedValue = localStorage.getItem(getNavGroupsStorageKey(user.uid))
            if (storedValue) {
                const parsed = JSON.parse(storedValue)
                if (Array.isArray(parsed)) {
                    const sanitized = sanitizeGroupIds(parsed.filter((item): item is string => typeof item === "string"), defaultIds)
                    nextOpenIds = sanitized.length > 0 ? sanitized : defaultIds
                }
            }
        } catch (error) {
            console.warn("Failed to restore Omni nav group state", error)
        }

        if (activeGroupId && !nextOpenIds.includes(activeGroupId)) {
            nextOpenIds = [...nextOpenIds, activeGroupId]
        }

        setOpenGroupIds(nextOpenIds)
        setGroupStateReady(true)
    }, [user?.uid, navGroupIdsKey])

    useEffect(() => {
        if (!groupStateReady || !activeGroupId) return

        setOpenGroupIds((current) => {
            const sanitized = sanitizeGroupIds(current, navGroupIds)
            return sanitized.includes(activeGroupId) ? sanitized : [...sanitized, activeGroupId]
        })
    }, [activeGroupId, navGroupIdsKey, groupStateReady])

    useEffect(() => {
        if (!groupStateReady || !user || typeof window === "undefined") return
        localStorage.setItem(getNavGroupsStorageKey(user.uid), JSON.stringify(sanitizeGroupIds(openGroupIds, navGroupIds)))
    }, [groupStateReady, user?.uid, openGroupIds, navGroupIdsKey])

    const toggleGroup = (groupId: string) => {
        setOpenGroupIds((current) => (current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId]))
    }

    return (
        <Sidebar collapsible="icon" className="!top-0 !h-screen z-40 border-none bg-[#111111] text-white">
            <SidebarHeader className="!h-16 !p-0 border-b border-white/10 bg-[#111111]">
                <div className="flex h-full items-center justify-between px-4 group-data-[collapsible=icon]:justify-center">
                    <div className="flex items-center gap-3 group-data-[collapsible=icon]:hidden">
                        <Image
                            src="/vion-logo-text-light.png"
                            alt="Vion"
                            width={80}
                            height={24}
                            className="h-6 w-auto object-contain"
                            priority
                        />
                        <Badge className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-white/5">
                            {t("omni.brand.badge")}
                        </Badge>
                    </div>
                    <div className="hidden items-center justify-center group-data-[collapsible=icon]:flex">
                        <Image
                            src="/vion-logo-icon-white.png"
                            alt="Vion"
                            width={32}
                            height={32}
                            className="h-8 w-8 object-contain"
                            priority
                        />
                    </div>
                </div>
            </SidebarHeader>

            <SidebarContent className="bg-[#111111] px-2 py-3 gap-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
                {canSwitchAccounts ? (
                    <div className="px-2 pb-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left text-sm text-white transition hover:bg-white/10">
                                    <div className="min-w-0">
                                        <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                                            {t("omni.accountSwitcher.label")}
                                        </div>
                                        <div className="truncate pt-1 font-medium">
                                            {isLoading
                                                ? t("omni.accountSwitcher.loading")
                                                : activeAccount?.companyName || activeAccount?.email || t("omni.accountSwitcher.select")}
                                        </div>
                                    </div>
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-white/60" /> : <Building2 className="h-4 w-4 text-white/70" />}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-80 rounded-xl p-1" align="start" side={isMobile ? "bottom" : "right"}>
                                <DropdownMenuLabel>{t("omni.accountSwitcher.title")}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {accounts.length === 0 ? (
                                    <DropdownMenuItem disabled>{t("omni.accountSwitcher.empty")}</DropdownMenuItem>
                                ) : (
                                    accounts.map((account) => (
                                        <DropdownMenuItem
                                            key={account.id}
                                            disabled={!account.omniEnabled}
                                            onClick={() => {
                                                const changed = selectAccount(account.id)
                                                if (changed && pathname.startsWith("/omni/directory/")) {
                                                    router.push("/omni")
                                                }
                                            }}
                                            className="cursor-pointer"
                                        >
                                            <div className="flex w-full items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="truncate font-medium">{account.companyName || account.email || account.id}</div>
                                                    <div className="truncate text-xs text-muted-foreground">
                                                        {account.agencyName || t("omni.accountSwitcher.noAgency")}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {!account.omniEnabled ? (
                                                        <span className="text-[10px] uppercase tracking-wide text-amber-600">
                                                            {t("omni.accountSwitcher.omniDisabled")}
                                                        </span>
                                                    ) : null}
                                                    {activeAccount?.id === account.id ? <Check className="h-4 w-4" /> : null}
                                                </div>
                                            </div>
                                        </DropdownMenuItem>
                                    ))
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => router.push("/omni/directory/accounts")} className="cursor-pointer">
                                    {t("omni.accountSwitcher.manageAccounts")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ) : null}

                <SidebarMenu>
                    {topLevelItems.map((item) => (
                        <OmniNavButton key={item.href} href={item.href} title={item.title} icon={item.icon} pathname={pathname} />
                    ))}
                </SidebarMenu>

                {navGroups.map((section) => {
                    const isOpen = isSidebarIconCollapsed || openGroupIds.includes(section.id)
                    const isGroupActive = activeGroupId === section.id

                    return (
                    <SidebarGroup key={section.id} className="pt-2">
                        <SidebarGroupLabel asChild className="px-0 group-data-[collapsible=icon]:hidden">
                            <button
                                type="button"
                                onClick={() => toggleGroup(section.id)}
                                className={cn(
                                    "flex w-full items-center justify-between rounded-xl px-2 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors",
                                    isGroupActive || isOpen ? "text-white/58 hover:text-white/75" : "text-white/35 hover:text-white/58"
                                )}
                            >
                                <span>{section.title}</span>
                                <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen ? "rotate-180" : "rotate-0")} />
                            </button>
                        </SidebarGroupLabel>
                        <SidebarGroupContent
                            className={cn(
                                "overflow-hidden transition-[max-height,opacity] duration-200 ease-out",
                                isOpen ? "max-h-[32rem] opacity-100" : "pointer-events-none max-h-0 opacity-0"
                            )}
                        >
                            <SidebarMenu>
                                {section.items.map((item) => (
                                    <OmniNavButton key={item.href} href={item.href} title={item.title} icon={item.icon} pathname={pathname} />
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                    )
                })}
            </SidebarContent>
            <SidebarFooter className="border-t border-white/10 bg-[#111111] p-2">
                <SidebarMenu className="gap-1">
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="rounded-xl text-white data-[state=open]:bg-white/10 hover:bg-white/5"
                                >
                                    <div className="flex aspect-square size-8 items-center justify-center rounded-xl bg-white/10 text-white font-bold">
                                        {user?.email?.[0]?.toUpperCase() || "U"}
                                    </div>
                                    <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                                        <span className="truncate font-semibold">{userFallback}</span>
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
                                        <div className="flex aspect-square size-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
                                            {user?.email?.[0]?.toUpperCase() || "U"}
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="truncate font-semibold text-sm">{userFallback}</span>
                                            <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-1">
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger className="px-2 py-2.5 cursor-pointer">
                                            <div className="flex items-center gap-3">
                                                <Globe className="size-4 text-muted-foreground" />
                                                <span className="font-medium text-sm">{t("omni.userMenu.language")}</span>
                                            </div>
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent className="w-48">
                                            <DropdownMenuItem onClick={() => setLanguage("en")} className="cursor-pointer">
                                                <div className="flex items-center justify-between w-full">
                                                    <span>{t("omni.userMenu.english")}</span>
                                                    {language === "en" ? <Check className="size-4" /> : null}
                                                </div>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setLanguage("tr")} className="cursor-pointer">
                                                <div className="flex items-center justify-between w-full">
                                                    <span>{t("omni.userMenu.turkish")}</span>
                                                    {language === "tr" ? <Check className="size-4" /> : null}
                                                </div>
                                            </DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>
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
