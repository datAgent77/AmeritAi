"use client"

import { useEffect, useState, useCallback } from "react"
import { auth } from "@/lib/firebase"
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
import { Loader2, Plus, Archive, ArchiveRestore, Users, Activity, MessageSquare, ShieldCheck, Search } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { useLanguage } from "@/context/LanguageContext"

interface UserData {
    id: string
    email: string
    role: string
    isActive: boolean
    isArchived?: boolean
    archivedAt?: string
    createdAt: string
}

export default function AdminPage() {
    const { t, language } = useLanguage()
    const [users, setUsers] = useState<UserData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const { toast } = useToast()

    // Dashboard Stats
    const [stats, setStats] = useState({
        totalTenants: 0,
        activeTenants: 0,
        totalChatbots: 0,
        totalChatSessions: 0
    })

    // Announcement State
    const [isAnnouncementActive, setIsAnnouncementActive] = useState(false)
    const [announcementMessage, setAnnouncementMessage] = useState("")
    const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false)
    const [recentActivity, setRecentActivity] = useState<any[]>([])

    // Archive Tenant State (moved before useCallback that uses it)
    const [showArchived, setShowArchived] = useState(false)
    const [isArchiving, setIsArchiving] = useState<string | null>(null)
    const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null)  // For AlertDialog

    const fetchDashboardData = useCallback(async () => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;

            const token = await currentUser.getIdToken();
            const url = showArchived
                ? '/api/admin/dashboard-stats?includeArchived=true'
                : '/api/admin/dashboard-stats';
            const response = await fetch(url, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to fetch dashboard data");
            }

            const data = await response.json();

            setUsers(data.users || []);
            setStats(data.stats || {
                totalTenants: 0,
                activeTenants: 0,
                totalChatbots: 0,
                totalChatSessions: 0
            });
            setRecentActivity(data.recentActivity || []);

            // Use announcement data from API (no client-side Firestore call needed)
            if (data.announcement) {
                setIsAnnouncementActive(data.announcement.isActive || false)
                setAnnouncementMessage(data.announcement.message || "")
            }

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
    }, [toast, showArchived])

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
                    callerUid: auth.currentUser?.uid,
                    callerRole: users.find(u => u.id === auth.currentUser?.uid)?.role || 'SUPER_ADMIN'
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

    const handleArchiveTenant = async (userId: string) => {
        // Called when user confirms in AlertDialog

        setIsArchiving(userId)
        try {
            const token = await auth.currentUser?.getIdToken()
            const response = await fetch("/api/admin/archive-tenant", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ userId })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || "Failed to archive tenant")
            }

            // Remove from visible list (or mark as archived if showArchived is true)
            if (!showArchived) {
                const updatedUsers = users.filter(u => u.id !== userId)
                setUsers(updatedUsers)
                // Update stats
                const tenants = updatedUsers.filter(u => u.role === 'TENANT_ADMIN')
                const active = tenants.filter(u => u.isActive).length
                setStats(prev => ({ ...prev, totalTenants: tenants.length, activeTenants: active }))
            } else {
                const updatedUsers = users.map(u =>
                    u.id === userId ? { ...u, isArchived: true, archivedAt: new Date().toISOString() } : u
                )
                setUsers(updatedUsers)
            }

            toast({
                title: "Başarılı",
                description: "Kiracı başarıyla arşivlendi.",
            })
        } catch (error: any) {
            console.error("Error archiving tenant:", error)
            toast({
                title: "Hata",
                description: error.message || "Kiracı arşivlenemedi.",
                variant: "destructive",
            })
        } finally {
            setIsArchiving(null)
        }
    }

    const handleRestoreTenant = async (userId: string) => {
        setIsArchiving(userId)
        try {
            const token = await auth.currentUser?.getIdToken()
            const response = await fetch("/api/admin/restore-tenant", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ userId })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || "Failed to restore tenant")
            }

            // Update local state
            const updatedUsers = users.map(u =>
                u.id === userId ? { ...u, isArchived: false, archivedAt: undefined } : u
            )
            setUsers(updatedUsers)

            toast({
                title: "Başarılı",
                description: "Kiracı başarıyla geri yüklendi.",
            })
        } catch (error: any) {
            console.error("Error restoring tenant:", error)
            toast({
                title: "Hata",
                description: error.message || "Kiracı geri yüklenemedi.",
                variant: "destructive",
            })
        } finally {
            setIsArchiving(null)
        }
    }

    const saveAnnouncement = async () => {
        setIsSavingAnnouncement(true)
        try {
            const token = await auth.currentUser?.getIdToken();
            const response = await fetch("/api/admin/save-announcement", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    isActive: isAnnouncementActive,
                    message: announcementMessage
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to save announcement");
            }

            toast({
                title: "Başarılı",
                description: "Duyuru başarıyla güncellendi.",
            })
        } catch (error: any) {
            console.error("Error saving announcement:", error)
            toast({
                title: "Hata",
                description: error.message || "Duyuru güncellenemedi.",
                variant: "destructive",
            })
        } finally {
            setIsSavingAnnouncement(false)
        }
    }

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                fetchDashboardData();
            }
        });

        return () => unsubscribe();
    }, [fetchDashboardData])

    // Refetch when showArchived changes
    useEffect(() => {
        if (auth.currentUser) {
            fetchDashboardData();
        }
    }, [showArchived, fetchDashboardData])

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
                    </svg>
                    Platform
                </span>
                <span>/</span>
                <span className="text-foreground font-medium">{t('tenants') || "Müşteriler"}</span>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t('tenants') || "Müşteriler"}</h2>
                    <p className="text-muted-foreground">{t('manageTenantsDescription') || "Sistem kullanıcılarını ve erişimlerini yönetin."}</p>
                </div>
                <Button onClick={() => setIsAddTenantOpen(true)} className="shadow-sm">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('addTenant') || "+ Müşteri Ekle"}
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('totalTenants') || "Toplam Müşteri"}</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.totalTenants}</div>
                        <p className="text-xs text-muted-foreground">{t('registeredTenantAccounts') || "Kayıtlı müşteri hesapları"}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('activeTenants') || "Aktif Müşteriler"}</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">{stats.activeTenants}</div>
                        <p className="text-xs text-muted-foreground">{t('currentlyActiveAccounts') || "Şu anda aktif hesaplar"}</p>
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
                        <CardTitle className="text-sm font-medium">Toplam Sohbet Oturumu</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{(stats as any).totalChatSessions || 0}</div>
                        <p className="text-xs text-muted-foreground">Toplam Sohbet</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tenant List */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showArchived}
                                onChange={(e) => setShowArchived(e.target.checked)}
                                className="rounded border-gray-300"
                            />
                            <span className="text-muted-foreground">Arşivlenmiş kullanıcıları göster</span>
                        </label>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('searchTenants') || "Müşteri ara..."}
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-50/50">
                                <TableRow>
                                    <TableHead>{t('email')}</TableHead>
                                    <TableHead>{t('role')}</TableHead>
                                    <TableHead>{t('status')}</TableHead>
                                    <TableHead>{t('createdAt')}</TableHead>
                                    <TableHead className="text-right">{t('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map((user) => (
                                    <TableRow key={user.id} className={`transition-colors ${user.isArchived ? "bg-gray-50 opacity-70" : "hover:bg-gray-50/50"}`}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-600">
                                                    {user.email.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span>{user.email}</span>
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
                                            <Badge variant={user.role === 'SUPER_ADMIN' ? 'default' : 'secondary'} className="rounded-full px-3">
                                                {user.role === 'SUPER_ADMIN' ? <ShieldCheck className="w-3 h-3 mr-1" /> : null}
                                                {user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={user.isActive ? 'outline' : 'destructive'}
                                                className={`rounded-full px-3 ${user.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}
                                            >
                                                {user.isActive ? t('active') : t('inactive')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {user.createdAt ? ((typeof user.createdAt === 'string') ? new Date(user.createdAt).toLocaleDateString() : (user.createdAt as any).toDate().toLocaleDateString()) : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {user.role !== 'SUPER_ADMIN' && (
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                                        onClick={() => window.location.href = `/admin/tenant/${user.id}`}
                                                    >
                                                        {t('manage')}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className={user.isActive ? "text-orange-500 hover:bg-orange-50" : "text-green-600 hover:bg-green-50"}
                                                        onClick={() => toggleStatus(user.id, user.isActive)}
                                                        disabled={user.isArchived}
                                                    >
                                                        {user.isActive ? t('deactivate') : t('activate')}
                                                    </Button>
                                                    {user.isArchived ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                            onClick={() => handleRestoreTenant(user.id)}
                                                            disabled={isArchiving === user.id}
                                                        >
                                                            {isArchiving === user.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <ArchiveRestore className="h-4 w-4 mr-1" />
                                                                    Geri Yükle
                                                                </>
                                                            )}
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                                                            onClick={() => setArchiveConfirmId(user.id)}
                                                            disabled={isArchiving === user.id}
                                                        >
                                                            {isArchiving === user.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Archive className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    )}
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

            {/* Add Tenant Dialog (Inherited from previous version) */}
            <Dialog open={isAddTenantOpen} onOpenChange={setIsAddTenantOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('addNewTenant') || "Yeni Müşteri Ekle"}</DialogTitle>
                        <DialogDescription>
                            Sistem için yeni bir kiracı hesabı oluşturun. Tüm detaylar otomatik olarak atanacaktır.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
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
                                        <select
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
                                        </select>
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
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddTenantOpen(false)}>{t('cancel')}</Button>
                        <Button onClick={handleCreateTenant} disabled={isCreating} className="bg-indigo-600 hover:bg-indigo-700">
                            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('createTenant')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Archive Confirmation AlertDialog */}
            <AlertDialog open={!!archiveConfirmId} onOpenChange={(open) => !open && setArchiveConfirmId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Kiracıyı Arşivle</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu kiracıyı arşivlemek istediğinizden emin misiniz? Hesabı deaktive edilecek ancak veriler korunacak.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-orange-500 hover:bg-orange-600"
                            onClick={() => {
                                if (archiveConfirmId) {
                                    handleArchiveTenant(archiveConfirmId)
                                    setArchiveConfirmId(null)
                                }
                            }}
                        >
                            Arşivle
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    )
}
