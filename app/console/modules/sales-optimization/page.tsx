"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, TrendingUp, Tag, Package, ShoppingCart, GitCompare, Loader2, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

interface DiscountCode {
    code: string
    discount: number
    type: 'percent' | 'fixed'
    minOrder?: number
}

interface SalesOptimizationConfig {
    discountCodes: boolean
    stockAlerts: boolean
    cartRecovery: boolean
    productComparison: boolean
    discountCodeConfig?: {
        codes: DiscountCode[]
        autoOffer: boolean
        offerAfterSeconds: number
    }
    stockAlertConfig?: {
        lowStockThreshold: number
        showExactCount: boolean
    }
    cartRecoveryConfig?: {
        triggerAfterSeconds: number
        offerDiscount: boolean
        discountPercent: number
    }
}

const DEFAULT_CONFIG: SalesOptimizationConfig = {
    discountCodes: false,
    stockAlerts: false,
    cartRecovery: false,
    productComparison: false,
    discountCodeConfig: {
        codes: [],
        autoOffer: false,
        offerAfterSeconds: 30
    },
    stockAlertConfig: {
        lowStockThreshold: 5,
        showExactCount: true
    },
    cartRecoveryConfig: {
        triggerAfterSeconds: 60,
        offerDiscount: false,
        discountPercent: 10
    }
}

export default function SalesOptimizationPage() {
    const { t } = useLanguage()
    const router = useRouter()
    const { user } = useAuth()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [config, setConfig] = useState<SalesOptimizationConfig>(DEFAULT_CONFIG)
    const [newCode, setNewCode] = useState<DiscountCode>({ code: '', discount: 10, type: 'percent' })

    useEffect(() => {
        const loadConfig = async () => {
            if (!user?.uid) return
            try {
                const response = await fetch(`/api/console/settings?chatbotId=${user.uid}`);
                if (!response.ok) throw new Error("Failed to fetch settings");
                const data = await response.json();

                if (data.salesOptimizationConfig) {
                    setConfig({ ...DEFAULT_CONFIG, ...data.salesOptimizationConfig })
                }
            } catch (error) {
                console.error("Error loading config:", error)
            } finally {
                setIsLoading(false)
            }
        }
        loadConfig()
    }, [user?.uid])

    const saveConfig = async () => {
        if (!user?.uid) return
        setIsSaving(true)
        try {
            const response = await fetch("/api/console/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chatbotId: user.uid,
                    chatbotSettings: {
                        salesOptimizationConfig: config
                    }
                })
            });

            if (!response.ok) throw new Error("Failed to save settings");

            toast({
                title: t('saved') || "Saved",
                description: t('settingsSaved') || "Settings saved successfully"
            })
        } catch (error) {
            console.error("Error saving config:", error)
            toast({
                title: t('error') || "Error",
                description: t('errorSaving') || "Error saving settings",
                variant: "destructive"
            })
        } finally {
            setIsSaving(false)
        }
    }

    const addDiscountCode = () => {
        if (!newCode.code) return
        setConfig(prev => ({
            ...prev,
            discountCodeConfig: {
                ...prev.discountCodeConfig!,
                codes: [...(prev.discountCodeConfig?.codes || []), newCode]
            }
        }))
        setNewCode({ code: '', discount: 10, type: 'percent' })
    }

    const removeDiscountCode = (index: number) => {
        setConfig(prev => ({
            ...prev,
            discountCodeConfig: {
                ...prev.discountCodeConfig!,
                codes: prev.discountCodeConfig?.codes.filter((_, i) => i !== index) || []
            }
        }))
    }

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/console/modules")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <TrendingUp className="h-8 w-8 text-emerald-600" />
                            {t('modules.salesOptimization') || "Sales Optimization"}
                        </h2>
                        <p className="text-muted-foreground">
                            {t('modules.salesOptimizationDesc') || "Configure discount codes, stock alerts, cart recovery and product comparison features"}
                        </p>
                    </div>
                </div>
                <Button onClick={saveConfig} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('save') || "Save"}
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Discount Codes */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Tag className="h-5 w-5 text-purple-600" />
                                <CardTitle>{t('salesOpt.discountCodes') || "Discount Codes"}</CardTitle>
                            </div>
                            <Switch
                                checked={config.discountCodes}
                                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, discountCodes: checked }))}
                            />
                        </div>
                        <CardDescription>
                            {t('salesOpt.discountCodesDesc') || "Offer discount codes to customers during conversation"}
                        </CardDescription>
                    </CardHeader>
                    {config.discountCodes && (
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={config.discountCodeConfig?.autoOffer}
                                    onCheckedChange={(checked) => setConfig(prev => ({
                                        ...prev,
                                        discountCodeConfig: { ...prev.discountCodeConfig!, autoOffer: checked }
                                    }))}
                                />
                                <Label>{t('salesOpt.autoOffer') || "Auto-offer after delay"}</Label>
                            </div>
                            {config.discountCodeConfig?.autoOffer && (
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        value={config.discountCodeConfig?.offerAfterSeconds || 30}
                                        onChange={(e) => setConfig(prev => ({
                                            ...prev,
                                            discountCodeConfig: { ...prev.discountCodeConfig!, offerAfterSeconds: parseInt(e.target.value) }
                                        }))}
                                        className="w-20"
                                    />
                                    <span className="text-sm text-muted-foreground">{t('seconds') || "seconds"}</span>
                                </div>
                            )}
                            <div className="border-t pt-4">
                                <Label className="mb-2 block">{t('salesOpt.addCode') || "Add Discount Code"}</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="CODE10"
                                        value={newCode.code}
                                        onChange={(e) => setNewCode(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                        className="flex-1"
                                    />
                                    <Input
                                        type="number"
                                        value={newCode.discount}
                                        onChange={(e) => setNewCode(prev => ({ ...prev, discount: parseInt(e.target.value) }))}
                                        className="w-20"
                                    />
                                    <select
                                        value={newCode.type}
                                        onChange={(e) => setNewCode(prev => ({ ...prev, type: e.target.value as 'percent' | 'fixed' }))}
                                        className="border rounded px-2"
                                    >
                                        <option value="percent">%</option>
                                        <option value="fixed">₺</option>
                                    </select>
                                    <Button size="icon" onClick={addDiscountCode}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            {(config.discountCodeConfig?.codes?.length ?? 0) > 0 && (
                                <div className="space-y-2">
                                    {config.discountCodeConfig?.codes?.map((code, i) => (
                                        <div key={i} className="flex items-center justify-between bg-muted p-2 rounded">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary">{code.code}</Badge>
                                                <span className="text-sm">{code.discount}{code.type === 'percent' ? '%' : '₺'} {t('discount') || "discount"}</span>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => removeDiscountCode(i)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    )}
                </Card>

                {/* Stock Alerts */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-orange-600" />
                                <CardTitle>{t('salesOpt.stockAlerts') || "Stock Alerts"}</CardTitle>
                            </div>
                            <Switch
                                checked={config.stockAlerts}
                                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, stockAlerts: checked }))}
                            />
                        </div>
                        <CardDescription>
                            {t('salesOpt.stockAlertsDesc') || "Show low stock warnings to create urgency"}
                        </CardDescription>
                    </CardHeader>
                    {config.stockAlerts && (
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Label>{t('salesOpt.lowStockThreshold') || "Low stock threshold"}</Label>
                                <Input
                                    type="number"
                                    value={config.stockAlertConfig?.lowStockThreshold || 5}
                                    onChange={(e) => setConfig(prev => ({
                                        ...prev,
                                        stockAlertConfig: { ...prev.stockAlertConfig!, lowStockThreshold: parseInt(e.target.value) }
                                    }))}
                                    className="w-20"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={config.stockAlertConfig?.showExactCount}
                                    onCheckedChange={(checked) => setConfig(prev => ({
                                        ...prev,
                                        stockAlertConfig: { ...prev.stockAlertConfig!, showExactCount: checked }
                                    }))}
                                />
                                <Label>{t('salesOpt.showExactCount') || "Show exact count (e.g. 'Only 3 left!')"}</Label>
                            </div>
                        </CardContent>
                    )}
                </Card>

                {/* Cart Recovery */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5 text-blue-600" />
                                <CardTitle>{t('salesOpt.cartRecovery') || "Cart Recovery"}</CardTitle>
                            </div>
                            <Switch
                                checked={config.cartRecovery}
                                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, cartRecovery: checked }))}
                            />
                        </div>
                        <CardDescription>
                            {t('salesOpt.cartRecoveryDesc') || "Re-engage users who abandon their cart"}
                        </CardDescription>
                    </CardHeader>
                    {config.cartRecovery && (
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Label>{t('salesOpt.triggerAfter') || "Trigger after"}</Label>
                                <Input
                                    type="number"
                                    value={config.cartRecoveryConfig?.triggerAfterSeconds || 60}
                                    onChange={(e) => setConfig(prev => ({
                                        ...prev,
                                        cartRecoveryConfig: { ...prev.cartRecoveryConfig!, triggerAfterSeconds: parseInt(e.target.value) }
                                    }))}
                                    className="w-20"
                                />
                                <span className="text-sm text-muted-foreground">{t('seconds') || "seconds"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={config.cartRecoveryConfig?.offerDiscount}
                                    onCheckedChange={(checked) => setConfig(prev => ({
                                        ...prev,
                                        cartRecoveryConfig: { ...prev.cartRecoveryConfig!, offerDiscount: checked }
                                    }))}
                                />
                                <Label>{t('salesOpt.offerDiscount') || "Offer discount to recover"}</Label>
                            </div>
                            {config.cartRecoveryConfig?.offerDiscount && (
                                <div className="flex items-center gap-2">
                                    <Label>{t('salesOpt.discountPercent') || "Discount"}</Label>
                                    <Input
                                        type="number"
                                        value={config.cartRecoveryConfig?.discountPercent || 10}
                                        onChange={(e) => setConfig(prev => ({
                                            ...prev,
                                            cartRecoveryConfig: { ...prev.cartRecoveryConfig!, discountPercent: parseInt(e.target.value) }
                                        }))}
                                        className="w-20"
                                    />
                                    <span>%</span>
                                </div>
                            )}
                        </CardContent>
                    )}
                </Card>

                {/* Product Comparison */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <GitCompare className="h-5 w-5 text-green-600" />
                                <CardTitle>{t('salesOpt.productComparison') || "Product Comparison"}</CardTitle>
                            </div>
                            <Switch
                                checked={config.productComparison}
                                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, productComparison: checked }))}
                            />
                        </div>
                        <CardDescription>
                            {t('salesOpt.productComparisonDesc') || "Allow chatbot to compare products and recommend the best option"}
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        </div>
    )
}
