import { Eye, MessageCircle } from "lucide-react"
import { EngagementSettings } from "../types"
import { getPreviewStyle } from "../utils"

interface EngagementPreviewProps {
    settings: EngagementSettings
}

export function EngagementPreview({ settings }: EngagementPreviewProps) {
    const previewStyle = getPreviewStyle(settings);

    return (
        <div className="hidden lg:flex w-[400px] flex-col rounded-xl border bg-slate-100 dark:bg-slate-900 overflow-hidden shadow-sm sticky top-6 self-start">
            <div className="p-3 border-b bg-white dark:bg-black flex items-center gap-2 text-xs text-muted-foreground">
                <Eye className="w-4 h-4" />
                Canlı Önizleme
            </div>

            <div className="flex-1 relative p-6 overflow-hidden">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, gray 1px, transparent 0)', backgroundSize: '20px 20px' }}
                ></div>

                <div className="space-y-4 opacity-30 mt-10 blur-[1px]">
                    <div className="h-8 bg-slate-300 dark:bg-slate-700 w-3/4 rounded animate-pulse"></div>
                    <div className="h-4 bg-slate-300 dark:bg-slate-700 w-full rounded animate-pulse"></div>
                    <div className="h-4 bg-slate-300 dark:bg-slate-700 w-5/6 rounded animate-pulse"></div>
                    <div className="h-40 bg-slate-300 dark:bg-slate-700 w-full rounded mt-8 animate-pulse"></div>
                </div>

                <div className="absolute bottom-10 right-6 flex flex-col items-end gap-3 transition-all duration-300">
                    <div
                        className="relative transition-all duration-500 max-w-[280px] p-4 flex items-center gap-3"
                        style={previewStyle}
                    >
                        <div className="text-sm leading-relaxed">
                            {settings.bubble.messages[0]?.text || "Merhaba! Size özel bir teklifimiz var, incelemek ister misiniz?"}
                        </div>
                        {settings.bubble.showCloseButton && (
                            <div className="opacity-50 hover:opacity-100 cursor-pointer">×</div>
                        )}
                    </div>

                    <div className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform cursor-pointer">
                        <MessageCircle className="w-6 h-6" />
                    </div>
                </div>
            </div>
        </div>
    )
}
