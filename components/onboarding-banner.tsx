"use client"

import { useLanguage } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button"
import { X, Rocket, Copy } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"

export function OnboardingBanner() {
    const { language } = useLanguage()
    const router = useRouter()
    const { user } = useAuth()
    const [dismissed, setDismissed] = useState(false)
    const [copied, setCopied] = useState(false)

    if (dismissed) return null

    const handleCopyCode = () => {
        const code = `<script src="${window.location.origin}/widget.js" data-chatbot-id="${user?.uid}"></script>`
        navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-4 py-2.5">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Rocket className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">
                        {language === 'tr'
                            ? '🎉 Widget kurulumunuz henüz tamamlanmadı. Chatbot\'unuzu web sitenize ekleyin!'
                            : '🎉 Widget installation incomplete. Add your chatbot to your website!'}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                        size="sm"
                        variant="secondary"
                        className="bg-white/20 hover:bg-white/30 text-white border-0 gap-1.5"
                        onClick={handleCopyCode}
                    >
                        <Copy className="w-3.5 h-3.5" />
                        {copied
                            ? (language === 'tr' ? 'Kopyalandı!' : 'Copied!')
                            : (language === 'tr' ? 'Kodu Kopyala' : 'Copy Code')
                        }
                    </Button>
                    <Button
                        size="sm"
                        variant="secondary"
                        className="bg-white text-violet-600 hover:bg-white/90 border-0"
                        onClick={() => router.push("/onboarding")}
                    >
                        {language === 'tr' ? 'Kurulumu Tamamla' : 'Complete Setup'}
                    </Button>
                    <button
                        onClick={() => setDismissed(true)}
                        className="p-1 hover:bg-white/20 rounded-md transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
