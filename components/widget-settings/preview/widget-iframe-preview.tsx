"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Monitor, Smartphone, ExternalLink } from "lucide-react"

interface WidgetIframePreviewProps {
    userId: string
    isSaving?: boolean
    t: (key: string) => string
}

export function WidgetIframePreview({ userId, isSaving = false, t }: WidgetIframePreviewProps) {
    const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile')
    const [iframeKey, setIframeKey] = useState(0)
    const [isLoading, setIsLoading] = useState(true)

    // Re-load iframe after save completes (isSaving goes false after true)
    const wasSaving = useRef(false)
    useEffect(() => {
        if (wasSaving.current && !isSaving) {
            // Save just finished — reload the iframe after a short delay for DB write to propagate
            const t = setTimeout(() => {
                setIframeKey(k => k + 1)
            }, 800)
            return () => clearTimeout(t)
        }
        wasSaving.current = isSaving
    }, [isSaving])

    const refresh = useCallback(() => {
        setIsLoading(true)
        setIframeKey(k => k + 1)
    }, [])

    const iframeSrc = `/api/widget-preview-frame?chatbotId=${userId}&t=${iframeKey}`

    const mobileFrame = (
        <div className="relative mx-auto border-gray-800 bg-gray-800 border-[14px] rounded-[2.8rem] h-[660px] w-[320px] shadow-xl shrink-0">
            {/* Notch */}
            <div className="w-[148px] h-[18px] bg-gray-800 top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute z-50" />
            {/* Side buttons */}
            <div className="h-[32px] w-[3px] bg-gray-800 absolute -start-[17px] top-[80px] rounded-s-lg" />
            <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[128px] rounded-s-lg" />
            <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[182px] rounded-s-lg" />
            <div className="h-[64px] w-[3px] bg-gray-800 absolute -end-[17px] top-[142px] rounded-e-lg" />

            <div className="rounded-[2rem] overflow-hidden w-full h-full bg-white relative">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                        <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                )}
                <iframe
                    key={iframeKey}
                    src={iframeSrc}
                    className="w-full h-full border-0"
                    onLoad={() => setIsLoading(false)}
                    title="Widget Mobile Preview"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                />
            </div>
        </div>
    )

    const desktopFrame = (
        <div className="w-full max-w-[600px] bg-white rounded-lg shadow-2xl border overflow-hidden shrink-0">
            {/* Browser chrome */}
            <div className="bg-gray-100 p-3 flex items-center gap-2 border-b">
                <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 bg-white rounded px-3 py-1 text-xs text-gray-400 text-center border">
                    yourwebsite.com
                </div>
            </div>
            <div className="h-[520px] relative bg-gradient-to-br from-gray-50 to-gray-100">
                {/* Dummy page content */}
                <div className="p-6 space-y-3 pointer-events-none select-none">
                    <div className="h-5 bg-gray-200 rounded w-36" />
                    <div className="h-3 bg-gray-200 rounded w-full" />
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                    <div className="h-24 bg-gray-200 rounded mt-3" />
                    <div className="grid grid-cols-3 gap-3">
                        <div className="h-16 bg-gray-200 rounded" />
                        <div className="h-16 bg-gray-200 rounded" />
                        <div className="h-16 bg-gray-200 rounded" />
                    </div>
                </div>
                {/* Widget iframe overlaid */}
                {isLoading && (
                    <div className="absolute bottom-4 right-4 flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                )}
                <iframe
                    key={`desktop-${iframeKey}`}
                    src={iframeSrc}
                    className="absolute inset-0 w-full h-full border-0 bg-transparent"
                    onLoad={() => setIsLoading(false)}
                    title="Widget Desktop Preview"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                    style={{ pointerEvents: 'all' }}
                />
            </div>
        </div>
    )

    return (
        <div className="flex-1 flex flex-col items-center bg-muted/30 rounded-xl border border-dashed border-border/50 p-4 h-full overflow-y-auto w-full gap-4">
            {/* Toolbar */}
            <div className="flex items-center gap-2 shrink-0 w-full justify-between">
                <div className="flex gap-2">
                    <Button
                        variant={previewMode === 'mobile' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => { setPreviewMode('mobile'); setIsLoading(true) }}
                    >
                        <Smartphone className="w-3.5 h-3.5 mr-1.5" />
                        {t('mobile') || 'Mobil'}
                    </Button>
                    <Button
                        variant={previewMode === 'desktop' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => { setPreviewMode('desktop'); setIsLoading(true) }}
                    >
                        <Monitor className="w-3.5 h-3.5 mr-1.5" />
                        {t('desktop') || 'Masaüstü'}
                    </Button>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={refresh} title={t('refreshPreview')}>
                        <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/widget-test?id=${userId}`, '_blank')}
                        title={t('openFullscreen')}
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            {/* Frame */}
            <div className="flex justify-center w-full">
                {previewMode === 'mobile' ? mobileFrame : desktopFrame}
            </div>

            <p className="text-[11px] text-muted-foreground text-center shrink-0 mt-auto">
                {t('previewAutoUpdates')}
            </p>
        </div>
    )
}
