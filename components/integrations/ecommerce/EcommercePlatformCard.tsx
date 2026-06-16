"use client"

import { useState } from "react"
import { CheckCircle2, AlertCircle, RefreshCw, Unplug, PlugZap, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/context/LanguageContext"
import type { EcomConnection } from "@/lib/integrations/ecommerce/types"
import type { PlatformMeta } from "@/lib/integrations/ecommerce/platform-registry"

interface Props {
    connection?: EcomConnection
    meta: PlatformMeta
    chatbotId: string
    onConnect: () => void
    onDisconnect: () => Promise<void>
    onSync: () => Promise<void>
}

function statusBadge(status: string | undefined, t: (key: string) => string) {
    if (status === "active") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{t('ecomActive')}</Badge>
    if (status === "error") return <Badge className="bg-rose-100 text-rose-700 border-rose-200">{t('ecomError')}</Badge>
    return <Badge variant="outline" className="text-zinc-500">{t('ecomNotConnected')}</Badge>
}

export function EcommercePlatformCard({ connection, meta, chatbotId, onConnect, onDisconnect, onSync }: Props) {
    const { t } = useLanguage()
    const [disconnecting, setDisconnecting] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const isConnected = !!connection && connection.status === "active"

    async function handleDisconnect() {
        setDisconnecting(true)
        try { await onDisconnect() } finally { setDisconnecting(false) }
    }

    async function handleSync() {
        setSyncing(true)
        try { await onSync() } finally { setSyncing(false) }
    }

    return (
        <Card className={isConnected ? "border-emerald-200 bg-emerald-50/40" : "border-zinc-200"}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg border border-zinc-200 bg-white flex items-center justify-center p-2 shrink-0">
                            <img
                                src={meta.logoUrl}
                                alt={meta.name}
                                className="max-w-full max-h-full object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none"
                                }}
                            />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-semibold">{meta.name}</CardTitle>
                            {connection?.storeName && (
                                <p className="text-xs text-zinc-500 mt-0.5">{connection.storeName}</p>
                            )}
                        </div>
                    </div>
                    {statusBadge(connection?.status, t)}
                </div>
            </CardHeader>

            {isConnected && connection && (
                <CardContent className="pt-0 pb-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs bg-white/70 rounded-md border border-emerald-100 p-3">
                        <div>
                            <p className="text-zinc-500 mb-0.5">{t('ecomProducts')}</p>
                            <p className="font-semibold">{connection.syncedProductCount.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-zinc-500 mb-0.5">{t('ecomOrders')}</p>
                            <p className="font-semibold">{connection.syncedOrderCount.toLocaleString()}</p>
                        </div>
                        {connection.lastProductSyncAt && (
                            <div className="col-span-2">
                                <p className="text-zinc-500 mb-0.5">{t('ecomLastSync')}</p>
                                <p className="font-medium">
                                    {new Date(connection.lastProductSyncAt).toLocaleString()}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-xs border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                            onClick={handleSync}
                            disabled={syncing}
                        >
                            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
                            {t('ecomSyncNow')}
                        </Button>

                        {connection.storeUrl && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs text-zinc-500"
                                asChild
                            >
                                <a href={connection.storeUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                                    {t('ecomOpenStore')}
                                </a>
                            </Button>
                        )}

                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 ml-auto"
                            onClick={handleDisconnect}
                            disabled={disconnecting}
                        >
                            <Unplug className="w-3.5 h-3.5 mr-1.5" />
                            {t('ecomDisconnect')}
                        </Button>
                    </div>
                </CardContent>
            )}

            {!isConnected && (
                <CardContent className="pt-0 pb-4">
                    <CardDescription className="text-xs mb-3">
                        {t('ecomConnectDesc').replace('{platform}', meta.name)}
                    </CardDescription>
                    <Button size="sm" className="w-full" onClick={onConnect}>
                        <PlugZap className="w-3.5 h-3.5 mr-2" />
                        {t('ecomConnect')}
                    </Button>
                </CardContent>
            )}
        </Card>
    )
}
