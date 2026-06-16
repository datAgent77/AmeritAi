"use client"

import { useState, useEffect, useCallback } from "react"
import { Store, AlertCircle, CheckCircle2 } from "lucide-react"
import { EcommercePlatformCard } from "./EcommercePlatformCard"
import { EcommerceConnectionForm } from "./EcommerceConnectionForm"
import { PLATFORM_META } from "@/lib/integrations/ecommerce/platform-registry"
import { useLanguage } from "@/context/LanguageContext"
import type { EcomConnection, EcomPlatform } from "@/lib/integrations/ecommerce/types"

interface Props {
    chatbotId: string
}

export function EcommerceIntegrationsPanel({ chatbotId }: Props) {
    const { t } = useLanguage()
    const [connections, setConnections] = useState<EcomConnection[]>([])
    const [loading, setLoading] = useState(true)
    const [connectingPlatform, setConnectingPlatform] = useState<EcomPlatform | null>(null)
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

    const loadConnections = useCallback(async () => {
        try {
            const res = await fetch(`/api/ecommerce/status?chatbotId=${chatbotId}`)
            const data = await res.json()
            setConnections(data.connections || [])
        } catch {
            // non-blocking
        } finally {
            setLoading(false)
        }
    }, [chatbotId])

    useEffect(() => { loadConnections() }, [loadConnections])

    function showToast(type: "success" | "error", message: string) {
        setToast({ type, message })
        setTimeout(() => setToast(null), 3500)
    }

    async function handleDisconnect(platform: EcomPlatform) {
        const res = await fetch(`/api/ecommerce/connect?chatbotId=${chatbotId}&platform=${platform}`, {
            method: "DELETE",
        })
        if (res.ok) {
            setConnections(prev => prev.filter(c => c.platform !== platform))
            showToast("success", t('ecomDisconnectedToast').replace('{platform}', PLATFORM_META[platform].name))
        } else {
            showToast("error", t('ecomDisconnectFailedToast'))
        }
    }

    async function handleSync(platform: EcomPlatform) {
        const res = await fetch("/api/ecommerce/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chatbotId, platform, type: "all" }),
        })
        const data = await res.json()
        if (res.ok) {
            showToast("success", t('ecomSyncDoneToast').replace('{products}', String(data.syncedProducts)).replace('{orders}', String(data.syncedOrders)))
            await loadConnections()
        } else {
            showToast("error", data.error || t('ecomSyncFailedToast'))
        }
    }

    function handleConnectSuccess(platform: EcomPlatform, result: { connectionId: string; storeName?: string }) {
        setConnectingPlatform(null)
        showToast("success", t('ecomConnectedToast').replace('{platform}', PLATFORM_META[platform].name).replace('{store}', result.storeName ? `"${result.storeName}"` : ""))
        loadConnections()
    }

    const platforms = Object.values(PLATFORM_META)
    const popularFirst = [...platforms.filter(p => p.popular), ...platforms.filter(p => !p.popular)]

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all
                    ${toast.type === "success"
                        ? "bg-emerald-600 text-white"
                        : "bg-rose-600 text-white"
                    }`}>
                    {toast.type === "success"
                        ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                        : <AlertCircle className="w-4 h-4 shrink-0" />
                    }
                    {toast.message}
                </div>
            )}

            <div>
                <div className="flex items-center gap-2 mb-1">
                    <Store className="w-5 h-5 text-zinc-700" />
                    <h2 className="text-lg font-semibold tracking-tight">{t('ecomPanelHeading')}</h2>
                </div>
                <p className="text-sm text-zinc-500">
                    {t('ecomPanelSubtitle')}
                </p>
            </div>

            {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-36 rounded-xl bg-zinc-100 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {popularFirst.map(meta => {
                        const connection = connections.find(c => c.platform === meta.id)
                        return (
                            <EcommercePlatformCard
                                key={meta.id}
                                meta={meta}
                                connection={connection as EcomConnection | undefined}
                                chatbotId={chatbotId}
                                onConnect={() => setConnectingPlatform(meta.id)}
                                onDisconnect={() => handleDisconnect(meta.id)}
                                onSync={() => handleSync(meta.id)}
                            />
                        )
                    })}
                </div>
            )}

            {connectingPlatform && (
                <EcommerceConnectionForm
                    open={!!connectingPlatform}
                    meta={PLATFORM_META[connectingPlatform]}
                    chatbotId={chatbotId}
                    onClose={() => setConnectingPlatform(null)}
                    onSuccess={result => handleConnectSuccess(connectingPlatform, result)}
                />
            )}
        </div>
    )
}
