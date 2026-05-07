"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Plus, Search, Settings2 } from "lucide-react"
import { auth } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/context/LanguageContext"
import { getPublicPlansSorted, normalizePlanId } from "@/lib/pricing-config"
import type { PartnerCapabilities } from "@/lib/management/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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

type SubscriptionStatus = "active" | "trial" | "past_due" | "canceled" | "unpaid"
type BillingPeriod = "monthly" | "yearly"

interface ManagedCustomer {
    id: string
    email: string
    firstName?: string
    lastName?: string
    phone?: string
    companyName?: string
    industry?: string
    isActive: boolean
    isArchived?: boolean
    planId?: string | null
    subscriptionStatus?: string | null
    subscriptionBillingPeriod?: string | null
}

interface SubscriptionDraft {
    planId: string
    status: SubscriptionStatus
    billingStatus: "free" | "paid" | "pending" | "cancelled"
    billingPeriod: BillingPeriod
    trialEndsAt: string | null
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
    messageLimitOverride: number | null
    adminNotes: string
    isFrozen: boolean
    trialDays: number
    prioritySupport: boolean
}

const DEFAULT_SUBSCRIPTION_DRAFT: SubscriptionDraft = {
    planId: "starter",
    status: "trial",
    billingStatus: "free",
    billingPeriod: "monthly",
    trialEndsAt: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    messageLimitOverride: null,
    adminNotes: "",
    isFrozen: false,
    trialDays: 14,
    prioritySupport: false,
}

function normalizeSubscriptionStatus(value: unknown): SubscriptionStatus {
    if (value === "active" || value === "trial" || value === "past_due" || value === "canceled" || value === "unpaid") {
        return value
    }
    return "trial"
}

function normalizeBillingPeriod(value: unknown): BillingPeriod {
    return value === "yearly" ? "yearly" : "monthly"
}

export default function AgencyEndUsersPage() {
    const { t } = useLanguage()
    const { toast } = useToast()
    const [customers, setCustomers] = useState<ManagedCustomer[]>([])
    const [viewerCapabilities, setViewerCapabilities] = useState<PartnerCapabilities | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSavingStatusId, setIsSavingStatusId] = useState<string | null>(null)
    const [isMembershipOpen, setIsMembershipOpen] = useState(false)
    const [membershipCustomer, setMembershipCustomer] = useState<ManagedCustomer | null>(null)
    const [membershipDraft, setMembershipDraft] = useState<SubscriptionDraft>(DEFAULT_SUBSCRIPTION_DRAFT)
    const [isMembershipLoading, setIsMembershipLoading] = useState(false)
    const [isMembershipSaving, setIsMembershipSaving] = useState(false)

    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [phone, setPhone] = useState("")
    const [companyName, setCompanyName] = useState("")
    const [companyWebsite, setCompanyWebsite] = useState("")
    const [industry, setIndustry] = useState("ecommerce")

    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
    const [planFilter, setPlanFilter] = useState<string>("all")
    const [showArchived, setShowArchived] = useState(false)

    const fetchCustomers = useCallback(async () => {
        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) return

            const response = await fetch(`/api/agency/customers?includeArchived=${showArchived ? "true" : "false"}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.error || "Failed to fetch customers")
            }

            setCustomers(Array.isArray(data?.customers) ? data.customers : [])
            setViewerCapabilities(data?.viewerCapabilities || null)
        } catch (error: any) {
            toast({
                title: t("error"),
                description: error?.message || t("agencyCustomersFetchFailed"),
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }, [showArchived, t, toast])

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (!user) {
                setIsLoading(false)
                return
            }
            fetchCustomers()
        })

        return () => unsubscribe()
    }, [fetchCustomers])

    useEffect(() => {
        if (auth.currentUser) {
            fetchCustomers()
        }
    }, [fetchCustomers, showArchived])

    const planOptions = useMemo(() => {
        const fromPricing = getPublicPlansSorted()
            .map((plan) => ({
                id: plan.planId,
                label: plan.displayName || plan.planId,
            }))

        const dynamic = Array.from(
            new Set(customers.map((customer) => normalizePlanId(customer.planId || "starter")))
        ).map((id) => {
            const existing = fromPricing.find((plan) => plan.id === id)
            return existing || { id, label: id.charAt(0).toUpperCase() + id.slice(1) }
        })

        const merged = [...fromPricing]
        dynamic.forEach((item) => {
            if (!merged.some((entry) => entry.id === item.id)) {
                merged.push(item)
            }
        })

        return merged
    }, [customers])

    const filteredCustomers = useMemo(() => {
        const query = searchTerm.trim().toLowerCase()

        return customers.filter((customer) => {
            const matchesSearch =
                !query ||
                (customer.companyName || "").toLowerCase().includes(query) ||
                (customer.email || "").toLowerCase().includes(query) ||
                (customer.firstName || "").toLowerCase().includes(query) ||
                (customer.lastName || "").toLowerCase().includes(query)

            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "active" && customer.isActive) ||
                (statusFilter === "inactive" && !customer.isActive)

            const normalizedPlanId = normalizePlanId(customer.planId || "starter")
            const matchesPlan = planFilter === "all" || normalizedPlanId === planFilter

            return matchesSearch && matchesStatus && matchesPlan
        })
    }, [customers, planFilter, searchTerm, statusFilter])

    const resetCreateForm = () => {
        setEmail("")
        setPassword("")
        setFirstName("")
        setLastName("")
        setPhone("")
        setCompanyName("")
        setCompanyWebsite("")
        setIndustry("ecommerce")
    }

    const handleCreateCustomer = async () => {
        if (!email || !password || !companyName) {
            toast({
                title: t("error"),
                description: t("agencyManagedAccountRequiredFields"),
                variant: "destructive",
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
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    email,
                    password,
                    firstName,
                    lastName,
                    phone,
                    companyName,
                    companyWebsite,
                    industry,
                }),
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.error || "Failed to create customer")
            }

            toast({
                title: t("success"),
                description: t("agencyManagedAccountCreated"),
            })

            setIsCreateOpen(false)
            resetCreateForm()
            await fetchCustomers()
        } catch (error: any) {
            toast({
                title: t("error"),
                description: error?.message || t("agencyManagedAccountCreateFailed"),
                variant: "destructive",
            })
        } finally {
            setIsCreating(false)
        }
    }

    const handleToggleStatus = async (customer: ManagedCustomer) => {
        setIsSavingStatusId(customer.id)
        try {
            const token = await auth.currentUser?.getIdToken()
            const response = await fetch("/api/admin/toggle-user-status", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    userId: customer.id,
                    isActive: !customer.isActive,
                }),
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.error || "Failed to update status")
            }

            setCustomers((prev) =>
                prev.map((entry) => (entry.id === customer.id ? { ...entry, isActive: !entry.isActive } : entry))
            )
        } catch (error: any) {
            toast({
                title: t("error"),
                description: error?.message || t("failedToUpdateUserStatus"),
                variant: "destructive",
            })
        } finally {
            setIsSavingStatusId(null)
        }
    }

    const openMembershipDialog = async (customer: ManagedCustomer) => {
        setMembershipCustomer(customer)
        setIsMembershipOpen(true)
        setIsMembershipLoading(true)

        try {
            const token = await auth.currentUser?.getIdToken()
            const response = await fetch(`/api/admin/customer-admin?userId=${customer.id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.error || "Failed to load membership")
            }

            const incoming = data?.subscription || {}
            setMembershipDraft({
                ...DEFAULT_SUBSCRIPTION_DRAFT,
                ...incoming,
                planId: normalizePlanId(typeof incoming.planId === "string" && incoming.planId ? incoming.planId : customer.planId || "starter"),
                status: normalizeSubscriptionStatus(incoming.status || customer.subscriptionStatus),
                billingPeriod: normalizeBillingPeriod(incoming.billingPeriod || customer.subscriptionBillingPeriod),
            })
        } catch (error: any) {
            setMembershipDraft({
                ...DEFAULT_SUBSCRIPTION_DRAFT,
                planId: normalizePlanId(customer.planId || "starter"),
                status: normalizeSubscriptionStatus(customer.subscriptionStatus),
                billingPeriod: normalizeBillingPeriod(customer.subscriptionBillingPeriod),
                billingStatus: customer.subscriptionStatus === "active" ? "paid" : "free",
            })
            toast({
                title: t("error"),
                description: error?.message || t("fetchFailedDesc"),
                variant: "destructive",
            })
        } finally {
            setIsMembershipLoading(false)
        }
    }

    const saveMembership = async () => {
        if (!membershipCustomer) return

        setIsMembershipSaving(true)
        try {
            const token = await auth.currentUser?.getIdToken()
            const response = await fetch("/api/admin/customer-admin", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    userId: membershipCustomer.id,
                    subscription: membershipDraft,
                }),
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.error || "Failed to update membership")
            }

            toast({
                title: t("success"),
                description: t("accountUpdated"),
            })

            setIsMembershipOpen(false)
            setMembershipCustomer(null)
            await fetchCustomers()
        } catch (error: any) {
            toast({
                title: t("error"),
                description: error?.message || t("failedToUpdate"),
                variant: "destructive",
            })
        } finally {
            setIsMembershipSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex justify-center p-10">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t("endUsers")}</h1>
                    <p className="text-muted-foreground">{t("assignedCustomersDesc")}</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("agencyAddManagedAccount")}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t("quickActions")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative min-w-[250px] flex-1">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("agencySearchCustomers")}
                                className="pl-8"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                            />
                        </div>
                        <select
                            className="flex h-9 min-w-[170px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
                        >
                            <option value="all">{`${t("status")}: ${t("all")}`}</option>
                            <option value="active">{t("active")}</option>
                            <option value="inactive">{t("inactive")}</option>
                        </select>
                        <select
                            className="flex h-9 min-w-[170px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={planFilter}
                            onChange={(event) => setPlanFilter(event.target.value)}
                        >
                            <option value="all">{`${t("plan")}: ${t("all")}`}</option>
                            {planOptions.map((plan) => (
                                <option key={plan.id} value={plan.id}>
                                    {plan.label}
                                </option>
                            ))}
                        </select>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={showArchived}
                                onChange={(event) => setShowArchived(event.target.checked)}
                                className="rounded border-gray-300"
                            />
                            <span className="text-muted-foreground">{t("agencyShowArchivedCustomers")}</span>
                        </label>
                        {(searchTerm || statusFilter !== "all" || planFilter !== "all") && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setSearchTerm("")
                                    setStatusFilter("all")
                                    setPlanFilter("all")
                                }}
                            >
                                {t("clearFilters")}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <div className="overflow-hidden rounded-md border">
                        <Table>
                            <TableHeader className="bg-gray-50/60">
                                <TableRow>
                                    <TableHead>{t("companyName")}</TableHead>
                                    <TableHead>{t("email")}</TableHead>
                                    <TableHead>{t("plan")}</TableHead>
                                    <TableHead>{t("subscription")}</TableHead>
                                    <TableHead>{t("status")}</TableHead>
                                    <TableHead className="text-right">{t("actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCustomers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                                            {t("noTenantsAssigned")}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCustomers.map((customer) => (
                                        <TableRow key={customer.id}>
                                            <TableCell>
                                                <div className="font-medium">{customer.companyName || "-"}</div>
                                                <div className="text-xs text-muted-foreground">{customer.industry || "-"}</div>
                                            </TableCell>
                                            <TableCell>{customer.email}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    {planOptions.find((plan) => plan.id === normalizePlanId(customer.planId || "starter"))?.label || "Starter"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {(customer.subscriptionStatus || "trial").toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={customer.isActive ? "outline" : "destructive"}>
                                                        {customer.isActive ? t("active") : t("inactive")}
                                                    </Badge>
                                                    <Switch
                                                        checked={customer.isActive}
                                                        onCheckedChange={() => handleToggleStatus(customer)}
                                                        disabled={isSavingStatusId === customer.id}
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openMembershipDialog(customer)}
                                                    >
                                                        <Settings2 className="mr-1 h-4 w-4" />
                                                        {t("edit")}
                                                    </Button>
                                                    {viewerCapabilities?.canAccessManagedAccountWorkspace === true ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                window.location.href = `/admin/tenant/${customer.id}/settings/customer-admin`
                                                            }}
                                                        >
                                                            {t("manage")}
                                                        </Button>
                                                    ) : null}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
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
                                <Label htmlFor="agency-end-users-companyName">{t("companyName")}</Label>
                                <Input id="agency-end-users-companyName" value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="agency-end-users-industry">{t("industry")}</Label>
                                <select
                                    id="agency-end-users-industry"
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
                            <Label htmlFor="agency-end-users-website">{t("website")}</Label>
                            <Input
                                id="agency-end-users-website"
                                value={companyWebsite}
                                onChange={(event) => setCompanyWebsite(event.target.value)}
                                placeholder="https://example.com"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="agency-end-users-firstName">{t("firstName")}</Label>
                                <Input id="agency-end-users-firstName" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="agency-end-users-lastName">{t("lastName")}</Label>
                                <Input id="agency-end-users-lastName" value={lastName} onChange={(event) => setLastName(event.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="agency-end-users-phone">{t("phone")}</Label>
                            <Input id="agency-end-users-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="agency-end-users-email">{t("email")}</Label>
                                <Input id="agency-end-users-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="agency-end-users-password">{t("password")}</Label>
                                <Input id="agency-end-users-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                            {t("cancel")}
                        </Button>
                        <Button onClick={handleCreateCustomer} disabled={isCreating}>
                            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {t("create")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isMembershipOpen} onOpenChange={setIsMembershipOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{t("subscription")}</DialogTitle>
                        <DialogDescription>{membershipCustomer?.email || membershipCustomer?.companyName || "-"}</DialogDescription>
                    </DialogHeader>

                    {isMembershipLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-4 py-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="membership-plan">{t("plan")}</Label>
                                    <select
                                        id="membership-plan"
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={membershipDraft.planId}
                                        onChange={(event) => setMembershipDraft((prev) => ({ ...prev, planId: normalizePlanId(event.target.value) }))}
                                    >
                                        {planOptions.map((plan) => (
                                            <option key={plan.id} value={plan.id}>
                                                {plan.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="membership-status">{t("status")}</Label>
                                    <select
                                        id="membership-status"
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={membershipDraft.status}
                                        onChange={(event) =>
                                            setMembershipDraft((prev) => ({
                                                ...prev,
                                                status: normalizeSubscriptionStatus(event.target.value),
                                            }))
                                        }
                                    >
                                        <option value="trial">{t("trial")}</option>
                                        <option value="active">{t("active")}</option>
                                        <option value="past_due">{t("pastDue")}</option>
                                        <option value="canceled">{t("cancelled")}</option>
                                        <option value="unpaid">{t("unpaid")}</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="membership-billing-status">{t("billingStatus")}</Label>
                                    <select
                                        id="membership-billing-status"
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={membershipDraft.billingStatus}
                                        onChange={(event) =>
                                            setMembershipDraft((prev) => ({
                                                ...prev,
                                                billingStatus: event.target.value as SubscriptionDraft["billingStatus"],
                                            }))
                                        }
                                    >
                                        <option value="free">{t("billingFree")}</option>
                                        <option value="paid">{t("billingPaid")}</option>
                                        <option value="pending">{t("billingPending")}</option>
                                        <option value="cancelled">{t("billingCancelled")}</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="membership-billing-period">{t("billingPeriod")}</Label>
                                    <select
                                        id="membership-billing-period"
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={membershipDraft.billingPeriod}
                                        onChange={(event) =>
                                            setMembershipDraft((prev) => ({
                                                ...prev,
                                                billingPeriod: normalizeBillingPeriod(event.target.value),
                                            }))
                                        }
                                    >
                                        <option value="monthly">{t("monthly")}</option>
                                        <option value="yearly">{t("yearly")}</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="membership-trial-ends">{t("trialEndsAt")}</Label>
                                    <Input
                                        id="membership-trial-ends"
                                        type="date"
                                        value={membershipDraft.trialEndsAt ? String(membershipDraft.trialEndsAt).slice(0, 10) : ""}
                                        onChange={(event) =>
                                            setMembershipDraft((prev) => ({
                                                ...prev,
                                                trialEndsAt: event.target.value ? new Date(event.target.value).toISOString() : null,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="membership-period-end">{t("currentPeriodEnd")}</Label>
                                    <Input
                                        id="membership-period-end"
                                        type="date"
                                        value={membershipDraft.currentPeriodEnd ? String(membershipDraft.currentPeriodEnd).slice(0, 10) : ""}
                                        onChange={(event) =>
                                            setMembershipDraft((prev) => ({
                                                ...prev,
                                                currentPeriodEnd: event.target.value ? new Date(event.target.value).toISOString() : null,
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between rounded-md border p-3">
                                <div>
                                    <div className="text-sm font-medium">{t("freezeAccount")}</div>
                                    <div className="text-xs text-muted-foreground">{t("freezeAccountDesc")}</div>
                                </div>
                                <Switch
                                    checked={Boolean(membershipDraft.isFrozen)}
                                    onCheckedChange={(checked) => setMembershipDraft((prev) => ({ ...prev, isFrozen: checked }))}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsMembershipOpen(false)}>
                            {t("cancel")}
                        </Button>
                        <Button onClick={saveMembership} disabled={isMembershipSaving || isMembershipLoading}>
                            {isMembershipSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {t("save")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
