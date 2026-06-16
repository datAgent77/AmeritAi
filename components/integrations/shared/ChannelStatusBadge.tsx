"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/context/LanguageContext"
import type { MetaConsoleChannelState } from "@/lib/omni/types"

const STATE_STYLES: Record<MetaConsoleChannelState, string> = {
    not_started: "bg-muted text-muted-foreground border-border",
    checking: "bg-blue-50 text-blue-700 border-blue-200",
    needs_user_action: "bg-amber-50 text-amber-700 border-amber-200",
    pending_verification: "bg-sky-50 text-sky-700 border-sky-200",
    connected: "bg-emerald-50 text-emerald-700 border-emerald-200",
    degraded: "bg-orange-50 text-orange-700 border-orange-200",
    reauth_required: "bg-rose-50 text-rose-700 border-rose-200",
    failed: "bg-destructive/10 text-destructive border-destructive/20",
}

const STATE_LABELS: Record<string, Record<MetaConsoleChannelState, string>> = {
    tr: {
        not_started: "Başlamadı",
        checking: "Kontrol Ediliyor",
        needs_user_action: "Aksiyon Gerekli",
        pending_verification: "Doğrulanıyor",
        connected: "Bağlı",
        degraded: "Sorunlu",
        reauth_required: "Yeniden Bağlan",
        failed: "Başarısız",
    },
    en: {
        not_started: "Not Started",
        checking: "Checking",
        needs_user_action: "Action Required",
        pending_verification: "Verifying",
        connected: "Connected",
        degraded: "Degraded",
        reauth_required: "Reconnect",
        failed: "Failed",
    },
    es: {
        not_started: "Sin iniciar",
        checking: "Comprobando",
        needs_user_action: "Acción requerida",
        pending_verification: "Verificando",
        connected: "Conectado",
        degraded: "Degradado",
        reauth_required: "Reconectar",
        failed: "Fallido",
    },
}

export function ChannelStatusBadge({ state, className }: { state: MetaConsoleChannelState; className?: string }) {
    const { language } = useLanguage()
    const labels = STATE_LABELS[language] || STATE_LABELS.en
    return (
        <Badge variant="outline" className={cn("rounded-full px-3 py-1 text-[11px] font-medium", STATE_STYLES[state], className)}>
            {labels[state]}
        </Badge>
    )
}
