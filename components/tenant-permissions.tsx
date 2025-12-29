"use client"

import { useState } from "react"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ShoppingBag, Mic, FileText, Users, ArrowRight, ArrowLeft, LayoutDashboard, Bot, TrendingUp } from "lucide-react"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface TenantData {
    enablePersonalShopper?: boolean
    visiblePersonalShopper?: boolean
    enableVoiceAssistant?: boolean
    visibleVoiceAssistant?: boolean
    enableCopywriter?: boolean
    visibleCopywriter?: boolean
    enableLeadFinder?: boolean
    visibleLeadFinder?: boolean
    enableSalesOptimization?: boolean
    visibleSalesOptimization?: boolean
    canManageModules?: boolean
    [key: string]: any
}

interface TenantPermissionsProps {
    tenant: TenantData
    userId: string
    onUpdate: (data: Partial<TenantData>) => void
}

interface ModuleConfig {
    id: string
    usageKey: keyof TenantData
    visibilityKey: keyof TenantData
    title: string
    description: string
    icon: any
    color: string
    bgColor: string
}

const INTEGRATED_MODULES: ModuleConfig[] = [
    {
        id: "core-chatbot",
        usageKey: "enableChatbot",
        visibilityKey: "visibleChatbot",
        title: "AI Satış Chatbotu",
        description: "Temel yapay zeka satış asistanınız. 7/24 müşterilerinizle etkileşime geçer.",
        icon: Bot,
        color: "text-primary",
        bgColor: "bg-primary/10",
    },
    {
        id: "personal-shopper",
        usageKey: "enablePersonalShopper",
        visibilityKey: "visiblePersonalShopper",
        title: "Kişisel Alışveriş Asistanı",
        description: "Smart product recommendations and catalog management.",
        icon: ShoppingBag,
        color: "text-neutral-700",
        bgColor: "bg-neutral-100",
    },
    {
        id: "voice-assistant",
        usageKey: "enableVoiceAssistant",
        visibilityKey: "visibleVoiceAssistant",
        title: "Sesli Asistan",
        description: "Kullanıcıların chatbot ile konuşmasına (Ses-Metin) ve yanıtları duymasına (Metin-Ses) izin verin.",
        icon: Mic,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
    }
]

const STANDALONE_MODULES: ModuleConfig[] = [

    {
        id: "sales-optimization",
        usageKey: "enableSalesOptimization",
        visibilityKey: "visibleSalesOptimization",
        title: "Satış Optimizasyonu",
        description: "İndirim kodları, stok uyarıları, sepet kurtarma ve ürün karşılaştırma özellikleri.",
        icon: TrendingUp,
        color: "text-emerald-600",
        bgColor: "bg-emerald-100",
    }
]

export function TenantPermissions({ tenant, userId, onUpdate }: TenantPermissionsProps) {
    const [permissions, setPermissions] = useState({
        enablePersonalShopper: tenant.enablePersonalShopper || false,
        visiblePersonalShopper: tenant.visiblePersonalShopper ?? true,
        enableVoiceAssistant: tenant.enableVoiceAssistant ?? true,
        visibleVoiceAssistant: tenant.visibleVoiceAssistant ?? true,
        enableCopywriter: tenant.enableCopywriter ?? true,
        visibleCopywriter: tenant.visibleCopywriter ?? true,
        enableLeadFinder: tenant.enableLeadFinder ?? true,
        visibleLeadFinder: tenant.visibleLeadFinder ?? true,
    })
    const [loading, setLoading] = useState<Record<string, boolean>>({})
    const { toast } = useToast()

    const handleToggle = async (key: string) => {
        const newValue = !permissions[key as keyof typeof permissions]
        const previousValue = permissions[key as keyof typeof permissions]

        setPermissions(prev => ({ ...prev, [key]: newValue }))

        // Find if this is a usage key for an integrated module
        const integratedModule = INTEGRATED_MODULES.find(m => m.usageKey === key)
        if (integratedModule) {
            // Sync visible state locally as well
            setPermissions(prev => ({ ...prev, [integratedModule.visibilityKey]: newValue }))
        }

        setLoading(prev => ({ ...prev, [key]: true }))

        try {
            const userRef = doc(db, "users", userId)
            const chatbotRef = doc(db, "chatbots", userId)

            const updates: Record<string, any> = {
                [key]: newValue
            }

            // Sync visibility if it is an integrated module usage toggle
            if (integratedModule) {
                updates[integratedModule.visibilityKey] = newValue
            }

            await updateDoc(userRef, updates)

            // Sycn Integrated Modules to Chatbot config (legacy support)
            if (key === 'enablePersonalShopper') {
                await updateDoc(chatbotRef, {
                    enablePersonalShopper: newValue
                }).catch(e => console.log("Chatbot doc might not exist yet:", e))
            } else if (key === 'enableVoiceAssistant') {
                await updateDoc(chatbotRef, {
                    enableVoiceSupport: newValue
                }).catch(e => console.log("Chatbot doc might not exist yet:", e))
            }

            onUpdate({ [key]: newValue, ...(integratedModule ? { [integratedModule.visibilityKey]: newValue } : {}) })
        } catch (error) {
            console.error("Error updating permission:", error)
            setPermissions(prev => ({ ...prev, [key]: previousValue }))
            if (integratedModule) {
                // Revert visibility as well
                const oldVis = !newValue
                setPermissions(prev => ({ ...prev, [integratedModule.visibilityKey]: oldVis }))
            }
            toast({
                title: "Hata",
                description: "Ayarlar güncellenirken bir sorun oluştu.",
                variant: "destructive"
            })
        } finally {
            setLoading(prev => ({ ...prev, [key]: false }))
        }
    }

    const renderModuleCard = (module: ModuleConfig) => {
        const isEnabled = permissions[module.usageKey as keyof typeof permissions]
        const isVisible = permissions[module.visibilityKey as keyof typeof permissions]
        const isLoading = loading[module.usageKey as string] || loading[module.visibilityKey as string]

        const isIntegrated = INTEGRATED_MODULES.some(m => m.id === module.id)

        return (
            <Card key={module.id} className="relative overflow-hidden transition-all hover:shadow-md border-border/50">
                <div className={`absolute top-0 right-0 p-3`}>
                    <Badge
                        variant={isEnabled ? "default" : "secondary"}
                        className={`${isEnabled ? "bg-green-500 hover:bg-green-600" : "bg-muted text-muted-foreground"} transition-colors`}
                    >
                        {isEnabled ? "Aktif" : "Pasif"}
                    </Badge>
                </div>
                <CardHeader>
                    <div className={`w-10 h-10 rounded-lg ${module.bgColor} flex items-center justify-center mb-2`}>
                        <module.icon className={`h-5 w-5 ${module.color}`} />
                    </div>
                    <CardTitle className="text-base">{module.title}</CardTitle>
                    <CardDescription className="line-clamp-2 text-xs">
                        {module.description}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={isEnabled}
                                    onCheckedChange={() => handleToggle(module.usageKey as string)}
                                    disabled={isLoading}
                                />
                                <span className="text-xs text-muted-foreground">Kullanım</span>
                            </div>
                        </div>

                        {!isIntegrated && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={isVisible}
                                        onCheckedChange={() => handleToggle(module.visibilityKey as string)}
                                        disabled={isLoading}
                                    />
                                    <span className="text-xs text-muted-foreground">Görünürlük</span>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold tracking-tight">Modüller</h3>
                    <p className="text-sm text-muted-foreground">
                        Yapay zeka asistanlarını ve araçlarını yönetin.
                    </p>
                </div>
                {Object.keys(loading).some(k => loading[k]) && (
                    <div className="flex items-center text-sm text-muted-foreground animate-pulse">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Kaydediliyor...
                    </div>
                )}
            </div>

            <div className="space-y-10">
                <div>
                    <div className="mb-4">
                        <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
                            <LayoutDashboard className="h-4 w-4" />
                            Bağımsız Araçlar
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            Bu araçlar, yönetim panelinden bağımsız olarak kullanılır ve chatbot widget&apos;ını etkilemez.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {STANDALONE_MODULES.map(renderModuleCard)}
                    </div>
                </div>
            </div>
        </div>
    )
}
