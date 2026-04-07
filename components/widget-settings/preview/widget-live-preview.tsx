"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { WidgetSettings } from "@/hooks/use-widget-settings"
import { PreviewAmbient } from "./preview-ambient"
import { PreviewClassic } from "./preview-classic"
import type { AmbientDockPreviewState } from "@/lib/ambient-dock-style"

interface WidgetLivePreviewProps {
    userId: string
    settings: WidgetSettings
    t: (key: string) => string
    ambientPreviewDockState?: AmbientDockPreviewState
    ambientPreviewThinking?: boolean
}

function PreviewBackdrop({ previewMode }: { previewMode: "mobile" | "desktop" }) {
    const wrapperClass = previewMode === "mobile" ? "p-4" : "p-7"

    return (
        <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.08),transparent_30%),#f8fafc]">
            <div className={`${wrapperClass} h-full`}>
                <div className={`rounded-[28px] border border-slate-200/70 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)] ${previewMode === "mobile" ? "h-[120px]" : "h-[152px]"}`}>
                    <div className={`${previewMode === "mobile" ? "p-5 gap-3.5" : "p-7 gap-3.5"} grid`}>
                        <div className="h-3 w-[42%] rounded-full bg-gradient-to-r from-slate-300/60 to-slate-200/80" />
                        <div className="h-3 w-[88%] rounded-full bg-gradient-to-r from-slate-300/60 to-slate-200/80" />
                        <div className="h-3 w-[66%] rounded-full bg-gradient-to-r from-slate-300/60 to-slate-200/80" />
                    </div>
                </div>
                <div className={`mt-4 grid gap-3.5 ${previewMode === "mobile" ? "grid-cols-1" : "grid-cols-3"}`}>
                    <div className={`rounded-3xl border border-slate-200/60 bg-white/75 shadow-[0_10px_28px_rgba(15,23,42,0.05)] ${previewMode === "mobile" ? "h-[76px]" : "h-[104px]"}`} />
                    <div className={`rounded-3xl border border-slate-200/60 bg-white/75 shadow-[0_10px_28px_rgba(15,23,42,0.05)] ${previewMode === "mobile" ? "h-[76px]" : "h-[104px]"}`} />
                    <div className={`rounded-3xl border border-slate-200/60 bg-white/75 shadow-[0_10px_28px_rgba(15,23,42,0.05)] ${previewMode === "mobile" ? "h-[76px]" : "h-[104px]"}`} />
                </div>
                <div className={`mt-3.5 rounded-3xl border border-slate-200/60 bg-white/75 shadow-[0_10px_28px_rgba(15,23,42,0.05)] ${previewMode === "mobile" ? "h-[140px]" : "h-[180px]"}`} />
            </div>
        </div>
    )
}

export function WidgetLivePreview({
    settings,
    t,
    ambientPreviewDockState = "auto",
    ambientPreviewThinking = false,
}: WidgetLivePreviewProps) {
    const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile")
    const [lottieData, setLottieData] = useState<any>(null)
    const isSidecarPreviewActive =
        settings.chatDisplayMode === "sidecar" &&
        (previewMode === "desktop" || settings.sidecarDesktopOnly === false)

    const previewShouldStartOpen = useMemo(() => {
        if (isSidecarPreviewActive) return true
        if (settings.chatDisplayMode === "sidecar") return false
        if (ambientPreviewThinking) return true
        if (settings.chatDisplayMode === "ambient") {
            return ambientPreviewDockState.startsWith("open")
        }
        if (settings.interactionMode === "always_open") return true
        return ambientPreviewDockState.startsWith("open")
    }, [
        ambientPreviewDockState,
        ambientPreviewThinking,
        isSidecarPreviewActive,
        settings.chatDisplayMode,
        settings.interactionMode,
    ])

    const [isPreviewOpen, setIsPreviewOpen] = useState(previewShouldStartOpen)

    useEffect(() => {
        if (settings.chatDisplayMode === "sidecar" && settings.sidecarAlwaysOpen === true) {
            setIsPreviewOpen(isSidecarPreviewActive)
            return
        }
        setIsPreviewOpen(previewShouldStartOpen)
    }, [isSidecarPreviewActive, previewShouldStartOpen, settings.chatDisplayMode, settings.sidecarAlwaysOpen])

    useEffect(() => {
        let cancelled = false

        const loadLottie = async () => {
            if (settings.launcherType !== "fullImage" || settings.launcherImageMode !== "lottie" || !settings.launcherLottieUrl) {
                setLottieData(null)
                return
            }

            try {
                const response = await fetch(settings.launcherLottieUrl)
                if (!response.ok) {
                    throw new Error(`Failed to load Lottie animation (${response.status})`)
                }

                const data = await response.json()
                if (!cancelled) {
                    setLottieData(data)
                }
            } catch (error) {
                if (!cancelled) {
                    console.warn("Widget preview: Failed to load Lottie animation", error)
                    setLottieData(null)
                }
            }
        }

        loadLottie()
        return () => {
            cancelled = true
        }
    }, [settings.launcherImageMode, settings.launcherLottieUrl, settings.launcherType])

    const previewCanvas = (
        <div className="relative h-full w-full overflow-hidden rounded-[inherit] bg-white">
            <PreviewBackdrop previewMode={previewMode} />
            {settings.chatDisplayMode === "ambient" ? (
                <PreviewAmbient
                    settings={settings}
                    previewMode={previewMode}
                    isPreviewOpen={isPreviewOpen}
                    setIsPreviewOpen={setIsPreviewOpen}
                    previewAmbientDockState={ambientPreviewDockState}
                    previewAmbientThinking={ambientPreviewThinking}
                />
            ) : (
                <PreviewClassic
                    settings={settings}
                    previewMode={previewMode}
                    isPreviewOpen={isPreviewOpen}
                    setIsPreviewOpen={setIsPreviewOpen}
                    lottieData={lottieData}
                />
            )}
        </div>
    )

    return (
        <div className="flex h-full min-h-[600px] flex-1 flex-col items-center overflow-y-auto rounded-xl border border-dashed border-border/50 bg-muted/30 p-6">
            <div className="mb-4 flex gap-2">
                <Button
                    variant={previewMode === "mobile" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreviewMode("mobile")}
                >
                    {t("mobile") || "Mobile"}
                </Button>
                <Button
                    variant={previewMode === "desktop" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreviewMode("desktop")}
                >
                    {t("desktop") || "Desktop"}
                </Button>
            </div>

            <div className="sticky top-8 flex w-full max-w-[700px] justify-center">
                {previewMode === "mobile" ? (
                    <div className="relative mx-auto h-[740px] w-[360px] shrink-0 rounded-[2.8rem] border-[14px] border-gray-800 bg-gray-800 shadow-xl">
                        <div className="absolute left-1/2 top-0 z-50 h-[22px] w-[178px] -translate-x-1/2 rounded-b-[1.1rem] bg-gray-800"></div>
                        <div className="absolute -start-[17px] top-[88px] h-[36px] w-[3px] rounded-s-lg bg-gray-800"></div>
                        <div className="absolute -start-[17px] top-[146px] h-[52px] w-[3px] rounded-s-lg bg-gray-800"></div>
                        <div className="absolute -start-[17px] top-[206px] h-[52px] w-[3px] rounded-s-lg bg-gray-800"></div>
                        <div className="absolute -end-[17px] top-[164px] h-[72px] w-[3px] rounded-e-lg bg-gray-800"></div>
                        <div className="h-full w-full overflow-hidden rounded-[2rem] border-0 bg-white">
                            {previewCanvas}
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-[600px] shrink-0 overflow-hidden rounded-lg border bg-white shadow-2xl">
                        <div className="flex items-center gap-2 border-b bg-gray-100 p-3 dark:bg-gray-800">
                            <div className="flex gap-1.5">
                                <div className="h-3 w-3 rounded-full bg-red-500"></div>
                                <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                            </div>
                            <div className="flex-1 rounded bg-white px-3 py-1 text-center text-xs text-gray-500 dark:bg-gray-700">
                                yourwebsite.com
                            </div>
                        </div>
                        <div className="h-[500px] w-full border-0 bg-white">
                            {previewCanvas}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
