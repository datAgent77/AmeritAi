"use client"

import { useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { getPartnerLevelLabel } from "@/lib/management/access"
import type { PartnerLevel } from "@/lib/management/types"
import type { OmniDirectoryAgencyRecord } from "@/lib/omni/types"

export function OmniAgenciesPanel() {
    const { user, hasOmniPermission } = useAuth()
    const { t } = useLanguage()
    const { toast } = useToast()
    const [agencies, setAgencies] = useState<OmniDirectoryAgencyRecord[]>([])
    const [search, setSearch] = useState("")
    const [levelFilter, setLevelFilter] = useState<PartnerLevel | "all">("all")
    const [isLoading, setIsLoading] = useState(true)

    const load = async () => {
        if (!user) return

        setIsLoading(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/omni/directory/agencies", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                throw new Error("Failed to load agencies")
            }

            const data = await response.json()
            setAgencies(Array.isArray(data.agencies) ? data.agencies : [])
        } catch (error) {
            console.error("Failed to load agencies", error)
            setAgencies([])
            toast({
                title: t("omni.agencies.toast.loadFailed.title"),
                description: t("omni.agencies.toast.loadFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        load()
    }, [user?.uid])

    const filteredAgencies = useMemo(() => {
        const normalized = search.trim().toLowerCase()
        return agencies.filter((agency) => {
            const matchesSearch = !normalized || [agency.partnerName, agency.agencyName, agency.email, agency.firstName, agency.lastName]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(normalized))
            const matchesLevel = levelFilter === "all" || agency.partnerLevel === levelFilter
            return matchesSearch && matchesLevel
        })
    }, [agencies, search, levelFilter])

    if (!hasOmniPermission("directory.agencies.view")) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-16 text-center text-sm text-muted-foreground">
                    {t("omni.agencies.forbidden")}
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                <CardHeader>
                    <CardDescription>{t("omni.agencies.metric.total")}</CardDescription>
                    <CardTitle className="text-2xl">{agencies.length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>{t("omni.agencies.metric.accounts")}</CardDescription>
                        <CardTitle className="text-2xl">{agencies.reduce((sum, agency) => sum + agency.customerCount, 0)}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>{t("omni.agencies.metric.omniEnabled")}</CardDescription>
                        <CardTitle className="text-2xl">{agencies.reduce((sum, agency) => sum + agency.omniEnabledAccounts, 0)}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{t("omni.agencies.list.title")}</CardTitle>
                    <CardDescription>{t("omni.agencies.list.description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder={t("omni.agencies.search")} />
                    </div>
                    <div className="max-w-sm">
                        <select
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={levelFilter}
                            onChange={(event) => setLevelFilter(event.target.value as PartnerLevel | "all")}
                        >
                            <option value="all">Partner Level: All</option>
                            <option value="partner">Partner</option>
                            <option value="solution_partner">Solution Partner</option>
                            <option value="strategic_partner">Strategic Partner</option>
                        </select>
                    </div>

                    {filteredAgencies.length === 0 ? (
                        <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                            {isLoading ? t("omni.agencies.loading") : t("omni.agencies.empty")}
                        </div>
                    ) : (
                        filteredAgencies.map((agency) => (
                            <div key={agency.id} className="rounded-lg border bg-white p-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="font-medium">{agency.partnerName || agency.agencyName || agency.email || agency.id}</div>
                                    <Badge variant="secondary">
                                        {getPartnerLevelLabel(agency.partnerLevel)}
                                    </Badge>
                                    <Badge variant={agency.isActive ? "outline" : "destructive"}>
                                        {agency.isActive ? t("omni.agencies.status.active") : t("omni.agencies.status.inactive")}
                                    </Badge>
                                </div>
                                <div className="mt-2 text-sm text-muted-foreground">{agency.email || t("omni.common.notAvailable")}</div>
                                <div className="mt-3 grid gap-3 md:grid-cols-3">
                                    <div className="rounded-lg border px-4 py-3 text-sm">
                                        <div className="text-muted-foreground">{t("omni.agencies.field.accounts")}</div>
                                        <div className="mt-1 font-medium">{agency.customerCount}</div>
                                    </div>
                                    <div className="rounded-lg border px-4 py-3 text-sm">
                                        <div className="text-muted-foreground">{t("omni.agencies.field.omniEnabledAccounts")}</div>
                                        <div className="mt-1 font-medium">{agency.omniEnabledAccounts}</div>
                                    </div>
                                    <div className="rounded-lg border px-4 py-3 text-sm">
                                        <div className="text-muted-foreground">{t("omni.agencies.field.phone")}</div>
                                        <div className="mt-1 font-medium">{agency.phone || t("omni.common.notAvailable")}</div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
