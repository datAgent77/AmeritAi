"use client"

import Image from "next/image"
import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { getPartnerLevelLabel } from "@/lib/management/access"
import type { PartnerLevel } from "@/lib/management/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, ArrowLeft, Users, Building2, Mail, Settings, ExternalLink, Trash2, ShieldCheck } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
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

interface AgencyDetail {
    id: string
    email: string
    agencyName: string
    partnerName?: string | null
    firstName?: string
    lastName?: string
    phone?: string
    isActive: boolean
    isArchived?: boolean
    createdAt?: any
    customerCount?: number
    partnerLevel: PartnerLevel
    partnerLogoUrl?: string | null
}

interface TenantUser {
    id: string
    email: string
    companyName?: string
    isActive: boolean
    isArchived?: boolean
    agencyId?: string | null
    planId?: string
    subscriptionStatus?: string
    subscriptionBillingPeriod?: string
}

export default function AgencyManagementPage() {
    const { t } = useLanguage()
    const { toast } = useToast()
    const router = useRouter()
    const params = useParams()
    const agencyId = params.agencyId as string

    const [agency, setAgency] = useState<AgencyDetail | null>(null)
    const [assignedTenants, setAssignedTenants] = useState<TenantUser[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isTogglingStatus, setIsTogglingStatus] = useState(false)
    const [editedEmail, setEditedEmail] = useState("")
    const [editedPartnerLevel, setEditedPartnerLevel] = useState<PartnerLevel>("solution_partner")
    const [isSavingEmail, setIsSavingEmail] = useState(false)
    const [isSavingPartnerLevel, setIsSavingPartnerLevel] = useState(false)
    const [isDeletingAgency, setIsDeletingAgency] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

    const fetchAgencyData = useCallback(async () => {
        setIsLoading(true)
        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) return

            const [agenciesRes, accountsRes] = await Promise.all([
                fetch(`/api/admin/agencies?includeArchived=true`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                fetch(`/api/omni/directory/accounts?includeArchived=true`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ])

            if (!agenciesRes.ok) throw new Error("Failed to fetch partner")
            if (!accountsRes.ok) throw new Error("Failed to fetch managed accounts")

            const agenciesData = await agenciesRes.json()
            const accountsData = await accountsRes.json()

            const found = (agenciesData.agencies || []).find((a: AgencyDetail) => a.id === agencyId)
            if (!found) {
                toast({ title: t('error') || "Hata", description: "Partner bulunamadı.", variant: "destructive" })
                router.push("/admin/agencies")
                return
            }
            setAgency(found)
            setEditedEmail(found.email || "")
            setEditedPartnerLevel(found.partnerLevel || "solution_partner")

            const tenants = (accountsData.accounts || []).filter(
                (u: TenantUser & { partnerId?: string | null }) => (u.agencyId || u.partnerId) === agencyId
            )
            setAssignedTenants(tenants)
        } catch (error: any) {
            console.error("Error fetching partner data:", error)
            toast({ title: t('error') || "Hata", description: error?.message || "Veri yüklenemedi.", variant: "destructive" })
        } finally {
            setIsLoading(false)
        }
    }, [agencyId, toast, t, router])

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) fetchAgencyData()
            else setIsLoading(false)
        })
        return () => unsubscribe()
    }, [fetchAgencyData])

    const handleToggleStatus = async () => {
        if (!agency) return
        setIsTogglingStatus(true)
        try {
            const token = await auth.currentUser?.getIdToken()
            const response = await fetch("/api/admin/toggle-user-status", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ userId: agency.id, isActive: !agency.isActive })
            })
            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || "Failed to toggle status")
            }
            setAgency((prev) => prev ? { ...prev, isActive: !prev.isActive } : prev)
            toast({
                title: t('success') || "Başarılı",
                description: agency.isActive
                    ? (t('deactivated') || "Partner devre dışı bırakıldı.")
                    : (t('activated') || "Partner etkinleştirildi.")
            })
        } catch (error: any) {
            toast({ title: t('error') || "Hata", description: error?.message, variant: "destructive" })
        } finally {
            setIsTogglingStatus(false)
        }
    }

    const handleUpdateAgencyEmail = async () => {
        if (!agency) return

        const normalizedEmail = editedEmail.trim().toLowerCase()

        if (!normalizedEmail) {
            toast({
                title: t('error') || "Hata",
                description: t('emailRequired') || "E-posta alanı zorunludur.",
                variant: "destructive"
            })
            return
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(normalizedEmail)) {
            toast({
                title: t('error') || "Hata",
                description: t('invalidEmail') || "Geçerli bir e-posta adresi girin.",
                variant: "destructive"
            })
            return
        }

        if (normalizedEmail === (agency.email || "").toLowerCase()) {
            return
        }

        setIsSavingEmail(true)
        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) {
                throw new Error(t('unauthorized') || "Unauthorized")
            }

            const response = await fetch("/api/admin/update-user", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    targetUserId: agency.id,
                    email: normalizedEmail
                })
            })

            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data.error || "Failed to update partner email")
            }

            setAgency((prev) => prev ? { ...prev, email: normalizedEmail } : prev)
            toast({
                title: t('success') || "Başarılı",
                description: t('agencyEmailUpdated') || "Partner e-posta adresi güncellendi."
            })
        } catch (error: any) {
            toast({
                title: t('error') || "Hata",
                description: error?.message || (t('failedToUpdate') || "Güncelleme başarısız."),
                variant: "destructive"
            })
        } finally {
            setIsSavingEmail(false)
        }
    }

    const handleUpdatePartnerLevel = async () => {
        if (!agency || editedPartnerLevel === agency.partnerLevel) return

        setIsSavingPartnerLevel(true)
        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) {
                throw new Error(t('unauthorized') || "Unauthorized")
            }

            const response = await fetch("/api/admin/update-user", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    targetUserId: agency.id,
                    partnerLevel: editedPartnerLevel
                })
            })

            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data.error || "Failed to update partner level")
            }

            setAgency((prev) => prev ? { ...prev, partnerLevel: editedPartnerLevel } : prev)
            toast({
                title: t('success') || "Başarılı",
                description: "Partner level updated successfully."
            })
        } catch (error: any) {
            toast({
                title: t('error') || "Hata",
                description: error?.message || "Partner level could not be updated.",
                variant: "destructive"
            })
        } finally {
            setIsSavingPartnerLevel(false)
        }
    }

    const handleDeleteAgency = async () => {
        if (!agency) return
        setIsDeletingAgency(true)
        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) {
                throw new Error(t('unauthorized') || "Unauthorized")
            }

            const response = await fetch("/api/admin/delete-agency", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ agencyId: agency.id })
            })

            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data.error || "Failed to delete agency")
            }

            const data = await response.json().catch(() => ({}))
            const unassignedTenants = Number(data?.unassignedTenants || 0)

            toast({
                title: t('success') || "Başarılı",
                description: unassignedTenants > 0
                    ? `${t('agencyDeleted') || "Partner silindi."} ${unassignedTenants} ${t('customers') || "müşteri"} ${t('unassigned') || "Unassigned"}.`
                    : (t('agencyDeleted') || "Partner silindi.")
            })
            router.push("/admin/agencies")
        } catch (error: any) {
            toast({
                title: t('error') || "Hata",
                description: error?.message || "Partner silinemedi.",
                variant: "destructive"
            })
        } finally {
            setIsDeletingAgency(false)
            setIsDeleteDialogOpen(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!agency) return null

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Back Button */}
            <Button
                variant="ghost"
                onClick={() => router.push("/admin/agencies")}
                className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="h-4 w-4" />
                {t('back') || "Geri"}
            </Button>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{agency.partnerName || agency.agencyName || agency.email}</h1>
                    <p className="text-muted-foreground mt-1">{t('manageAgencyDesc') || "Partner bilgilerini ve bağlı müşterileri yönetin."}</p>
                </div>
                <Badge
                    variant={agency.isActive ? "outline" : "destructive"}
                    className={`text-sm px-3 py-1 ${agency.isActive ? "bg-green-50 text-green-700 border-green-200" : ""}`}
                >
                    {agency.isActive ? (t('active') || "Aktif") : (t('inactive') || "Pasif")}
                </Badge>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                            <CardTitle className="text-sm text-muted-foreground font-normal">{t('agencyName') || "Partner Adı"}</CardTitle>
                            <p className="font-semibold text-sm">{agency.partnerName || agency.agencyName || "-"}</p>
                        </div>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                            <Mail className="h-4 w-4" />
                        </div>
                        <div>
                            <CardTitle className="text-sm text-muted-foreground font-normal">{t('email') || "E-posta"}</CardTitle>
                            <p className="font-semibold text-sm truncate max-w-[160px]" title={agency.email}>{agency.email}</p>
                        </div>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
                            <Users className="h-4 w-4" />
                        </div>
                        <div>
                            <CardTitle className="text-sm text-muted-foreground font-normal">{t('customers') || "Müşteriler"}</CardTitle>
                            <p className="font-semibold text-sm">{assignedTenants.length}</p>
                        </div>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                            <ShieldCheck className="h-4 w-4" />
                        </div>
                        <div>
                            <CardTitle className="text-sm text-muted-foreground font-normal">Partner Level</CardTitle>
                            <p className="font-semibold text-sm">{getPartnerLevelLabel(agency.partnerLevel)}</p>
                        </div>
                    </CardHeader>
                </Card>
            </div>

            {/* Status Management */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Settings className="h-4 w-4" />
                        {t('agencySettings') || "Partner Ayarları"}
                    </CardTitle>
                    <CardDescription>{t('agencySettingsDesc') || "Partner aktifliğini, seviyesini ve iletişim bilgilerini yönetin."}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100">
                        <div>
                            <div className="font-medium text-sm">{t('agencyStatus') || "Partner Durumu"}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                                {agency.isActive
                                    ? (t('agencyActiveDesc') || "Partner aktif ve bağlı müşterilerle çalışmaya devam edebilir.")
                                    : (t('agencyInactiveDesc') || "Partner pasif, bu yüzden yönetim akışları sınırlandırılır.")}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">
                                {agency.isActive ? (t('active') || "Aktif") : (t('inactive') || "Pasif")}
                            </span>
                            <Switch
                                checked={agency.isActive}
                                onCheckedChange={handleToggleStatus}
                                disabled={isTogglingStatus}
                            />
                        </div>
                    </div>

                    <div className="p-4 rounded-lg bg-gray-50 border border-gray-100 space-y-3">
                        <div>
                            <div className="font-medium text-sm">{t('email') || "E-posta"}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                                {t('agencyEmailEditHint') || "Partner giriş için kullandığı e-posta adresini güncelleyin."}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Input
                                type="email"
                                value={editedEmail}
                                onChange={(event) => setEditedEmail(event.target.value)}
                                placeholder={t('email') || "E-posta"}
                                className="sm:max-w-md"
                            />
                            <Button
                                onClick={handleUpdateAgencyEmail}
                                disabled={isSavingEmail || editedEmail.trim().toLowerCase() === (agency.email || "").toLowerCase()}
                                className="sm:w-auto"
                            >
                                {isSavingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t('save') || "Kaydet"}
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4 lg:grid-cols-[1fr_auto]">
                        <div className="space-y-3">
                            <div>
                                <div className="font-medium text-sm">Partner Level</div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                    Capability ve strategic branding erişimi bu seviyeden çözülür.
                                </div>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                <select
                                    className="flex h-9 min-w-[240px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    value={editedPartnerLevel}
                                    onChange={(event) => setEditedPartnerLevel(event.target.value as PartnerLevel)}
                                >
                                    <option value="partner">Partner</option>
                                    <option value="solution_partner">Solution Partner</option>
                                    <option value="strategic_partner">Strategic Partner</option>
                                </select>
                                <Button
                                    onClick={handleUpdatePartnerLevel}
                                    disabled={isSavingPartnerLevel || editedPartnerLevel === agency.partnerLevel}
                                >
                                    {isSavingPartnerLevel ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Save Level
                                </Button>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3">
                            <div className="relative h-14 w-14 overflow-hidden rounded-2xl border bg-white">
                                {agency.partnerLogoUrl ? (
                                    <Image
                                        src={agency.partnerLogoUrl}
                                        alt={agency.partnerName || agency.agencyName || "Partner"}
                                        fill
                                        className="object-contain p-2"
                                        unoptimized
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-muted-foreground">
                                        No Logo
                                    </div>
                                )}
                            </div>
                            <div className="max-w-[220px] text-sm">
                                <div className="font-medium">Strategic Branding Preview</div>
                                <div className="text-xs text-muted-foreground">
                                    {agency.partnerLevel === "strategic_partner"
                                        ? "Header-right branding is active for this partner and its linked customer accounts."
                                        : "Logo visibility opens only when this partner reaches Strategic Partner level."}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 p-4 rounded-lg border border-red-200 bg-red-50/60 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="font-medium text-sm text-red-700">
                                {t('deleteAgency') || "Partneri Sil"}
                            </div>
                            <div className="text-xs text-red-700/80 mt-0.5">
                                {assignedTenants.length > 0
                                    ? `${assignedTenants.length} ${(t('customers') || "müşteri")} ${(t('unassigned') || "Unassigned")} olacak.`
                                    : (t('deleteAgencyHint') || "Bu işlem geri alınamaz.")}
                            </div>
                        </div>
                        <Button
                            variant="destructive"
                            onClick={() => setIsDeleteDialogOpen(true)}
                            disabled={isDeletingAgency}
                            className="sm:w-auto"
                        >
                            {isDeletingAgency ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t('deleteAgency') || "Partneri Sil"}
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Assigned Customers */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Users className="h-4 w-4" />
                        {t('assignedCustomers') || "Bağlı Müşteriler"}
                    </CardTitle>
                    <CardDescription>
                        {t('assignedCustomersDesc') || "Bu partnere bağlı tüm müşteri hesapları."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-50/50">
                                <TableRow>
                                    <TableHead>{t('email') || "E-posta"}</TableHead>
                                    <TableHead>{t('plan') || "Plan"}</TableHead>
                                    <TableHead>{t('status') || "Durum"}</TableHead>
                                    <TableHead className="text-right">{t('actions') || "İşlemler"}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assignedTenants.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                            {t('noTenantsAssigned') || "Bu partnere henüz müşteri atanmamış."}
                                        </TableCell>
                                    </TableRow>
                                ) : assignedTenants.map((tenant) => (
                                    <TableRow key={tenant.id} className="hover:bg-gray-50/50 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-600">
                                                    {tenant.email.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-sm">{tenant.email}</div>
                                                    {tenant.companyName && (
                                                        <div className="text-xs text-muted-foreground">{tenant.companyName}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium capitalize text-sm">
                                                {tenant.planId ? tenant.planId.charAt(0).toUpperCase() + tenant.planId.slice(1) : "-"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={tenant.isActive ? "outline" : "destructive"}
                                                className={`rounded-full px-3 ${tenant.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}
                                            >
                                                {tenant.isActive ? (t('active') || "Aktif") : (t('inactive') || "Pasif")}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => window.location.href = `/admin/tenant/${tenant.id}/settings/customer-admin`}
                                                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                            >
                                                <ExternalLink className="h-4 w-4 mr-1" />
                                                {t('manage') || "Yönet"}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('deleteAgency') || "Partneri Sil"}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {assignedTenants.length > 0
                                ? `${agency.partnerName || agency.agencyName || agency.email} ${(t('agencyDeleteConfirmWithCustomers') || "silinecek ve bu partnere bağlı müşteriler partnersiz hale getirilecektir. Bu işlem geri alınamaz.")}`
                                : (t('agencyDeleteConfirm') || "Bu partneri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingAgency}>
                            {t('cancel') || "İptal"}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleDeleteAgency}
                            disabled={isDeletingAgency}
                        >
                            {isDeletingAgency ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                t('deleteAgency') || "Partneri Sil"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
