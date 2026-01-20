"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { doc, getDoc, updateDoc, collection, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase" // Client SDK
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
    CreditCard, 
    Calendar, 
    Shield, 
    User, 
    Clock, 
    CheckCircle2, 
    AlertTriangle,
    Mail,
    Hash,
    MoreHorizontal,
    Bot,
    Zap,
    History,
    FileText,
    ArrowUpRight,
    AlertCircle,
    Check
} from "lucide-react"
import { getPlanConfig } from "@/lib/pricing-config"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

// Feature flag to toggle billing UI elements
const SHOW_BILLING = true

// Types
interface UserInfo {
    email: string
    createdAt: any
    lastLoginAt: any
    displayName?: string
    photoURL?: string
}

interface Subscription {
    planId: string
    status: 'active' | 'trial' | 'past_due' | 'canceled' | 'unpaid'
    trialEndsAt: string | null
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
    billingStatus: 'free' | 'paid' | 'pending' | 'cancelled'
    trialDays: number
    // Admin Overrides
    messageLimitOverride?: number
    adminNotes?: string
    isFrozen?: boolean
    prioritySupport?: boolean
}

interface BillingInfo {
    billingPeriod: 'monthly' | 'yearly'
    amount: number
    currency: string
    nextBillingDate: string | null
    lastPaymentDate: string | null
    paymentMethod?: string
    billingAddress?: string
    taxId?: string
}

export default function CustomerAdminPage() {
    const { t, language } = useLanguage()
    const { user: currentUser, role: currentRole } = useAuth()
    const { toast } = useToast()
    const params = useParams()
    const userId = params.userId as string

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
    const [subscription, setSubscription] = useState<Subscription>({
        planId: 'starter',
        status: 'trial',
        trialEndsAt: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        billingStatus: 'free',
        trialDays: 14,
        isFrozen: false,
        prioritySupport: false
    })
    const [billingInfo, setBillingInfo] = useState<BillingInfo>({
        billingPeriod: 'monthly',
        amount: 0,
        currency: 'TRY',
        nextBillingDate: null,
        lastPaymentDate: null
    })

    const [resourceUsage, setResourceUsage] = useState({
        messageCount: 0,
        conversationCount: 0,
        knowledgeFiles: 0,
        knowledgeWebsites: 0,
        leadsCount: 0,
        appointmentsCount: 0
    })

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            if (!userId || !currentUser) return
            setIsLoading(true)
            try {
                // In a real app, this would be a single API call to an admin endpoint
                // simulating fetch from Firestore directly for now (security rules permitting or use Admin SDK API)
                
                // Get ID token for authentication
                const token = await currentUser.getIdToken()
                
                // For this demo, we'll fetch via a mock API call or direct firestore if rules allow reading other users
                // Assuming we use an API endpoint usually:
                const response = await fetch(`/api/admin/customer-admin?userId=${userId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                
                if (response.ok) {
                    const data = await response.json()
                    setUserInfo(data.user)
                    setSubscription(data.subscription)
                    setBillingInfo(data.billing || {
                        billingPeriod: 'monthly',
                        amount: 0,
                        currency: 'TRY',
                        nextBillingDate: null,
                        lastPaymentDate: null
                    })
                    if (data.resourceUsage) {
                        setResourceUsage(data.resourceUsage)
                    }
                } else {
                    // Fallback to direct firestore read if API not ready or for demo
                     const userDoc = await getDoc(doc(db, "users", userId))
                     if (userDoc.exists()) {
                         const userData = userDoc.data()
                         setUserInfo({
                             email: userData.email,
                             createdAt: userData.createdAt,
                             lastLoginAt: userData.lastLoginAt,
                             displayName: userData.displayName,
                             photoURL: userData.photoURL
                         })
                         setSubscription({
                             planId: userData.planId || 'starter',
                             status: userData.subscriptionStatus || 'trial',
                             trialEndsAt: userData.trialEndsAt || null,
                             currentPeriodEnd: userData.currentPeriodEnd || null,
                             cancelAtPeriodEnd: userData.cancelAtPeriodEnd || false,
                             billingStatus: userData.billingStatus || 'free',
                             trialDays: userData.trialDays || 14,
                             messageLimitOverride: userData.messageLimitOverride,
                             adminNotes: userData.adminNotes,
                             isFrozen: userData.isFrozen,
                             prioritySupport: userData.prioritySupport
                         })
                         // Billing info might be in a subcollection or separate doc, mocking for now
                     }
                }
            } catch (error) {
                console.error("Error fetching customer data:", error)
                toast({
                    title: t('error'),
                    description: t('fetchFailedDesc') || "Müşteri verileri alınamadı.",
                    variant: "destructive"
                })
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [userId, t, toast])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const response = await fetch('/api/admin/customer-admin', {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await currentUser?.getIdToken()}`
                },
                body: JSON.stringify({
                    userId,
                    subscription,
                    billing: billingInfo
                })
            })

            if (!response.ok) throw new Error('Failed to update settings')

            toast({
                title: t('success'),
                description: t('settingsSavedDesc') || "Ayarlar başarıyla güncellendi."
            })
        } catch (error) {
            console.error("Error saving settings:", error)
            toast({
                title: t('error'),
                description: t('updateFailedDesc') || "Failed to update settings.",
                variant: "destructive"
            })
        } finally {
            setIsSaving(false)
        }
    }

    // Helper to format dates
    const formatDate = (date: any) => {
        if (!date) return '-'
        // Handle Firestore Timestamp or ISO string
        const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date)
        return d.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    const planConfig = getPlanConfig(subscription.planId)

    if (isLoading) {
        return <div className="p-8 text-center">Loading...</div>
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Plan ve Abonelik Yönetimi</h1>
                <p className="text-muted-foreground mt-2">
                    Müşterinin abonelik, plan ve fatura süreçlerini yönetin.
                </p>
            </div>

            {/* Modern Summary Bento Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. User Profile Card */}
                <Card className="lg:col-span-1 border border-gray-200 shadow-sm bg-white overflow-hidden relative">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-medium text-muted-foreground uppercase tracking-wide text-xs">
                            Müşteri Bilgileri
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-full bg-zinc-100 flex items-center justify-center text-xl font-bold text-zinc-500 border border-zinc-200">
                                {userInfo?.displayName?.[0] || userInfo?.email?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-lg text-zinc-900">{userInfo?.displayName || 'İsimsiz Kullanıcı'}</span>
                                <span className="text-sm text-muted-foreground">{userInfo?.email}</span>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4 pt-2">
                            <div className="flex items-center gap-3 text-sm">
                                <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <Calendar size={16} />
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">Kayıt Tarihi</div>
                                    <div className="font-medium text-zinc-900">{formatDate(userInfo?.createdAt)}</div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 text-sm">
                                <div className="h-8 w-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                                    <CheckCircle2 size={16} />
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">Durum</div>
                                    <Badge variant="outline" className={cn("mt-0.5 font-medium border-0 px-2 py-0.5 bg-green-100 text-green-700", subscription.isFrozen && "bg-red-100 text-red-700")}>
                                        {subscription.isFrozen ? "Dondurulmuş" : "Aktif"}
                                    </Badge>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-sm">
                                <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                                    <Hash size={16} />
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">Kullanıcı ID</div>
                                    <div className="font-mono text-xs text-zinc-600 truncate max-w-[180px]" title={userId}>{userId}</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Plan & Limits Summary Card */}
                <Card className="lg:col-span-2 border-none shadow-sm bg-gradient-to-br from-zinc-900 to-zinc-950 text-white overflow-hidden relative">
                    <CardHeader className="pb-2 relative z-10">
                         <div className="flex justify-between items-start">
                             <div>
                                <CardTitle className="text-base font-medium text-zinc-400 uppercase tracking-wide text-xs mb-1">
                                    Aktif Paket
                                </CardTitle>
                                <div className="flex items-end gap-3">
                                    <h2 className="text-4xl font-bold text-white capitalize">{subscription.planId} Plan</h2>
                                    {subscription.status === 'trial' && (
                                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/50 mb-1.5 hover:bg-blue-500/30">Deneme Sürümü</Badge>
                                    )}
                                    {subscription.prioritySupport && (
                                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/50 mb-1.5">Öncelikli Destek</Badge>
                                    )}
                                </div>
                             </div>
                             <div className="text-right">
                                    <div className="text-sm text-zinc-400">Aylık Tutar</div>
                                    <div className="text-2xl font-bold">
                                        {planConfig?.billing?.contact 
                                            ? 'Özel Teklif' 
                                            : `$${planConfig?.billing?.monthly?.amount || 0}`
                                        }
                                    </div>
                                    {planConfig?.billing?.annual && !planConfig?.billing?.contact && (
                                        <div className="text-xs text-zinc-400 mt-1">
                                            Yıllık: ${planConfig.billing.annual.amount}
                                        </div>
                                    )}
                             </div>
                         </div>
                    </CardHeader>

                    <CardContent className="relative z-10 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             {/* Features List */}
                             <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Paket Özellikleri</h3>
                                <ul className="space-y-2">
                                    {planConfig?.modules?.included?.map((module: string) => {
                                        const moduleTranslations: Record<string, string> = {
                                            generalChatbot: "Genel Chatbot",
                                            knowledgeBase: "Bilgi Bankası",
                                            leadCollection: "Müşteri Bilgi Toplama",
                                            proactiveMessaging: "Proaktif Mesajlaşma",
                                            productCatalog: "Ürün Kataloğu",
                                            digitalWaiter: "Dijital Garson",
                                            salesOptimization: "Satış Optimizasyonu",
                                            visualDiagnosis: "Görsel Teşhis",
                                            generalAssistant: "Genel Asistan",
                                            knowledgeEducation: "Bilgi Eğitimi",
                                            salesCatalog: "Satış Kataloğu",
                                            voiceAppointments: "Sesli Randevu",
                                            aiCopywriter: "AI Metin Yazarı",
                                            emailMarketing: "E-posta Pazarlama",
                                            all: "Tüm Özellikler"
                                        }

                                        if (module === 'all') return (
                                            <li key="all" className="flex items-center gap-2 text-sm text-zinc-300">
                                                <div className="h-5 w-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                                                    <Check size={10} className="text-white" />
                                                </div>
                                                <span className="capitalize">Tüm Özellikler</span>
                                            </li>
                                        )
                                        return (
                                            <li key={module} className="flex items-center gap-2 text-sm text-zinc-300">
                                                <div className="h-5 w-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                                                    <Check size={10} className="text-white" />
                                                </div>
                                                <span className="capitalize">
                                                    {moduleTranslations[module] || module.replace(/([A-Z])/g, ' $1').trim()}
                                                </span>
                                            </li>
                                        )
                                    })}
                                    {(!planConfig?.modules?.included || planConfig.modules.included.length === 0) && (
                                        <li className="text-sm text-zinc-500">Özel özellik tanımlanmamış.</li>
                                    )}
                                </ul>
                             </div>

                             {/* Limits Summary */}
                             <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Kullanım Limitleri</h3>
                                
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-zinc-400">Mesaj Limiti</span>
                                            <span className="text-white font-medium">
                                                {(subscription.messageLimitOverride || planConfig?.limits.messageLimit) === 'unlimited' 
                                                    ? `${resourceUsage.messageCount} / Sınırsız` 
                                                    : `${resourceUsage.messageCount} / ${subscription.messageLimitOverride || planConfig?.limits.messageLimit || 0}`}
                                            </span>
                                        </div>
                                        {/* Progress bar for messages - arbitrary 10000 scale for unlimited or percentage for fixed */}
                                        <Progress 
                                            value={(() => {
                                                const limit = subscription.messageLimitOverride || planConfig?.limits.messageLimit;
                                                if (limit === 'unlimited') return Math.min((resourceUsage.messageCount / 1000) * 100, 100);
                                                const numLimit = Number(limit) || 1;
                                                return Math.min((resourceUsage.messageCount / numLimit) * 100, 100);
                                            })()}
                                            className="h-1.5 bg-white/10 [&>div]:bg-indigo-500" 
                                        />
                                        <div className="text-[10px] text-zinc-500 text-right">
                                            {resourceUsage.messageCount} mesaj gönderildi
                                        </div>
                                    </div>

                                     <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-zinc-400">Bilgi Bankası Döküman</span>
                                            <span className="text-white font-medium">
                                                {resourceUsage.knowledgeFiles} / {planConfig?.limits.knowledge?.files || 0} Adet
                                            </span>
                                        </div>
                                        <Progress 
                                            value={(() => {
                                                const limit = planConfig?.limits.knowledge?.files;
                                                if (limit === 'unlimited') return Math.min((resourceUsage.knowledgeFiles / 1000) * 100, 100);
                                                const numLimit = Number(limit) || 1;
                                                return Math.min((resourceUsage.knowledgeFiles / numLimit) * 100, 100);
                                            })()} 
                                            className="h-1.5 bg-white/10 [&>div]:bg-emerald-500" 
                                        />
                                        <div className="text-[10px] text-zinc-500 text-right">
                                            {resourceUsage.knowledgeFiles} / {planConfig?.limits.knowledge?.files || 0} kullanıldı
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-zinc-400">Web Sayfası Tarama</span>
                                            <span className="text-white font-medium">
                                                {resourceUsage.knowledgeWebsites} / {planConfig?.limits.knowledge?.websites || 0} Sayfa
                                            </span>
                                        </div>
                                        <Progress 
                                            value={(() => {
                                                const limit = planConfig?.limits.knowledge?.websites;
                                                if (limit === 'unlimited') return Math.min((resourceUsage.knowledgeWebsites / 1000) * 100, 100);
                                                const numLimit = Number(limit) || 1;
                                                return Math.min((resourceUsage.knowledgeWebsites / numLimit) * 100, 100);
                                            })()} 
                                            className="h-1.5 bg-white/10 [&>div]:bg-amber-500" 
                                        />
                                        <div className="text-[10px] text-zinc-500 text-right">
                                            {resourceUsage.knowledgeWebsites} / {planConfig?.limits.knowledge?.websites || 0} kullanıldı
                                        </div>
                                    </div>
                                </div>
                             </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Simplified Tabs */}
            <Tabs defaultValue="plan" className="w-full">
                <TabsList className="w-full justify-start h-auto p-0 bg-transparent">
                    <TabsTrigger 
                        value="plan" 
                        className="rounded-full border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 font-medium"
                    >
                        Plan ve Ücretlendirme
                    </TabsTrigger>
                    {SHOW_BILLING && (
                        <TabsTrigger 
                            value="billing" 
                            className="rounded-full border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 font-medium"
                        >
                            Faturalama Bilgileri
                        </TabsTrigger>
                    )}
                    <TabsTrigger 
                        value="admin" 
                        className="rounded-full border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 font-medium"
                    >
                        Yönetici Ayarları
                    </TabsTrigger>
                </TabsList>

                {/* Tab 1: Plan Configuration */}
                <TabsContent value="plan" className="mt-8 space-y-6">
                    <Card className="border border-gray-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="w-5 h-5" />
                                Plan Durumu
                            </CardTitle>
                            <CardDescription>
                                Müşterinin aktif planını ve deneme süresi detaylarını buradan yönetebilirsiniz.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Plan Selection */}
                                <div className="space-y-4">
                                     <div className="space-y-2">
                                        <Label>Plan Seçimi</Label>
                                        <Select
                                            value={subscription.planId}
                                            onValueChange={(value) => setSubscription({ ...subscription, planId: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="starter">Başlangıç (Starter)</SelectItem>
                                                <SelectItem value="growth">Büyüme (Growth)</SelectItem>
                                                <SelectItem value="pro">Profesyonel (Pro)</SelectItem>
                                                <SelectItem value="enterprise">Kurumsal (Enterprise)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            Plan değişikliği anında uygulanır ve limitler güncellenir.
                                        </p>
                                     </div>

                                     <div className="space-y-2">
                                        <Label>Faturalama Durumu</Label>
                                        <Select
                                            value={subscription.billingStatus}
                                            onValueChange={(value) => {
                                                // If setting to 'paid', automatically set status to 'active' (disable trial mode)
                                                if (value === 'paid') {
                                                    setSubscription({ 
                                                        ...subscription, 
                                                        billingStatus: value as any,
                                                        status: 'active',
                                                        trialEndsAt: null  // Clear trial end date
                                                    })
                                                } else {
                                                    setSubscription({ ...subscription, billingStatus: value as any })
                                                }
                                            }}

                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="free">Free</SelectItem>
                                                <SelectItem value="paid">Paid</SelectItem>
                                                <SelectItem value="pending">Pending</SelectItem>
                                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                            </SelectContent>
                                        </Select>
                                     </div>
                                </div>

                                {/* Trial Configuration */}
                                <div className="p-6 bg-zinc-50 rounded-xl space-y-4 border border-zinc-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock className="w-4 h-4 text-zinc-500" />
                                        <h4 className="font-semibold text-sm text-zinc-700">Deneme Süresi Ayarları</h4>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs">Deneme Süresi (Gün)</Label>
                                            <Input 
                                                type="number" 
                                                value={subscription.trialDays} 
                                                onChange={(e) => setSubscription({ ...subscription, trialDays: parseInt(e.target.value) || 0 })}
                                                className="bg-white"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Bitiş Tarihi</Label>
                                            <Input 
                                                type="date" 
                                                value={subscription.trialEndsAt?.split('T')[0] || ''} 
                                                onChange={(e) => setSubscription({ ...subscription, trialEndsAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                                                className="bg-white"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between pt-2 border-t border-zinc-200 mt-4">
                                        <div className="space-y-0.5">
                                            <div className="text-sm font-medium text-zinc-900">Deneme Modu (Trial Mode)</div>
                                            <div className="text-xs text-muted-foreground">
                                                {`Aktif edildiğinde abonelik durumu 'trial' olarak ayarlanır.`}
                                            </div>
                                        </div>
                                        <Switch 
                                            checked={subscription.status === 'trial'}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    // Enable Trial
                                                    const endDate = new Date();
                                                    endDate.setDate(endDate.getDate() + (subscription.trialDays || 14));
                                                    
                                                    setSubscription({
                                                        ...subscription,
                                                        status: 'trial',
                                                        trialEndsAt: endDate.toISOString()
                                                    });
                                                } else {
                                                    // Disable Trial
                                                    setSubscription({
                                                        ...subscription,
                                                        status: 'active', // Or 'free' based on billing status, but 'active' implies non-trial
                                                        trialEndsAt: null
                                                    });
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 2: Billing Information */}
                {SHOW_BILLING && (
                    <TabsContent value="billing" className="mt-8">
                    <Card className="border border-gray-200 shadow-sm">
                        <CardHeader>
                             <CardTitle className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5" />
                                Fatura Detayları
                            </CardTitle>
                            <CardDescription>
                                Müşterinin fatura adres ve ödeme bilgilerini düzenleyin.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Fatura Adresi</Label>
                                    <Input  
                                        value={billingInfo.billingAddress || ''} 
                                        onChange={(e) => setBillingInfo({ ...billingInfo, billingAddress: e.target.value })}
                                        placeholder="Açık adres giriniz..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Vergi Numarası / T.C.</Label>
                                    <Input 
                                        value={billingInfo.taxId || ''} 
                                        onChange={(e) => setBillingInfo({ ...billingInfo, taxId: e.target.value })}
                                        placeholder="Vergi No veya T.C. Kimlik No"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Ödeme Yöntemi</Label>
                                    <Select
                                        value={billingInfo.paymentMethod || 'credit_card'}
                                        onValueChange={(value) => setBillingInfo({ ...billingInfo, paymentMethod: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="credit_card">Kredi Kartı (Stripe)</SelectItem>
                                            <SelectItem value="bank_transfer">Banka Havalesi</SelectItem>
                                            <SelectItem value="other">Diğer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <h4 className="font-medium text-sm text-zinc-900">Otomatik Yenileme ve Döngü</h4>
                                <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg border border-zinc-100">
                                    <div className="space-y-0.5">
                                        <div className="text-sm font-medium text-zinc-900">Otomatik Yenileme</div>
                                        <div className="text-xs text-muted-foreground">Periyot sonunda abonelik otomatik yenilenir.</div>
                                    </div>
                                    <Switch 
                                        checked={!subscription.cancelAtPeriodEnd} 
                                        onCheckedChange={(checked) => setSubscription({ ...subscription, cancelAtPeriodEnd: !checked })} 
                                    />
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-sm text-zinc-900 flex items-center gap-2">
                                        <History className="w-4 h-4 text-muted-foreground" />
                                        Fatura Geçmişi
                                    </h4>
                                    <Button variant="outline" size="sm" className="h-8 text-xs">
                                        <ArrowUpRight className="w-3 h-3 mr-1" />
                                        Tümünü İndir
                                    </Button>
                                </div>
                                
                                <div className="rounded-lg border border-zinc-200 overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase text-zinc-500 font-medium">
                                            <tr>
                                                <th className="px-4 py-3">Tarih</th>
                                                <th className="px-4 py-3">Tutar</th>
                                                <th className="px-4 py-3">Durum</th>
                                                <th className="px-4 py-3 text-right">İşlem</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100">
                                            {/* Mock Data for Billing History */}
                                            {[
                                                { date: '2024-01-01', amount: '799.00 TRY', status: 'Paid' },
                                                { date: '2023-12-01', amount: '799.00 TRY', status: 'Paid' },
                                                { date: '2023-11-01', amount: '299.00 TRY', status: 'Paid' },
                                            ].map((invoice, i) => (
                                                <tr key={i} className="hover:bg-zinc-50/50 transition-colors bg-white">
                                                    <td className="px-4 py-3 text-zinc-600 font-mono text-xs">{invoice.date}</td>
                                                    <td className="px-4 py-3 font-medium text-zinc-900">{invoice.amount}</td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-normal">
                                                            {invoice.status === 'Paid' ? 'Ödendi' : invoice.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-zinc-900">
                                                            <FileText className="w-3 h-3" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    </TabsContent>
                )}

                {/* Tab 3: Admin Settings */}
                <TabsContent value="admin" className="mt-8 space-y-6">
                    <Card className="border border-gray-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                Yönetici Kontrolleri
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Mesaj Limiti (Override)</Label>
                                        <div className="flex gap-2">
                                            <Input 
                                                type="number" 
                                                value={subscription.messageLimitOverride || ''} 
                                                onChange={(e) => setSubscription({ ...subscription, messageLimitOverride: e.target.value ? parseInt(e.target.value) : undefined })}
                                                placeholder={`Varsayılan: ${planConfig?.limits.messageLimit || 0}`}
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">Boş bırakılırsa plan varsayılanı kullanılır.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Yönetici Notları</Label>
                                        <textarea 
                                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={subscription.adminNotes || ''} 
                                            onChange={(e) => setSubscription({ ...subscription, adminNotes: e.target.value })}
                                            placeholder="Bu müşteri hakkında özel notlar..."
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
                                        <div className="space-y-0.5">
                                            <div className="text-sm font-medium text-red-900">Hesabı Dondur</div>
                                            <div className="text-xs text-red-600/80">Giriş ve API erişimini geçici olarak durdurur.</div>
                                        </div>
                                        <Switch 
                                            checked={subscription.isFrozen || false} 
                                            onCheckedChange={(checked) => setSubscription({ ...subscription, isFrozen: checked })} 
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-100">
                                        <div className="space-y-0.5">
                                            <div className="text-sm font-medium text-amber-900">Öncelikli Destek</div>
                                            <div className="text-xs text-amber-700/80">Müşteri ticketlarına öncelik tanınır.</div>
                                        </div>
                                        <Switch 
                                            checked={subscription.prioritySupport || false} 
                                            onCheckedChange={(checked) => setSubscription({ ...subscription, prioritySupport: checked })} 
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
                <Button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    size="lg"
                    className="min-w-[150px]"
                >
                    {isSaving ? (
                        <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                            Kaydediliyor...
                        </>
                    ) : (
                        "Ayarları Kaydet"
                    )}
                </Button>
            </div>
        </div>
    )
}
