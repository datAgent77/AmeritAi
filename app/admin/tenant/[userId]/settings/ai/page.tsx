"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Save, Bot, Settings2, Sparkles, Zap, DollarSign, Globe } from "lucide-react"

interface ModelOption {
    id: string
    name: string
    inputCost: string
    outputCost: string
    badge?: string
}

const MODELS: Record<string, ModelOption[]> = {
    openai: [
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', inputCost: '$0.15', outputCost: '$0.60', badge: 'badgeMostEconomical' },
        { id: 'gpt-4o', name: 'GPT-4o', inputCost: '$3.00', outputCost: '$10.00', badge: 'badgeBalanced' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', inputCost: '$0.50', outputCost: '$1.50', badge: 'badgeClassic' },
    ],
    google: [
        { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash-8B', inputCost: '$0.0375', outputCost: '$0.15', badge: 'badgeCheapest' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', inputCost: '$0.075', outputCost: '$0.30', badge: 'fast' },
    ]
}

const PROVIDERS = [
    { id: 'openai', name: 'OpenAI', description: 'providerOpenaiDesc' },
    { id: 'google', name: 'Google Gemini', description: 'lowestCost' },
]

export default function TenantAISettingsPage() {
    const { user } = useAuth()
    const { t } = useLanguage()
    const { toast } = useToast()
    const params = useParams()
    const chatbotId = params.userId as string

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    const [useGlobalDefaults, setUseGlobalDefaults] = useState(true)
    const [provider, setProvider] = useState("openai")
    const [model, setModel] = useState("gpt-4o-mini")

    // Global config state
    const [globalConfig, setGlobalConfig] = useState<{ provider: string; model: string } | null>(null)

    useEffect(() => {
        if (!user || !chatbotId) return

        const fetchSettings = async () => {
            try {
                const token = await user.getIdToken()

                // Fetch tenant config
                const res = await fetch(`/api/admin/tenant-ai-config?chatbotId=${chatbotId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (res.ok) {
                    const data = await res.json()
                    setUseGlobalDefaults(data.useGlobalDefaults !== false)
                    setProvider(data.provider || "openai")
                    setModel(data.model || "gpt-4o-mini")
                }

                // Fetch global config
                const globalRes = await fetch('/api/admin/system-settings', {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (globalRes.ok) {
                    const globalData = await globalRes.json()
                    setGlobalConfig({
                        provider: globalData.provider || 'openai',
                        model: globalData.model || 'gpt-4o-mini'
                    })
                }
            } catch (error) {
                console.error("Failed to load tenant AI settings", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchSettings()
    }, [user, chatbotId])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            const token = await user?.getIdToken()
            const res = await fetch("/api/admin/tenant-ai-config", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    chatbotId,
                    useGlobalDefaults,
                    provider: useGlobalDefaults ? null : provider,
                    model: useGlobalDefaults ? null : model
                })
            })

            if (res.ok) {
                toast({ title: t('saved'), description: t('aiConfigSaved') })
            } else {
                throw new Error("Failed to save")
            }
        } catch (error) {
            toast({ title: t('error'), description: t('settingsSaveFailed'), variant: "destructive" })
        } finally {
            setIsSaving(false)
        }
    }

    const selectedModel = MODELS[provider]?.find(m => m.id === model)

    // Find global model info
    const globalModelInfo = globalConfig
        ? MODELS[globalConfig.provider]?.find(m => m.id === globalConfig.model)
        : null
    const globalProviderInfo = globalConfig
        ? PROVIDERS.find(p => p.id === globalConfig.provider)
        : null

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-xl">
                    <Bot className="w-8 h-8 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('aiConfiguration')}</h1>
                    <p className="text-muted-foreground">{t('aiConfigPageDesc')}</p>
                </div>
            </div>

            <form onSubmit={handleSave}>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings2 className="w-5 h-5" />
                            {t('modelSelection')}
                        </CardTitle>
                        <CardDescription>
                            {t('modelSelectionDesc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label className="text-base">{t('useGlobalDefaults')}</Label>
                                <p className="text-sm text-muted-foreground">
                                    {t('useGlobalDefaultsDesc')}
                                </p>
                            </div>
                            <Switch
                                checked={useGlobalDefaults}
                                onCheckedChange={setUseGlobalDefaults}
                            />
                        </div>

                        {/* Global Config Display */}
                        {useGlobalDefaults && globalConfig && (
                            <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Globe className="w-5 h-5 text-primary" />
                                    <span className="font-semibold text-primary">{t('activeGlobalSetting')}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <p className="text-sm text-muted-foreground">{t('providerLabel')}</p>
                                        <p className="font-medium">{globalProviderInfo?.name || globalConfig.provider}</p>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-muted-foreground">{t('modelLabel')}</p>
                                        <p className="font-medium">{globalModelInfo?.name || globalConfig.model}</p>
                                    </div>
                                    {globalModelInfo && (
                                        <div className="flex-1">
                                            <p className="text-sm text-muted-foreground">{t('cost')}</p>
                                            <p className="font-medium text-sm">
                                                <span className="text-green-600">{t('inputLabel')} {globalModelInfo.inputCost}</span>
                                                {' / '}
                                                <span className="text-blue-600">{t('outputLabel')} {globalModelInfo.outputCost}</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {!useGlobalDefaults && (
                            <div className="space-y-6 pt-4 border-t">
                                {/* Provider Selection */}
                                <div className="space-y-4">
                                    <Label className="text-base">{t('aiProvider')}</Label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {PROVIDERS.map(p => (
                                            <div
                                                key={p.id}
                                                onClick={() => {
                                                    setProvider(p.id)
                                                    setModel(MODELS[p.id][0].id)
                                                }}
                                                className={`cursor-pointer flex flex-col items-center justify-between rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground transition-colors ${provider === p.id ? 'border-primary bg-accent' : 'border-muted bg-popover'}`}
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className={`w-4 h-4 rounded-full border border-primary ${provider === p.id ? 'bg-primary' : ''}`} />
                                                    <span className="text-lg font-semibold">{p.name}</span>
                                                </div>
                                                <span className="text-sm text-center text-muted-foreground">
                                                    {t(p.description)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Model Selection with Pricing */}
                                <div className="space-y-4">
                                    <Label className="text-base">{t('modelSelection')}</Label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {MODELS[provider]?.map(m => (
                                            <div
                                                key={m.id}
                                                onClick={() => setModel(m.id)}
                                                className={`cursor-pointer rounded-lg border-2 p-4 hover:bg-accent transition-colors ${model === m.id ? 'border-primary bg-accent' : 'border-muted'}`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-4 h-4 rounded-full border border-primary ${model === m.id ? 'bg-primary' : ''}`} />
                                                        <span className="font-semibold">{m.name}</span>
                                                    </div>
                                                    {m.badge && (
                                                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                                            {t(m.badge)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4 mt-3 text-sm">
                                                    <div className="flex items-center gap-1 text-muted-foreground">
                                                        <Zap className="w-3 h-3" />
                                                        <span>{t('inputLabel')}</span>
                                                        <span className="font-medium text-foreground">{m.inputCost}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-muted-foreground">
                                                        <Sparkles className="w-3 h-3" />
                                                        <span>{t('outputLabel')}</span>
                                                        <span className="font-medium text-foreground">{m.outputCost}</span>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-2">
                                                    /1M token
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Selected Model Summary */}
                                {selectedModel && (
                                    <div className="rounded-lg bg-muted/50 p-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            <DollarSign className="w-4 h-4 text-green-600" />
                                            <span className="font-medium">{t('selectedModelLabel')}</span>
                                            <span>{selectedModel.name}</span>
                                            <span className="text-muted-foreground">•</span>
                                            <span className="text-muted-foreground">
                                                {t('inputLabel')} {selectedModel.inputCost} / {t('outputLabel')} {selectedModel.outputCost} per 1M token
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                    <div className="p-6 pt-0 flex justify-end">
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Save className="mr-2 h-4 w-4" />
                            {t('save')}
                        </Button>
                    </div>
                </Card>
            </form>
        </div>
    )
}

