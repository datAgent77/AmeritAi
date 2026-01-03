"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Loader2, ShieldAlert, Calendar, Mail, Clock, CreditCard, Settings2, Shield, Save, Crown, Snowflake, StickyNote, User, Gift, Star, Rocket, Building2, CircleDollarSign, CreditCard as CardIcon, Hourglass, XCircle, BarChart3, Infinity, Receipt, CalendarClock, CalendarCheck } from "lucide-react"

interface UserInfo {
    id: string
    email: string
    createdAt: string
    role: string
    isActive: boolean
    isArchived: boolean
}

interface Subscription {
    planId: string
    billingStatus: string
    trialDays: number
    trialEndsAt: string | null
    paidSince: string | null
    messageLimitOverride: number | null
    moduleOverrides: { enabled?: string[]; disabled?: string[] } | null
    isPriority: boolean
    isFrozen: boolean
    adminNotes: string
    // Billing fields
    billingPeriod: 'monthly' | 'yearly'
    nextInvoiceDate: string | null
    nextPaymentDueDate: string | null
    lastInvoiceDate: string | null
    lastPaymentDate: string | null
    invoiceAmount: number | null
    currency: string
    reminderDaysBefore: number
}

export default function CustomerAdminPage() {
    const params = useParams()
    const userId = params.userId as string
    const { user, role } = useAuth()
    const { t } = useLanguage()
    const { toast } = useToast()

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
    const [subscription, setSubscription] = useState<Subscription>({
        planId: 'trial',
        billingStatus: 'free',
        trialDays: 14,
        trialEndsAt: null,
        paidSince: null,
        messageLimitOverride: null,
        moduleOverrides: null,
        isPriority: false,
        isFrozen: false,
        adminNotes: '',
        // Billing fields
        billingPeriod: 'monthly',
        nextInvoiceDate: null,
        nextPaymentDueDate: null,
        lastInvoiceDate: null,
        lastPaymentDate: null,
        invoiceAmount: null,
        currency: 'TRY',
        reminderDaysBefore: 3
    })

    useEffect(() => {
        const fetchData = async () => {
            if (!user || !userId || role !== 'SUPER_ADMIN') return

            setIsLoading(true)
            try {
                const token = await user.getIdToken()
                const response = await fetch(`/api/admin/customer-admin?userId=${userId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })

                if (!response.ok) {
                    throw new Error('Failed to fetch customer data')
                }

                const data = await response.json()
                setUserInfo(data.user)
                setSubscription(data.subscription)
            } catch (error: any) {
                console.error('Error fetching customer data:', error)
                toast({
                    title: t('error'),
                    description: error.message,
                    variant: 'destructive'
                })
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [user, userId, role, t, toast])

    // Only SUPER_ADMIN can access this page
    if (role !== 'SUPER_ADMIN') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="bg-destructive/10 p-4 rounded-full">
                    <ShieldAlert className="h-12 w-12 text-destructive" />
                </div>
                <h2 className="text-xl font-semibold">{t('error')}</h2>
                <p className="text-muted-foreground">{t('accessDenied') || 'Bu sayfaya erişim izniniz yok.'}</p>
            </div>
        )
    }

    const handleSave = async () => {
        if (!user || !userId) return

        setIsSaving(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch('/api/admin/customer-admin', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId,
                    subscription
                })
            })

            if (!response.ok) {
                throw new Error('Failed to save settings')
            }

            toast({
                title: t('success'),
                description: t('settingsSaved')
            })
        } catch (error: any) {
            console.error('Error saving settings:', error)
            toast({
                title: t('error'),
                description: error.message,
                variant: 'destructive'
            })
        } finally {
            setIsSaving(false)
        }
    }

    const calculateUsageDays = (createdAt: string) => {
        return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Modern Header */}
            <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-xl">
                    <Shield className="w-8 h-8 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('customerAdmin')}</h1>
                    <p className="text-muted-foreground">{t('customerAdminDesc')}</p>
                </div>
            </div>

            {/* General Info Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        {t('generalInfo')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                            <Mail className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">{t('email')}</p>
                                <p className="font-semibold text-sm">{userInfo?.email}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                            <Calendar className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">{t('createdAt')}</p>
                                <p className="font-semibold text-sm">
                                    {userInfo?.createdAt ? new Date(userInfo.createdAt).toLocaleDateString() : '-'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                            <Clock className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">{t('usageDays')}</p>
                                <p className="font-semibold text-sm">
                                    {userInfo?.createdAt ? `${calculateUsageDays(userInfo.createdAt)} ${t('days')}` : '-'}
                                </p>
                            </div>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground font-medium mb-2">{t('status')}</p>
                            <div className="flex gap-2">
                                <Badge variant={userInfo?.isActive ? 'outline' : 'destructive'}
                                    className={userInfo?.isActive ? "bg-green-50 text-green-700 border-green-200" : ""}>
                                    {userInfo?.isActive ? t('active') : t('inactive')}
                                </Badge>
                                {userInfo?.isArchived && (
                                    <Badge variant="secondary">{t('archived')}</Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Plan & Billing Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        {t('planAndBilling')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">{t('planBadge')}</Label>
                            <Select
                                value={subscription.planId}
                                onValueChange={(value) => setSubscription({ ...subscription, planId: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="trial">
                                        <span className="flex items-center gap-2"><Gift className="w-4 h-4" /> Trial</span>
                                    </SelectItem>
                                    <SelectItem value="starter">
                                        <span className="flex items-center gap-2"><Star className="w-4 h-4" /> Starter</span>
                                    </SelectItem>
                                    <SelectItem value="pro">
                                        <span className="flex items-center gap-2"><Rocket className="w-4 h-4" /> Pro</span>
                                    </SelectItem>
                                    <SelectItem value="enterprise">
                                        <span className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Enterprise</span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">{t('billingStatus')}</Label>
                            <Select
                                value={subscription.billingStatus}
                                onValueChange={(value) => setSubscription({ ...subscription, billingStatus: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="free">
                                        <span className="flex items-center gap-2"><CircleDollarSign className="w-4 h-4" /> {t('billingFree')}</span>
                                    </SelectItem>
                                    <SelectItem value="paid">
                                        <span className="flex items-center gap-2"><CardIcon className="w-4 h-4" /> {t('billingPaid')}</span>
                                    </SelectItem>
                                    <SelectItem value="pending">
                                        <span className="flex items-center gap-2"><Hourglass className="w-4 h-4" /> {t('billingPending')}</span>
                                    </SelectItem>
                                    <SelectItem value="cancelled">
                                        <span className="flex items-center gap-2"><XCircle className="w-4 h-4" /> {t('billingCancelled')}</span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">{t('trialDays')}</Label>
                            <Input
                                type="number"
                                value={subscription.trialDays}
                                onChange={(e) => setSubscription({ ...subscription, trialDays: parseInt(e.target.value) || 0 })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">{t('trialEndsAt')}</Label>
                            <Input
                                type="date"
                                value={subscription.trialEndsAt ? subscription.trialEndsAt.split('T')[0] : ''}
                                onChange={(e) => setSubscription({ ...subscription, trialEndsAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Billing Information Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Receipt className="w-5 h-5" />
                        {t('billingInfo')}
                    </CardTitle>
                    <CardDescription>{t('billingInfoDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">{t('billingPeriodLabel')}</Label>
                            <Select
                                value={subscription.billingPeriod}
                                onValueChange={(value: 'monthly' | 'yearly') => setSubscription({ ...subscription, billingPeriod: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="monthly">
                                        <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {t('billingMonthly')}</span>
                                    </SelectItem>
                                    <SelectItem value="yearly">
                                        <span className="flex items-center gap-2"><CalendarCheck className="w-4 h-4" /> {t('billingYearly')}</span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">{t('invoiceAmount')}</Label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={subscription.invoiceAmount || ''}
                                onChange={(e) => setSubscription({ ...subscription, invoiceAmount: e.target.value ? parseFloat(e.target.value) : null })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">{t('currency')}</Label>
                            <Select
                                value={subscription.currency}
                                onValueChange={(value) => setSubscription({ ...subscription, currency: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TRY">TRY (₺)</SelectItem>
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                    <SelectItem value="EUR">EUR (€)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-2">
                                <CalendarClock className="w-4 h-4" />
                                {t('nextInvoiceDate')}
                            </Label>
                            <Input
                                type="date"
                                value={subscription.nextInvoiceDate ? subscription.nextInvoiceDate.split('T')[0] : ''}
                                onChange={(e) => setSubscription({ ...subscription, nextInvoiceDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-2">
                                <CalendarCheck className="w-4 h-4" />
                                {t('nextPaymentDueDate')}
                            </Label>
                            <Input
                                type="date"
                                value={subscription.nextPaymentDueDate ? subscription.nextPaymentDueDate.split('T')[0] : ''}
                                onChange={(e) => setSubscription({ ...subscription, nextPaymentDueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                            />
                        </div>
                    </div>

                    <div className="rounded-lg border p-4 bg-muted/30">
                        <Label className="text-sm font-medium">{t('reminderDaysBefore')}</Label>
                        <p className="text-xs text-muted-foreground mb-3">{t('reminderDaysBeforeDesc')}</p>
                        <Input
                            type="number"
                            min={0}
                            max={30}
                            className="w-24"
                            value={subscription.reminderDaysBefore}
                            onChange={(e) => setSubscription({ ...subscription, reminderDaysBefore: parseInt(e.target.value) || 0 })}
                        />
                    </div>

                    {/* Read-only last dates */}
                    {(subscription.lastInvoiceDate || subscription.lastPaymentDate) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                            {subscription.lastInvoiceDate && (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                    <Receipt className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">{t('lastInvoiceDate')}</p>
                                        <p className="font-semibold text-sm">
                                            {new Date(subscription.lastInvoiceDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            )}
                            {subscription.lastPaymentDate && (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50">
                                    <CircleDollarSign className="h-5 w-5 text-green-600" />
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">{t('lastPaymentDate')}</p>
                                        <p className="font-semibold text-sm text-green-700">
                                            {new Date(subscription.lastPaymentDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Overrides Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings2 className="w-5 h-5" />
                        {t('overrides')}
                    </CardTitle>
                    <CardDescription>{t('overridesDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">{t('messageLimitOverride')}</Label>
                        <Select
                            value={subscription.messageLimitOverride === null ? 'default' : subscription.messageLimitOverride === -1 ? 'unlimited' : 'custom'}
                            onValueChange={(value) => {
                                if (value === 'default') {
                                    setSubscription({ ...subscription, messageLimitOverride: null })
                                } else if (value === 'unlimited') {
                                    setSubscription({ ...subscription, messageLimitOverride: -1 })
                                }
                            }}
                        >
                            <SelectTrigger className="w-[250px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="default"><span className="flex items-center gap-2"><BarChart3 className="w-4 h-4" /> {t('useDefault')}</span></SelectItem>
                                <SelectItem value="unlimited"><span className="flex items-center gap-2"><Infinity className="w-4 h-4" /> {t('unlimited')}</span></SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Admin Controls Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        {t('adminControls')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="bg-amber-100 p-2 rounded-lg">
                                <Crown className="h-5 w-5 text-amber-600" />
                            </div>
                            <div className="space-y-0.5">
                                <Label className="text-base font-medium">{t('prioritySupport')}</Label>
                                <p className="text-sm text-muted-foreground">{t('prioritySupportDesc')}</p>
                            </div>
                        </div>
                        <Switch
                            checked={subscription.isPriority}
                            onCheckedChange={(checked) => setSubscription({ ...subscription, isPriority: checked })}
                        />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-4 hover:bg-destructive/5 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="bg-red-100 p-2 rounded-lg">
                                <Snowflake className="h-5 w-5 text-red-600" />
                            </div>
                            <div className="space-y-0.5">
                                <Label className="text-base font-medium text-destructive">{t('freezeAccount')}</Label>
                                <p className="text-sm text-muted-foreground">{t('freezeAccountDesc')}</p>
                            </div>
                        </div>
                        <Switch
                            checked={subscription.isFrozen}
                            onCheckedChange={(checked) => setSubscription({ ...subscription, isFrozen: checked })}
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <StickyNote className="h-4 w-4 text-muted-foreground" />
                            <Label className="text-sm font-medium">{t('adminNotes')}</Label>
                        </div>
                        <Textarea
                            placeholder={t('adminNotesPlaceholder')}
                            value={subscription.adminNotes}
                            onChange={(e) => setSubscription({ ...subscription, adminNotes: e.target.value })}
                            rows={4}
                            className="resize-none"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving} size="lg">
                    {isSaving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="mr-2 h-4 w-4" />
                    )}
                    {t('saveSettings')}
                </Button>
            </div>
        </div>
    )
}

