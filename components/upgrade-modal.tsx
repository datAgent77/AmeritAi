"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Sparkles, ArrowRight } from "lucide-react"

import {
    trackUpgradeModalOpened,
    trackUpgradeIntent,
    trackUpgradeModalDismissed,
    EventSource,
} from "@/lib/event-tracking"

import {
    UpgradePrompt,
    markPromptShown,
} from "@/lib/upgrade-intelligence"

interface UpgradeModalProps {
    isOpen: boolean
    onClose: () => void

    /** Yeni sistem */
    prompt?: UpgradePrompt

    /** Legacy destek (geri uyumluluk) */
    moduleName?: string
    description?: string
    icon?: React.ComponentType<{ className?: string }>
}

export function UpgradeModal({
    isOpen,
    onClose,
    prompt,
    moduleName,
    description,
    icon: Icon,
}: UpgradeModalProps) {
    const { language } = useLanguage()
    const router = useRouter()

    /* ------------------------------------------------------------------
     * DISPLAY LOGIC (tek source of truth)
     * ------------------------------------------------------------------ */

    const title =
        prompt?.title ??
        (moduleName
            ? language === "tr"
                ? `${moduleName} Premium`
                : `${moduleName} is Premium`
            : language === "tr"
                ? "Premium Özellik"
                : "Premium Feature")

    const desc =
        prompt?.description ??
        description ??
        (language === "tr"
            ? "Bu özelliği kullanmak için planınızı yükseltmeniz gerekir."
            : "Upgrade your plan to use this feature.")

    const ctaLabel =
        prompt?.ctaLabel ??
        (language === "tr" ? "Planları Gör" : "View Plans")

    const reason = (prompt?.reason ?? "unknown") as EventSource | undefined

    /* ------------------------------------------------------------------
     * TRACK: modal opened
     * ------------------------------------------------------------------ */
    useEffect(() => {
        if (!isOpen) return
        trackUpgradeModalOpened(title, reason)
    }, [isOpen, title, reason])

    /* ------------------------------------------------------------------
     * ACTIONS
     * ------------------------------------------------------------------ */

    const handleUpgradeClick = () => {
        trackUpgradeIntent(title, reason)

        // ❗ Çok önemli: pricing’e giderken prompt tekrar gösterilmesin
        markPromptShown()

        // Detect if we are on onboarding page using window location if possible or just assume context
        // Ideally we should know where we are opening this modal from.
        // But for now, since this modal is mainly used in onboarding context when locked modules are clicked,
        // we can try to be smart or just pass a generic param if needed. 
        // However, the request specifically mentioned "from onboarding".
        // Let's check the current pathname if we are on client side.

        let returnUrl = "/pricing"
        if (typeof window !== "undefined" && window.location.pathname.includes("onboarding")) {
            returnUrl += "?from=onboarding"
        }

        router.push(returnUrl)
        onClose()
    }

    const handleDismiss = () => {
        trackUpgradeModalDismissed(title)

        // ❗ Session içinde bir daha çıkmasın
        markPromptShown()

        onClose()
    }

    /* ------------------------------------------------------------------
     * RENDER
     * ------------------------------------------------------------------ */

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) handleDismiss()
            }}
        >
            <DialogContent className="sm:max-w-[420px] px-6 py-0 overflow-hidden bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-lg">

                {/* HEADER */}
                <div className="bg-white dark:bg-zinc-950 p-6 pt-8 text-center border-b border-zinc-100 dark:border-zinc-800/50">
                    <div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                        {Icon ? <Icon className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
                    </div>

                    <DialogTitle className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
                        {title}
                    </DialogTitle>

                    <Badge variant="secondary" className="gap-1 bg-violet-100 text-violet-700 hover:bg-violet-200 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800">
                        <Sparkles className="w-3 h-3" />
                        {language === "tr" ? "Premium Özellik" : "Premium Feature"}
                    </Badge>
                </div>

                {/* BODY */}
                <div className="p-6 space-y-6">
                    <DialogDescription className="text-center text-zinc-500 dark:text-zinc-400 text-base leading-relaxed max-w-[90%] mx-auto">
                        {desc} {language === "tr" ? "Bu özellik işletmenizi büyütmek için tasarlanmış gelişmiş araçlar sunar. Şimdi yükseltin ve sınırları kaldırın." : "This feature offers advanced tools designed to grow your business. Upgrade now and remove limits."}
                    </DialogDescription>

                    <div className="space-y-3">
                        <Button
                            size="lg"
                            className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white"
                            onClick={handleUpgradeClick}
                        >
                            {ctaLabel}
                            <ArrowRight className="w-4 h-4" />
                        </Button>

                        <Button
                            variant="ghost"
                            className="w-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                            onClick={handleDismiss}
                        >
                            {language === "tr" ? "Daha Sonra" : "Maybe Later"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
