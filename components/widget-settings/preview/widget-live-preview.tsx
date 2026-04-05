"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { WidgetSettings } from "@/hooks/use-widget-settings"
import { PreviewClassic } from "./preview-classic"
import { PreviewAmbient } from "./preview-ambient"
import type { AmbientDockPreviewState } from "@/lib/ambient-dock-style"
import { resolveAmbientDeviceSettings } from "@/lib/ambient-device-settings"
import { resolveClassicDeviceSettings } from "@/lib/classic-device-settings"

interface WidgetLivePreviewProps {
    settings: WidgetSettings
    t: (key: string) => string
    ambientPreviewDockState?: AmbientDockPreviewState
    ambientPreviewThinking?: boolean
}

export function WidgetLivePreview({
    settings,
    t,
    ambientPreviewDockState = "auto",
    ambientPreviewThinking = false,
}: WidgetLivePreviewProps) {
    const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile')
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [lottieData, setLottieData] = useState<any>(null)

    const isAmbientMode = settings.chatDisplayMode === "ambient"
    const isSidecarMode = settings.chatDisplayMode === "sidecar"
    const previewDevice = previewMode === "mobile" ? "mobile" : "desktop"
    const effectivePreviewSettings = isAmbientMode
        ? { ...settings, ...resolveAmbientDeviceSettings(settings, previewDevice) }
        : { ...settings, ...resolveClassicDeviceSettings(settings, previewDevice) }
    const previewThemeClass = isAmbientMode && effectivePreviewSettings.ambientTheme === "dark"
        ? "dark"
        : ""

    // Fetch Lottie animation data for preview
    useEffect(() => {
        if (effectivePreviewSettings.launcherLottieUrl && effectivePreviewSettings.launcherLottieUrl.trim()) {
            fetch(effectivePreviewSettings.launcherLottieUrl)
                .then(res => res.json())
                .then(data => setLottieData(data))
                .catch(err => {
                    console.error('Failed to load Lottie:', err)
                    setLottieData(null)
                })
        } else {
            setLottieData(null)
        }
    }, [effectivePreviewSettings.launcherLottieUrl])

    return (
        <div className="flex-1 flex flex-col items-center bg-muted/30 rounded-xl border border-dashed border-border/50 p-6 min-h-[600px] h-full overflow-y-auto">
            <div className="flex gap-2 mb-4">
                <Button
                    variant={previewMode === 'mobile' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('mobile')}
                >
                    {t('mobile') || 'Mobile'}
                </Button>
                <Button
                    variant={previewMode === 'desktop' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('desktop')}
                >
                    {t('desktop') || 'Desktop'}
                </Button>
            </div>

            <div className="sticky top-8 w-full max-w-[700px] flex justify-center">
                {previewMode === 'mobile' ? (
                    // MOBILE FRAME
                    <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[14px] rounded-[2.8rem] h-[740px] w-[360px] shadow-xl shrink-0">
                        <div className="w-[178px] h-[22px] bg-gray-800 top-0 rounded-b-[1.1rem] left-1/2 -translate-x-1/2 absolute z-50"></div>
                        <div className="h-[36px] w-[3px] bg-gray-800 absolute -start-[17px] top-[88px] rounded-s-lg"></div>
                        <div className="h-[52px] w-[3px] bg-gray-800 absolute -start-[17px] top-[146px] rounded-s-lg"></div>
                        <div className="h-[52px] w-[3px] bg-gray-800 absolute -start-[17px] top-[206px] rounded-s-lg"></div>
                        <div className="h-[72px] w-[3px] bg-gray-800 absolute -end-[17px] top-[164px] rounded-e-lg"></div>

                        <div className={`rounded-[2rem] overflow-hidden w-full h-full bg-white dark:bg-gray-950 flex flex-col relative ${previewThemeClass}`}>
                            {isAmbientMode ? (
                                <PreviewAmbient
                                    settings={effectivePreviewSettings}
                                    previewMode={previewMode}
                                    isPreviewOpen={isPreviewOpen}
                                    setIsPreviewOpen={setIsPreviewOpen}
                                    previewAmbientDockState={ambientPreviewDockState}
                                    previewAmbientThinking={ambientPreviewThinking}
                                />
                            ) : (
                                <PreviewClassic
                                    settings={effectivePreviewSettings}
                                    previewMode={previewMode}
                                    isPreviewOpen={isPreviewOpen}
                                    setIsPreviewOpen={setIsPreviewOpen}
                                    lottieData={lottieData}
                                />
                            )}
                        </div>
                    </div>
                ) : (
                    // DESKTOP FRAME
                    <div className={`w-full max-w-[600px] bg-white dark:bg-gray-950 rounded-lg shadow-2xl border overflow-hidden shrink-0 ${previewThemeClass}`}>
                        <div className="bg-gray-100 dark:bg-gray-800 p-3 flex items-center gap-2 border-b">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            </div>
                            <div className="flex-1 bg-white dark:bg-gray-700 rounded px-3 py-1 text-xs text-gray-500 text-center">
                                yourwebsite.com
                            </div>
                        </div>

                        <div className="h-[500px] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 relative p-6 overflow-hidden">
                            {/* Dummy Content */}
                            <div className="space-y-4">
                                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded mt-4"></div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                    <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                    <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                </div>
                            </div>

                            {/* Inner Preview Content */}
                            {isAmbientMode ? (
                                <PreviewAmbient
                                    settings={effectivePreviewSettings}
                                    previewMode={previewMode}
                                    isPreviewOpen={isPreviewOpen}
                                    setIsPreviewOpen={setIsPreviewOpen}
                                    previewAmbientDockState={ambientPreviewDockState}
                                    previewAmbientThinking={ambientPreviewThinking}
                                />
                            ) : (
                                <PreviewClassic
                                    settings={effectivePreviewSettings}
                                    previewMode={previewMode}
                                    isPreviewOpen={isPreviewOpen}
                                    setIsPreviewOpen={setIsPreviewOpen}
                                    lottieData={lottieData}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
