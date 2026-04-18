"use client"

import { CheckCircle2, RefreshCw, Unplug } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { WhatsAppBizStatusPayload } from "@/lib/integrations/whatsapp-business/types"

export function WhatsAppBizConnectedState(props: {
    status: WhatsAppBizStatusPayload
    refreshing?: boolean
    disconnecting?: boolean
    onRefresh: () => void
    onDisconnect: () => void
}) {
    return (
        <Card className="border-emerald-200 bg-emerald-50/60">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-emerald-900">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    WhatsApp Business bağlandı
                </CardTitle>
                <CardDescription className="text-emerald-800">
                    {props.status.config.displayNumber || "Seçili numara"} için mesaj akışı aktif görünüyor.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-2 text-sm text-emerald-900">
                    <p>İşletme hesabı: {props.status.config.wabaId || "-"}</p>
                    <p>Numara: {props.status.config.displayNumber || "-"}</p>
                    <p>Son kontrol: {props.status.config.preflightResult?.checkedAt || "Henüz yok"}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="button" variant="outline" className="border-emerald-200 bg-white text-emerald-900" onClick={props.onRefresh} disabled={props.refreshing}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Durumu yenile
                    </Button>
                    <Button type="button" variant="outline" className="border-rose-200 bg-white text-rose-700" onClick={props.onDisconnect} disabled={props.disconnecting}>
                        <Unplug className="mr-2 h-4 w-4" />
                        Bağlantıyı kaldır
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
