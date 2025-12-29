"use client"

import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, CreditCard, Crown, MessageSquare, ShoppingBag, Mic, UserPlus, PenTool, Sparkles } from "lucide-react"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { PLANS, PlanId, getPlansForComparison, formatPrice, calculateYearlySavings } from "@/lib/plans-config"
import { MODULES, INDUSTRY_DEFAULT_MODULES, getAdditionalModulesForIndustry } from "@/lib/modules-config"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

// Icon mapping for modules
const MODULE_ICONS: Record<string, any> = {
    chatbot: MessageSquare,
    personalShopper: ShoppingBag,
    voiceAssistant: Mic,
    leadFinder: UserPlus,
    copywriter: PenTool
}

export default function SubscriptionPage() {
    const { t, language } = useLanguage()
    const { user } = useAuth()
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
    const [userData, setUserData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchUserData = async () => {
            if (!user) return
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid))
                if (userDoc.exists()) {
                    setUserData(userDoc.data())
                }
            } catch (error) {
                console.error("Error fetching user data:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchUserData()
    }, [user])

    const currentPlan = userData?.plan || 'starter'
    const industry = userData?.industry || 'ecommerce'
    const subscriptionStatus = userData?.subscriptionStatus || 'trial'
    const trialEndsAt = userData?.trialEndsAt ? new Date(userData.trialEndsAt) : null
    const daysRemaining = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0

    // Get industry modules
    const industryModules = INDUSTRY_DEFAULT_MODULES[industry] || INDUSTRY_DEFAULT_MODULES.other
    const additionalModules = getAdditionalModulesForIndustry(industry)

    const plans = getPlansForComparison()

    if (loading) {
        return (
            <div className="space-y-6 max-w-6xl animate-pulse">
                <div className="h-8 w-48 bg-gray-200 rounded"></div>
                <div className="h-96 bg-gray-100 rounded-xl"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-6xl">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">{t('subscription')}</h1>
                <p className="text-muted-foreground">{t('subscriptionDescription')}</p>
            </div>

            {/* Current Plan Status */}
            <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent overflow-hidden">
                <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-6 py-0">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-xl">
                                <Crown className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">
                                    {PLANS[currentPlan as PlanId]?.name?.[language === 'tr' ? 'tr' : 'en'] || 'Starter'}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {subscriptionStatus === 'trial' && daysRemaining > 0 ? (
                                        <span className="text-violet-600 font-medium">
                                            {language === 'tr'
                                                ? `Deneme süresi: ${daysRemaining} gün kaldı`
                                                : `Trial: ${daysRemaining} days remaining`}
                                        </span>
                                    ) : subscriptionStatus === 'active' ? (
                                        <span className="text-green-600">{language === 'tr' ? 'Aktif' : 'Active'}</span>
                                    ) : (
                                        <span className="text-red-600">{language === 'tr' ? 'Süresi doldu' : 'Expired'}</span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                                {language === 'tr' ? 'Fatura Geçmişi' : 'Billing History'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Active Modules */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        {language === 'tr' ? 'Aktif Modülleriniz' : 'Your Active Modules'}
                    </CardTitle>
                    <CardDescription>
                        {language === 'tr'
                            ? 'Sektörünüz için varsayılan olarak dahil edilen modüller'
                            : 'Modules included by default for your industry'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {industryModules.map((moduleId) => {
                            const mod = MODULES[moduleId]
                            const IconComponent = MODULE_ICONS[moduleId] || MessageSquare
                            return (
                                <div
                                    key={moduleId}
                                    className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors"
                                >
                                    <div className="p-2.5 bg-primary/10 rounded-lg">
                                        <IconComponent className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate leading-none">
                                            {mod?.name?.[language === 'tr' ? 'tr' : 'en'] || moduleId}
                                        </p>
                                        <Badge variant="secondary" className="mt-1.5 text-xs font-normal">
                                            {language === 'tr' ? 'Dahil' : 'Included'}
                                        </Badge>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Additional Modules (Premium) */}
                    {additionalModules.length > 0 && (
                        <div className="mt-8">
                            <h4 className="text-sm font-semibold text-foreground mb-4">
                                {language === 'tr' ? 'Premium Modüller (Ek Ücretli)' : 'Premium Modules (Add-ons)'}
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                {additionalModules.map((module) => {
                                    const IconComponent = MODULE_ICONS[module.id] || MessageSquare
                                    return (
                                        <div
                                            key={module.id}
                                            className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="p-2.5 bg-muted rounded-lg">
                                                <IconComponent className="w-5 h-5 text-muted-foreground" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold truncate leading-none">
                                                    {module.name[language === 'tr' ? 'tr' : 'en']}
                                                </p>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    ${module.monthlyPrice}/mo
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Plan Comparison */}
            <Card>
                <CardHeader>
                    <CardTitle>{language === 'tr' ? 'Planları Karşılaştırın' : 'Compare Plans'}</CardTitle>
                    <CardDescription>
                        {language === 'tr'
                            ? 'İhtiyaçlarınıza en uygun planı seçin'
                            : 'Choose the plan that best fits your needs'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Billing Toggle */}
                    <div className="flex justify-center mb-8">
                        <div className="bg-muted p-1 rounded-lg flex items-center">
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${billingCycle === 'monthly' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                {language === 'tr' ? 'Aylık' : 'Monthly'}
                            </button>
                            <button
                                onClick={() => setBillingCycle('annual')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${billingCycle === 'annual' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                {language === 'tr' ? 'Yıllık' : 'Annual'}
                                <Badge variant="secondary" className="text-xs border-0">
                                    {language === 'tr' ? '2 Ay Ücretsiz' : '2 Months Free'}
                                </Badge>
                            </button>
                        </div>
                    </div>

                    {/* Plans Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {plans.map((plan) => {
                            const isCurrent = plan.id === currentPlan
                            const price = billingCycle === 'monthly' ? plan.monthlyPrice : Math.round(plan.yearlyPrice / 12)

                            return (
                                <div
                                    key={plan.id}
                                    className={`relative flex flex-col rounded-xl border-2 p-6 transition-all ${isCurrent
                                        ? 'border-primary bg-primary/5'
                                        : plan.popular
                                            ? 'border-foreground/10'
                                            : 'border-border hover:border-foreground/10'
                                        }`}
                                >
                                    {isCurrent && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm">
                                            {language === 'tr' ? 'Mevcut Plan' : 'Current'}
                                        </div>
                                    )}
                                    {plan.popular && !isCurrent && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-foreground text-background px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm">
                                            {language === 'tr' ? 'Popüler' : 'Popular'}
                                        </div>
                                    )}

                                    <div className="mb-4">
                                        <h3 className="text-lg font-bold">{plan.name[language === 'tr' ? 'tr' : 'en']}</h3>
                                        <div className="mt-2 flex items-baseline gap-1">
                                            <span className="text-4xl font-extrabold">
                                                {price === 0 ? (language === 'tr' ? 'Ücretsiz' : 'Free') : `$${price}`}
                                            </span>
                                            {price > 0 && <span className="text-muted-foreground">/mo</span>}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-2">
                                            {plan.description[language === 'tr' ? 'tr' : 'en']}
                                        </p>
                                    </div>

                                    <ul className="space-y-3 mb-6 flex-1">
                                        <li className="flex items-center gap-2 text-sm">
                                            <div className="p-0.5 rounded-full bg-primary/10 text-primary">
                                                <Check className="w-3 h-3" />
                                            </div>
                                            {plan.features.maxMessages === -1
                                                ? (language === 'tr' ? 'Sınırsız mesaj' : 'Unlimited messages')
                                                : `${plan.features.maxMessages.toLocaleString()} ${language === 'tr' ? 'mesaj/ay' : 'messages/mo'}`
                                            }
                                        </li>
                                        <li className="flex items-center gap-2 text-sm">
                                            <div className="p-0.5 rounded-full bg-primary/10 text-primary">
                                                <Check className="w-3 h-3" />
                                            </div>
                                            {language === 'tr' ? 'Sektör modülleri dahil' : 'Industry modules included'}
                                        </li>
                                        <li className="flex items-center gap-2 text-sm">
                                            <div className="p-0.5 rounded-full bg-primary/10 text-primary">
                                                <Check className="w-3 h-3" />
                                            </div>
                                            {plan.features.additionalModules === -1
                                                ? (language === 'tr' ? 'Tüm premium modüller' : 'All premium modules')
                                                : plan.features.additionalModules === 0
                                                    ? (language === 'tr' ? 'Temel özellikler' : 'Basic features')
                                                    : `${plan.features.additionalModules} ${language === 'tr' ? 'ek modül' : 'add-on modules'}`
                                            }
                                        </li>
                                        {plan.features.customBranding && (
                                            <li className="flex items-center gap-2 text-sm">
                                                <div className="p-0.5 rounded-full bg-primary/10 text-primary">
                                                    <Check className="w-3 h-3" />
                                                </div>
                                                {language === 'tr' ? 'Özel markalama' : 'Custom branding'}
                                            </li>
                                        )}
                                        {plan.features.apiAccess && (
                                            <li className="flex items-center gap-2 text-sm">
                                                <div className="p-0.5 rounded-full bg-primary/10 text-primary">
                                                    <Check className="w-3 h-3" />
                                                </div>
                                                {language === 'tr' ? 'API erişimi' : 'API access'}
                                            </li>
                                        )}
                                        {plan.features.prioritySupport && (
                                            <li className="flex items-center gap-2 text-sm">
                                                <div className="p-0.5 rounded-full bg-primary/10 text-primary">
                                                    <Check className="w-3 h-3" />
                                                </div>
                                                {language === 'tr' ? 'Öncelikli destek' : 'Priority support'}
                                            </li>
                                        )}
                                    </ul>

                                    <Button
                                        className={`w-full ${isCurrent ? '' : ''}`}
                                        variant={isCurrent ? 'outline' : 'default'}
                                        disabled={isCurrent}
                                    >
                                        {isCurrent
                                            ? (language === 'tr' ? 'Mevcut Planınız' : 'Your Current Plan')
                                            : (language === 'tr' ? 'Yükselt' : 'Upgrade')
                                        }
                                    </Button>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Payment Info */}
            <Card>
                <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-6 py-0">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-full">
                                <CreditCard className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm">
                                    {language === 'tr' ? 'Güvenli Ödeme' : 'Secure Payment'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {language === 'tr' ? 'Stripe ile şifrelenmiş' : 'Encrypted via Stripe'}
                                </p>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground text-center md:text-right">
                            {language === 'tr'
                                ? 'İstediğiniz zaman iptal edebilirsiniz. Taahhüt yok.'
                                : 'Cancel anytime. No commitment required.'}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
