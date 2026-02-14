"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tag, Package, ShoppingCart, GitCompare, Loader2, Plus, Trash2 } from "lucide-react"
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

interface SalesOptimizationSettingsFormProps {
    targetUserId: string
    isSuperAdmin?: boolean
}

export function SalesOptimizationSettingsForm({ targetUserId, isSuperAdmin = false }: SalesOptimizationSettingsFormProps) {
    const { t, language } = useLanguage()
    const { user } = useAuth()
    const { toast } = useToast()

    const effectiveUserId = targetUserId

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [config, setConfig] = useState<SalesOptimizationConfig>(DEFAULT_CONFIG)
    const [newCode, setNewCode] = useState<DiscountCode>({ code: '', discount: 10, type: 'percent', usageType: 'auto' })
    const [shownCodes, setShownCodes] = useState<Record<string, boolean>>({})

    const resetShownStatus = (codeId: string) => {
        setShownCodes(prev => {
            const newState = { ...prev }
            delete newState[codeId]
            return newState
        })
    }

    useEffect(() => {
        const loadConfig = async () => {
            if (!effectiveUserId || !user) return
            try {
                const token = await user.getIdToken();
                const response = await fetch(`/api/console/settings?chatbotId=${effectiveUserId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
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
    }, [effectiveUserId, user])

    // Check localStorage for "shown" tags - Realtime (Only relevant for User View/Testing)
    useEffect(() => {
        if (typeof window === 'undefined' || isSuperAdmin) return

        const checkStatus = () => {
            const checks: Record<string, boolean> = {}
            config.discountCodeConfig?.codes.forEach(code => {
                const key = `vion_auto_offer_shown_${code.code}`
                if (localStorage.getItem(key) === 'true') {
                    checks[code.code] = true
                }
            })
            setShownCodes(checks)
        }

        checkStatus()
        window.addEventListener('storage', checkStatus)
        window.addEventListener('local-storage-update', checkStatus)

        return () => {
            window.removeEventListener('storage', checkStatus)
            window.removeEventListener('local-storage-update', checkStatus)
        }
    }, [config.discountCodeConfig?.codes, isSuperAdmin])

    const saveConfig = async () => {
        if (!effectiveUserId || !user) return
        setIsSaving(true)
        try {
            const token = await user.getIdToken();

            // Ensure autoOffer matches the codes state
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
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-8 p-8 pt-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            {t('modules.salesOptimization') || "Sales Optimization"}
                        </h2>
                        <p className="text-muted-foreground mt-1">
                            {t('modules.salesOptimizationDesc') || "Configure discount codes, stock alerts, cart recovery and product comparison features"}
                        </p>
                    </div>
                </div>
                <Button onClick={saveConfig} disabled={isSaving} className="min-w-[100px]">
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('save') || "Save"}
                </Button>
            </div>

            <div className="grid gap-6">
                {/* Discount Codes - Full Width */}
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
                                <div className="">
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

                                        <select
                                            value={newCode.usageType}
                                            onChange={(e) => setNewCode(prev => ({ ...prev, usageType: e.target.value as 'auto' | 'chat_only' }))}
                                            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        >
                                            <option value="auto">
                                                {language === 'tr' ? 'Otomatik Teklif' : 'Auto Offer'}
                                            </option>
                                            <option value="chat_only">
                                                {language === 'tr' ? 'Sadece Sohbet' : 'Chat Only'}
                                            </option>
                                        </select>

                                        <Button onClick={addDiscountCode} className="bg-purple-600 hover:bg-purple-700">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    {newCode.usageType === 'auto' && (
                                        <div className="bg-white p-4 rounded-xl mt-5 border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-1.5 flex-1">
                                                <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                                    {language === 'tr' ? 'Otomatik Teklif Süresi' : 'Auto-Offer Delay'}
                                                    <Badge variant="outline" className="font-normal text-[10px] px-1.5 py-0 h-5">Timer</Badge>
                                                </Label>
                                                <p className="text-sm text-muted-foreground leading-relaxed">
                                                    {language === 'tr'
                                                        ? 'Bu kod, kullanıcının hareketsiz kaldığı süre sonunda sunulur.'
                                                        : 'This code will be shown after this period of inactivity.'}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border">
                                                <Input
                                                    type="number"
                                                    value={config.discountCodeConfig?.offerAfterSeconds || 30}
                                                    onChange={(e) => setConfig(prev => ({
                                                        ...prev,
                                                        discountCodeConfig: {
                                                            ...prev.discountCodeConfig!,
                                                            offerAfterSeconds: parseInt(e.target.value),
                                                            autoOffer: true // Always enable if setting time
                                                        }
                                                    }))}
                                                    className="w-14 h-8 border-0 bg-transparent p-0 text-center focus-visible:ring-0 font-medium text-lg"
                                                />
                                                <span className="text-sm text-muted-foreground font-medium pr-1">
                                                    {t('seconds') || "s"}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-0">
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
                                                    <TableHead>{t('status') || "Status"}</TableHead>
                                                    <TableHead className="text-right">{t('actions') || "Actions"}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {config.discountCodeConfig?.codes.map((code, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell>
                                                            <div className="flex flex-col gap-1">
                                                                <span className="font-mono font-medium text-lg">{code.code}</span>
                                                                {(code.usageType === 'auto' || (!code.usageType && i === 0)) ? (
                                                                    <p className="text-xs text-purple-600 font-medium leading-snug flex items-center gap-1">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-600 inline-block" />
                                                                        {language === 'tr'
                                                                            ? 'Otomatik Teklif (Gecikmeli)'
                                                                            : 'Auto-Offer (Delayed)'}

                                                                        {!isSuperAdmin && shownCodes[code.code] && (
                                                                            <span className="ml-2 px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] border border-slate-200">
                                                                                {language === 'tr' ? 'Size Gösterildi' : 'Shown to You'}
                                                                            </span>
                                                                        )}
                                                                    </p>
                                                                ) : (
                                                                    <div className="flex items-center gap-1.5 mt-1">
                                                                        <Badge variant="outline" className="text-[10px] h-5 bg-slate-50 text-muted-foreground border-slate-200 font-normal">
                                                                            {language === 'tr' ? 'Sadece Sohbet' : 'Chat Only'}
                                                                        </Badge>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>

                                                        {/* Discount Column */}
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

                                                        {/* Status Column */}
                                                        <TableCell>
                                                            {!isSuperAdmin && shownCodes[code.code] ? (
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="secondary" className="bg-slate-100 text-slate-500 hover:bg-slate-200 gap-1 pr-1">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                                        {language === 'tr' ? 'Size Gösterildi' : 'Shown to You'}
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-4 w-4 ml-1 hover:bg-slate-300 rounded-full"
                                                                            onClick={() => resetShownStatus(code.code)}
                                                                        >
                                                                            <Trash2 className="h-2.5 w-2.5 text-slate-600" />
                                                                            <span className="sr-only">Reset</span>
                                                                        </Button>
                                                                    </Badge>
                                                                </div>
                                                            ) : (
                                                                (code.usageType === 'auto' || (!code.usageType && i === 0)) ? (
                                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 gap-1.5">
                                                                        <span className="relative flex h-1.5 w-1.5">
                                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                                                        </span>
                                                                        {language === 'tr' ? 'Hazır' : 'Ready'}
                                                                    </Badge>
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground">-</span>
                                                                )
                                                            )}
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
                        {config.stockAlerts && (
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border p-3 rounded-lg">
                                        <Label className="flex-1">{t('salesOpt.alertThreshold') || "Alert Threshold"}</Label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground">{t('below') || "Below"}</span>
                                            <Input
                                                type="number"
                                                value={config.stockAlertConfig?.lowStockThreshold || 5}
                                                onChange={(e) => setConfig(prev => ({
                                                    ...prev,
                                                    stockAlertConfig: { ...prev.stockAlertConfig!, lowStockThreshold: parseInt(e.target.value) }
                                                }))}
                                                className="w-16 h-8 text-center"
                                            />
                                            <span className="text-sm text-muted-foreground">{t('units') || "units"}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between border p-3 rounded-lg">
                                        <div className="space-y-0.5">
                                            <Label>{t('salesOpt.showExactCount') || "Show Exact Count"}</Label>
                                            <p className="text-xs text-muted-foreground">{t('salesOpt.showExactCountDesc') || '"Only 3 items left" vs "Low Stock"'}</p>
                                        </div>
                                        <Switch
                                            checked={config.stockAlertConfig?.showExactCount}
                                            onCheckedChange={(checked) => setConfig(prev => ({
                                                ...prev,
                                                stockAlertConfig: { ...prev.stockAlertConfig!, showExactCount: checked }
                                            }))}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        )}
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
                        {config.cartRecovery && (
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border p-3 rounded-lg">
                                        <Label>{t('salesOpt.triggerTimer') || "Trigger Timer"}</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                value={config.cartRecoveryConfig?.triggerAfterSeconds || 60}
                                                onChange={(e) => setConfig(prev => ({
                                                    ...prev,
                                                    cartRecoveryConfig: { ...prev.cartRecoveryConfig!, triggerAfterSeconds: parseInt(e.target.value) }
                                                }))}
                                                className="w-16 h-8 text-center"
                                            />
                                            <span className="text-xs text-muted-foreground">{t('salesOpt.secondsOfInactivity') || "seconds of inactivity"}</span>
                                        </div>
                                    </div>

                                    <div className="border p-3 rounded-lg space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label>{t('salesOpt.offerRecoveryDiscount') || "Offer Recovery Discount"}</Label>
                                            <Switch
                                                checked={config.cartRecoveryConfig?.offerDiscount}
                                                onCheckedChange={(checked) => setConfig(prev => ({
                                                    ...prev,
                                                    cartRecoveryConfig: { ...prev.cartRecoveryConfig!, offerDiscount: checked }
                                                }))}
                                            />
                                        </div>

                                        {config.cartRecoveryConfig?.offerDiscount && (
                                            <div className="flex items-center gap-4 pt-2 border-t">
                                                <Label className="text-sm text-muted-foreground">{t('salesOpt.discountAmount') || "Discount Amount:"}</Label>
                                                <div className="flex items-center gap-2 ml-auto">
                                                    <Input
                                                        type="number"
                                                        value={config.cartRecoveryConfig?.discountPercent || 10}
                                                        onChange={(e) => setConfig(prev => ({
                                                            ...prev,
                                                            cartRecoveryConfig: { ...prev.cartRecoveryConfig!, discountPercent: parseInt(e.target.value) }
                                                        }))}
                                                        className="w-16 h-8 text-center font-bold text-blue-600"
                                                    />
                                                    <span className="font-bold text-blue-600">%</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                </div>

                {/* Product Comparison - Full Width if enabled, or just a small card */}
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
            </div >
        </div >
    )
}
