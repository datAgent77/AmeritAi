"use client"

import { useEffect, useState, useCallback, useMemo, type SelectHTMLAttributes } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"
import { getPartnerLevelLabel } from "@/lib/management/access"
import type { PartnerCapabilities, PartnerLevel } from "@/lib/management/types"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Loader2, Plus, Users, Activity, MessageSquare, Search, CreditCard, Settings, Building2, MoreHorizontal, Trash2, ChevronDown } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLanguage } from "@/context/LanguageContext"
import { cn } from "@/lib/utils"

interface UserData {
    id: string
    email: string
    role: string
    isActive: boolean
    isArchived?: boolean
    archivedAt?: string
    createdAt: string
    agencyId?: string | null
    agencyAssignedAt?: string | null
    agencyAssignedBy?: string | null
    companyName?: string
    planId?: string
    plan?: string
    entitlements?: {
        planId?: string
    }
    subscription?: {
        planId?: string
        status?: string
        billingPeriod?: string
    }
}

interface AgencyData {
    id: string
    email: string
    agencyName: string
    partnerName?: string | null
    firstName?: string
    lastName?: string
    phone?: string | null
    isActive: boolean
    isArchived?: boolean
    customerCount?: number
    omniEnabledAccounts?: number
    partnerLevel: PartnerLevel
    partnerLogoUrl?: string | null
    capabilities?: PartnerCapabilities
}

type CustomersManagementSection = "agencies" | "end-users"

interface CustomersManagementPageProps {
    section: CustomersManagementSection
}

function getCreatedAtTime(value: unknown) {
    if (!value) return 0

    if (typeof value === "string") {
        const parsed = Date.parse(value)
        return Number.isNaN(parsed) ? 0 : parsed
    }

    if (typeof value === "object") {
        const timestamp = value as { seconds?: unknown; _seconds?: unknown }
        const seconds = typeof timestamp.seconds === "number"
            ? timestamp.seconds
            : typeof timestamp._seconds === "number"
                ? timestamp._seconds
                : null

        return seconds ? seconds * 1000 : 0
    }

    return 0
}

function NativeSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <div
            className={cn(
                "relative items-center focus-within:ring-2 focus-within:ring-ring/70",
                className
            )}
        >
            <select
                className="h-full w-full appearance-none border-0 bg-transparent p-0 pr-7 text-inherit outline-none"
                {...props}
            >
                {children}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
    )
}

export function CustomersManagementPage({ section }: CustomersManagementPageProps) {
    const { t, language } = useLanguage()
    const router = useRouter()
    const isAgenciesSection = section === "agencies"
    const isEndUsersSection = section === "end-users"
    const [users, setUsers] = useState<UserData[]>([])
    const [agencies, setAgencies] = useState<AgencyData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAgenciesLoading, setIsAgenciesLoading] = useState(true)
    const { toast } = useToast()

    // Dashboard Stats
    const [stats, setStats] = useState({
        totalTenants: 0,
        activeTenants: 0,
        totalChatbots: 0,
        totalChatSessions: 0
    })

    const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserData | null>(null)
    const [isDeletingTenant, setIsDeletingTenant] = useState<string | null>(null)

    const fetchDashboardData = useCallback(async () => {
        try {
            const currentUser = auth.currentUser
            if (!currentUser) return

            const token = await currentUser.getIdToken()
            const dashboardUrl = "/api/admin/dashboard-stats"
            const accountsUrl = "/api/omni/directory/accounts?includeArchived=false"
            const [dashboardResponse, accountsResponse] = await Promise.all([
                fetch(dashboardUrl, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }),
                fetch(accountsUrl, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })
            ])

            if (!dashboardResponse.ok) {
                const errorData = await dashboardResponse.json().catch(() => ({}))
                throw new Error(errorData.error || "Failed to fetch dashboard data")
            }

            if (!accountsResponse.ok) {
                const errorData = await accountsResponse.json().catch(() => ({}))
                throw new Error(errorData.error || "Failed to fetch managed accounts")
            }

            const dashboardData = await dashboardResponse.json()
            const accountsData = await accountsResponse.json()
            const legacyUsers = Array.isArray(dashboardData?.users) ? dashboardData.users : []
            const legacyUserMap = new Map(legacyUsers.map((user: UserData) => [user.id, user]))
            const sharedAccounts = Array.isArray(accountsData?.accounts) ? accountsData.accounts : []

            setUsers(
                sharedAccounts.map((account: any) => {
                    const legacy = legacyUserMap.get(account.id) as UserData | undefined
                    const subscription = legacy?.subscription || (
                        account.planId || account.subscriptionStatus || account.subscriptionBillingPeriod
                            ? {
                                planId: account.planId || undefined,
                                status: account.subscriptionStatus || undefined,
                                billingPeriod: account.subscriptionBillingPeriod || undefined,
                            }
                            : undefined
                    )

                    return {
                        id: account.id,
                        email: account.email || legacy?.email || "",
                        role: "TENANT_ADMIN",
                        isActive: account.isActive !== false,
                        isArchived: account.isArchived === true,
                        archivedAt: legacy?.archivedAt,
                        createdAt: account.createdAt || legacy?.createdAt || "",
                        agencyId: account.partnerId || account.agencyId || legacy?.agencyId || null,
                        agencyAssignedAt: legacy?.agencyAssignedAt || null,
                        agencyAssignedBy: legacy?.agencyAssignedBy || null,
                        companyName: account.companyName || legacy?.companyName,
                        planId: account.planId || legacy?.planId,
                        plan: legacy?.plan,
                        entitlements: legacy?.entitlements || (account.planId ? { planId: account.planId } : undefined),
                        subscription,
                    } satisfies UserData
                })
            )
            setStats(dashboardData?.stats || {
                totalTenants: 0,
                activeTenants: 0,
                totalChatbots: 0,
                totalChatSessions: 0
            })
        } catch (error: any) {
            console.error("Error fetching dashboard data:", error)
            toast({
                title: "Error Debug",
                description: JSON.stringify(error.message || error, null, 2),
                variant: "destructive",
                duration: 10000
            })
        } finally {
            setIsLoading(false)
        }
    }, [toast])

    const fetchAgencies = useCallback(async () => {
        setIsAgenciesLoading(true)
        try {
            const currentUser = auth.currentUser
            if (!currentUser) return

            const token = await currentUser.getIdToken()
            const response = await fetch("/api/admin/agencies?includeArchived=false", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || "Failed to fetch agencies")
            }

            const data = await response.json()
            setAgencies(Array.isArray(data?.agencies) ? data.agencies : [])
        } catch (error: any) {
            console.error("Error fetching agencies:", error)
            toast({
                title: "Error",
                description: error?.message || "Failed to fetch agencies.",
                variant: "destructive"
            })
        } finally {
            setIsAgenciesLoading(false)
        }
    }, [toast])

    // Add Tenant State
    const [isAddTenantOpen, setIsAddTenantOpen] = useState(false)
    const [newTenantEmail, setNewTenantEmail] = useState("")
    const [newTenantPassword, setNewTenantPassword] = useState("")
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [phone, setPhone] = useState("")
    const [companyName, setCompanyName] = useState("")
    const [companyWebsite, setCompanyWebsite] = useState("")
    const [industry, setIndustry] = useState("ecommerce")
    const [isCreating, setIsCreating] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedAgencyId, setSelectedAgencyId] = useState<string>("")
    const [assigningTenantId, setAssigningTenantId] = useState<string | null>(null)
    const [isAddAgencyOpen, setIsAddAgencyOpen] = useState(false)
    const [isCreatingAgency, setIsCreatingAgency] = useState(false)
    const [newAgencyName, setNewAgencyName] = useState("")
    const [newAgencyEmail, setNewAgencyEmail] = useState("")
    const [newAgencyPassword, setNewAgencyPassword] = useState("")
    const [newAgencyFirstName, setNewAgencyFirstName] = useState("")
    const [newAgencyLastName, setNewAgencyLastName] = useState("")
    const [newAgencyPhone, setNewAgencyPhone] = useState("")
    const [newAgencyPartnerLevel, setNewAgencyPartnerLevel] = useState<PartnerLevel>("partner")
    const [agencySearchTerm, setAgencySearchTerm] = useState("")
    const [agencyStatusFilter, setAgencyStatusFilter] = useState<"all" | "active" | "inactive">("all")
    const [agencyCustomerFilter, setAgencyCustomerFilter] = useState<"all" | "has-customers" | "no-customers">("all")
    const [agencyLevelFilter, setAgencyLevelFilter] = useState<PartnerLevel | "all">("all")
    const [userStatusFilter, setUserStatusFilter] = useState<"all" | "active" | "inactive">("all")
    const [userPlanFilter, setUserPlanFilter] = useState("all")
    const [userAgencyFilter, setUserAgencyFilter] = useState("all")
    const [userSubscriptionFilter, setUserSubscriptionFilter] = useState<"all" | "trial" | "paid" | "unknown">("all")
    const [partnerConversionUser, setPartnerConversionUser] = useState<UserData | null>(null)
    const [conversionPartnerName, setConversionPartnerName] = useState("")
    const [conversionPartnerLevel, setConversionPartnerLevel] = useState<PartnerLevel>("partner")
    const [isConvertingPartner, setIsConvertingPartner] = useState(false)

    const getPartnerName = useCallback((agency: AgencyData) => {
        return agency.partnerName || agency.agencyName || agency.email || agency.id
    }, [])

    const derivePartnerNameFromUser = useCallback((user: UserData) => {
        const companyName = typeof user.companyName === "string" ? user.companyName.trim() : ""
        if (companyName) return companyName
        const email = typeof user.email === "string" ? user.email.trim() : ""
        if (email) {
            const [local] = email.split("@")
            return local || email
        }
        return "Partner"
    }, [])

    const getUserPlanId = useCallback((user: UserData) => {
        const rawPlanId =
            user.subscription?.planId ||
            user.planId ||
            user.plan ||
            user.entitlements?.planId

        if (!rawPlanId || typeof rawPlanId !== "string") return ""
        if (rawPlanId === "trial") return "starter"
        return rawPlanId.toLowerCase()
    }, [])

    const getUserSubscriptionType = useCallback((user: UserData): "trial" | "paid" | "unknown" => {
        const status = String(user.subscription?.status || "").toLowerCase()
        const rawPlanId =
            user.subscription?.planId ||
            user.planId ||
            user.plan ||
            user.entitlements?.planId

        if (status === "trial" || rawPlanId === "trial") return "trial"
        if (status || rawPlanId) return "paid"
        return "unknown"
    }, [])


    const toggleStatus = async (userId: string, currentStatus: boolean) => {
        try {
            const token = await auth.currentUser?.getIdToken();
            const response = await fetch("/api/admin/toggle-user-status", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId,
                    isActive: !currentStatus
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to toggle status");
            }

            // Update local state
            const updatedUsers = users.map(u =>
                u.id === userId ? { ...u, isActive: !currentStatus } : u
            )
            setUsers(updatedUsers)

            // Update stats locally
            const tenants = updatedUsers.filter(u => u.role === 'TENANT_ADMIN')
            const active = tenants.filter(u => u.isActive).length
            setStats(prev => ({ ...prev, activeTenants: active }))

            toast({
                title: "Success",
                description: `User ${!currentStatus ? 'activated' : 'deactivated'} successfully.`,
            })
        } catch (error: any) {
            console.error("Error updating user:", error)
            toast({
                title: "Error",
                description: error.message || "Failed to update user status.",
                variant: "destructive",
            })
        }
    }

    const handleAssignTenantAgency = async (tenantId: string, agencyId: string) => {
        setAssigningTenantId(tenantId)
        try {
            const token = await auth.currentUser?.getIdToken()
            const response = await fetch("/api/admin/assign-tenant-agency", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    tenantId,
                    agencyId: agencyId || null
                })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || "Failed to assign partner")
            }

            setUsers((prev) => prev.map((user) => {
                if (user.id !== tenantId) return user
                return {
                    ...user,
                    agencyId: agencyId || null,
                    agencyAssignedAt: agencyId ? new Date().toISOString() : null,
                    agencyAssignedBy: agencyId ? auth.currentUser?.uid || null : null
                }
            }))

            toast({
                title: "Success",
                description: agencyId ? "Partner assigned." : "Partner unassigned."
            })
            fetchAgencies()
        } catch (error: any) {
            toast({
                title: "Error",
                description: error?.message || "Failed to assign partner.",
                variant: "destructive"
            })
        } finally {
            setAssigningTenantId(null)
        }
    }

    const handleCreateTenant = async () => {
        if (!newTenantEmail || !newTenantPassword || !companyName) {
            toast({
                title: "Error",
                description: "Please fill in all required fields (Email, Password, Company Name).",
                variant: "destructive",
            })
            return
        }

        setIsCreating(true)
        try {
            // Call our new API route to create user
            const response = await fetch("/api/admin/create-tenant", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${await auth.currentUser?.getIdToken()}`
                },
                body: JSON.stringify({
                    email: newTenantEmail,
                    password: newTenantPassword,
                    firstName,
                    lastName,
                    phone,
                    companyName,
                    companyWebsite,
                    industry,
                    agencyId: selectedAgencyId || null
                })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || "Failed to create tenant")
            }

            toast({
                title: "Success",
                description: "Tenant created successfully.",
            })
            setIsAddTenantOpen(false)
            setNewTenantEmail("")
            setNewTenantPassword("")
            setFirstName("")
            setLastName("")
            setPhone("")
            setCompanyName("")
            setCompanyWebsite("")
            setIndustry("ecommerce")
            setSelectedAgencyId("")
            fetchDashboardData()
        } catch (error: any) {
            console.error("Error creating tenant:", error)
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setIsCreating(false)
        }
    }

    const handleCreateAgency = async () => {
        if (!newAgencyName || !newAgencyEmail || !newAgencyPassword) {
            toast({
                title: "Error",
                description: "agencyName, email and password are required.",
                variant: "destructive"
            })
            return
        }

        setIsCreatingAgency(true)
        try {
            const token = await auth.currentUser?.getIdToken()
            const response = await fetch("/api/admin/create-agency", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    agencyName: newAgencyName,
                    partnerLevel: newAgencyPartnerLevel,
                    email: newAgencyEmail,
                    password: newAgencyPassword,
                    firstName: newAgencyFirstName,
                    lastName: newAgencyLastName,
                    phone: newAgencyPhone
                })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || "Failed to create partner")
            }

            toast({
                title: "Success",
                description: "Partner created successfully."
            })

            setIsAddAgencyOpen(false)
            setNewAgencyName("")
            setNewAgencyEmail("")
            setNewAgencyPassword("")
            setNewAgencyFirstName("")
            setNewAgencyLastName("")
            setNewAgencyPhone("")
            setNewAgencyPartnerLevel("partner")
            await fetchAgencies()
        } catch (error: any) {
            toast({
                title: "Error",
                description: error?.message || "Failed to create partner.",
                variant: "destructive"
            })
        } finally {
            setIsCreatingAgency(false)
        }
    }

    const handleToggleAgencyStatus = async (agencyId: string, currentStatus: boolean) => {
        try {
            const token = await auth.currentUser?.getIdToken();
            const response = await fetch("/api/admin/toggle-user-status", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: agencyId,
                    isActive: !currentStatus
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to toggle partner status");
            }

            setAgencies((prev) => prev.map((agency) =>
                agency.id === agencyId ? { ...agency, isActive: !currentStatus } : agency
            ));

            toast({
                title: "Success",
                description: `Partner ${!currentStatus ? "activated" : "deactivated"} successfully.`,
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error?.message || "Failed to update partner status.",
                variant: "destructive",
            });
        }
    }

    const openPartnerConversionDialog = (user: UserData) => {
        setPartnerConversionUser(user)
        setConversionPartnerName(derivePartnerNameFromUser(user))
        setConversionPartnerLevel("partner")
    }

    const handleConvertUserToPartner = async () => {
        if (!partnerConversionUser) return

        const normalizedPartnerName = conversionPartnerName.trim()
        if (!normalizedPartnerName) {
            toast({
                title: "Error",
                description: t('agencyName') || "Partner adı gerekli.",
                variant: "destructive"
            })
            return
        }

        setIsConvertingPartner(true)
        try {
            const token = await auth.currentUser?.getIdToken()
            const response = await fetch("/api/admin/update-user", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    targetUserId: partnerConversionUser.id,
                    role: "AGENCY_ADMIN",
                    partnerLevel: conversionPartnerLevel,
                    agencyName: normalizedPartnerName,
                })
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data.error || "Failed to convert user to partner")
            }

            toast({
                title: "Success",
                description: t('userConvertedToPartner') || "Kullanıcı partner hesabına dönüştürüldü."
            })

            setPartnerConversionUser(null)
            setConversionPartnerName("")
            setConversionPartnerLevel("partner")
            await Promise.all([fetchDashboardData(), fetchAgencies()])
        } catch (error: any) {
            toast({
                title: "Error",
                description: error?.message || t('userConvertToPartnerFailed') || "Kullanıcı partner hesabına dönüştürülemedi.",
                variant: "destructive"
            })
        } finally {
            setIsConvertingPartner(false)
        }
    }

    const handleDeleteTenant = async (user: UserData) => {
        setIsDeletingTenant(user.id)
        try {
            const token = await auth.currentUser?.getIdToken()
            const response = await fetch("/api/admin/delete-tenant", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ userId: user.id })
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data.error || "Failed to delete tenant")
            }

            await Promise.all([fetchDashboardData(), fetchAgencies()])

            toast({
                title: t('success') || "Başarılı",
                description: t('deleteTenantSuccess') || "Müşteri verileri başarıyla silindi.",
            })
        } catch (error: any) {
            console.error("Error deleting tenant:", error)
            toast({
                title: "Hata",
                description: error?.message || t('failedToDeleteTenant') || "Müşteri verileri silinemedi.",
                variant: "destructive",
            })
        } finally {
            setIsDeletingTenant(null)
            setDeleteConfirmUser(null)
        }
    }

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                fetchAgencies();
                if (isEndUsersSection) {
                    fetchDashboardData();
                } else {
                    setIsLoading(false)
                }
            } else {
                setIsLoading(false)
            }
        });

        return () => unsubscribe();
    }, [fetchDashboardData, fetchAgencies, isEndUsersSection])

    const userPlanOptions = useMemo(() => {
        const options = new Set<string>()
        for (const user of users) {
            const planId = getUserPlanId(user)
            if (planId) options.add(planId)
        }
        return Array.from(options).sort()
    }, [users, getUserPlanId])

    const filteredAgencies = useMemo(() => {
        const query = agencySearchTerm.trim().toLowerCase()

        return agencies.filter((agency) => {
            const matchesQuery = !query ||
                getPartnerName(agency).toLowerCase().includes(query) ||
                (agency.email || "").toLowerCase().includes(query)

            const matchesStatus =
                agencyStatusFilter === "all" ||
                (agencyStatusFilter === "active" && agency.isActive) ||
                (agencyStatusFilter === "inactive" && !agency.isActive)

            const customerCount = agency.customerCount || 0
            const matchesCustomerCount =
                agencyCustomerFilter === "all" ||
                (agencyCustomerFilter === "has-customers" && customerCount > 0) ||
                (agencyCustomerFilter === "no-customers" && customerCount === 0)

            const matchesLevel =
                agencyLevelFilter === "all" ||
                agency.partnerLevel === agencyLevelFilter

            return matchesQuery && matchesStatus && matchesCustomerCount && matchesLevel
        })
    }, [agencies, agencySearchTerm, agencyStatusFilter, agencyCustomerFilter, agencyLevelFilter, getPartnerName])

    const filteredUsers = useMemo(() => {
        const query = searchTerm.trim().toLowerCase()

        return users
            .filter((user) => {
                if (user.role !== "TENANT_ADMIN") return false

                const matchesQuery = !query ||
                    (user.email || "").toLowerCase().includes(query) ||
                    (user.companyName || "").toLowerCase().includes(query)

                const matchesStatus =
                    userStatusFilter === "all" ||
                    (userStatusFilter === "active" && user.isActive) ||
                    (userStatusFilter === "inactive" && !user.isActive)

                const planId = getUserPlanId(user)
                const matchesPlan = userPlanFilter === "all" || planId === userPlanFilter

                const matchesAgency =
                    userAgencyFilter === "all" ||
                    (userAgencyFilter === "unassigned" && !user.agencyId) ||
                    user.agencyId === userAgencyFilter

                const subscriptionType = getUserSubscriptionType(user)
                const matchesSubscription =
                    userSubscriptionFilter === "all" ||
                    subscriptionType === userSubscriptionFilter

                return matchesQuery && matchesStatus && matchesPlan && matchesAgency && matchesSubscription
            })
            .sort((left, right) => {
                const createdDiff = getCreatedAtTime(right.createdAt) - getCreatedAtTime(left.createdAt)
                if (createdDiff !== 0) return createdDiff

                return (left.email || "").localeCompare(right.email || "")
            })
    }, [users, searchTerm, userStatusFilter, userPlanFilter, userAgencyFilter, userSubscriptionFilter, getUserPlanId, getUserSubscriptionType])

    const activeAgencyCount = agencies.filter((agency) => agency.isActive).length
    const totalAgencyCustomers = agencies.reduce((total, agency) => total + (agency.customerCount || 0), 0)
    const hasUserFilters = Boolean(
        searchTerm ||
        userStatusFilter !== "all" ||
        userPlanFilter !== "all" ||
        userAgencyFilter !== "all" ||
        userSubscriptionFilter !== "all"
    )
    const listCardClassName = "border-border/60 shadow-sm"
    const listCardHeaderClassName = "space-y-4 border-b border-border/60 pb-5"
    const listCardContentClassName = "pt-5"
    const listTableWrapperClassName = "overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm"
    const listTableHeaderClassName = "bg-muted/45"

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">
                        {isAgenciesSection
                            ? (t('agencies') || "Partnerler")
                            : (t('endUsers') || "Son Kullanıcılar")}
                    </h2>
                    <p className="text-muted-foreground">
                        {isAgenciesSection
                            ? (t('manageAgencyDesc') || "Partner bilgilerini ve bağlı müşterileri yönetin.")
                            : (t('manageTenantsDescription') || "Sistem kullanıcılarını ve erişimlerini yönetin.")}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {isAgenciesSection ? (
                        <Button variant="outline" onClick={() => setIsAddAgencyOpen(true)} className="shadow-sm">
                            <Plus className="mr-2 h-4 w-4" />
                            {t('addAgency') || "Add Partner"}
                        </Button>
                    ) : (
                        <Button onClick={() => setIsAddTenantOpen(true)} className="shadow-sm">
                            <Plus className="mr-2 h-4 w-4" />
                            {t('addTenant') || "+ Son Kullanıcı Ekle"}
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            {isAgenciesSection ? (
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('agencies') || "Partnerler"}</CardTitle>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{agencies.length}</div>
                            <p className="text-xs text-muted-foreground">{t('agency') || "Partner"} hesabı</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('active') || "Aktif"}</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-600">{activeAgencyCount}</div>
                            <p className="text-xs text-muted-foreground">{t('agencyActiveDesc') || "Partner aktif ve bağlı son kullanıcı akışları kullanılabilir."}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('customers') || "Müşteriler"}</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{totalAgencyCustomers}</div>
                            <p className="text-xs text-muted-foreground">{t('assignedCustomers') || "Atanmış Müşteriler"}</p>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('totalTenants') || "Toplam Son Kullanıcı"}</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stats.totalTenants}</div>
                            <p className="text-xs text-muted-foreground">{t('registeredTenantAccounts') || "Kayıtlı son kullanıcılar"}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('activeTenants') || "Aktif Son Kullanıcılar"}</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-600">{stats.activeTenants}</div>
                            <p className="text-xs text-muted-foreground">{t('currentlyActiveAccounts') || "Şu anda aktif son kullanıcılar"}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('totalChatbots') || "Toplam Chatbot"}</CardTitle>
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stats.totalChatbots}</div>
                            <p className="text-xs text-muted-foreground">{t('deployedChatbots') || "Tüm müşterilerde dağıtıldı"}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('totalChatSessions') || "Toplam Sohbet Oturumu"}</CardTitle>
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{(stats as any).totalChatSessions || 0}</div>
                            <p className="text-xs text-muted-foreground">{t('totalConversations') || "Toplam Sohbet"}</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {isAgenciesSection && (
                <Card className={listCardClassName}>
                    <CardHeader className={listCardHeaderClassName}>
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <CardTitle className="text-base font-semibold">{t('agencies') || "Partners"}</CardTitle>
                            <span className="text-xs text-muted-foreground">
                                {filteredAgencies.length} {t('results') || "results"}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative w-full min-[540px]:w-[320px]">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t('search') || "Search"}
                                    className="pl-8"
                                    value={agencySearchTerm}
                                    onChange={(e) => setAgencySearchTerm(e.target.value)}
                                />
                            </div>
                            <NativeSelect
                                className="flex h-9 min-w-[160px] flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                                value={agencyStatusFilter}
                                onChange={(e) => setAgencyStatusFilter(e.target.value as "all" | "active" | "inactive")}
                            >
                                <option value="all">{t('status') || "Status"}: {t('all') || "All"}</option>
                                <option value="active">{t('active') || "Active"}</option>
                                <option value="inactive">{t('inactive') || "Inactive"}</option>
                            </NativeSelect>
                            <NativeSelect
                                className="flex h-9 min-w-[220px] flex-[1.2] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                                value={agencyCustomerFilter}
                                onChange={(e) => setAgencyCustomerFilter(e.target.value as "all" | "has-customers" | "no-customers")}
                            >
                                <option value="all">{t('customers') || "Customers"}: {t('all') || "All"}</option>
                                <option value="has-customers">{t('customers') || "Customers"} &gt; 0</option>
                                <option value="no-customers">{t('customers') || "Customers"} = 0</option>
                            </NativeSelect>
                            <NativeSelect
                                className="flex h-9 min-w-[220px] flex-[1.2] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                                value={agencyLevelFilter}
                                onChange={(e) => setAgencyLevelFilter(e.target.value as PartnerLevel | "all")}
                            >
                                <option value="all">Partner Level: All</option>
                                <option value="partner">Partner</option>
                                <option value="solution_partner">Solution Partner</option>
                                <option value="strategic_partner">Strategic Partner</option>
                            </NativeSelect>
                            {(agencySearchTerm || agencyStatusFilter !== "all" || agencyCustomerFilter !== "all" || agencyLevelFilter !== "all") && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 whitespace-nowrap"
                                    onClick={() => {
                                        setAgencySearchTerm("")
                                        setAgencyStatusFilter("all")
                                        setAgencyCustomerFilter("all")
                                        setAgencyLevelFilter("all")
                                    }}
                                >
                                    {t('clearFilters') || "Clear filters"}
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className={listCardContentClassName}>
                        {isAgenciesLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        ) : (
                            <div className={listTableWrapperClassName}>
                                <Table>
                                    <TableHeader className={listTableHeaderClassName}>
                                        <TableRow>
                                            <TableHead>{t('agency') || "Partner"}</TableHead>
                                            <TableHead>{t('email') || "Email"}</TableHead>
                                            <TableHead>Partner Level</TableHead>
                                            <TableHead>{t('customers') || "Customers"}</TableHead>
                                            <TableHead>{t('status') || "Status"}</TableHead>
                                            <TableHead className="text-right">{t('actions') || "Actions"}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredAgencies.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                                    {t('noResults') || "No results found."}
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredAgencies.map((agency) => (
                                            <TableRow key={agency.id}>
                                                <TableCell className="font-medium">{getPartnerName(agency)}</TableCell>
                                                <TableCell>{agency.email}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">{getPartnerLevelLabel(agency.partnerLevel)}</Badge>
                                                </TableCell>
                                                <TableCell>{agency.customerCount || 0}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Badge variant={agency.isActive ? "outline" : "destructive"}>
                                                            {agency.isActive ? (t('active') || "Active") : (t('inactive') || "Inactive")}
                                                        </Badge>
                                                        <Switch
                                                            checked={agency.isActive}
                                                            onCheckedChange={() => handleToggleAgencyStatus(agency.id, agency.isActive)}
                                                        />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => router.push(`/admin/tenant/${agency.id}/settings/customer-admin`)}
                                                            title={t('manageSubscription') || "Abonelik"}
                                                        >
                                                            <CreditCard className="h-4 w-4 mr-1" />
                                                            {t('manageSubscription') || "Abonelik"}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => router.push(`/admin/agency/${agency.id}`)}
                                                            title={t('manage') || "Yönet"}
                                                        >
                                                            <Settings className="h-4 w-4 mr-1" />
                                                            {t('manage') || "Yönet"}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Tenant List */}
            {isEndUsersSection && (
                <Card className={cn(listCardClassName, "my-8")}>
                    <CardHeader className={listCardHeaderClassName}>
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <CardTitle className="text-base font-semibold">
                                {t('endUsers') || "Son Kullanıcılar"}
                            </CardTitle>
                            <span className="text-xs text-muted-foreground">
                                {filteredUsers.length} {t('results') || "results"}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative w-full min-[540px]:w-[320px]">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t('searchTenants') || "Son kullanıcı ara..."}
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <NativeSelect
                                aria-label={t('status') || "Status"}
                                className="flex h-9 min-w-[160px] flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                                value={userStatusFilter}
                                onChange={(e) => setUserStatusFilter(e.target.value as "all" | "active" | "inactive")}
                            >
                                <option value="all">{t('status') || "Status"}: {t('all') || "All"}</option>
                                <option value="active">{t('active') || "Active"}</option>
                                <option value="inactive">{t('inactive') || "Inactive"}</option>
                            </NativeSelect>
                            <NativeSelect
                                aria-label={t('plan') || "Plan"}
                                className="flex h-9 min-w-[160px] flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                                value={userPlanFilter}
                                onChange={(e) => setUserPlanFilter(e.target.value)}
                            >
                                <option value="all">{t('plan') || "Plan"}: {t('all') || "All"}</option>
                                {userPlanOptions.map((plan) => (
                                    <option key={plan} value={plan}>
                                        {plan.charAt(0).toUpperCase() + plan.slice(1)}
                                    </option>
                                ))}
                            </NativeSelect>
                            <NativeSelect
                                aria-label={t('agency') || "Partner"}
                                className="flex h-9 min-w-[200px] flex-[1.2] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                                value={userAgencyFilter}
                                onChange={(e) => setUserAgencyFilter(e.target.value)}
                            >
                                <option value="all">{t('agency') || "Partner"}: {t('all') || "All"}</option>
                                <option value="unassigned">{t('unassigned') || "Unassigned"}</option>
                                {agencies
                                    .filter((agency) => !agency.isArchived)
                                    .map((agency) => (
                                        <option key={agency.id} value={agency.id}>
                                            {getPartnerName(agency)}
                                        </option>
                                    ))}
                            </NativeSelect>
                            <NativeSelect
                                aria-label={t('subscription') || "Subscription"}
                                className="flex h-9 min-w-[180px] flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                                value={userSubscriptionFilter}
                                onChange={(e) => setUserSubscriptionFilter(e.target.value as "all" | "trial" | "paid" | "unknown")}
                            >
                                <option value="all">{t('subscription') || "Subscription"}: {t('all') || "All"}</option>
                                <option value="trial">{t('trial') || "Trial"}</option>
                                <option value="paid">{t('paid') || "Paid"}</option>
                                <option value="unknown">{t('unknown') || "Unknown"}</option>
                            </NativeSelect>
                            {hasUserFilters && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 whitespace-nowrap"
                                    onClick={() => {
                                        setSearchTerm("")
                                        setUserStatusFilter("all")
                                        setUserPlanFilter("all")
                                        setUserAgencyFilter("all")
                                        setUserSubscriptionFilter("all")
                                    }}
                                >
                                    {t('clearFilters') || "Clear filters"}
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="overflow-hidden rounded-lg border border-border/70 bg-background">
                            <Table>
                                <TableHeader className={listTableHeaderClassName}>
                                    <TableRow>
                                        <TableHead>{t('email')}</TableHead>
                                        <TableHead>{t('agency') || "Partner"}</TableHead>
                                        <TableHead>{t('plan') || "Plan"}</TableHead>
                                        <TableHead>{t('status')}</TableHead>
                                        <TableHead className="text-right">{t('actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUsers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                                {t('noResults') || "No results found."}
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredUsers.map((user) => (
                                        <TableRow key={user.id} className={`transition-colors focus-within:bg-muted/50 ${user.isArchived ? "bg-muted/45 opacity-70" : "hover:bg-muted/30"}`}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-600">
                                                    {(user.email || '??').substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="break-all sm:break-normal">{user.email}</span>
                                                        {user.isArchived && (
                                                            <Badge variant="secondary" className="bg-gray-200 text-gray-600 rounded-full px-2 py-0 text-[10px]">
                                                                Arşiv
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{user.id.substring(0, 8)}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-2">
                                                <div className="text-sm">
                                                    {agencies.find((agency) => agency.id === user.agencyId)?.partnerName || agencies.find((agency) => agency.id === user.agencyId)?.agencyName || t('unassigned') || "Unassigned"}
                                                </div>
                                                <NativeSelect
                                                    className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                    value={user.agencyId || ""}
                                                    disabled={assigningTenantId === user.id}
                                                    onChange={(event) => handleAssignTenantAgency(user.id, event.target.value)}
                                                >
                                                    <option value="">{t('unassigned') || "Unassigned"}</option>
                                                    {agencies
                                                        .filter((agency) => !agency.isArchived)
                                                        .map((agency) => (
                                                            <option key={agency.id} value={agency.id}>
                                                                {getPartnerName(agency)}
                                                            </option>
                                                        ))}
                                                </NativeSelect>
                                            </div>
                                        </TableCell>
                                        {/* Plan & Subscription Status */}
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <span className="font-medium text-sm">
                                                    {(() => {
                                                        const planId = getUserPlanId(user)
                                                        if (!planId) return "-"
                                                        return planId.charAt(0).toUpperCase() + planId.slice(1)
                                                    })()}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {user.subscription?.billingPeriod === 'monthly' ? (t('monthly') || 'Aylık') : user.subscription?.billingPeriod === 'yearly' ? (t('yearly') || 'Yıllık') : ''}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Switch
                                                    checked={user.isActive}
                                                    onCheckedChange={() => toggleStatus(user.id, user.isActive)}
                                                    disabled={user.isArchived}
                                                    aria-label={user.isActive ? t('deactivate') : t('activate')}
                                                />
                                                 <Badge
                                                    variant={user.isActive ? 'outline' : 'destructive'}
                                                    className={`rounded-full px-3 ${user.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}
                                                >
                                                    {user.isActive ? t('active') : t('inactive')}
                                                </Badge>
                                                {/* Subscription Status Badge */}
                                                {user.subscription?.status === 'trial' && (
                                                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 rounded-full">
                                                        {t('trial') || 'Deneme'}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        
                                        <TableCell className="text-right">
                                            {user.role !== 'SUPER_ADMIN' && (
                                                <div className="flex justify-end">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-full"
                                                                aria-label={t('actions') || "Actions"}
                                                            >
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-52">
                                                            <DropdownMenuItem
                                                                className="cursor-pointer"
                                                                onClick={() => router.push(`/admin/tenant/${user.id}/settings/customer-admin`)}
                                                            >
                                                                <CreditCard className="h-4 w-4" />
                                                                {t('manageSubscription') || "Abonelik"}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="cursor-pointer"
                                                                disabled={user.isArchived}
                                                                onClick={() => openPartnerConversionDialog(user)}
                                                            >
                                                                <Building2 className="h-4 w-4" />
                                                                {t('makePartner') || "Partner Yap"}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="cursor-pointer"
                                                                onClick={() => router.push(`/admin/tenant/${user.id}`)}
                                                            >
                                                                <Settings className="h-4 w-4" />
                                                                {t('details') || "Detay"}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                variant="destructive"
                                                                className="cursor-pointer"
                                                                onClick={() => setDeleteConfirmUser(user)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                {t('deleteTenantAction') || (language === 'tr' ? 'Üyeliği Sil' : 'Delete Membership')}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            )}
                                        </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Add Tenant Dialog */}
            {isEndUsersSection && (
                <Dialog open={isAddTenantOpen} onOpenChange={setIsAddTenantOpen}>
                <DialogContent className="max-w-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
                    <DialogHeader className="px-8 pt-8 pb-4 shrink-0 border-b">
                        <DialogTitle>{t('addNewTenant') || "Yeni Son Kullanıcı Ekle"}</DialogTitle>
                        <DialogDescription>
                            Sistem için yeni bir kiracı hesabı oluşturun. Tüm detaylar otomatik olarak atanacaktır.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 space-y-4">
                                <h3 className="text-sm font-semibold border-b pb-1 uppercase tracking-wider text-gray-500">{t('companyInfo')}</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="companyName">{t('companyName')}</Label>
                                        <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Inc." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="industry">{t('industry')}</Label>
                                        <NativeSelect
                                            id="industry"
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                            value={industry}
                                            onChange={(e) => setIndustry(e.target.value)}
                                        >
                                            <option value="ecommerce">{t('industryEcommerce')}</option>
                                            <option value="booking">{t('industryTravel') || 'Travel & Booking'}</option>
                                            <option value="real_estate">{t('industryRealEstate')}</option>
                                            <option value="saas">{t('industrySaas')}</option>
                                            <option value="service">{t('industryService')}</option>
                                            <option value="healthcare">{t('industryHealthcare')}</option>
                                            <option value="education">{t('industryEducation')}</option>
                                            <option value="academic">{t('industryAcademic')}</option>
                                            <option value="finance">{t('industryFinance')}</option>
                                            <option value="restaurant">{t('industryRestaurant') || 'Restaurant'}</option>
                                            <option value="agriculture">{language === 'tr' ? 'Tarım' : 'Agriculture'}</option>
                                            <option value="automotive">{language === 'tr' ? 'Otomotiv' : 'Automotive'}</option>
                                            <option value="insurance">{language === 'tr' ? 'Sigorta' : 'Insurance'}</option>
                                            <option value="logistics">{language === 'tr' ? 'Lojistik' : 'Logistics'}</option>
                                            <option value="beauty">{language === 'tr' ? 'Güzellik & Wellness' : 'Beauty & Wellness'}</option>
                                            <option value="legal">{language === 'tr' ? 'Hukuk' : 'Legal'}</option>
                                            <option value="fitness">{language === 'tr' ? 'Spor & Fitness' : 'Sports & Fitness'}</option>
                                            <option value="maritime">{language === 'tr' ? 'Denizcilik' : 'Maritime'}</option>
                                            <option value="other">{t('industryOther')}</option>
                                        </NativeSelect>
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label htmlFor="website">{t('website')}</Label>
                                        <Input id="website" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} placeholder="https://example.com" />
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-2 space-y-4 pt-2">
                                <h3 className="text-sm font-semibold border-b pb-1 uppercase tracking-wider text-gray-500">{t('contactInfo')}</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">{t('firstName')}</Label>
                                        <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">{t('lastName')}</Label>
                                        <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label htmlFor="phone">{t('phone')}</Label>
                                        <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 890" />
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-2 space-y-4 pt-2">
                                <h3 className="text-sm font-semibold border-b pb-1 uppercase tracking-wider text-gray-500">{t('accountInfo')}</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">{t('email')}</Label>
                                        <Input id="email" type="email" value={newTenantEmail} onChange={(e) => setNewTenantEmail(e.target.value)} placeholder="tenant@example.com" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">{t('password')}</Label>
                                        <Input id="password" type="password" value={newTenantPassword} onChange={(e) => setNewTenantPassword(e.target.value)} placeholder="******" />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label htmlFor="agency">{t('agency') || "Partner"} ({t('optional') || "optional"})</Label>
                                        <NativeSelect
                                            id="agency"
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                            value={selectedAgencyId}
                                            onChange={(e) => setSelectedAgencyId(e.target.value)}
                                        >
                                            <option value="">{t('unassigned') || "Unassigned"}</option>
                                            {agencies
                                                .filter((agency) => !agency.isArchived)
                                                .map((agency) => (
                                                    <option key={agency.id} value={agency.id}>
                                                        {getPartnerName(agency)}
                                                    </option>
                                                ))}
                                        </NativeSelect>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="px-8 py-6 shrink-0 border-t bg-muted/20">
                        <Button variant="outline" onClick={() => setIsAddTenantOpen(false)}>{t('cancel')}</Button>
                        <Button onClick={handleCreateTenant} disabled={isCreating} className="bg-zinc-900 hover:bg-zinc-800 text-white">
                            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('createTenant')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
                </Dialog >
            )}

            {isAgenciesSection && (
                <Dialog open={isAddAgencyOpen} onOpenChange={setIsAddAgencyOpen}>
                <DialogContent className="max-w-xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
                    <DialogHeader className="px-8 pt-8 pb-4 shrink-0 border-b">
                        <DialogTitle>{t('createAgency') || "Create Partner"}</DialogTitle>
                        <DialogDescription>{t('createAgencyDesc') || "Create a new partner admin account."}</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="agencyName">{t('agencyName') || "Partner Name"}</Label>
                            <Input id="agencyName" value={newAgencyName} onChange={(e) => setNewAgencyName(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="agencyFirstName">{t('firstName') || "First Name"}</Label>
                                <Input id="agencyFirstName" value={newAgencyFirstName} onChange={(e) => setNewAgencyFirstName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="agencyLastName">{t('lastName') || "Last Name"}</Label>
                                <Input id="agencyLastName" value={newAgencyLastName} onChange={(e) => setNewAgencyLastName(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="agencyPhone">{t('phone') || "Phone"}</Label>
                            <Input id="agencyPhone" value={newAgencyPhone} onChange={(e) => setNewAgencyPhone(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="agencyEmail">{t('email') || "Email"}</Label>
                            <Input id="agencyEmail" type="email" value={newAgencyEmail} onChange={(e) => setNewAgencyEmail(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="agencyPassword">{t('password') || "Password"}</Label>
                            <Input id="agencyPassword" type="password" value={newAgencyPassword} onChange={(e) => setNewAgencyPassword(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="agencyPartnerLevel">Partner Level</Label>
                            <NativeSelect
                                id="agencyPartnerLevel"
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={newAgencyPartnerLevel}
                                onChange={(e) => setNewAgencyPartnerLevel(e.target.value as PartnerLevel)}
                            >
                                <option value="partner">Partner</option>
                                <option value="solution_partner">Solution Partner</option>
                                <option value="strategic_partner">Strategic Partner</option>
                            </NativeSelect>
                        </div>
                    </div>
                    <DialogFooter className="px-8 py-6 shrink-0 border-t bg-muted/20">
                        <Button variant="outline" onClick={() => setIsAddAgencyOpen(false)}>{t('cancel') || "Cancel"}</Button>
                        <Button onClick={handleCreateAgency} disabled={isCreatingAgency}>
                            {isCreatingAgency && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('createAgency') || "Create Partner"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
                </Dialog>
            )}

            {isEndUsersSection && (
                <Dialog
                    open={!!partnerConversionUser}
                    onOpenChange={(open) => {
                        if (!open && !isConvertingPartner) {
                            setPartnerConversionUser(null)
                            setConversionPartnerName("")
                            setConversionPartnerLevel("partner")
                        }
                    }}
                >
                    <DialogContent className="max-w-xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
                        <DialogHeader className="px-8 pt-8 pb-4 shrink-0 border-b">
                            <DialogTitle>{t('convertUserToPartner') || "Kullanıcıyı Partnera Dönüştür"}</DialogTitle>
                            <DialogDescription>
                                Seçilen son kullanıcı partner hesabına çevrilecek. Kullanıcı müşteri listesinden çıkar ve Partnerler listesinde görünür.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                            <div className="space-y-2">
                                <Label>{t('email') || "E-posta"}</Label>
                                <Input value={partnerConversionUser?.email || ""} disabled className="bg-muted/50" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="conversionPartnerName">{t('agencyName') || "Partner Adı"}</Label>
                                <Input
                                    id="conversionPartnerName"
                                    value={conversionPartnerName}
                                    onChange={(e) => setConversionPartnerName(e.target.value)}
                                    placeholder={t('agencyName') || "Partner adı"}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="conversionPartnerLevel">Partner Level</Label>
                                <NativeSelect
                                    id="conversionPartnerLevel"
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    value={conversionPartnerLevel}
                                    onChange={(e) => setConversionPartnerLevel(e.target.value as PartnerLevel)}
                                >
                                    <option value="partner">Partner</option>
                                    <option value="solution_partner">Solution Partner</option>
                                    <option value="strategic_partner">Strategic Partner</option>
                                </NativeSelect>
                            </div>
                            {partnerConversionUser?.agencyId ? (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                    Bu kullanıcı şu anda bir partnere bağlı. Dönüştürme işlemi mevcut partner atamasını temizler ve hesabı partner dizinine taşır.
                                </div>
                            ) : null}
                        </div>
                        <DialogFooter className="px-8 py-6 shrink-0 border-t bg-muted/20">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setPartnerConversionUser(null)
                                    setConversionPartnerName("")
                                    setConversionPartnerLevel("partner")
                                }}
                                disabled={isConvertingPartner}
                            >
                                {t('cancel') || "Cancel"}
                            </Button>
                            <Button onClick={handleConvertUserToPartner} disabled={isConvertingPartner}>
                                {isConvertingPartner && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t('makePartner') || "Partner Yap"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {isEndUsersSection && (
                <AlertDialog open={!!deleteConfirmUser} onOpenChange={(open) => !open && !isDeletingTenant && setDeleteConfirmUser(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{language === 'tr' ? 'Üyeliği Sil' : 'Delete Membership'}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {t('deleteTenantConfirm') || "Bu müşteriyi silmek istediğinizden emin misiniz? Bu işlem tüm verilerini silecektir."}
                                {deleteConfirmUser?.email ? (
                                    <span className="mt-2 block font-medium text-foreground">{deleteConfirmUser.email}</span>
                                ) : null}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeletingTenant === deleteConfirmUser?.id}>
                                {t('cancel') || "İptal"}
                            </AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive text-white hover:bg-destructive/90"
                                onClick={() => {
                                    if (deleteConfirmUser) {
                                        handleDeleteTenant(deleteConfirmUser)
                                    }
                                }}
                            >
                                {isDeletingTenant === deleteConfirmUser?.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                {t('deleteTenantAction') || (language === 'tr' ? 'Üyeliği Sil' : 'Delete Membership')}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div >
    )
}
