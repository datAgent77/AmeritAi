"use client"

import { CheckCircle2, RefreshCw, Unplug } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { MessengerDMStatusPayload } from "@/lib/integrations/messenger/types"

export function MessengerConnectedState(props: {
    status: MessengerDMStatusPayload
    refreshing?: boolean
    disconnecting?: boolean
    onRefresh: () => void
    onDisconnect: () => void
}) {
    return (
        <Card className="border-emerald-200 bg-emerald-50/60 shadow-sm">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base text-emerald-900 font-semibold">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    Messenger Bağlantısı Aktif
                </CardTitle>
                <CardDescription className="text-emerald-800 text-xs">
                    Vion AI, <strong className="font-semibold">{props.status.config.pageName || "seçili sayfa"}</strong> üzerinden gelen Messenger mesajlarını başarıyla yanıtlıyor.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 text-sm text-emerald-900 bg-white/60 p-4 rounded-lg border border-emerald-100">
                    <div>
                        <p className="text-emerald-600 text-xs font-medium mb-1">Bağlı Facebook Sayfası</p>
                        <p className="font-semibold">{props.status.config.pageName || "-"}</p>
                    </div>
                    <div>
                        <p className="text-emerald-600 text-xs font-medium mb-1">Sayfa ID</p>
                        <p className="font-semibold text-xs font-mono">{props.status.config.pageId || "-"}</p>
                    </div>
                    <div className="sm:col-span-2">
                        <p className="text-emerald-600 text-xs font-medium mb-1">Son Sistem Kontrolü</p>
                        <p className="font-medium text-xs">
                            {props.status.config.preflightResult?.checkedAt
                                ? new Date(props.status.config.preflightResult.checkedAt).toLocaleString("tr-TR")
                                : "Henüz yok"}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50 hover:text-emerald-900 w-full sm:w-auto"
                        onClick={props.onRefresh}
                        disabled={props.refreshing}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Sistemi Yenile
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800 w-full sm:w-auto"
                        onClick={props.onDisconnect}
                        disabled={props.disconnecting}
                    >
                        <Unplug className="mr-2 h-4 w-4" />
                        Bağlantıyı Kaldır
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
