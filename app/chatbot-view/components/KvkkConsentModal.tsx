"use client"

import { ShieldCheck, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface KvkkConsentModalProps {
    isOpen: boolean
    text: string
    onClose: () => void
    title?: string
    theme?: string
}

export function KvkkConsentModal({
    isOpen,
    text,
    onClose,
    title = "KVKK Aydınlatma Metni",
    theme,
}: KvkkConsentModalProps) {
    if (!isOpen) return null

    const isDark = theme === "dark"

    return (
        <div className={`fixed inset-0 z-[120] flex flex-col animate-in slide-in-from-bottom-4 duration-300 ${isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-gray-900'}`}>
            <div className={`sticky top-0 z-10 flex items-center justify-between border-b px-5 py-4 backdrop-blur-md ${isDark ? 'border-zinc-800 bg-zinc-950/80' : 'border-gray-100 bg-white/80'}`}>
                <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-gray-100 text-gray-700'}`}>
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold">{title}</h2>
                        <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                            Aydınlatma Metni Detayları
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'}`}
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-6">
                <pre className={`whitespace-pre-wrap font-sans text-sm leading-relaxed ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                    {text}
                </pre>
            </div>

            <div className={`sticky bottom-0 border-t px-5 py-4 ${isDark ? 'border-zinc-800 bg-zinc-900/90' : 'border-gray-100 bg-gray-50/90'}`}>
                <button
                    onClick={onClose}
                    className={`w-full rounded-xl px-4 py-3.5 text-sm font-semibold shadow-sm transition-colors ${isDark ? 'bg-zinc-100 text-zinc-900 hover:bg-white' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
                >
                    Geri Dön
                </button>
            </div>
        </div>
    )
}
