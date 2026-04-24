"use client"

import { ShieldAlert, ShieldCheck } from "lucide-react"

interface KvkkConsentOverlayProps {
    show: boolean
    isRejected: boolean
    rejectionContactText: string
    onAccept: () => void
    onReject: () => void
    onReadFull: () => void
    t: (key: string) => string
    theme?: string
}

export function KvkkConsentOverlay({
    show,
    isRejected,
    rejectionContactText,
    onAccept,
    onReject,
    onReadFull,
    t,
    theme
}: KvkkConsentOverlayProps) {
    if (!show) return null

    const isDark = theme === 'dark'

    return (
        <div className={`absolute inset-0 z-[100] flex flex-col items-center justify-center p-6 backdrop-blur-md transition-all duration-300 ${isDark ? 'bg-zinc-950/90 text-zinc-100' : 'bg-white/90 text-gray-900'}`}>
            <div className={`w-full max-w-sm rounded-2xl border p-6 text-center shadow-xl transition-all duration-500 animate-in fade-in zoom-in-95 ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-gray-100 bg-white'}`}>
                {isRejected ? (
                    <>
                        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${isDark ? 'bg-zinc-800/80 text-zinc-300' : 'bg-gray-100 text-gray-700'}`}>
                            <ShieldAlert className="h-6 w-6" />
                        </div>
                        <h2 className="mb-2 text-xl font-bold tracking-tight">{t("kvkkConsentRequiredTitle")}</h2>
                        <div className={`mb-6 text-[13px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                            <p className="mb-5 text-balance">
                                {t("kvkkConsentDescription")}
                            </p>
                            <div className="flex flex-col items-center">
                                <p className={`whitespace-pre-wrap leading-relaxed text-center ${isDark ? 'text-zinc-300' : 'text-gray-900'}`}>
                                    {rejectionContactText}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2.5">
                            <button
                                onClick={onAccept}
                                className={`w-full rounded-xl px-4 py-3 text-[13px] font-semibold shadow-sm transition-all duration-200 active:scale-[0.98] ${isDark ? 'bg-zinc-100 text-zinc-900 hover:bg-white' : 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-md'}`}
                            >
                                {t("kvkkChangedMindAccept")}
                            </button>
                            <button
                                onClick={onReadFull}
                                className={`w-full rounded-xl px-4 py-3 text-[13px] font-medium transition-all duration-200 active:scale-[0.98] ${isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'}`}
                            >
                                {t("kvkkReadFull")}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${isDark ? 'bg-zinc-800/80 text-zinc-300' : 'bg-gray-100 text-gray-700'}`}>
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <h2 className="mb-2 text-xl font-bold tracking-tight">{t("kvkkConsentTitle")}</h2>
                        <p className={`mb-6 text-[13px] leading-relaxed text-balance ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                            {t("kvkkConsentDescription")}
                        </p>
                        <div className="flex flex-col gap-2.5">
                            <button
                                onClick={onAccept}
                                className={`w-full rounded-xl px-4 py-3 text-[13px] font-semibold shadow-sm transition-all duration-200 active:scale-[0.98] ${isDark ? 'bg-zinc-100 text-zinc-900 hover:bg-white' : 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-md'}`}
                            >
                                {t("kvkkAccept")}
                            </button>
                            <div className="grid grid-cols-2 gap-2.5">
                                <button
                                    onClick={onReadFull}
                                    className={`w-full rounded-xl px-4 py-3 text-[13px] font-medium transition-all duration-200 active:scale-[0.98] ${isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'}`}
                                >
                                    {t("kvkkReadAll")}
                                </button>
                                <button
                                    onClick={onReject}
                                    className={`w-full rounded-xl px-4 py-3 text-[13px] font-medium transition-all duration-200 active:scale-[0.98] ${isDark ? 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
                                >
                                    {t("kvkkReject")}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
