"use client"

import { useEffect, useState } from "react"
import { auth } from "@/lib/firebase"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CreditCard, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/context/LanguageContext"
import Link from "next/link"

interface SubscriptionData {
    userId: string
    email: string
    subscription?: {
        planId?: string
        billingStatus?: string
        billingPeriod?: 'monthly' | 'yearly'
        nextInvoiceDate?: string
        nextPaymentDueDate?: string
        invoiceAmount?: number
        currency?: string
        trialDays?: number
        trialEndsAt?: string
        isPriority?: boolean
        isFrozen?: boolean
    }
}

export default function SubscriptionsPage() {
    const { t, language } = useLanguage()
    const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const { toast } = useToast()

    useEffect(() => {
        const fetchSubscriptions = async () => {
            try {
                const currentUser = auth.currentUser
                if (!currentUser) return

                const token = await currentUser.getIdToken()
                const response = await fetch('/api/admin/dashboard-stats', {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                })

                if (!response.ok) {
                    throw new Error("Failed to fetch subscriptions")
                }

                const data = await response.json()
                const users = data.users || []
                
                // Map users to subscription data
                const subscriptionData: SubscriptionData[] = users.map((user: any) => ({
                    userId: user.id,
                    email: user.email,
                    subscription: user.subscription || {}
                }))

                setSubscriptions(subscriptionData)
            } catch (error) {
                console.error("Error fetching subscriptions:", error)
                toast({
                    title: "Error",
                    description: "Failed to load subscriptions",
                    variant: "destructive"
                })
            } finally {
                setIsLoading(false)
            }
        }

        fetchSubscriptions()
    }, [toast])

    const filteredSubscriptions = subscriptions.filter(sub =>
        sub.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const getStatusBadge = (subscription?: SubscriptionData['subscription']) => {
        if (!subscription) {
            return <Badge variant="outline">{t('free') || 'Ücretsiz'}</Badge>
        }

        const status = subscription.billingStatus || 'free'
        const variant = status === 'active' ? 'default' : status === 'trial' ? 'secondary' : 'outline'
        
        // Translate status values
        const statusTranslations: Record<string, string> = {
            'free': t('free') || 'Ücretsiz',
            'paid': t('paid') || 'Ücretli',
            'active': t('paid') || 'Ücretli',
            'trial': t('trial') || 'Deneme',
            'cancelled': t('billingCancelled') || 'İptal Edildi',
            'pending': t('billingPending') || 'Beklemede'
        }
        
        return <Badge variant={variant}>{statusTranslations[status] || status}</Badge>
    }
    
    const getPlanName = (planId?: string) => {
        if (!planId) return '-'
        
        const planTranslations: Record<string, string> = {
            'free': t('free') || 'Ücretsiz',
            'pro': t('pro') || 'Pro',
            'trial': t('trial') || 'Deneme'
        }
        
        return planTranslations[planId.toLowerCase()] || planId
    }

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-'
        return new Date(dateString).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US')
    }

    const formatCurrency = (amount?: number, currency?: string) => {
        if (!amount) return '-'
        const currencyCode = currency || 'USD'
        return new Intl.NumberFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
            style: 'currency',
            currency: currencyCode
        }).format(amount)
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
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t('customerAdmin') || "Abonelik yönetimi"}</h2>
                    <p className="text-muted-foreground">{t('subscriptionDescription') || "Tüm müşterilerin abonelik durumlarını görüntüleyin ve yönetin."}</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                    placeholder={t('search') || "Ara..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Subscriptions Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        {t('subscriptions') || "Abonelikler"}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('email') || "E-posta"}</TableHead>
                                <TableHead>{t('plan') || "Plan"}</TableHead>
                                <TableHead>{t('status') || "Durum"}</TableHead>
                                <TableHead>{t('billingPeriod') || "Faturalama Dönemi"}</TableHead>
                                <TableHead>{t('nextInvoice') || "Sonraki Fatura"}</TableHead>
                                <TableHead>{t('amount') || "Tutar"}</TableHead>
                                <TableHead>{t('actions') || "İşlemler"}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSubscriptions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                        {searchQuery ? t('noResults') || "Sonuç bulunamadı" : t('noSubscriptions') || "Abonelik bulunamadı"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredSubscriptions.map((sub) => (
                                    <TableRow key={sub.userId}>
                                        <TableCell className="font-medium">{sub.email}</TableCell>
                                        <TableCell>{getPlanName(sub.subscription?.planId)}</TableCell>
                                        <TableCell>{getStatusBadge(sub.subscription)}</TableCell>
                                        <TableCell>
                                            {sub.subscription?.billingPeriod 
                                                ? (sub.subscription.billingPeriod === 'monthly' 
                                                    ? (t('monthly') || 'Aylık')
                                                    : (t('yearly') || 'Yıllık'))
                                                : '-'}
                                        </TableCell>
                                        <TableCell>{formatDate(sub.subscription?.nextInvoiceDate)}</TableCell>
                                        <TableCell>{formatCurrency(sub.subscription?.invoiceAmount, sub.subscription?.currency)}</TableCell>
                                        <TableCell>
                                            <Link
                                                href={`/admin/tenant/${sub.userId}/settings/customer-admin`}
                                                className="text-primary hover:underline text-sm"
                                            >
                                                {t('manage') || "Yönet"}
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
