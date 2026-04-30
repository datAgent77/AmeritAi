import { Eye, MessageCircle } from "lucide-react"
import { EngagementSettings } from "../types"
import { getPreviewBubbleConfig, getPreviewStyle, type EngagementPreviewVariantMode } from "../utils"

interface EngagementPreviewProps {
    settings: EngagementSettings
    chatDisplayMode: "classic" | "ambient"
}

export function EngagementPreview({ settings, chatDisplayMode }: EngagementPreviewProps) {
    const previewMode: EngagementPreviewVariantMode = chatDisplayMode === "ambient" ? "ambient" : "classic"
    const previewStyle = getPreviewStyle(settings, previewMode)
    const previewConfig = getPreviewBubbleConfig(settings, previewMode)
    const bubbleText = settings.bubble.messages[0]?.text || "Merhaba! Size özel bir teklifimiz var, incelemek ister misiniz?"
    const typewriterEnabled = previewMode === "ambient" && previewConfig.renderStyle === "ambient_ai_bubble_typewriter"

    return (
        <div className="hidden lg:flex w-[420px] flex-col rounded-xl border bg-slate-100 dark:bg-slate-900 overflow-hidden shadow-sm sticky top-6 self-start">
            <div className="p-3 border-b bg-white dark:bg-black text-xs text-muted-foreground space-y-2">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Canlı Önizleme
                    </div>
                    <div className="inline-flex rounded-full border bg-background px-2 py-1 text-[11px] text-muted-foreground">
                        {previewMode === "ambient" ? "Ambient görünüm" : "Classic görünüm"}
                    </div>
                </div>
            </div>

            <div className="flex-1 relative p-6 overflow-hidden">
                <div
                    className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, gray 1px, transparent 0)', backgroundSize: '20px 20px' }}
                />

                <div className="space-y-4 opacity-30 mt-10 blur-[1px]">
                    <div className="h-8 bg-slate-300 dark:bg-slate-700 w-3/4 rounded animate-pulse" />
                    <div className="h-4 bg-slate-300 dark:bg-slate-700 w-full rounded animate-pulse" />
                    <div className="h-4 bg-slate-300 dark:bg-slate-700 w-5/6 rounded animate-pulse" />
                    <div className="h-40 bg-slate-300 dark:bg-slate-700 w-full rounded mt-8 animate-pulse" />
                </div>

                {previewMode === "classic" ? (
                    <div className="absolute bottom-10 right-6 flex flex-col items-end gap-3 transition-all duration-300">
                        <div className="relative transition-all duration-500 max-w-[280px] p-4 flex items-center gap-3" style={previewStyle}>
                            <div className="text-sm leading-relaxed">
                                {bubbleText}
                            </div>
                            {settings.bubble.showCloseButton && <div className="opacity-50 hover:opacity-100 cursor-pointer">×</div>}
                        </div>

                        <div className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform cursor-pointer">
                            <MessageCircle className="w-6 h-6" />
                        </div>
                    </div>
                ) : (
                    <div className="absolute inset-x-6 bottom-10">
                        <div className="relative mx-auto max-w-[340px]">
                            <div className="mb-3 flex justify-center">
                                <div
                                    className="relative max-w-[320px] p-4 flex items-start gap-3 border"
                                    style={{
                                        ...previewStyle,
                                        transform: `translate(${previewConfig.offsetX || 0}px, ${previewConfig.offsetY || 0}px)`,
                                    }}
                                >
                                    <div className="mt-0.5 h-5 w-5 rounded-full border border-white/25 bg-white/10 flex items-center justify-center text-[10px] font-semibold text-white/90 shrink-0">
                                        AI
                                    </div>
                                    <div className="text-sm leading-relaxed break-words">
                                        {bubbleText}
                                        {typewriterEnabled && (
                                            <span className="ml-0.5 inline-block animate-pulse">
                                                {previewConfig.typewriter.cursorVisible ? (previewConfig.typewriter.cursorChar || "▍") : ""}
                                            </span>
                                        )}
                                    </div>
                                    {settings.bubble.showCloseButton && <div className="opacity-60 cursor-pointer text-white">×</div>}
                                    <div className="absolute -top-2 right-2 flex items-center gap-1">
                                        {(previewConfig.renderStyle === "ambient_ai_bubble" || previewConfig.renderStyle === "ambient_ai_bubble_typewriter") && (
                                            <div className="rounded-full border bg-background px-2 py-0.5 text-[10px] text-muted-foreground shadow-sm">
                                                {String(previewConfig.aiBubbleTheme || "default")}
                                            </div>
                                        )}
                                        {typewriterEnabled && (
                                            <div className="rounded-full border bg-background px-2 py-0.5 text-[10px] text-muted-foreground shadow-sm">
                                                Daktilo
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mx-auto h-14 max-w-[320px] rounded-full border border-violet-400/80 bg-black shadow-[0_0_0_1px_rgba(167,139,250,0.35)] px-4 flex items-center gap-3">
                                <div className="text-violet-300 text-xs">Ask to Vion Ai</div>
                                <div className="ml-auto h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700" />
                                <div className="h-8 w-8 rounded-full bg-violet-700/60 border border-violet-500/50" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
