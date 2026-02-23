"use client"

import Image from "next/image"
import * as LucideIcons from "lucide-react"
import { Send, RefreshCw, ChevronDown, ChevronUp, MessageCircle } from "lucide-react"
import { getAmbientDockStateKey, resolveAmbientDockStyle, type AmbientDockPreviewState } from "@/lib/ambient-dock-style"

interface PreviewAmbientProps {
    settings: any
    previewMode: 'mobile' | 'desktop'
    isPreviewOpen: boolean
    setIsPreviewOpen: (open: boolean) => void
    previewAmbientDockState?: AmbientDockPreviewState
    previewAmbientThinking?: boolean
}

export function PreviewAmbient({
    settings,
    previewMode,
    isPreviewOpen,
    setIsPreviewOpen,
    previewAmbientDockState = "auto",
    previewAmbientThinking = false,
}: PreviewAmbientProps) {
    const inputSize = (settings.ambientInputSize || "lg") as "sm" | "md" | "lg" | "xl"
    const sizeConfigMap = {
        sm: { btnSize: 'h-8 w-8', iconSize: 'w-4 h-4', textSize: 'text-sm', dockPadding: 'p-2', leadingSize: 'w-7 h-7' },
        md: { btnSize: 'h-9 w-9', iconSize: 'w-[18px] h-[18px]', textSize: 'text-base', dockPadding: 'p-2', leadingSize: 'w-8 h-8' },
        lg: { btnSize: 'h-10 w-10', iconSize: 'w-5 h-5', textSize: 'text-lg', dockPadding: 'p-2', leadingSize: 'w-9 h-9' },
        xl: { btnSize: 'h-11 w-11', iconSize: 'w-5 h-5', textSize: 'text-xl', dockPadding: 'p-2.5', leadingSize: 'w-10 h-10' },
    } as const
    const sizeConfig = sizeConfigMap[inputSize] || sizeConfigMap.lg

    const renderAmbientLeadingIcon = () => {
        if (settings.showAmbientIcon === false) return null

        const ambientIconColor = settings.ambientIconColor || settings.brandColor || "#3b82f6"
        const customIconUrl = settings.ambientIconUrl || settings.launcherIconUrl
        const iconType = settings.ambientIconType

        if (iconType === "custom" && customIconUrl) {
            return (
                <div className={`ml-2 mr-1 flex-shrink-0 flex items-center justify-center rounded-full overflow-hidden ${sizeConfig.leadingSize} bg-transparent`}>
                    <Image
                        src={customIconUrl}
                        alt="Widget Icon"
                        width={32}
                        height={32}
                        className="w-full h-full object-contain p-[2px]"
                        unoptimized
                    />
                </div>
            )
        }

        const IconComponent = iconType === "library" && settings.ambientLibraryIcon
            ? ((LucideIcons as any)[settings.ambientLibraryIcon] || MessageCircle)
            : MessageCircle

        return (
            <div className={`ml-2 mr-1 flex-shrink-0 flex items-center justify-center rounded-full overflow-hidden ${sizeConfig.leadingSize} bg-transparent`}>
                <IconComponent className={sizeConfig.iconSize} color={ambientIconColor} />
            </div>
        )
    }

    const isDesktop = previewMode === 'desktop'
    const railHeight = Math.max(220, Math.min(460, settings.ambientMaxHeight || 260))
    const overlayOpacity = settings.ambientOverlayOpacity || 0.55

    // Ambient modda pencere açık kapalı yok, "Sohbet Yüksekte mi Alçakta mı" mantığı var. (Preview'da örnek gösterim)
    const forcedPreviewDockState = previewAmbientDockState === "auto"
        ? null
        : previewAmbientDockState
    const isChatActive = forcedPreviewDockState
        ? forcedPreviewDockState.startsWith("open")
        : (isPreviewOpen || previewAmbientThinking)
    const visualDockState = forcedPreviewDockState || getAmbientDockStateKey({
        isCollapsed: !isChatActive,
        isFocused: false,
    })
    const dockStyles = resolveAmbientDockStyle({
        settings,
        state: visualDockState,
        isChatLoading: previewAmbientThinking,
    })
    const dockOuterClass = `rounded-full p-[2px] transition-all duration-500 ${dockStyles.isCollapsed
        ? (dockStyles.borderMode === 'animated' ? 'ambient-border-animated shadow-md hover:shadow-lg' : 'shadow-md hover:shadow-lg')
        : dockStyles.borderMode === 'animated'
            ? 'ambient-border-animated shadow-[0_18px_36px_rgba(0,0,0,0.24)]'
            : 'shadow-[0_18px_36px_rgba(0,0,0,0.24)]'
        }`
    const dockOuterStyle =
        dockStyles.borderMode === "solid" && dockStyles.outerBorderColor
            ? { backgroundColor: dockStyles.outerBorderColor }
            : (dockStyles.borderMode === "gradient")
                ? {
                    ...dockStyles.gradientCssVars,
                    background: `linear-gradient(90deg, ${dockStyles.gradientColors[0]} 0%, ${dockStyles.gradientColors[1]} 33%, ${dockStyles.gradientColors[2]} 66%, ${dockStyles.gradientColors[3]} 100%)`,
                }
                : dockStyles.borderMode === "animated"
                    ? { ...dockStyles.gradientCssVars }
                    : undefined
    const ambientPlaceholder = settings.initialLanguage === "tr" ? "Ai Asistanına Sor" : "Ask to Ai Assistant"
    const parsedAmbientWidth = typeof settings.ambientWidth === "number"
        ? settings.ambientWidth
        : Number(settings.ambientWidth)
    const resolvedAmbientMaxWidth = Number.isFinite(parsedAmbientWidth)
        ? (parsedAmbientWidth > 0 ? `${parsedAmbientWidth}px` : '100%')
        : '100%'
    const resolvedAmbientSideMargin = `${settings.ambientSideMargin || 0}px`
    const ambientActionButtonClass = `${sizeConfig.btnSize} rounded-full bg-white/90 backdrop-blur-sm text-gray-500 border border-gray-200/60 shadow-sm flex items-center justify-center transition-all dark:bg-zinc-800/90 dark:text-zinc-300 dark:border-zinc-700/70`

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
                    maxWidth: resolvedAmbientMaxWidth,
                    paddingBottom: `${settings.ambientBottomMargin || 20}px`,
                    paddingLeft: resolvedAmbientSideMargin,
                    paddingRight: resolvedAmbientSideMargin
                }}
            >
                {isChatActive ? (
                    <div
                        className="bg-white/80 dark:bg-black/70 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] p-4 pt-6 mx-auto transition-all duration-300 w-full"
                        style={{ height: `${railHeight}px` }}
                    >
                        <div className="flex justify-between items-center mb-4 px-2">
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-200 opacity-90">
                                {settings.companyName || "AI Assistant"}
                            </div>
                            <button onClick={() => setIsPreviewOpen(false)} className="text-xs px-3 py-1 bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-200 rounded-full hover:bg-black/10 dark:hover:bg-white/15 transition-colors">
                                Kapat
                            </button>
                        </div>
                        <div className="flex flex-col gap-3 px-2">
                            <div
                                className="text-sm text-white px-4 py-3 rounded-2xl shadow-sm w-fit max-w-[85%]"
                                style={{ backgroundColor: settings.ambientAiBubbleColor || settings.brandColor || "#3b82f6" }}
                            >
                                Merhaba! Nasıl yardımcı olabilirim?
                            </div>
                            <div
                                className="text-sm text-gray-800 px-4 py-3 rounded-2xl rounded-br-md shadow-sm w-fit max-w-[75%] ml-auto bg-white/80 border border-white/70"
                                style={settings.ambientUserBubbleColor ? { backgroundColor: settings.ambientUserBubbleColor } : undefined}
                            >
                                Demo kullanıcı mesajı
                            </div>
                            {settings.suggestedQuestions?.slice(0, 2).map((q: string, i: number) => (
                                <div key={i} className="text-sm text-gray-700 dark:text-gray-200 bg-black/5 dark:bg-white/5 py-2 px-4 rounded-xl text-left border border-black/5 dark:border-white/10">
                                    {q}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                {/* Always-on Input Bar */}
                <div
                    className="py-4 mx-auto w-full transition-all duration-300"
                    style={{ maxWidth: resolvedAmbientMaxWidth }}
                >
                    <div
                        onClick={() => {
                            if (forcedPreviewDockState) return
                            setIsPreviewOpen(true)
                        }}
                        className={dockOuterClass}
                        style={dockOuterStyle}
                    >
                        <div
                            className="backdrop-blur-xl border border-white/40 dark:border-white/20 rounded-full p-2 flex items-center shadow-lg transition-all cursor-pointer hover:shadow-xl"
                            style={{ backgroundColor: dockStyles.formBackgroundColor || 'rgba(255, 255, 255, 0.9)' }}
                        >
                            {renderAmbientLeadingIcon()}
                            <span
                                className={`flex-1 ${sizeConfig.textSize} leading-tight bg-transparent border-0`}
                                style={{ color: settings.ambientInputTextColor || '#6b7280' }}
                            >
                                {settings.ambientPlaceholderText || ambientPlaceholder}
                            </span>
                            {isChatActive ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                        }}
                                        className={ambientActionButtonClass}
                                        aria-label="Refresh preview"
                                    >
                                        <RefreshCw className={sizeConfig.iconSize} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            if (!forcedPreviewDockState) setIsPreviewOpen(false)
                                        }}
                                        className={ambientActionButtonClass}
                                        aria-label="Collapse preview"
                                    >
                                        <ChevronDown className={sizeConfig.iconSize} />
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (!forcedPreviewDockState) setIsPreviewOpen(true)
                                    }}
                                    className={ambientActionButtonClass}
                                    aria-label="Expand preview"
                                >
                                    <ChevronUp className={sizeConfig.iconSize} />
                                </button>
                            )}
                            <div
                                className="p-2 rounded-full text-white ml-2"
                                style={{ backgroundColor: settings.ambientIconColor || settings.brandColor || "#1f2937" }}
                            >
                                <Send className={sizeConfig.iconSize} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
