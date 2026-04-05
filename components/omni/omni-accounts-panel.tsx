"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, Loader2, RefreshCw, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { useOmniAccount } from "@/context/OmniAccountContext"
import { useToast } from "@/hooks/use-toast"
import { getPartnerLevelLabel } from "@/lib/management/access"

export function OmniAccountsPanel() {
    const router = useRouter()
    const { user, role, hasOmniPermission } = useAuth()
    const { t } = useLanguage()
    const { accounts, activeAccount, selectAccount, refreshAccounts, isLoading } = useOmniAccount()
    const { toast } = useToast()
    const [search, setSearch] = useState("")
    const [agencyFilter, setAgencyFilter] = useState("all")
    const [omniOnly, setOmniOnly] = useState(false)
    const [pendingAccountId, setPendingAccountId] = useState<string | null>(null)

    const canManageAccounts = hasOmniPermission("directory.accounts.manage")

    const agencyOptions = useMemo(() => {
        return Array.from(new Set(accounts.map((account) => account.partnerName || account.agencyName).filter((value): value is string => Boolean(value)))).sort()
    }, [accounts])

    const filteredAccounts = useMemo(() => {
        const normalized = search.trim().toLowerCase()
        return accounts.filter((account) => {
            if (omniOnly && !account.omniEnabled) return false
            if (agencyFilter !== "all" && ((account.partnerName || account.agencyName) || "__none__") !== agencyFilter) return false
            if (!normalized) return true
            return [account.companyName, account.email, account.partnerName, account.agencyName, account.industry]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(normalized))
        })
    }, [accounts, search, omniOnly, agencyFilter])

    const emptyState = useMemo(() => {
        if (isLoading) {
            return {
                title: t("omni.common.loading"),
                description: t("omni.accounts.loading"),
                ctaHref: null as string | null,
                ctaLabel: null as string | null,
            }
        }

        if (accounts.length === 0) {
            if (role === "AGENCY_ADMIN") {
                return {
                    title: t("omni.accounts.emptyManagedTitle"),
                    description: t("omni.accounts.emptyManagedDescription"),
                    ctaHref: "/agency/end-users",
                    ctaLabel: t("omni.accounts.openManagedAccounts"),
                }
            }

            if (role === "SUPER_ADMIN") {
                return {
                    title: t("omni.accounts.emptySuperTitle"),
                    description: t("omni.accounts.emptySuperDescription"),
                    ctaHref: null,
                    ctaLabel: null,
                }
            }
        }

        return {
            title: t("omni.accounts.empty"),
            description: t("omni.accounts.emptyFiltered"),
            ctaHref: null,
            ctaLabel: null,
        }
    }, [accounts.length, isLoading, role, t])

    if (!hasOmniPermission("directory.accounts.view")) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-16 text-center text-sm text-muted-foreground">
                    {t("omni.accounts.forbidden")}
                </CardContent>
            </Card>
        )
    }

    const enableOmniForAccount = async (accountId: string) => {
        if (!user || !canManageAccounts) return

        setPendingAccountId(accountId)
        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/directory/accounts/${accountId}`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ omniEnabled: true }),
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data.error || "Failed to enable Omni")
            }

            await refreshAccounts()
            selectAccount(accountId)

            toast({
                title: t("omni.accounts.enableSuccessTitle"),
                description: t("omni.accounts.enableSuccessDescription"),
            })
        } catch (error) {
            toast({
                variant: "destructive",
                title: t("omni.accounts.enableErrorTitle"),
                description: error instanceof Error ? error.message : t("omni.accounts.enableErrorDescription"),
            })
        } finally {
            setPendingAccountId(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardDescription>{t("omni.accounts.metric.total")}</CardDescription>
                        <CardTitle className="text-2xl">{accounts.length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>{t("omni.accounts.metric.omniEnabled")}</CardDescription>
                        <CardTitle className="text-2xl">{accounts.filter((account) => account.omniEnabled).length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>{t("omni.accounts.metric.active")}</CardDescription>
                        <CardTitle className="text-2xl">{accounts.filter((account) => account.isActive && !account.isArchived).length}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <CardTitle className="text-lg">{t("omni.accounts.list.title")}</CardTitle>
                        <CardDescription>{t("omni.accounts.list.description")}</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <div className="relative min-w-[260px]">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder={t("omni.accounts.search")} />
                        </div>
                        <div className="min-w-[220px]">
                            <Select value={agencyFilter} onValueChange={setAgencyFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t("omni.accounts.field.agency")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t("omni.accounts.allAgencies")}</SelectItem>
                                    <SelectItem value="__none__">{t("omni.accounts.noAgency")}</SelectItem>
                                    {agencyOptions.map((agency) => (
                                        <SelectItem key={agency} value={agency}>
                                            {agency}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border px-3">
                            <Switch checked={omniOnly} onCheckedChange={setOmniOnly} />
                            <span className="text-sm text-muted-foreground">{t("omni.accounts.omniOnly")}</span>
                        </div>
                        <Button variant="outline" onClick={() => refreshAccounts()}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            {t("omni.accounts.refresh")}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {filteredAccounts.length === 0 ? (
                        <div className="rounded-lg border border-dashed px-4 py-10 text-center">
                            <div className="space-y-3">
                                <div className="text-sm font-medium text-foreground">{emptyState.title}</div>
                                <div className="text-sm text-muted-foreground">{emptyState.description}</div>
                                {emptyState.ctaHref && emptyState.ctaLabel ? (
                                    <div className="flex justify-center">
                                        <Button asChild variant="outline">
                                            <Link href={emptyState.ctaHref}>{emptyState.ctaLabel}</Link>
                                        </Button>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ) : (
                        filteredAccounts.map((account) => (
                            <div key={account.id} className="flex flex-col gap-4 rounded-lg border bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="min-w-0 space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                        <div className="truncate font-medium">{account.companyName || account.email || account.id}</div>
                                        {activeAccount?.id === account.id ? <Badge>{t("omni.accounts.selected")}</Badge> : null}
                                        <Badge variant={account.omniEnabled ? "secondary" : "outline"}>
                                            {account.omniEnabled ? t("omni.accounts.omniEnabled") : t("omni.accounts.omniDisabled")}
                                        </Badge>
                                        {account.partnerLevel ? (
                                            <Badge variant="secondary">
                                                {getPartnerLevelLabel(account.partnerLevel)}
                                            </Badge>
                                        ) : null}
                                        <Badge variant={account.isActive ? "outline" : "destructive"}>
                                            {account.isActive ? t("omni.accounts.status.active") : t("omni.accounts.status.inactive")}
                                        </Badge>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {account.email || t("omni.common.notAvailable")}
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                                        <span>{t("omni.accounts.field.agency")}: {account.partnerName || account.agencyName || t("omni.accounts.noAgency")}</span>
                                        <span>{t("omni.accounts.field.industry")}: {account.industry || t("omni.common.notAvailable")}</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {!account.omniEnabled && canManageAccounts ? (
                                        <Button
                                            onClick={() => enableOmniForAccount(account.id)}
                                            disabled={pendingAccountId === account.id}
                                        >
                                            {pendingAccountId === account.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                            {pendingAccountId === account.id ? t("omni.accounts.enablingOmni") : t("omni.accounts.enableOmni")}
                                        </Button>
                                    ) : null}
                                    <Button
                                        variant="outline"
                                        disabled={!account.omniEnabled}
                                        onClick={() => {
                                            const changed = selectAccount(account.id)
                                            if (changed) {
                                                router.push("/omni")
                                            }
                                        }}
                                    >
                                        {account.omniEnabled ? t("omni.accounts.openInOmni") : t("omni.accounts.omniDisabled")}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        disabled={!account.omniEnabled}
                                        onClick={() => {
                                            const changed = selectAccount(account.id)
                                            if (changed || activeAccount?.id === account.id) {
                                                router.push("/omni/settings")
                                            }
                                        }}
                                    >
                                        {t("omni.accounts.openSettings")}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        disabled={!account.omniEnabled}
                                        onClick={() => {
                                            const changed = selectAccount(account.id)
                                            if (changed || activeAccount?.id === account.id) {
                                                router.push("/omni/channels/web-widget")
                                            }
                                        }}
                                    >
                                        {t("omni.accounts.openWidget")}
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
