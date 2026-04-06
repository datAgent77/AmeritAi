"use client"

import Image from "next/image"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ShieldCheck, Loader2, Plus, Search, Settings, Users, Activity } from "lucide-react"
import { auth } from "@/lib/firebase"
import { uploadLogo } from "@/lib/widget-settings-utils"
import type { ManagementPartnerRecord, PartnerCapabilities } from "@/lib/management/types"
import { getPartnerLevelLabel } from "@/lib/management/access"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

interface ManagedCustomer {
    id: string
    email: string
    firstName?: string
    lastName?: string
    companyName?: string
    industry?: string
    isActive: boolean
    isArchived?: boolean
}



function getIndustryLabel(industry: string | null | undefined, t: (key: string) => string) {
    switch (industry) {
        case "ecommerce":
            return t("agencyIndustryEcommerce")
        case "booking":
            return t("agencyIndustryBooking")
        case "real_estate":
            return t("agencyIndustryRealEstate")
        case "saas":
            return t("agencyIndustrySaas")
        case "service":
            return t("agencyIndustryService")
        case "restaurant":
            return t("agencyIndustryRestaurant")
        case "other":
            return t("agencyIndustryOther")
        default:
            return industry || "-"
    }
}

export default function AgencyPage() {
    const { toast } = useToast()
    const { t } = useLanguage()
    const searchParams = useSearchParams()
    const [customers, setCustomers] = useState<ManagedCustomer[]>([])
    const [viewerPartner, setViewerPartner] = useState<ManagementPartnerRecord | null>(null)
    const [viewerCapabilities, setViewerCapabilities] = useState<PartnerCapabilities | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false)
    const [isSavingLogo, setIsSavingLogo] = useState(false)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [showArchived, setShowArchived] = useState(false)
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
    const [industryFilter, setIndustryFilter] = useState("all")

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [phone, setPhone] = useState("")
    const [companyName, setCompanyName] = useState("")
    const [companyWebsite, setCompanyWebsite] = useState("")
    const [industry, setIndustry] = useState("ecommerce")

    const fetchWorkspace = useCallback(async () => {
        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) return

            const response = await fetch(`/api/agency/customers?includeArchived=${showArchived ? "true" : "false"}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.error || "Failed to fetch customers")
            }

            setCustomers(Array.isArray(data?.customers) ? data.customers : [])
            setViewerPartner(data?.viewerPartner || null)
            setViewerCapabilities(data?.viewerCapabilities || null)
        } catch (error: any) {
            toast({
                title: t("error"),
                description: error?.message || t("agencyCustomersFetchFailed"),
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }, [showArchived, t, toast])

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                fetchWorkspace()
            } else {
                setIsLoading(false)
            }
        })

        return () => unsubscribe()
    }, [fetchWorkspace])

    useEffect(() => {
        if (auth.currentUser) {
            fetchWorkspace()
        }
    }, [showArchived, fetchWorkspace])

    const industryOptions = useMemo(() => {
        const values = new Set<string>()
        customers.forEach((customer) => {
            const value = (customer.industry || "").trim()
            if (value) values.add(value)
        })
        return Array.from(values).sort((a, b) => a.localeCompare(b))
    }, [customers])

    const filteredCustomers = useMemo(() => {
        const q = searchTerm.trim().toLowerCase()

        return customers.filter((customer) => {
            const matchesSearch = !q ||
                (customer.companyName || "").toLowerCase().includes(q) ||
                (customer.email || "").toLowerCase().includes(q) ||
                (customer.firstName || "").toLowerCase().includes(q) ||
                (customer.lastName || "").toLowerCase().includes(q) ||
                (customer.industry || "").toLowerCase().includes(q)

            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "active" && customer.isActive) ||
                (statusFilter === "inactive" && !customer.isActive)

            const matchesIndustry =
                industryFilter === "all" ||
                (customer.industry || "") === industryFilter

            return matchesSearch && matchesStatus && matchesIndustry
        })
    }, [customers, searchTerm, statusFilter, industryFilter])

    const activeCount = useMemo(
        () => customers.filter((customer) => customer.isActive && !customer.isArchived).length,
        [customers]
    )

    const partnerLevelLabel = getPartnerLevelLabel(viewerPartner?.partnerLevel)
    const isStrategicPartner = viewerPartner?.partnerLevel === "strategic_partner"
    const canCreateManagedAccounts = viewerCapabilities?.canCreateManagedAccounts === true
    const canAccessManagedWorkspaces = viewerCapabilities?.canAccessManagedAccountWorkspace === true

    useEffect(() => {
        if (searchParams.get("section") === "customers") {
            const timer = window.setTimeout(() => {
                document.getElementById("managed-customers")?.scrollIntoView({ behavior: "smooth", block: "start" })
            }, 50)

            return () => window.clearTimeout(timer)
        }
    }, [searchParams])

    const handleCreateCustomer = async () => {
        if (!canCreateManagedAccounts) {
            toast({
                title: t("error"),
                description: t("agencyManagedAccountAccessDenied"),
                variant: "destructive"
            })
            return
        }

        if (!email || !password || !companyName) {
            toast({
                title: t("error"),
                description: t("agencyManagedAccountRequiredFields"),
                variant: "destructive"
            })
            return
        }

        setIsCreating(true)
        try {
            const token = await auth.currentUser?.getIdToken()
            const response = await fetch("/api/agency/customers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    email,
                    password,
                    firstName,
                    lastName,
                    phone,
                    companyName,
                    companyWebsite,
                    industry
                })
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.error || "Failed to create customer")
            }

            toast({
                title: t("success"),
                description: t("agencyManagedAccountCreated")
            })

            setIsCreateOpen(false)
            setEmail("")
            setPassword("")
            setFirstName("")
            setLastName("")
            setPhone("")
            setCompanyName("")
            setCompanyWebsite("")
            setIndustry("ecommerce")
            await fetchWorkspace()
        } catch (error: any) {
            toast({
                title: t("error"),
                description: error?.message || t("agencyManagedAccountCreateFailed"),
                variant: "destructive"
            })
        } finally {
            setIsCreating(false)
        }
    }

    const handlePartnerLogoUpload = async (file?: File | null) => {
        if (!file || !auth.currentUser || !isStrategicPartner) return

        setIsSavingLogo(true)
        try {
            const token = await auth.currentUser.getIdToken()
            const uploadedUrl = await uploadLogo(file, auth.currentUser.uid, token, () => undefined)
            if (!uploadedUrl) {
                throw new Error("Logo upload failed")
            }

            const response = await fetch("/api/agency/profile", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ partnerLogoUrl: uploadedUrl })
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.error || "Failed to update partner logo")
            }

            setViewerPartner(data?.partner || null)
            setViewerCapabilities(data?.capabilities || null)
            toast({
                title: t("success"),
                description: t("agencyPartnerLogoUpdated")
            })
        } catch (error: any) {
            toast({
                title: t("error"),
                description: error?.message || t("agencyPartnerLogoUpdateFailed"),
                variant: "destructive"
            })
        } finally {
            setIsSavingLogo(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t("agencyWorkspaceTitle")}</h1>
                    <p className="text-muted-foreground">{t("agencyWorkspaceDesc")}</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} disabled={!canCreateManagedAccounts}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("agencyAddManagedAccount")}
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">{t("agencyPartnerLevel")}</CardTitle>
                        <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{partnerLevelLabel}</Badge>
                            {!canCreateManagedAccounts ? <Badge variant="secondary">{t("agencyViewOnly")}</Badge> : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {canAccessManagedWorkspaces
                                ? t("agencyPartnerLevelManageDesc")
                                : t("agencyPartnerLevelReviewDesc")}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">{t("agencyTotalCustomers")}</CardTitle>
                        <Users className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{customers.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">{t("agencyActiveCustomers")}</CardTitle>
                        <Activity className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">{activeCount}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base">{t("agencyPartnerBranding")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="relative h-16 w-16 overflow-hidden rounded-2xl border bg-white">
                            {viewerPartner?.partnerLogoUrl ? (
                                <Image
                                    src={viewerPartner.partnerLogoUrl}
                                    alt={viewerPartner.partnerName || "Partner"}
                                    fill
                                    className="object-contain p-2"
                                    unoptimized
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted-foreground">
                                    {t("agencyNoLogo")}
                                </div>
                            )}
                        </div>
                        <div className="min-w-0">
                            <div className="truncate font-medium">{viewerPartner?.partnerName || viewerPartner?.email || t("agency")}</div>
                            <div className="text-sm text-muted-foreground">
                                {isStrategicPartner
                                    ? t("agencyPartnerBrandingEnabledDesc")
                                    : t("agencyPartnerBrandingLockedDesc")}
                            </div>
                        </div>
                    </div>
                    {isStrategicPartner ? (
                        <div className="space-y-2">
                            <Label htmlFor="partner-logo-upload">{t("agencyStrategicPartnerLogo")}</Label>
                            <Input
                                id="partner-logo-upload"
                                type="file"
                                accept="image/*"
                                disabled={isSavingLogo}
                                onChange={(event) => handlePartnerLogoUpload(event.target.files?.[0] || null)}
                            />
                            {isSavingLogo ? (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    {t("agencyPartnerLogoUploading")}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </CardContent>
            </Card>

            <Card id="managed-customers" className="scroll-mt-24">
                <CardHeader>
                    <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
                        <div className="relative min-w-[260px] w-[320px] flex-none">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("agencySearchCustomers")}
                                className="pl-8"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                            />
                        </div>
                        <select
                            className="flex h-9 w-[170px] flex-none rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
                        >
                            <option value="all">{`${t("status")}: ${t("all")}`}</option>
                            <option value="active">{t("active")}</option>
                            <option value="inactive">{t("inactive")}</option>
                        </select>
                        <select
                            className="flex h-9 w-[200px] flex-none rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={industryFilter}
                            onChange={(event) => setIndustryFilter(event.target.value)}
                        >
                            <option value="all">{`${t("industry")}: ${t("all")}`}</option>
                            {industryOptions.map((option) => (
                                <option key={option} value={option}>
                                    {getIndustryLabel(option, t)}
                                </option>
                            ))}
                        </select>
                        <label className="flex items-center gap-2 text-sm cursor-pointer flex-none whitespace-nowrap">
                            <input
                                type="checkbox"
                                checked={showArchived}
                                onChange={(event) => setShowArchived(event.target.checked)}
                                className="rounded border-gray-300 flex-none"
                            />
                            <span className="text-muted-foreground">{t("agencyShowArchivedCustomers")}</span>
                        </label>
                        {(searchTerm || statusFilter !== "all" || industryFilter !== "all") && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-none whitespace-nowrap"
                                onClick={() => {
                                    setSearchTerm("")
                                    setStatusFilter("all")
                                    setIndustryFilter("all")
                                }}
                            >
                                {t("clearFilters")}
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-50/60">
                                <TableRow>
                                    <TableHead>{t("companyName")}</TableHead>
                                    <TableHead>{t("email")}</TableHead>
                                    <TableHead>{t("status")}</TableHead>
                                    <TableHead className="text-right">{t("actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCustomers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                            {t("agencyNoCustomerFound")}
                                        </TableCell>
                                    </TableRow>
                                ) : filteredCustomers.map((customer) => (
                                    <TableRow key={customer.id}>
                                        <TableCell>
                                            <div className="font-medium">{customer.companyName || "-"}</div>
                                            <div className="text-xs text-muted-foreground uppercase">{getIndustryLabel(customer.industry, t)}</div>
                                        </TableCell>
                                        <TableCell>{customer.email}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={customer.isActive ? "outline" : "destructive"}>
                                                    {customer.isActive ? t("active") : t("inactive")}
                                                </Badge>
                                                {customer.isArchived && (
                                                    <Badge variant="secondary">{t("archived")}</Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={!canAccessManagedWorkspaces}
                                                onClick={() => {
                                                    window.location.href = `/admin/tenant/${customer.id}`
                                                }}
                                            >
                                                <Settings className="w-4 h-4 mr-1" />
                                                {t("manage")}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t("agencyCreateManagedAccountTitle")}</DialogTitle>
                        <DialogDescription>{t("agencyCreateManagedAccountDesc")}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="companyName">{t("companyName")}</Label>
                                <Input id="companyName" value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="industry">{t("industry")}</Label>
                                <select
                                    id="industry"
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    value={industry}
                                    onChange={(event) => setIndustry(event.target.value)}
                                >
                                    <option value="ecommerce">{t("agencyIndustryEcommerce")}</option>
                                    <option value="booking">{t("agencyIndustryBooking")}</option>
                                    <option value="real_estate">{t("agencyIndustryRealEstate")}</option>
                                    <option value="saas">{t("agencyIndustrySaas")}</option>
                                    <option value="service">{t("agencyIndustryService")}</option>
                                    <option value="restaurant">{t("agencyIndustryRestaurant")}</option>
                                    <option value="other">{t("agencyIndustryOther")}</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="website">{t("website")}</Label>
                            <Input id="website" value={companyWebsite} onChange={(event) => setCompanyWebsite(event.target.value)} placeholder="https://example.com" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">{t("firstName")}</Label>
                                <Input id="firstName" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">{t("lastName")}</Label>
                                <Input id="lastName" value={lastName} onChange={(event) => setLastName(event.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">{t("phone")}</Label>
                            <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">{t("email")}</Label>
                                <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">{t("password")}</Label>
                                <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                            {t("cancel")}
                        </Button>
                        <Button onClick={handleCreateCustomer} disabled={isCreating || !canCreateManagedAccounts}>
                            {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {t("create")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
