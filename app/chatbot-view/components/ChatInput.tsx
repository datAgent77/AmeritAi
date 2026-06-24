import React from "react"
import { ChatbotSettings, QuickActionButton } from "@/types/chatbot"
import type { GuidedSkillClientEvent } from "@/lib/guided-skills/types"
import { getQuickActionDefinition, getQuickActionDisplayLabel, getQuickActionTriggerMessage } from "@/lib/quick-actions"
import * as LucideIcons from "lucide-react"
import { ArrowUp, Code2, ImagePlus, Mic, MoreHorizontal, Send, X, ChevronDown, ChevronUp, MessageCircle, Phone } from "lucide-react"
import { useVisualContext } from "../hooks/useVisualContext"
import type { UserMessageMediaPayload } from "../hooks/useChatCore"
import Image from "next/image"
import { event as trackEvent } from "@/lib/gtag"
import { getAmbientDockStateKey, resolveAmbientDockStyle } from "@/lib/ambient-dock-style"
import { resolveAmbientInputSizeConfig } from "@/lib/ambient-layout"
import { ConversationModeSwitch, type ConversationMode } from "./ConversationModeSwitch"
import { resolveLocalizedText } from "../utils/localized-copy"

type AmbientIconComponent = React.ComponentType<{ className?: string; color?: string }>
const ambientIconRegistry = LucideIcons as unknown as Record<string, AmbientIconComponent>
type QuickActionIconComponent = React.ComponentType<{ className?: string }>
const quickActionIconRegistry = LucideIcons as unknown as Record<string, QuickActionIconComponent>

const ARTIFY_PILL_GAP_PX = 12
const ARTIFY_MORE_BTN_PX = 40
const ARTIFY_MAX_INLINE_PILLS = 3

function computeArtifyInlinePillCount(pillWidths: readonly number[], availableWidth: number): number {
    const n = pillWidths.length
    if (n === 0 || availableWidth <= 0) return 0
    const maxK = Math.min(ARTIFY_MAX_INLINE_PILLS, n)
    for (let k = maxK; k >= 0; k--) {
        const needMore = n > k
        let used = 0
        for (let i = 0; i < k; i++) {
            used += pillWidths[i]
            if (i > 0) used += ARTIFY_PILL_GAP_PX
        }
        if (needMore) {
            if (k > 0) used += ARTIFY_PILL_GAP_PX
            used += ARTIFY_MORE_BTN_PX
        } else if (k === 0 && n > 0) {
            used = ARTIFY_MORE_BTN_PX
        }
        if (used <= availableWidth) return k
    }
    return 0
}

function colorWithAlpha(color: string | undefined, alpha: number) {
    const value = (color || "#7c3aed").trim()
    const clampedAlpha = Math.max(0, Math.min(1, alpha))

    const shortHex = value.match(/^#([0-9a-f]{3})$/i)
    if (shortHex) {
        const [r, g, b] = shortHex[1].split("").map((part) => parseInt(part + part, 16))
        return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`
    }

    const fullHex = value.match(/^#([0-9a-f]{6})$/i)
    if (fullHex) {
        const hex = fullHex[1]
        const r = parseInt(hex.slice(0, 2), 16)
        const g = parseInt(hex.slice(2, 4), 16)
        const b = parseInt(hex.slice(4, 6), 16)
        return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`
    }

    return `color-mix(in srgb, ${value} ${Math.round(clampedAlpha * 100)}%, transparent)`
}

interface ChatInputProps {
    settings: ChatbotSettings
    localInput: string
    setLocalInput: (val: string) => void
    sendMessage: (
        text: string,
        speakResponse?: boolean,
        visualContext?: string,
        guidedEvent?: GuidedSkillClientEvent | null,
        mediaPayload?: UserMessageMediaPayload | null
    ) => Promise<string>
    isChatLoading: boolean
    visualContext: ReturnType<typeof useVisualContext>
    language: string
    t: (key: string) => string
    setMessages: React.Dispatch<React.SetStateAction<any[]>>
    mode?: "classic" | "ambient" | "sidecar"
    ambientInputOnly?: boolean
    onClearChat?: () => void
    onCloseWidget?: () => void
    onToggleAmbientFeed?: () => void
    showUtilityActions?: boolean
    showConversationModeSwitch?: boolean
    conversationMode?: ConversationMode
    onConversationModeChange?: (mode: ConversationMode) => void
    disabled?: boolean
    quickActions?: { enabled: boolean; buttons: QuickActionButton[] }
    onTriggerAction?: (button: QuickActionButton) => void
}

export function ChatInput({
    settings,
    localInput,
    setLocalInput,
    sendMessage,
    isChatLoading,
    visualContext,
    language,
    t,
    setMessages,
    mode = "classic",
    ambientInputOnly = false,
    onCloseWidget,
    onToggleAmbientFeed,
    showUtilityActions = false,
    showConversationModeSwitch = false,
    conversationMode = "text",
    onConversationModeChange,
    disabled = false,
    quickActions,
    onTriggerAction,
}: ChatInputProps) {
    const {
        selectedImage,
        selectedImageName,
        isAnalyzingImage,
        handleImageSelect,
        clearSelectedImage,
        sendImageForAnalysis,
        saveImageToCache,
        selectedImageMimeType
    } = visualContext

    // Ensure clearSelectedImage is available
    const clearImage = clearSelectedImage || (() => { })

    const fileInputRef = React.useRef<HTMLInputElement>(null)
    const isAmbientMode = mode === "ambient"
    const isSidecarMode = mode === "sidecar"
    const isClassicArtifyInput = !isAmbientMode && !isSidecarMode && settings.classicInputVariant === "artify"
    const isWideView = settings.viewMode === "wide"
    const isAmbientInputOnly = isAmbientMode && ambientInputOnly
    const ambientPlaceholder = resolveLocalizedText(
        settings.ambientPlaceholderText,
        settings.ambientPlaceholderTextLocalized,
        language,
        language === "tr" ? "AI Asistanına Sor" : "Ask the AI assistant"
    )

    const sizeConfig = resolveAmbientInputSizeConfig(settings.ambientInputSize)

    const ambientActionButtonClass = `${sizeConfig.buttonSizeClass} rounded-full bg-white/90 backdrop-blur-sm text-gray-500 border border-gray-200/60 shadow-sm flex items-center justify-center transition-all hover:bg-white hover:shadow-md hover:text-gray-700 dark:bg-zinc-800/90 dark:text-zinc-300 dark:border-zinc-700/70 dark:hover:bg-zinc-700/95 dark:hover:text-zinc-100 dark:hover:border-zinc-600`
    const ambientSendButtonClass = `${sizeConfig.buttonSizeClass} rounded-full text-white shadow-sm flex items-center justify-center transition-all hover:brightness-90 hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed`
    const sidecarActionButtonClass = "flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-500 shadow-sm transition-all hover:border-gray-300 hover:bg-white hover:text-gray-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    const sidecarSendButtonClass = "flex h-9 w-9 items-center justify-center rounded-full text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
    const textModeLabel = language === "tr" ? "Yazı" : "Text"
    const voiceModeLabel = language === "tr" ? "Ses" : "Voice"
    const voiceButtonTitle = language === "tr" ? "Sesli görüşmeye geç" : "Switch to voice"
    const quickActionColor = settings.brandColor || "#7c3aed"
    const quickActionSurface = colorWithAlpha(quickActionColor, 0.08)
    const quickActionSurfaceStrong = colorWithAlpha(quickActionColor, 0.14)
    const quickActionBorder = colorWithAlpha(quickActionColor, 0.2)
    const quickActionIconSurface = colorWithAlpha(quickActionColor, 0.12)

    const [isInputFocused, setIsInputFocused] = React.useState(false)
    const [isMobileViewport, setIsMobileViewport] = React.useState(false)
    const [isArtifyMoreOpen, setIsArtifyMoreOpen] = React.useState(false)
    const [artifyInlineCount, setArtifyInlineCount] = React.useState(0)
    const artifyLeftClusterRef = React.useRef<HTMLDivElement>(null)
    const artifyMeasurePillsRef = React.useRef<HTMLDivElement>(null)
    const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null)
    const ambientDockStyles = isAmbientMode
        ? resolveAmbientDockStyle({
            settings,
            state: getAmbientDockStateKey({
                isCollapsed: isAmbientInputOnly,
                isFocused: isInputFocused,
            }),
            isChatLoading,
        })
        : null
    const resizeSidecarTextarea = React.useCallback(() => {
        if (!isSidecarMode || !(inputRef.current instanceof HTMLTextAreaElement)) return

        const textarea = inputRef.current
        textarea.style.height = "0px"
        const nextHeight = Math.min(Math.max(textarea.scrollHeight, 56), 56)
        textarea.style.height = `${nextHeight}px`
        textarea.style.overflowY = textarea.scrollHeight > 56 ? "auto" : "hidden"
    }, [isSidecarMode])

    React.useEffect(() => {
        const updateViewportFlags = () => {
            if (typeof window === "undefined") return
            setIsMobileViewport(window.innerWidth < 768)
        }

        updateViewportFlags()
        window.addEventListener("resize", updateViewportFlags)
        return () => window.removeEventListener("resize", updateViewportFlags)
    }, [])

    React.useEffect(() => {
        // Automatically focus the input when AI finishes answering
        if (!isChatLoading && inputRef.current && !ambientInputOnly && !isMobileViewport) {
            // setTimeout to ensure it runs after any pending renders
            setTimeout(() => {
                inputRef.current?.focus()
            }, 10)
        }
    }, [isChatLoading, ambientInputOnly, isMobileViewport])

    React.useEffect(() => {
        resizeSidecarTextarea()
    }, [localInput, resizeSidecarTextarea])

    React.useEffect(() => {
        const handleActivateInput = (event: MessageEvent) => {
            if (event.data?.type !== 'USEREX_ACTIVATE_INPUT') return

            // In ambient mode, open the feed first if it's currently collapsed (input-only).
            if (isAmbientMode && ambientInputOnly && onToggleAmbientFeed) {
                onToggleAmbientFeed()
            }

            const focusInput = () => {
                if (!inputRef.current) return
                inputRef.current.focus()
                // Put cursor at the end for existing text
                const val = inputRef.current.value
                inputRef.current.setSelectionRange(val.length, val.length)
            }

            // Retry a few times to cover iframe mount/layout transitions after open.
            focusInput()
            setTimeout(focusInput, 50)
            setTimeout(focusInput, 180)
        }

        window.addEventListener('message', handleActivateInput)
        return () => window.removeEventListener('message', handleActivateInput)
    }, [ambientInputOnly, isAmbientMode, onToggleAmbientFeed])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if ((!localInput.trim() && !selectedImage) || isAnalyzingImage || isChatLoading) return

        const currentInput = localInput
        const currentImage = selectedImage
        const currentMimeType = selectedImageMimeType

        setLocalInput("")

        if (currentImage) {
            // Image Flow
            // 1. Get Analysis - pass image data directly to avoid closure issues
            const analysisResult = await sendImageForAnalysis(currentInput, currentImage, currentMimeType)

            // 2. Handle result
            if (analysisResult.success && analysisResult.context) {
                // Success: Send message with analysis context
                try {
                    const textToSend = currentInput.trim() || (language === 'tr' ? "Görseli analiz et" : "Analyze this image");

                    // If user didn't ask a question, show analysis directly
                    if (!currentInput.trim() && analysisResult.analysis) {
                        const userMsg = {
                            id: 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
                            role: 'user',
                            content: textToSend,
                            image: currentImage,
                            imageMimeType: currentMimeType,
                            createdAt: new Date()
                        };

                        const assistantText = language === 'tr'
                            ? `Görsel analiz sonucu:\nTeşhis: ${analysisResult.analysis.diagnosis}\nGüven: ${analysisResult.analysis.confidence}\nÖnerilen: ${analysisResult.analysis.treatment}`
                            : `Image analysis result:\nDiagnosis: ${analysisResult.analysis.diagnosis}\nConfidence: ${analysisResult.analysis.confidence}\nRecommended: ${analysisResult.analysis.treatment}`;

                        const assistantMsg = {
                            id: 'assistant-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
                            role: 'assistant',
                            content: assistantText,
                            createdAt: new Date()
                        };

                        // Persist image for UI recovery
                        if (currentImage && currentMimeType) {
                            saveImageToCache(userMsg.id, currentImage, currentMimeType, textToSend);
                        }

                        setMessages((prev: any[]) => [...prev, userMsg, assistantMsg]);
                        clearImage();
                        return;
                    }

                    await sendMessage(
                        textToSend,
                        false,
                        analysisResult.context,
                        undefined,
                        {
                            image: currentImage,
                            imageMimeType: currentMimeType,
                        }
                    )
                } catch (error) {
                    console.error("Failed to send image message", error)
                }
            } else if (analysisResult.error) {
                // Error: Add error message directly as assistant message (don't send to AI)
                // This prevents the error from being sent to AI and causing confusion
                const errorMessage = analysisResult.error;
                const errorText = language === 'tr'
                    ? `Maalesef görsel analiz gerçekleştirilemedi. ${errorMessage} Başka bir konuda size yardımcı olabilir miyim?`
                    : `Unfortunately, I could not perform the image analysis. ${errorMessage} Can I help you with anything else?`;

                // Add user message (for the image upload attempt)
                const userMsg = {
                    id: 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
                    role: 'user',
                    content: currentInput.trim() || (language === 'tr' ? "Görseli analiz et" : "Analyze this image"),
                    image: currentImage,
                    imageMimeType: currentMimeType,
                    createdAt: new Date()
                };

                if (currentImage && currentMimeType) {
                    saveImageToCache(userMsg.id, currentImage, currentMimeType, userMsg.content)
                }

                // Add assistant error message directly (without calling AI)
                const assistantMsg = {
                    id: 'assistant-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
                    role: 'assistant',
                    content: errorText,
                    createdAt: new Date()
                };

                // Add both messages directly to state (bypassing AI)
                setMessages((prev: any[]) => [...prev, userMsg, assistantMsg]);

                // Clear the image since analysis failed
                clearImage();
            }
        } else {
            // Text Flow
            trackEvent({
                action: 'chat_message_sent',
                category: 'Chat',
                label: 'User Message'
            })
            sendMessage(currentInput)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e as any)
        }
    }

    const renderAmbientLeadingIcon = () => {
        if (!isAmbientMode || settings.showAmbientIcon === false) return null

        if (settings.ambientIconType === "custom" && (settings.ambientIconUrl || settings.launcherIconUrl)) {
            return (
                <div className={`ml-1 flex shrink-0 items-center justify-center rounded-full overflow-hidden ${sizeConfig.leadingSizeClass} bg-transparent`}>
                    <img
                        src={settings.ambientIconUrl || settings.launcherIconUrl}
                        alt="Widget Icon"
                        className="h-full w-full object-contain p-[2px]"
                    />
                </div>
            )
        }

        const IconComponent = (settings.ambientIconType === "library" && settings.ambientLibraryIcon)
            ? ambientIconRegistry[settings.ambientLibraryIcon] || MessageCircle
            : MessageCircle

        return (
            <div className={`ml-1 flex shrink-0 items-center justify-center rounded-full ${sizeConfig.leadingSizeClass} bg-transparent`}>
                <IconComponent
                    className={sizeConfig.leadingIconSizeClass}
                    color={settings.ambientIconColor || settings.brandColor || '#3b82f6'}
                />
            </div>
        )
    }

    const ambientDockWrapperClassName = isAmbientMode
        ? `rounded-[999px] p-[2px] transition-all duration-500 ${isAmbientInputOnly
            ? (ambientDockStyles?.borderMode === 'animated'
                ? 'ambient-border-animated shadow-xl hover:shadow-2xl'
                : 'shadow-xl hover:shadow-2xl')
            : ambientDockStyles?.borderMode === 'animated'
                ? 'ambient-border-animated shadow-[0_22px_48px_rgba(0,0,0,0.22)]'
                : ambientDockStyles?.borderMode === 'gradient'
                    ? 'shadow-[0_22px_48px_rgba(0,0,0,0.22)]'
                    : 'shadow-[0_22px_48px_rgba(0,0,0,0.22)]'
        }`
        : ""
    const ambientDockWrapperStyle = isAmbientMode
        ? ({
            ...(ambientDockStyles?.gradientCssVars || {}),
            ...(ambientDockStyles?.borderMode === 'solid' && ambientDockStyles.outerBorderColor
                ? { backgroundColor: ambientDockStyles.outerBorderColor }
                : (ambientDockStyles && ambientDockStyles.borderMode === 'gradient')
                    ? {
                        background: `linear-gradient(90deg, ${ambientDockStyles.gradientColors[0]} 0%, ${ambientDockStyles.gradientColors[1]} 33%, ${ambientDockStyles.gradientColors[2]} 66%, ${ambientDockStyles.gradientColors[3]} 100%)`
                    }
                    : {}),
        } as React.CSSProperties)
        : undefined

    const visibleQuickActionButtons = quickActions?.enabled && Array.isArray(quickActions?.buttons)
        ? quickActions.buttons.filter((button) => button.visible).sort((a, b) => a.order - b.order)
        : []
    const suggestedQuestionShortcuts = Array.isArray(settings.suggestedQuestions)
        ? settings.suggestedQuestions
            .filter((question): question is string => typeof question === "string" && question.trim().length > 0)
            .slice(0, 3)
            .map((question, index) => ({
                id: `suggested-${index}`,
                label: question,
                Icon: Code2,
                onClick: () => void sendMessage(question),
            }))
        : []
    const artifyShortcutItems = visibleQuickActionButtons.length > 0
        ? visibleQuickActionButtons.map((btn) => {
            const iconName = getQuickActionDefinition(btn.moduleId).iconName
            const Icon = quickActionIconRegistry[iconName] || Code2
            const displayLabel = getQuickActionDisplayLabel(btn, language)
            const triggerMessage = getQuickActionTriggerMessage(btn, language)
            return {
                id: btn.id,
                label: displayLabel,
                Icon,
                onClick: () => {
                    if (onTriggerAction) {
                        onTriggerAction({ ...btn, label: displayLabel, triggerMessage })
                    } else {
                        void sendMessage(triggerMessage)
                    }
                },
            }
        })
        : suggestedQuestionShortcuts

    const artifyShortcutKey = artifyShortcutItems.map((it) => `${it.id}:${it.label}`).join("|")

    const visibleArtifyShortcutItems = artifyShortcutItems.slice(0, artifyInlineCount)
    const overflowArtifyShortcutItems = artifyShortcutItems.slice(artifyInlineCount)
    const hasQuickActions = !isAmbientMode && !isClassicArtifyInput && visibleQuickActionButtons.length > 0

    React.useLayoutEffect(() => {
        if (!isClassicArtifyInput) return

        const run = () => {
            const left = artifyLeftClusterRef.current
            const measure = artifyMeasurePillsRef.current
            if (!left || !measure) return

            const n = artifyShortcutItems.length
            if (n === 0) {
                setArtifyInlineCount((prev) => (prev === 0 ? prev : 0))
                return
            }

            const els = measure.querySelectorAll<HTMLElement>("[data-artify-pill-measure]")
            const widths: number[] = []
            els.forEach((el) => widths.push(el.offsetWidth))

            if (widths.length !== n) return

            const available = Math.floor(left.getBoundingClientRect().width)
            const next = computeArtifyInlinePillCount(widths, available)
            setArtifyInlineCount((prev) => (prev === next ? prev : next))
        }

        run()

        const left = artifyLeftClusterRef.current
        if (!left || typeof ResizeObserver === "undefined") return

        const ro = new ResizeObserver(() => run())
        ro.observe(left)
        return () => ro.disconnect()
    }, [
        isClassicArtifyInput,
        artifyShortcutKey,
        artifyShortcutItems.length,
        settings.enableVisualDiagnosis,
        showConversationModeSwitch,
        language,
    ])

    return (
        <div
            className={isAmbientMode
                ? (isAmbientInputOnly
                    ? "pt-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-transparent"
                    : "pt-1 pb-[calc(0.85rem+env(safe-area-inset-bottom))] bg-transparent")
                : isSidecarMode
                    ? "px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-gray-100 dark:bg-zinc-950 border-t border-gray-200 dark:border-zinc-800"
                    : isWideView
                        ? `px-0 ${hasQuickActions ? "pt-3" : "pt-4"} pb-[calc(1rem+env(safe-area-inset-bottom))] bg-gray-100 dark:bg-zinc-950`
                        : `px-2 sm:px-4 ${hasQuickActions ? "pt-3" : "pt-4"} pb-[calc(1rem+env(safe-area-inset-bottom))] bg-gray-100 dark:bg-zinc-950`}
            style={{ backgroundColor: isAmbientMode ? 'transparent' : undefined }}
        >
            <div
                className={`relative mx-auto min-w-0 ${isAmbientMode ? "w-full bg-transparent" : isSidecarMode ? "w-full max-w-none" : "w-full max-w-none"}`}
                style={{ backgroundColor: isAmbientMode ? 'transparent' : undefined }}
            >
                {hasQuickActions && (
                    <div className="relative mb-3 min-w-0">
                        <div
                            className="w-full min-w-0 overflow-x-auto overscroll-x-contain px-0 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                            onWheel={(event) => {
                                const container = event.currentTarget
                                if (container.scrollWidth <= container.clientWidth) return
                                if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return

                                container.scrollLeft += event.deltaY
                                event.preventDefault()
                            }}
                        >
                            <div className="flex w-max min-w-max flex-nowrap gap-2 px-1">
                        {visibleQuickActionButtons.map((btn) => {
                                const iconName = getQuickActionDefinition(btn.moduleId).iconName
                                const Icon = quickActionIconRegistry[iconName] || MessageCircle
                                const displayLabel = getQuickActionDisplayLabel(btn, language)
                                const triggerMessage = getQuickActionTriggerMessage(btn, language)
                                return (
                                    <button
                                        key={btn.id}
                                        type="button"
                                        onClick={() => onTriggerAction ? onTriggerAction({ ...btn, label: displayLabel, triggerMessage }) : sendMessage(triggerMessage)}
                                        disabled={isChatLoading || disabled}
                                        className="group inline-flex shrink-0 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-xs font-semibold text-gray-700 backdrop-blur-sm transition-[background-color,border-color,color,transform] duration-200 hover:text-gray-950 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 dark:text-zinc-100 dark:hover:text-white"
                                        style={{
                                            borderColor: quickActionBorder,
                                            background: `linear-gradient(135deg, ${quickActionSurfaceStrong} 0%, rgba(255,255,255,0.94) 48%, ${quickActionSurface} 100%)`,
                                        }}
                                    >
                                        <span
                                            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors duration-200 group-hover:text-white"
                                            style={{
                                                color: quickActionColor,
                                                backgroundColor: quickActionIconSurface,
                                            }}
                                        >
                                            <Icon className="h-3.5 w-3.5" />
                                        </span>
                                        <span className="whitespace-nowrap leading-none">{displayLabel}</span>
                                    </button>
                                )
                            })
                        }
                            </div>
                        </div>
                        <div className="pointer-events-none absolute inset-y-2 left-0 w-5 bg-gradient-to-r from-white to-transparent dark:from-zinc-950" />
                        <div className="pointer-events-none absolute inset-y-2 right-0 w-5 bg-gradient-to-l from-white to-transparent dark:from-zinc-950" />
                    </div>
                )}

                {/* Rainbow Border Style is now in globals.css */}
                <div
                    className={ambientDockWrapperClassName}
                    style={ambientDockWrapperStyle}
                >
                    {selectedImage && (
                        <div className={`${isAmbientMode ? "mb-2 px-1" : "mb-2"} animate-in fade-in slide-in-from-bottom-2`}>
                            <div className="relative inline-flex items-start gap-3 rounded-xl border bg-white/90 p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
                                <div className="relative">
                                    <img
                                        src={`data:${selectedImageMimeType};base64,${selectedImage}`}
                                        alt="Selected"
                                        className="h-16 w-16 rounded-lg border-2 border-white object-cover shadow-sm ring-1 ring-gray-100 dark:border-white/10 dark:ring-white/10"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 rounded-b-lg bg-black/60 p-1">
                                        <p className="truncate px-1 text-center text-[9px] text-white">
                                            {isAnalyzingImage ? "Analiz ediliyor..." : "Görsel seçildi"}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={clearSelectedImage}
                                    className="absolute -right-2 -top-2 rounded-full border bg-white p-1 text-gray-500 shadow-md transition-colors hover:text-red-500 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:text-white"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    )}
                    {isClassicArtifyInput ? (
                        <form
                            onSubmit={handleSubmit}
                            className="relative flex min-h-[124px] flex-col justify-between gap-3 rounded-[20px] border border-gray-200 bg-white px-2.5 py-3 shadow-[0_6px_18px_rgba(15,23,42,0.06)] transition-all dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-[0_6px_18px_rgba(0,0,0,0.22)]"
                        >
                            {artifyShortcutItems.length > 0 && (
                                <div
                                    ref={artifyMeasurePillsRef}
                                    className="pointer-events-none fixed -left-[9999px] top-0 z-[-1] flex gap-3 opacity-0"
                                    aria-hidden
                                >
                                    {artifyShortcutItems.map((item) => {
                                        const Icon = item.Icon
                                        return (
                                            <button
                                                key={`measure-${item.id}`}
                                                type="button"
                                                tabIndex={-1}
                                                data-artify-pill-measure
                                                className="group inline-flex h-9 max-w-[170px] shrink-0 items-center gap-2 rounded-full border pl-1.5 pr-3.5 text-xs font-semibold text-gray-700 backdrop-blur-sm dark:text-zinc-100"
                                                style={{
                                                    borderColor: quickActionBorder,
                                                    background: `linear-gradient(135deg, ${quickActionSurfaceStrong} 0%, rgba(255,255,255,0.94) 48%, ${quickActionSurface} 100%)`,
                                                }}
                                            >
                                                <span
                                                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                                                    style={{
                                                        color: quickActionColor,
                                                        backgroundColor: quickActionIconSurface,
                                                    }}
                                                >
                                                    <Icon className="h-3.5 w-3.5" />
                                                </span>
                                                <span className="truncate leading-none">{item.label}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                            {settings.enableVisualDiagnosis && (
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/png, image/jpeg, image/webp"
                                    onChange={handleImageSelect}
                                    className="hidden"
                                />
                            )}
                            <textarea
                                ref={(node) => {
                                    inputRef.current = node
                                }}
                                value={localInput}
                                onChange={(e) => setLocalInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                rows={1}
                                disabled={isChatLoading}
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck={false}
                                enterKeyHint="send"
                                name="vion-chat-input"
                                placeholder={selectedImage
                                    ? (language === 'tr' ? 'Görsel hakkında soru sorun...' : 'Ask about the image...')
                                    : t('messagePlaceholder')}
                                className="min-h-[48px] w-full resize-none border-0 bg-transparent px-1 py-0 text-base font-normal leading-6 text-gray-800 placeholder:text-gray-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
                                style={{ fontSize: isMobileViewport ? '16px' : undefined }}
                            />
                            <div className="flex items-end gap-3">
                                <div ref={artifyLeftClusterRef} className="flex min-h-9 min-w-0 flex-1 flex-nowrap items-center gap-3 overflow-visible">
                                    {visibleArtifyShortcutItems.map((item) => {
                                        const Icon = item.Icon
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={item.onClick}
                                                disabled={isChatLoading || disabled}
                                                className="group inline-flex h-9 max-w-[170px] shrink-0 items-center gap-2 rounded-full border pl-1.5 pr-3.5 text-xs font-semibold text-gray-700 backdrop-blur-sm transition-[background-color,border-color,color,transform] duration-200 hover:text-gray-950 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 dark:text-zinc-100 dark:hover:text-white"
                                                style={{
                                                    borderColor: quickActionBorder,
                                                    background: `linear-gradient(135deg, ${quickActionSurfaceStrong} 0%, rgba(255,255,255,0.94) 48%, ${quickActionSurface} 100%)`,
                                                }}
                                            >
                                                <span
                                                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors duration-200 group-hover:text-white"
                                                    style={{
                                                        color: quickActionColor,
                                                        backgroundColor: quickActionIconSurface,
                                                    }}
                                                >
                                                    <Icon className="h-3.5 w-3.5" />
                                                </span>
                                                <span className="truncate leading-none">{item.label}</span>
                                            </button>
                                        )
                                    })}
                                    {overflowArtifyShortcutItems.length > 0 && (
                                        <div className="relative shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setIsArtifyMoreOpen((current) => !current)}
                                                disabled={isChatLoading || disabled}
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border text-gray-700 backdrop-blur-sm transition-[background-color,border-color,color,transform] hover:text-gray-950 disabled:cursor-not-allowed disabled:opacity-45 dark:text-zinc-100"
                                                style={{
                                                    borderColor: quickActionBorder,
                                                    background: `linear-gradient(135deg, ${quickActionSurfaceStrong} 0%, rgba(255,255,255,0.94) 48%, ${quickActionSurface} 100%)`,
                                                }}
                                                aria-label={language === 'tr' ? 'Daha fazla aksiyon' : 'More actions'}
                                                aria-expanded={isArtifyMoreOpen}
                                            >
                                                <MoreHorizontal className="h-5 w-5" />
                                            </button>
                                            {isArtifyMoreOpen && (
                                                <div className="absolute bottom-12 left-1/2 z-50 w-max min-w-[230px] max-w-[calc(100vw-48px)] -translate-x-1/2 overflow-hidden rounded-xl border border-gray-200 bg-white p-2 shadow-[0_16px_36px_rgba(15,23,42,0.16)] ring-1 ring-black/5 dark:border-zinc-700 dark:bg-zinc-950 dark:shadow-[0_16px_36px_rgba(0,0,0,0.38)] dark:ring-white/10">
                                                    {overflowArtifyShortcutItems.map((item) => {
                                                        const Icon = item.Icon
                                                        return (
                                                            <button
                                                                key={item.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setIsArtifyMoreOpen(false)
                                                                    item.onClick()
                                                                }}
                                                                className="flex h-12 w-full items-center gap-3 rounded-lg py-0 pl-1.5 pr-3 text-left text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:text-zinc-100 dark:hover:bg-zinc-900"
                                                            >
                                                                <Icon className="h-5 w-5 shrink-0" style={{ color: quickActionColor }} />
                                                                <span className="truncate">{item.label}</span>
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="ml-auto flex shrink-0 items-center gap-3">
                                    {settings.enableVisualDiagnosis && (
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isAnalyzingImage}
                                            className={`flex h-9 w-9 items-center justify-center rounded-full text-slate-900 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45 dark:text-zinc-100 dark:hover:bg-zinc-900 ${selectedImage ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : ''}`}
                                            title={language === 'tr' ? 'Görsel Ekle' : 'Add Image'}
                                        >
                                            <ImagePlus className="h-5 w-5" />
                                        </button>
                                    )}
                                    {showConversationModeSwitch && onConversationModeChange && (
                                        <button
                                            type="button"
                                            onClick={() => onConversationModeChange("voice")}
                                            disabled={isChatLoading || disabled}
                                            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-900 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45 dark:text-zinc-100 dark:hover:bg-zinc-900"
                                            title={voiceButtonTitle}
                                        >
                                            <Mic className="h-6 w-6" />
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={isChatLoading || (!localInput.trim() && !selectedImage)}
                                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-all hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 ${isAnalyzingImage ? 'animate-pulse' : ''}`}
                                        style={{ backgroundColor: settings.headerBackgroundColor || settings.brandColor || "#64748b" }}
                                        aria-label={language === 'tr' ? 'Gönder' : 'Send'}
                                    >
                                        <ArrowUp className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <form
                            onSubmit={handleSubmit}
                            className={isAmbientMode
                            ? `relative flex items-center ${sizeConfig.gapClass} rounded-[999px] ${sizeConfig.formPaddingClass} shadow-sm transition-all duration-300 border border-gray-200/50 ${!isAmbientInputOnly ? 'shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_48px_rgba(0,0,0,0.18)]' : ''}`
                            : isSidecarMode
                                ? "relative flex flex-col gap-2.5 rounded-[12px] border border-gray-200 bg-white px-3.5 py-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.07)] dark:border-zinc-700 dark:bg-zinc-950"
                                : "relative flex items-center gap-2"}
                            style={isAmbientMode ? { backgroundColor: ambientDockStyles?.formBackgroundColor || (settings.theme === 'dark' ? '#18181b' : '#f3f4f6') } : undefined}
                        >
                        {settings.enableVisualDiagnosis && (
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept="image/png, image/jpeg, image/webp"
                                onChange={handleImageSelect}
                                className="hidden"
                            />
                        )}

                        {!isAmbientMode && !isSidecarMode && showConversationModeSwitch && onConversationModeChange && (
                            <button
                                type="button"
                                onClick={() => onConversationModeChange("voice")}
                                disabled={isChatLoading || disabled}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-400 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:bg-white hover:text-gray-700 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                                title={voiceButtonTitle}
                                aria-label={voiceButtonTitle}
                            >
                                <Phone className="h-5 w-5" />
                            </button>
                        )}

                        {!isAmbientMode && !isSidecarMode && settings.enableVisualDiagnosis && (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isAnalyzingImage}
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm transition-all hover:-translate-y-0.5 active:scale-95 ${selectedImage
                                    ? 'text-green-600 bg-green-50 border border-green-200'
                                    : 'text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-600 border border-gray-200'} ${isAnalyzingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title={language === 'tr' ? 'Görsel Ekle' : 'Add Image'}
                                aria-label={language === 'tr' ? 'Görsel Ekle' : 'Add Image'}
                            >
                                <ImagePlus className="h-5 w-5" />
                            </button>
                        )}

                        {/* Ambient: Left-side Icon (Optional) */}
                        {renderAmbientLeadingIcon()}

                        {showConversationModeSwitch && isAmbientMode && onConversationModeChange && (
                            <ConversationModeSwitch
                                value={conversationMode}
                                onChange={onConversationModeChange}
                                textLabel={textModeLabel}
                                voiceLabel={voiceModeLabel}
                                compact
                                className="mx-0.5"
                            />
                        )}

                        <div className={`relative min-w-0 flex-1 ${isSidecarMode ? '' : 'group'}`}>
                            {isSidecarMode ? (
                                <textarea
                                    ref={(node) => {
                                        inputRef.current = node
                                    }}
                                    value={localInput}
                                    onChange={(e) => setLocalInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    rows={1}
                                    disabled={isChatLoading}
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                    spellCheck={false}
                                    enterKeyHint="send"
                                    name="vion-chat-input"
                                    placeholder={selectedImage
                                        ? (language === 'tr' ? 'Görsel hakkında soru sorun...' : 'Ask about the image...')
                                        : t('messagePlaceholder')}
                                    className="block min-h-[56px] max-h-[56px] w-full resize-none border-0 bg-transparent px-1 py-0.5 text-[14px] leading-6 text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
                                    style={{ fontSize: isMobileViewport ? '16px' : undefined }}
                                />
                            ) : (
                                <input
                                    ref={(node) => {
                                        inputRef.current = node
                                    }}
                                    value={localInput}
                                    onChange={(e) => setLocalInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    type="text"
                                    autoFocus={isAmbientMode && !isMobileViewport}
                                    disabled={isChatLoading}
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                    spellCheck={false}
                                    enterKeyHint="send"
                                    name="vion-chat-input"
                                    placeholder={selectedImage
                                        ? (language === 'tr' ? 'Görsel hakkında soru sorun...' : 'Ask about the image...')
                                        : (isAmbientMode ? (settings.ambientPlaceholderText || ambientPlaceholder) : t('messagePlaceholder'))}
                                    className={isAmbientMode
                                        ? `w-full ${sizeConfig.textSizeClass} leading-tight bg-transparent border-0 rounded-full ${sizeConfig.inputPaddingLeftClass} ${sizeConfig.inputPaddingRightClass} ${sizeConfig.inputPaddingYClass} focus:outline-none placeholder:text-gray-400 dark:placeholder:text-zinc-500`
                                        : "w-full text-base bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-full pl-4 pr-10 py-3.5 focus:outline-none focus:ring-2 focus:ring-opacity-20 focus:bg-white dark:focus:bg-zinc-900 transition-all shadow-sm group-hover:bg-white dark:group-hover:bg-zinc-800/80 group-hover:shadow-md group-hover:border-gray-300 dark:group-hover:border-zinc-700 text-gray-800 dark:text-zinc-100"}
                                    style={isAmbientMode
                                        ? {
                                            color: settings.ambientInputTextColor || (settings.theme === 'dark' ? '#f4f4f5' : '#4b5563'),
                                            fontSize: isMobileViewport ? '16px' : undefined,
                                        }
                                        : ({
                                            '--tw-ring-color': settings.headerBackgroundColor || settings.brandColor,
                                            fontSize: isMobileViewport ? '16px' : undefined,
                                        } as any)}
                                    onFocus={() => isAmbientMode && setIsInputFocused(true)}
                                    onBlur={() => isAmbientMode && setIsInputFocused(false)}
                                />
                            )}
                        </div>

                        {isSidecarMode && (
                            <div className="flex items-center justify-between gap-2.5 pt-2">
                                <div className="flex items-center gap-2">
                                    {showConversationModeSwitch && onConversationModeChange && (
                                        <button
                                            type="button"
                                            onClick={() => onConversationModeChange("voice")}
                                            disabled={isChatLoading || disabled}
                                            className={sidecarActionButtonClass}
                                            title={voiceButtonTitle}
                                            aria-label={voiceButtonTitle}
                                        >
                                            <Phone className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                    {settings.enableVisualDiagnosis && (
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isAnalyzingImage}
                                            className={`${sidecarActionButtonClass} ${selectedImage
                                                ? '!border-emerald-200 !bg-emerald-50 !text-emerald-700 dark:!border-emerald-800 dark:!bg-emerald-950/60 dark:!text-emerald-300'
                                                : ''}`}
                                            title={language === 'tr' ? 'Görsel Ekle' : 'Add Image'}
                                        >
                                            <ImagePlus className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="submit"
                                        disabled={isChatLoading || (!localInput.trim() && !selectedImage)}
                                        className={`${sidecarSendButtonClass} ${isAnalyzingImage ? 'animate-pulse' : ''}`}
                                        style={{ backgroundColor: settings.headerBackgroundColor || settings.brandColor }}
                                    >
                                        <Send className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Ambient: controls inside the dock, on the right side */}
                        {isAmbientMode && showUtilityActions && !ambientInputOnly && (
                            <button
                                type="button"
                                onClick={onCloseWidget}
                                className={ambientActionButtonClass}
                                title={language === 'tr' ? 'Sohbeti küçült' : 'Collapse chat'}
                            >
                                <ChevronDown className={sizeConfig.iconSizeClass} />
                            </button>
                        )}

                        {isAmbientMode && showUtilityActions && ambientInputOnly && onToggleAmbientFeed && (
                            <button
                                type="button"
                                onClick={onToggleAmbientFeed}
                                className={ambientActionButtonClass}
                                title={language === 'tr' ? 'Sohbeti aç' : 'Expand chat'}
                            >
                                <ChevronUp className={sizeConfig.iconSizeClass} />
                            </button>
                        )}

                        {isAmbientMode && settings.enableVisualDiagnosis && (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isAnalyzingImage}
                                className={`${ambientActionButtonClass} ${selectedImage ? '!bg-emerald-50 !text-emerald-700 !border-emerald-200 dark:!bg-emerald-950/60 dark:!text-emerald-300 dark:!border-emerald-800/70' : ''} ${isAnalyzingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title={language === 'tr' ? 'Görsel Ekle' : 'Add Image'}
                            >
                                <ImagePlus className={sizeConfig.iconSizeClass} />
                            </button>
                        )}

                        {!isSidecarMode && (
                            <button
                                type="submit"
                                disabled={isChatLoading || (!localInput.trim() && !selectedImage)}
                                className={isAmbientMode
                                    ? ambientSendButtonClass
                                    : `flex h-9 w-9 items-center justify-center rounded-full text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md active:scale-95 shadow-sm transform hover:-translate-y-0.5 ${isAnalyzingImage ? 'animate-pulse' : ''}`}
                                style={isAmbientMode ? { backgroundColor: settings.ambientIconColor || settings.brandColor || '#1f2937' } : { backgroundColor: settings.headerBackgroundColor || settings.brandColor }}
                            >
                                <Send className={isAmbientMode ? sizeConfig.iconSizeClass : "w-5 h-5"} />
                            </button>
                        )}
                        </form>
                    )}
                </div>



                {!isAmbientMode && (
                    <div className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2 ${isWideView ? "px-0" : "px-2"}`}>
                        <p className="text-[11px] font-medium text-gray-500 text-center text-balance">
                            {t('aiDisclaimer')}
                        </p>
                        {settings.hideVionBranding !== true && (
                            <a href="https://ameritai.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity whitespace-nowrap">
                                <span className="text-[11px] font-medium text-gray-500">{t("poweredBy")}</span>
                                <span className="text-[11px] font-bold text-gray-600 tracking-tight">AmeritAI</span>
                            </a>
                        )}
                    </div>
                )}
            </div>
        </div >
    )
}
