"use client"

import { useEffect, useState } from "react"
import { auth } from "@/lib/firebase"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface TenantData {
    email: string
    role: string
    isActive: boolean
    firstName?: string
    lastName?: string
    phone?: string
    companyName?: string
}

export default function TenantProfilePage({ params }: { params: { userId: string } }) {
    const { user, role: currentRole } = useAuth()
    const { t } = useLanguage()
    const { toast } = useToast()
    const [tenant, setTenant] = useState<TenantData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    // Form states
    const [role, setRole] = useState("")
    const [isActive, setIsActive] = useState(true)
    const [newPassword, setNewPassword] = useState("")
    const [isResettingPassword, setIsResettingPassword] = useState(false)
    const canManageRoleAndAccount = currentRole === "SUPER_ADMIN"

    useEffect(() => {
        const loadTenant = async () => {
            try {
                const token = await auth.currentUser?.getIdToken()
                const response = await fetch(`/api/console/settings?chatbotId=${params.userId}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined
                })

                if (!response.ok) {
                    throw new Error("Failed to load tenant")
                }

                const data = await response.json() as TenantData
                setTenant(data)
                setRole(data.role || "TENANT_ADMIN")
                setIsActive(data.isActive !== false)
            } catch (error) {
                console.error("Error loading tenant:", error)
            } finally {
                setIsLoading(false)
            }
        }
        loadTenant()
    }, [params.userId])

    const handleSave = async () => {
        if (!canManageRoleAndAccount) {
            return
        }
        setIsSaving(true)
        try {
            const token = await user?.getIdToken()
            const response = await fetch('/api/admin/update-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    targetUserId: params.userId,
                    role,
                    isActive
                })
            })

            const data = await response.json()
            if (!response.ok) {
                throw new Error(data.error || 'Failed to update profile')
            }

            toast({
                title: t('success'),
                description: "Profile updated successfully.",
            })
        } catch (error) {
            console.error("Error updating profile:", error)
            toast({
                title: t('error'),
                description: "Failed to update profile.",
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handlePasswordReset = async () => {
        if (!canManageRoleAndAccount) {
            return
        }
        if (!newPassword || newPassword.length < 6) {
            toast({
                title: t('error'),
                description: "Password must be at least 6 characters.",
                variant: "destructive"
            })
            return
        }

        setIsResettingPassword(true)
        try {
            const token = await user?.getIdToken()
            const response = await fetch('/api/admin/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    targetUserId: params.userId,
                    newPassword
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to reset password')
            }

            toast({
                title: t('success'),
                description: "User password has been updated.",
            })
            setNewPassword("")
        } catch (error: any) {
            console.error("Reset error:", error)
            toast({
                title: t('error'),
                description: error.message || "Failed to reset password.",
                variant: "destructive"
            })
        } finally {
            setIsResettingPassword(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (!tenant) {
        return <div className="p-8">Tenant not found</div>
    }

    return (
        <div className="space-y-8 p-8 max-w-3xl">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">{t('profileSettings')}</h2>
                <p className="text-muted-foreground">
                    {canManageRoleAndAccount
                        ? t('manageUserRole')
                        : (t('viewOnly') || "Bu alan ajans kullanıcıları için salt okunurdur.")}
                </p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Account Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">{t('emailAddress')}</Label>
                            <Input id="email" value={tenant.email} disabled className="bg-muted/50" />
                            <p className="text-[0.8rem] text-muted-foreground">{t('emailCannotChange')}</p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="role">{t('userRole')}</Label>
                            <Select value={role} onValueChange={setRole} disabled={!canManageRoleAndAccount}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('selectRole')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TENANT_ADMIN">{t('tenantAdmin')}</SelectItem>
                                    <SelectItem value="SUPER_ADMIN">{t('superAdmin')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-4">
                            <div className="space-y-0.5">
                                <Label className="text-base">{t('accountStatus')}</Label>
                                <p className="text-sm text-muted-foreground">
                                    {isActive ? t('userCanLogin') : t('userSuspended')}
                                </p>
                            </div>
                            <Switch
                                checked={isActive}
                                onCheckedChange={setIsActive}
                                disabled={!canManageRoleAndAccount}
                            />
                        </div>

                        {canManageRoleAndAccount && (
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t('saveChanges')}
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Password Reset Section */}
                {canManageRoleAndAccount && (
                    <Card className="border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-900/10">
                    <CardHeader>
                        <CardTitle className="text-red-700 dark:text-red-400">{t('passwordManagement')}</CardTitle>
                        <CardDescription>{t('overridePasswordDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4">
                            <Input
                                type="text"
                                placeholder={t('newPassword')}
                                className="bg-background"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <Button
                                variant="destructive"
                                disabled={isResettingPassword}
                                onClick={handlePasswordReset}
                            >
                                {isResettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t('reset')}
                            </Button>
                        </div>
                    </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
