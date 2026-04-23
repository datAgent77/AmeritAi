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

    const desktopPreviewShell = useMemo(() => {
        if (settings.viewMode === "wide") {
            if (settings.modalSize === "medium") {
                return {
                    maxWidth: "760px",
                    height: "620px",
                }
            }

            return {
                maxWidth: "1000px",
                height: "680px",
            }
        }

        return {
            maxWidth: "620px",
            height: "600px",
        }
    }, [settings.modalSize, settings.viewMode])

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
        <div className="flex h-full w-full flex-col items-center pt-8">
            <div className="mb-6 flex gap-2 rounded-full border bg-background/50 p-1 backdrop-blur shadow-sm">
                <Button
                    variant={previewMode === "mobile" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-full px-6"
                    onClick={() => setPreviewMode("mobile")}
                >
                    {t("mobile") || "Mobile"}
                </Button>
                <Button
                    variant={previewMode === "desktop" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-full px-6"
                    onClick={() => setPreviewMode("desktop")}
                >
                    {t("desktop") || "Desktop"}
                </Button>
            </div>

            <div className="flex w-full justify-center">
                {previewMode === "mobile" ? (
                    <div className="relative mx-auto h-[740px] w-[360px] shrink-0 rounded-[2.8rem] border-[14px] border-slate-900 bg-gray-800 shadow-2xl ring-1 ring-border/10">
                        <div className="absolute left-1/2 top-0 z-50 h-[22px] w-[178px] -translate-x-1/2 rounded-b-[1.1rem] bg-slate-900"></div>
                        <div className="absolute -start-[17px] top-[88px] h-[36px] w-[3px] rounded-s-lg bg-slate-900"></div>
                        <div className="absolute -start-[17px] top-[146px] h-[52px] w-[3px] rounded-s-lg bg-slate-900"></div>
                        <div className="absolute -start-[17px] top-[206px] h-[52px] w-[3px] rounded-s-lg bg-slate-900"></div>
                        <div className="absolute -end-[17px] top-[164px] h-[72px] w-[3px] rounded-e-lg bg-slate-900"></div>
                        <div className="h-full w-full overflow-hidden rounded-[2rem] border-0 bg-white">
                            {previewCanvas}
                        </div>
                    </div>
                ) : (
                    <div
                        className="w-full shrink-0 overflow-hidden rounded-xl border border-border/50 bg-white shadow-2xl ring-1 ring-border/10 transition-[max-width] duration-300"
                        style={{ maxWidth: desktopPreviewShell.maxWidth }}
                    >
                        <div className="flex items-center gap-2 border-b bg-muted/40 p-3">
                            <div className="flex gap-1.5">
                                <div className="h-3 w-3 rounded-full bg-rose-400"></div>
                                <div className="h-3 w-3 rounded-full bg-amber-400"></div>
                                <div className="h-3 w-3 rounded-full bg-emerald-400"></div>
                            </div>
                            <div className="mx-auto flex h-6 w-full max-w-[400px] items-center justify-center rounded bg-background px-3 text-xs text-muted-foreground shadow-sm ring-1 ring-border/50">
                                example.com
                            </div>
                            <div className="w-12" /> {/* Spacer to center the URL bar */}
                        </div>
                        <div
                            className="w-full border-0 bg-white transition-[height] duration-300"
                            style={{ height: desktopPreviewShell.height }}
                        >
                            {previewCanvas}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
