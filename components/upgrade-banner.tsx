"use client"

import { useLanguage } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button"
import { X, Sparkles, ArrowRight } from "lucide-react"
import { useState } from "react"
import { UpgradePrompt } from "@/lib/upgrade-intelligence"
import { useRouter } from "next/navigation"

interface UpgradeBannerProps {
    prompt?: UpgradePrompt
}

export function UpgradeBanner({ prompt }: UpgradeBannerProps = {}) {
    const router = useRouter()
    const { language } = useLanguage()
    const [dismissed, setDismissed] = useState(false)

    if (dismissed) return null

    // If no prompt provided or shouldn't show, don't render
    if (prompt && !prompt.shouldShow) return null

    const handleUpgradeClick = () => {
        console.log("upgrade_intent", { source: "banner", reason: prompt?.reason })
        router.push("/console/subscription")
    }

    // Use prompt if provided, otherwise fallback to generic message
    const title = prompt?.title || (language === 'tr'
        ? 'İşletmenizi büyütmeye hazır mısınız? Premium özellikleri keşfedin.'
        : 'Ready to grow your business? Explore premium features.')

    const ctaLabel = prompt?.ctaLabel || (language === 'tr' ? 'Planları Gör' : 'View Plans')

    return (
        <div className="bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-transparent border-b border-violet-500/10 dark:border-violet-500/5 px-4 py-2.5">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {title}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                        size="sm"
                        className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5 h-8 text-xs font-medium"
                        onClick={handleUpgradeClick}
                    >
                        {ctaLabel}
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                    <button
                        onClick={() => setDismissed(true)}
                        className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md transition-colors text-zinc-500"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
