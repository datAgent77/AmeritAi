"use client"

import { useEffect, useState, useCallback } from "react"
import { collection, getDocs, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { INDUSTRY_CONFIG } from "@/lib/industry-config"
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
import { Loader2, Plus, Archive, ArchiveRestore, ShieldCheck, Search } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"

interface UserData {
    id: string
    email: string
    role: string
    isActive: boolean
    isArchived?: boolean
    archivedAt?: string
    createdAt: string
}

export function TenantManagement() {
    const [users, setUsers] = useState<UserData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const { toast } = useToast()
    const { t } = useLanguage()
    const { user, role } = useAuth()

    // Add Tenant State
    const [isAddTenantOpen, setIsAddTenantOpen] = useState(false)
    const [newTenantEmail, setNewTenantEmail] = useState("")
    const [newTenantPassword, setNewTenantPassword] = useState("")
    const [newTenantFirstName, setNewTenantFirstName] = useState("")
    const [newTenantLastName, setNewTenantLastName] = useState("")
    const [newTenantCompanyName, setNewTenantCompanyName] = useState("")
    const [newTenantWebsite, setNewTenantWebsite] = useState("")
    const [newTenantIndustry, setNewTenantIndustry] = useState<string>("ecommerce")
    const [isCreating, setIsCreating] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")

    const [error, setError] = useState<string | null>(null)
    const [createError, setCreateError] = useState<string | null>(null)

    // Archive Tenant State
    const [showArchived, setShowArchived] = useState(false)
    const [isArchiving, setIsArchiving] = useState<string | null>(null)

    const fetchUsers = useCallback(async () => {
        if (!user) return

        setIsLoading(true)
        setError(null)
        try {
            const token = await user.getIdToken()
            const url = showArchived
                ? '/api/admin/users?includeArchived=true'
                : '/api/admin/users'

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to fetch users')
            }

            const data = await response.json()
            setUsers(data.users)
            setIsLoading(false)
        } catch (err: any) {
            console.error("Error fetching users:", err)
            setError(t('failedToLoadUsers'))
            setIsLoading(false)
        }
    }, [t, user, showArchived])

    useEffect(() => {
        // Wait for user to be authenticated before fetching
        if (!user) {
            setIsLoading(true)
            return
        }

        fetchUsers()
        const interval = setInterval(fetchUsers, 60000) // 60 seconds polling

        return () => clearInterval(interval)
    }, [fetchUsers, user])

    const toggleStatus = async (userId: string, currentStatus: boolean) => {
        try {
            await updateDoc(doc(db, "users", userId), {
                isActive: !currentStatus
            })

            const updatedUsers = users.map(u =>
                u.id === userId ? { ...u, isActive: !currentStatus } : u
            )
            setUsers(updatedUsers)

            toast({
                title: t('success'),
                description: t('userStatusUpdated'),
            })
        } catch (error) {
            console.error("Error updating user:", error)
            toast({
                title: t('error'),
                description: t('failedToUpdateUserStatus'),
                variant: "destructive",
            })
        }
    }

    const handleCreateTenant = async () => {
        setCreateError(null)
        if (!newTenantEmail || !newTenantPassword || !newTenantFirstName || !newTenantLastName || !newTenantCompanyName) {
            const msg = "Please fill in all required fields"
            setCreateError(msg)
            toast({
                title: t('error'),
                description: msg,
                variant: "destructive",
            })
            return
        }

        setIsCreating(true)
        try {
            // Get auth token from Firebase
            const token = await user?.getIdToken()

            const response = await fetch("/api/admin/create-tenant", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: newTenantEmail,
                    password: newTenantPassword,
                    firstName: newTenantFirstName,
                    lastName: newTenantLastName,
                    companyName: newTenantCompanyName,
                    companyWebsite: newTenantWebsite,
                    callerUid: user?.uid,
                    callerRole: role,
                    industry: newTenantIndustry
                })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || "Failed to create tenant")
            }

            toast({
                title: t('success'),
                description: t('tenantCreated'),
            })
            setIsAddTenantOpen(false)
            setNewTenantEmail("")
            setNewTenantPassword("")
            setNewTenantFirstName("")
            setNewTenantLastName("")
            setNewTenantCompanyName("")
            setNewTenantWebsite("")
            setNewTenantIndustry("ecommerce")
            setCreateError(null)
            // fetchUsers() - No need to call this manually as onSnapshot will pick up the change
        } catch (error: any) {
            console.error("Error creating tenant:", error)
            setCreateError(error.message)
            toast({
                title: t('error'),
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setIsCreating(false)
        }
    }

    const handleArchiveTenant = async (userId: string) => {
        const confirmed = window.confirm('Bu kiracıyı arşivlemek istediğinizden emin misiniz? Hesabı deaktive edilecek ancak veriler korunacak.')
        if (!confirmed) return

        setIsArchiving(userId)
        try {
            const token = await user?.getIdToken()

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
            } else {
                const updatedUsers = users.map(u =>
                    u.id === userId ? { ...u, isArchived: true, archivedAt: new Date().toISOString() } : u
                )
                setUsers(updatedUsers)
            }

            toast({
                title: t('success'),
                description: "Kiracı başarıyla arşivlendi",
            })
        } catch (error: any) {
            console.error("Error archiving tenant:", error)
            toast({
                title: t('error'),
                description: error.message || "Failed to archive tenant",
                variant: "destructive",
            })
        } finally {
            setIsArchiving(null)
        }
    }

    const handleRestoreTenant = async (userId: string) => {
        setIsArchiving(userId)
        try {
            const token = await user?.getIdToken()

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
                title: t('success'),
                description: "Kiracı başarıyla geri yüklendi",
            })
        } catch (error: any) {
            console.error("Error restoring tenant:", error)
            toast({
                title: t('error'),
                description: error.message || "Failed to restore tenant",
                variant: "destructive",
            })
        } finally {
            setIsArchiving(null)
        }
    }

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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t('tenants')}</h2>
                    <p className="text-muted-foreground">{t('manageTenantsDescription')}</p>
                </div>
                <Button onClick={() => setIsAddTenantOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('addTenant')}
                </Button>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{t('allTenants')}</CardTitle>
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
                                placeholder={t('searchTenants')}
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('email')}</TableHead>
                                    <TableHead>{t('role')}</TableHead>
                                    <TableHead>{t('status')}</TableHead>
                                    <TableHead>{t('createdAt')}</TableHead>
                                    <TableHead>{t('usageDays')}</TableHead>
                                    <TableHead className="text-right">{t('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map((user) => (
                                    <TableRow key={user.id} className={user.isArchived ? "bg-gray-50 opacity-70" : ""}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                                                    {user.email.substring(0, 2).toUpperCase()}
                                                </div>
                                                {user.email}
                                                {user.isArchived && (
                                                    <Badge variant="secondary" className="ml-2 bg-gray-200 text-gray-600">
                                                        {t('archive')}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={user.role === 'SUPER_ADMIN' ? 'default' : 'secondary'}>
                                                {user.role === 'SUPER_ADMIN' ? <ShieldCheck className="w-3 h-3 mr-1" /> : null}
                                                {user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={user.isActive ? 'outline' : 'destructive'} className={user.isActive ? "bg-green-50 text-green-700 border-green-200" : ""}>
                                                {user.isActive ? t('active') : t('inactive')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm font-medium">
                                                {Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))} {t('days')}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {user.role !== 'SUPER_ADMIN' && (
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => window.location.href = `/admin/tenant/${user.id}`}
                                                    >
                                                        {t('manage')}
                                                    </Button>
                                                    <Button
                                                        variant={user.isActive ? "destructive" : "default"}
                                                        size="sm"
                                                        onClick={() => toggleStatus(user.id, user.isActive)}
                                                        disabled={user.isArchived}
                                                    >
                                                        {user.isActive ? t('deactivate') : t('activate')}
                                                    </Button>
                                                    {user.isArchived ? (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-300"
                                                            onClick={() => handleRestoreTenant(user.id)}
                                                            disabled={isArchiving === user.id}
                                                        >
                                                            {isArchiving === user.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <ArchiveRestore className="h-4 w-4 mr-1" />
                                                                    {t('restore')}
                                                                </>
                                                            )}
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                                                            onClick={() => handleArchiveTenant(user.id)}
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
                                {filteredUsers.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            {t('noResults')}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isAddTenantOpen} onOpenChange={setIsAddTenantOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('addNewTenant')}</DialogTitle>
                        <DialogDescription>
                            {t('addNewTenantDescription')}
                        </DialogDescription>
                    </DialogHeader>

                    {createError && (
                        <div className="bg-red-500/15 border border-red-500/50 rounded-md p-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2 mt-4">
                            <div className="w-1 h-1 rounded-full bg-red-500" />
                            {createError}
                        </div>
                    )}

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input
                                    id="firstName"
                                    value={newTenantFirstName}
                                    onChange={(e) => setNewTenantFirstName(e.target.value)}
                                    placeholder="John"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input
                                    id="lastName"
                                    value={newTenantLastName}
                                    onChange={(e) => setNewTenantLastName(e.target.value)}
                                    placeholder="Doe"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="companyName">Company Name</Label>
                            <Input
                                id="companyName"
                                value={newTenantCompanyName}
                                onChange={(e) => setNewTenantCompanyName(e.target.value)}
                                placeholder="Acme Inc."
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="website">Website</Label>
                            <Input
                                id="website"
                                value={newTenantWebsite}
                                onChange={(e) => setNewTenantWebsite(e.target.value)}
                                placeholder="https://example.com"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">{t('email')}</Label>
                            <Input
                                id="email"
                                value={newTenantEmail}
                                onChange={(e) => setNewTenantEmail(e.target.value)}
                                placeholder="tenant@example.com"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">{t('password')}</Label>
                            <Input
                                id="password"
                                type="password"
                                value={newTenantPassword}
                                onChange={(e) => setNewTenantPassword(e.target.value)}
                                placeholder="******"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="industry">Industry</Label>
                            <Select value={newTenantIndustry} onValueChange={setNewTenantIndustry}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select industry" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(INDUSTRY_CONFIG).map(([key, config]) => (
                                        <SelectItem key={key} value={key}>
                                            {config.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddTenantOpen(false)}>
                            {t('cancel')}
                        </Button>
                        <Button onClick={handleCreateTenant} disabled={isCreating}>
                            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('createTenant')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    )
}
