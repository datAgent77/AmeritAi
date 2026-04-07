"use client"

import Image from "next/image"
import * as LucideIcons from "lucide-react"
import { Send, ChevronDown, ChevronUp, MessageCircle } from "lucide-react"
import { getAmbientDockStateKey, resolveAmbientDockStyle, type AmbientDockPreviewState } from "@/lib/ambient-dock-style"
import { resolveAmbientInputSizeConfig, resolveAmbientSurfaceLayout } from "@/lib/ambient-layout"
import { ThinkingIndicatorBubble } from "@/components/chatbot/thinking-indicator-bubble"

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
    const viewport = previewMode === "mobile" ? "mobile" : "desktop"
    const sizeConfig = resolveAmbientInputSizeConfig(settings.ambientInputSize)
    const ambientLayout = resolveAmbientSurfaceLayout(settings, viewport)

    const renderAmbientLeadingIcon = () => {
        if (settings.showAmbientIcon === false) return null

        const ambientIconColor = settings.ambientIconColor || settings.brandColor || "#3b82f6"
        const customIconUrl = settings.ambientIconUrl || settings.launcherIconUrl
        const iconType = settings.ambientIconType

        if (iconType === "custom" && customIconUrl) {
            return (
                <div className={`ml-1 flex shrink-0 items-center justify-center rounded-full overflow-hidden ${sizeConfig.leadingSizeClass} bg-transparent`}>
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
            <div className={`ml-1 flex shrink-0 items-center justify-center rounded-full overflow-hidden ${sizeConfig.leadingSizeClass} bg-transparent`}>
                <IconComponent className={sizeConfig.leadingIconSizeClass} color={ambientIconColor} />
            </div>
        )
    }

    const isDesktop = previewMode === 'desktop'
    const railHeight = Math.max(220, Math.min(460, settings.ambientMaxHeight || 260))
    const ambientFeedHeight = railHeight + ambientLayout.feedTopInsetPx
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
    const ambientActionButtonClass = `${sizeConfig.buttonSizeClass} rounded-full bg-white/90 backdrop-blur-sm text-gray-500 border border-gray-200/60 shadow-sm flex items-center justify-center transition-all dark:bg-zinc-800/90 dark:text-zinc-300 dark:border-zinc-700/70`
    const previewLanguage = settings.initialLanguage === "tr" ? "tr" : "en"

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
                    paddingBottom: `${ambientLayout.bottomMarginPx}px`,
                    paddingLeft: `${ambientLayout.shellSidePaddingPx}px`,
                    paddingRight: `${ambientLayout.shellSidePaddingPx}px`
                }}
            >
                {isChatActive ? (
                    <div
                        className="w-full transition-all duration-300"
                        style={{
                            height: `${ambientFeedHeight}px`,
                            paddingTop: `${ambientLayout.feedTopInsetPx}px`,
                        }}
                    >
                        <div
                            className="mx-auto flex h-full w-full"
                            style={{
                                maxWidth: ambientLayout.railMaxWidth,
                                paddingLeft: `${ambientLayout.feedViewportInsetPx}px`,
                                paddingRight: `${ambientLayout.feedViewportInsetPx}px`,
                            }}
                        >
                            <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_8px_40px_-4px_rgba(0,0,0,0.20),0_4px_20px_-4px_rgba(0,0,0,0.14)] dark:border-zinc-700 dark:bg-zinc-900">
                                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-zinc-800">
                                    <div className="text-sm font-medium text-gray-700 dark:text-gray-200 opacity-90">
                                        {settings.companyName || "AI Assistant"}
                                    </div>
                                    <button
                                        onClick={() => setIsPreviewOpen(false)}
                                        className="rounded-full bg-black/5 px-3 py-1 text-xs text-gray-700 transition-colors hover:bg-black/10 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/15"
                                    >
                                        Kapat
                                    </button>
                                </div>
                                <div className="flex-1 space-y-3 overflow-hidden px-4 py-4">
                                    <div
                                        className="w-fit max-w-[85%] rounded-2xl px-4 py-3 text-sm text-white shadow-sm"
                                        style={{ backgroundColor: settings.ambientAiBubbleColor || settings.brandColor || "#3b82f6" }}
                                    >
                                        Merhaba! Nasıl yardımcı olabilirim?
                                    </div>
                                    <div
                                        className="ml-auto w-fit max-w-[75%] rounded-2xl rounded-br-md border border-white/70 bg-white/80 px-4 py-3 text-sm text-gray-800 shadow-sm"
                                        style={settings.ambientUserBubbleColor ? { backgroundColor: settings.ambientUserBubbleColor } : undefined}
                                    >
                                        Demo kullanıcı mesajı
                                    </div>
                                    {previewAmbientThinking ? (
                                        <ThinkingIndicatorBubble
                                            language={previewLanguage}
                                            className="w-fit"
                                        />
                                    ) : (
                                        (settings.suggestedQuestions?.slice(0, 2) || [
                                            "What are the product groups?",
                                            "What are the production stages?",
                                        ]).map((q: string, i: number) => (
                                            <div key={i} className="rounded-xl border border-black/5 bg-black/5 px-4 py-2 text-left text-sm text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
                                                {q}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Always-on Input Bar */}
                <div
                    className="w-full py-4 transition-all duration-300"
                >
                    <div
                        className="mx-auto w-full"
                        style={{
                            maxWidth: ambientLayout.dockMaxWidth,
                            paddingLeft: `${ambientLayout.feedViewportInsetPx}px`,
                            paddingRight: `${ambientLayout.feedViewportInsetPx}px`,
                        }}
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
                                className={`cursor-pointer rounded-full border border-white/40 backdrop-blur-xl ${sizeConfig.formPaddingClass} flex items-center ${sizeConfig.gapClass} shadow-lg transition-all hover:shadow-xl dark:border-white/20`}
                                style={{ backgroundColor: dockStyles.formBackgroundColor || 'rgba(255, 255, 255, 0.9)' }}
                            >
                                {renderAmbientLeadingIcon()}
                                <span
                                    className={`min-w-0 flex-1 ${sizeConfig.textSizeClass} leading-tight bg-transparent border-0`}
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
                                                if (!forcedPreviewDockState) setIsPreviewOpen(false)
                                            }}
                                            className={ambientActionButtonClass}
                                            aria-label="Collapse preview"
                                        >
                                            <ChevronDown className={sizeConfig.iconSizeClass} />
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
                                        <ChevronUp className={sizeConfig.iconSizeClass} />
                                    </button>
                                )}
                                <div
                                    className={`ml-1 flex items-center justify-center rounded-full text-white ${sizeConfig.buttonSizeClass}`}
                                    style={{ backgroundColor: settings.ambientIconColor || settings.brandColor || "#1f2937" }}
                                >
                                    <Send className={sizeConfig.iconSizeClass} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
