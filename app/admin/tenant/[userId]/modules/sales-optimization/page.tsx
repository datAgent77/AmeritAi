"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, TrendingUp, Tag, Package, ShoppingCart, GitCompare, Loader2, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface DiscountCode {
    code: string
    discount: number
    type: 'percent' | 'fixed'
    usageType: 'auto' | 'chat_only'
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

export default function TenantSalesOptimizationPage() {
    const params = useParams()
    const userId = params.userId as string

    const { t, language } = useLanguage()
    const { user } = useAuth()
    const { toast } = useToast()

    const effectiveUserId = userId

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [config, setConfig] = useState<SalesOptimizationConfig>(DEFAULT_CONFIG)
    const [newCode, setNewCode] = useState<DiscountCode>({ code: '', discount: 10, type: 'percent', usageType: 'auto' })

    useEffect(() => {
        const loadConfig = async () => {
            if (!effectiveUserId) return
            try {
                const response = await fetch(`/api/console/settings?chatbotId=${effectiveUserId}`);
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
    }, [effectiveUserId])

    const saveConfig = async () => {
        if (!effectiveUserId) return
        setIsSaving(true)
        try {
            const token = await user?.getIdToken();

            const codes = config.discountCodeConfig?.codes || []
            const shouldAutoOffer = codes.some((c, i) => c.usageType === 'auto' || (!c.usageType && i === 0))
            const finalConfig = {
                ...config,
                discountCodeConfig: {
                    ...config.discountCodeConfig!,
                    autoOffer: shouldAutoOffer
                }
            }

            const response = await fetch("/api/console/settings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    chatbotId: effectiveUserId,
                    chatbotSettings: {
                        salesOptimizationConfig: finalConfig
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
        setConfig(prev => {
            const updatedCodes = [...(prev.discountCodeConfig?.codes || []), newCode]
            const shouldAutoOffer = updatedCodes.some((c, i) => c.usageType === 'auto' || (!c.usageType && i === 0))

            return {
                ...prev,
                discountCodeConfig: {
                    ...prev.discountCodeConfig!,
                    codes: updatedCodes,
                    autoOffer: shouldAutoOffer
                }
            }
        })
        setNewCode({ code: '', discount: 10, type: 'percent', usageType: 'auto' })
    }

    const removeDiscountCode = (index: number) => {
        setConfig(prev => {
            const updatedCodes = prev.discountCodeConfig?.codes.filter((_, i) => i !== index) || []
            const shouldAutoOffer = updatedCodes.some((c, i) => c.usageType === 'auto' || (!c.usageType && i === 0))

            return {
                ...prev,
                discountCodeConfig: {
                    ...prev.discountCodeConfig!,
                    codes: updatedCodes,
                    autoOffer: shouldAutoOffer
                }
            }
        })
    }

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-8 p-8 pt-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        {t('modules.salesOptimization') || "Sales Optimization"}
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        {t('modules.salesOptimizationDesc') || "Configure discount codes, stock alerts, cart recovery and product comparison features"}
                    </p>
                </div>
                <Button onClick={saveConfig} disabled={isSaving} className="min-w-[100px]">
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('save') || "Save"}
                </Button>
            </div>

            <div className="grid gap-6">
                {/* Discount Codes */}
                <Card className="border shadow-sm hover:shadow-md transition-shadow duration-200">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-secondary/50 rounded-xl">
                                    <Tag className="h-5 w-5 text-foreground/80" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-semibold tracking-tight">{t('salesOpt.discountCodes') || "Discount Codes"}</CardTitle>
                                    <CardDescription className="text-sm mt-1">
                                        {t('salesOpt.discountCodesDesc') || "AI will offer these codes to close sales when appropriate."}
                                    </CardDescription>
                                </div>
                            </div>
                            <Switch
                                checked={config.discountCodes}
                                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, discountCodes: checked }))}
                            />
                        </div>
                    </CardHeader>
                    {config.discountCodes && (
                        <CardContent className="space-y-6">
                            <div className="bg-slate-50/50 border rounded-xl p-5 transition-all">
                                <Label className="mb-3 block font-semibold">{t('salesOpt.addCode') || "Add New Discount Code"}</Label>
                                <div className="flex gap-3">
                                    <Input
                                        placeholder="e.g. SUMMER2025"
                                        value={newCode.code}
                                        onChange={(e) => setNewCode(prev => ({ ...prev, code: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                                        className="flex-1 font-mono uppercase"
                                    />
                                    <div className="flex items-center gap-2 border rounded-md bg-background px-3">
                                        <Input
                                            type="number"
                                            value={newCode.discount}
                                            onChange={(e) => setNewCode(prev => ({ ...prev, discount: parseInt(e.target.value) }))}
                                            className="w-20 border-0 shadow-none focus-visible:ring-0 px-0 text-right"
                                        />
                                        <select
                                            value={newCode.type}
                                            onChange={(e) => setNewCode(prev => ({ ...prev, type: e.target.value as 'percent' | 'fixed' }))}
                                            className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer text-muted-foreground hover:text-foreground"
                                        >
                                            <option value="percent">%</option>
                                            <option value="fixed">₺</option>
                                        </select>
                                    </div>
                                    <Button onClick={addDiscountCode} className="bg-purple-600 hover:bg-purple-700">
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="p-0 mt-4">
                                    {(!config.discountCodeConfig?.codes || config.discountCodeConfig.codes.length === 0) ? (
                                        <div className="p-8 text-center text-muted-foreground">
                                            {t('salesOpt.noCodes') || "No discount codes added. Add one above to get started."}
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>{t('salesOpt.code') || "Code"}</TableHead>
                                                    <TableHead>{t('salesOpt.discount') || "Discount"}</TableHead>
                                                    <TableHead className="text-right">{t('actions') || "Actions"}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {config.discountCodeConfig?.codes.map((code, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell>
                                                            <span className="font-mono font-medium text-lg">{code.code}</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-lg font-bold text-emerald-600 tabular-nums">
                                                                    {code.type === 'fixed' ? '₺' : ''}{code.discount}{code.type === 'percent' ? '%' : ''}
                                                                </span>
                                                                <Badge variant={code.type === 'percent' ? "default" : "secondary"} className="h-5 text-[10px] px-1.5">
                                                                    {code.type === 'percent' ? '%' : '₺'}
                                                                </Badge>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => removeDiscountCode(i)}
                                                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    )}
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Stock Alerts */}
                    <Card className="border shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-secondary/50 rounded-xl">
                                        <Package className="h-5 w-5 text-foreground/80" />
                                    </div>
                                    <CardTitle className="text-xl font-semibold tracking-tight">{t('stockScarcityRules') || "Stock Scarcity Rules"}</CardTitle>
                                </div>
                                <Switch
                                    checked={config.stockAlerts}
                                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, stockAlerts: checked }))}
                                />
                            </div>
                            <CardDescription className="pt-2 pl-12">
                                {t('stockScarcityRulesDesc') || "Creating urgency by highlighting low stock items."}
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    {/* Cart Recovery */}
                    <Card className="border shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-secondary/50 rounded-xl">
                                        <ShoppingCart className="h-5 w-5 text-foreground/80" />
                                    </div>
                                    <CardTitle className="text-xl font-semibold tracking-tight">{t('salesOpt.cartRecovery') || "Cart Recovery"}</CardTitle>
                                </div>
                                <Switch
                                    checked={config.cartRecovery}
                                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, cartRecovery: checked }))}
                                />
                            </div>
                            <CardDescription className="pt-2 pl-12">
                                {t('salesOpt.cartRecoveryDesc') || "Strategies to prevent cart abandonment."}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>

                {/* Product Comparison */}
                <Card className={`border shadow-sm hover:shadow-md transition-shadow duration-200 ${config.productComparison ? '' : 'opacity-70'}`}>
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-secondary/50 rounded-xl">
                                    <GitCompare className="h-5 w-5 text-foreground/80" />
                                </div>
                                <CardTitle className="text-xl font-semibold tracking-tight">{t('smartProductComparison') || "Smart Product Comparison"}</CardTitle>
                            </div>
                            <Switch
                                checked={config.productComparison}
                                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, productComparison: checked }))}
                            />
                        </div>
                        <CardDescription>
                            {t('smartProductComparisonDesc') || "Allows the AI to create side-by-side comparison tables for products to help users decide."}
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        </div>
    )
}
