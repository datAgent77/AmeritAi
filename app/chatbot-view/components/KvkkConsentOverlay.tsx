"use client"

import { ShieldAlert, ShieldCheck } from "lucide-react"

interface KvkkConsentOverlayProps {
    show: boolean
    isRejected: boolean
    rejectionContactText: string
    shortNoticeText?: string
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
    shortNoticeText,
    onAccept,
    onReject,
    onReadFull,
    t,
    theme
}: KvkkConsentOverlayProps) {
    if (!show) return null

    const isDark = theme === 'dark'
    const noticeCopy = shortNoticeText || t("kvkkConsentDescription")

    return (
        <div className="pointer-events-none absolute inset-x-0 bottom-[74px] z-[80] flex justify-center px-4">
            <div className={`pointer-events-auto w-full max-w-md rounded-2xl border p-4 text-left shadow-xl transition-all duration-500 animate-in fade-in slide-in-from-bottom-3 ${isDark ? 'border-zinc-800 bg-zinc-900 text-zinc-100' : 'border-gray-100 bg-white text-gray-900'}`}>
                {isRejected ? (
                    <>
                        <div className="mb-3 flex items-center gap-3">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isDark ? 'bg-zinc-800/80 text-zinc-300' : 'bg-gray-100 text-gray-700'}`}>
                                <ShieldAlert className="h-5 w-5" />
                            </div>
                            <h2 className="text-sm font-bold tracking-tight">{t("kvkkConsentRequiredTitle")}</h2>
                        </div>
                        <div className={`mb-4 text-[13px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                            <p className="mb-5 text-balance">
                                {noticeCopy}
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
                        <div className="mb-3 flex items-center gap-3">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isDark ? 'bg-zinc-800/80 text-zinc-300' : 'bg-gray-100 text-gray-700'}`}>
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <h2 className="text-sm font-bold tracking-tight">{t("kvkkConsentTitle")}</h2>
                        </div>
                        <p className={`mb-4 text-[13px] leading-relaxed text-balance ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                            {noticeCopy}
                        </p>
                        <div className="flex flex-col gap-2.5">
                            <button
                                onClick={onAccept}
                                className={`w-full rounded-xl px-4 py-3 text-[13px] font-semibold shadow-sm transition-all duration-200 active:scale-[0.98] ${isDark ? 'bg-zinc-100 text-zinc-900 hover:bg-white' : 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-md'}`}
                            >
                                {t("privacyNoticeUnderstood") === "privacyNoticeUnderstood" ? "Anladım" : t("privacyNoticeUnderstood")}
                            </button>
                            <div className="grid grid-cols-1 gap-2.5">
                                <button
                                    onClick={onReadFull}
                                    className={`w-full rounded-xl px-4 py-3 text-[13px] font-medium transition-all duration-200 active:scale-[0.98] ${isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'}`}
                                >
                                    {t("privacyNoticeOpen") === "privacyNoticeOpen" ? "Aydınlatma Metni" : t("privacyNoticeOpen")}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
