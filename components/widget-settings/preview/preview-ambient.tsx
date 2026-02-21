"use client"

import { Send, ListFilter } from "lucide-react"

interface PreviewAmbientProps {
    settings: any
    previewMode: 'mobile' | 'desktop'
    isPreviewOpen: boolean
    setIsPreviewOpen: (open: boolean) => void
}

export function PreviewAmbient({ settings, previewMode, isPreviewOpen, setIsPreviewOpen }: PreviewAmbientProps) {
    const isDesktop = previewMode === 'desktop'
    const railHeight = isDesktop ? (settings.ambientMaxHeight || 260) : 130
    const overlayOpacity = settings.ambientOverlayOpacity || 0.55

    // Ambient modda pencere açık kapalı yok, "Sohbet Yüksekte mi Alçakta mı" mantığı var. (Preview'da örnek gösterim)
    const isChatActive = isPreviewOpen

    return (
        <div className="absolute inset-0 flex flex-col justify-end pointer-events-none overflow-hidden z-50">
            {/* Ambient Background Blur / Tint */}
            <div
                className={`pointer-events-none absolute inset-x-0 bottom-[-120px] z-0 flex justify-center transition-opacity duration-500 ease-in-out ${isChatActive ? 'opacity-100' : 'opacity-0'}`}
            >
                <div
                    style={{
                        width: '100%',
                        height: isDesktop ? '300px' : '200px',
                        background: `radial-gradient(ellipse at 50% 100%, rgba(0,0,0,${overlayOpacity + 0.1}) 0%, rgba(0,0,0,${Math.max(0.25, overlayOpacity * 0.8)}) 30%, rgba(0,0,0,${Math.max(0.1, overlayOpacity * 0.4)}) 55%, rgba(0,0,0,0) 80%)`,
                        filter: 'blur(12px)',
                        transition: 'height 0.4s ease-out'
                    }}
                />
            </div>

            {/* Ambient Interface */}
            <div
                className={`pointer-events-auto bg-transparent w-full flex flex-col relative z-10 mx-auto`}
                style={{
                    maxWidth: isDesktop && settings.ambientWidth ? `${settings.ambientWidth}px` : '100%',
                    paddingBottom: `${settings.ambientBottomMargin || 20}px`,
                    paddingLeft: isDesktop ? `${settings.ambientSideMargin || 0}px` : '0px',
                    paddingRight: isDesktop ? `${settings.ambientSideMargin || 0}px` : '0px'
                }}
            >
                {isChatActive ? (
                    <div
                        className="bg-white/80 dark:bg-black/70 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] p-4 pt-6 mx-auto transition-all duration-300 w-full"
                        style={{ height: `${railHeight}px` }}
                    >
                        <div className="flex justify-between items-center mb-4 px-2">
                            <div className="text-sm font-medium opacity-70">
                                {settings.companyName || "AI Assistant"}
                            </div>
                            <button onClick={() => setIsPreviewOpen(false)} className="text-xs px-3 py-1 bg-black/5 dark:bg-white/10 rounded-full hover:bg-black/10 transition-colors">
                                Kapat
                            </button>
                        </div>
                        <div className="flex flex-col gap-3 px-2">
                            {settings.suggestedQuestions?.slice(0, 2).map((q: string, i: number) => (
                                <div key={i} className="text-sm bg-black/5 dark:bg-white/5 py-2 px-4 rounded-xl text-left border border-black/5">
                                    {q}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                {/* Always-on Input Bar */}
                <div
                    className="p-4 mx-auto w-full transition-all duration-300"
                    style={{ maxWidth: isDesktop ? (settings.ambientWidth ? `${settings.ambientWidth}px` : '500px') : '90%' }}
                >
                    <div
                        onClick={() => setIsPreviewOpen(true)}
                        className="bg-white/90 dark:bg-black/80 backdrop-blur-xl border border-white/40 dark:border-white/20 rounded-full p-2 flex items-center shadow-lg transition-all cursor-pointer hover:shadow-xl"
                    >
                        <div className="bg-black/5 dark:bg-white/10 p-2 rounded-full mr-2">
                            <ListFilter className="w-4 h-4" />
                        </div>
                        <span className="flex-1 text-sm text-gray-500 bg-transparent border-0">
                            Ask me anything...
                        </span>
                        <div className="p-2 rounded-full bg-black text-white ml-2">
                            <Send className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
