import React from "react"
import { ChatbotSettings, QuickActionButton } from "@/types/chatbot"
import type { GuidedSkillClientEvent } from "@/lib/guided-skills/types"
import * as LucideIcons from "lucide-react"
import { Send, ImageIcon, X, ChevronDown, ChevronUp, MessageCircle, Calendar, Users, FileText } from "lucide-react"
import { useVisualContext } from "../hooks/useVisualContext"
import type { UserMessageMediaPayload } from "../hooks/useChatCore"
import Image from "next/image"
import { event as trackEvent } from "@/lib/gtag"
import { getAmbientDockStateKey, resolveAmbientDockStyle } from "@/lib/ambient-dock-style"
import { resolveAmbientInputSizeConfig } from "@/lib/ambient-layout"
import { ConversationModeSwitch, type ConversationMode } from "./ConversationModeSwitch"

type AmbientIconComponent = React.ComponentType<{ className?: string; color?: string }>
const ambientIconRegistry = LucideIcons as unknown as Record<string, AmbientIconComponent>

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
    const isAmbientInputOnly = isAmbientMode && ambientInputOnly
    const ambientPlaceholder = language === "tr" ? "Ai Asistanına Sor" : "Ask to Ai Assistant"

    const sizeConfig = resolveAmbientInputSizeConfig(settings.ambientInputSize)

    const ambientActionButtonClass = `${sizeConfig.buttonSizeClass} rounded-full bg-white/90 backdrop-blur-sm text-gray-500 border border-gray-200/60 shadow-sm flex items-center justify-center transition-all hover:bg-white hover:shadow-md hover:text-gray-700 dark:bg-zinc-800/90 dark:text-zinc-300 dark:border-zinc-700/70 dark:hover:bg-zinc-700/95 dark:hover:text-zinc-100 dark:hover:border-zinc-600`
    const ambientSendButtonClass = `${sizeConfig.buttonSizeClass} rounded-full text-white shadow-sm flex items-center justify-center transition-all hover:brightness-90 hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed`
    const sidecarActionButtonClass = "flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-500 shadow-sm transition-all hover:border-gray-300 hover:bg-white hover:text-gray-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    const sidecarSendButtonClass = "flex h-10 w-10 items-center justify-center rounded-full text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
    const textModeLabel = language === "tr" ? "Yazi" : "Text"
    const voiceModeLabel = language === "tr" ? "Ses" : "Voice"

    const [isInputFocused, setIsInputFocused] = React.useState(false)
    const [isMobileViewport, setIsMobileViewport] = React.useState(false)
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

    return (
        <div
            className={isAmbientMode
                ? (isAmbientInputOnly
                    ? "pt-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-transparent"
                    : "pt-1 pb-[calc(0.85rem+env(safe-area-inset-bottom))] bg-transparent")
                : isSidecarMode
                    ? "px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white dark:bg-zinc-950 border-t border-gray-100 dark:border-zinc-800"
                    : "p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white dark:bg-zinc-950 border-t border-gray-100 dark:border-zinc-800"}
            style={{ backgroundColor: isAmbientMode ? 'transparent' : undefined }}
        >
            <div
                className={`relative mx-auto ${isAmbientMode ? "w-full bg-transparent" : isSidecarMode ? "w-full max-w-none" : "max-w-3xl"}`}
                style={{ backgroundColor: isAmbientMode ? 'transparent' : undefined }}
            >
                {!isAmbientMode && quickActions?.enabled && quickActions.buttons.filter(b => b.visible).length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {quickActions.buttons
                            .filter(b => b.visible)
                            .sort((a, b) => a.order - b.order)
                            .map(btn => {
                                const Icon = btn.moduleId === 'appointments' ? Calendar
                                    : btn.moduleId === 'humanHandoff' ? Users
                                    : FileText
                                return (
                                    <button
                                        key={btn.id}
                                        type="button"
                                        onClick={() => sendMessage(btn.triggerMessage)}
                                        disabled={isChatLoading || disabled}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-all hover:shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                                        style={{
                                            borderColor: settings.brandColor,
                                            color: settings.brandColor,
                                            backgroundColor: `${settings.brandColor}12`,
                                        }}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        {btn.label}
                                    </button>
                                )
                            })
                        }
                    </div>
                )}

                {showConversationModeSwitch && !isAmbientMode && onConversationModeChange && (
                    <div className="mb-3 flex justify-center">
                        <ConversationModeSwitch
                            value={conversationMode}
                            onChange={onConversationModeChange}
                            textLabel={textModeLabel}
                            voiceLabel={voiceModeLabel}
                        />
                    </div>
                )}

                {/* Rainbow Border Style is now in globals.css */}
                <div
                    className={ambientDockWrapperClassName}
                    style={ambientDockWrapperStyle}
                >
                    <form
                        onSubmit={handleSubmit}
                        className={isAmbientMode
                            ? `relative flex items-center ${sizeConfig.gapClass} rounded-[999px] ${sizeConfig.formPaddingClass} shadow-sm transition-all duration-300 border border-gray-200/50 ${!isAmbientInputOnly ? 'shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_48px_rgba(0,0,0,0.18)]' : ''}`
                            : isSidecarMode
                                ? "relative flex flex-col gap-2.5 rounded-[12px] border border-gray-200 bg-white px-3.5 py-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.07)] dark:border-zinc-700 dark:bg-zinc-950"
                                : "relative flex items-center gap-2"}
                        style={isAmbientMode ? { backgroundColor: ambientDockStyles?.formBackgroundColor || (settings.theme === 'dark' ? '#18181b' : '#f3f4f6') } : undefined}
                    >
                        {/* Image Preview */}
                        {selectedImage && (
                            <div className="absolute bottom-full left-0 mb-4 ml-2 animate-in fade-in slide-in-from-bottom-2 z-20">
                                <div className="relative group">
                                    <img
                                        src={`data:${selectedImageMimeType};base64,${selectedImage}`}
                                        alt="Selected"
                                        className={`h-20 w-20 object-cover rounded-lg shadow-lg border-2 ${isAmbientMode ? 'border-white/30 ring-1 ring-white/20' : 'border-white ring-1 ring-gray-100'}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={clearSelectedImage}
                                        className={`absolute -top-2 -right-2 p-1 rounded-full shadow-md transition-colors border ${isAmbientMode ? 'bg-black/60 border-white/20 text-white/80 hover:text-white' : 'bg-white border-gray-100 text-gray-500 hover:text-red-500'}`}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                    <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-[1px] p-1 rounded-b-lg">
                                        <p className="text-[9px] text-white truncate px-1 text-center">
                                            {isAnalyzingImage ? "Analiz ediliyor..." : "Görsel seçildi"}
                                        </p>
                                    </div>
                                </div>
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

                        {!isAmbientMode && !isSidecarMode && settings.enableVisualDiagnosis && (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isAnalyzingImage}
                                className={`p-3 rounded-full transition-all shadow-sm ${selectedImage
                                    ? 'text-green-600 bg-green-50 border border-green-200'
                                    : 'text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-600 border border-gray-200'} ${isAnalyzingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title={language === 'tr' ? 'Görsel Ekle' : 'Add Image'}
                            >
                                <ImageIcon className="w-4 h-4" />
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
                                            <ImageIcon className="h-3.5 w-3.5" />
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
                                <ImageIcon className={sizeConfig.iconSizeClass} />
                            </button>
                        )}

                        {!isSidecarMode && (
                            <button
                                type="submit"
                                disabled={isChatLoading || (!localInput.trim() && !selectedImage)}
                                className={isAmbientMode
                                    ? ambientSendButtonClass
                                    : `p-3.5 rounded-full text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md active:scale-95 shadow-sm transform hover:-translate-y-0.5 ${isAnalyzingImage ? 'animate-pulse' : ''}`}
                                style={isAmbientMode ? { backgroundColor: settings.ambientIconColor || settings.brandColor || '#1f2937' } : { backgroundColor: settings.headerBackgroundColor || settings.brandColor }}
                            >
                                <Send className={isAmbientMode ? sizeConfig.iconSizeClass : "w-5 h-5"} />
                            </button>
                        )}
                    </form>
                </div>



                {!isAmbientMode && (
                    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2 px-2">
                        <p className="text-[10px] text-gray-400 text-center text-balance">
                            {t('aiDisclaimer')}
                        </p>
                        <a href="https://getvion.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity whitespace-nowrap">
                            <span className="text-[10px] text-gray-400">Powered by</span>
                            <Image src="/vion-logo-full-dark.png" alt="Vion" width={50} height={12} className="h-2.5 w-auto opacity-60" unoptimized />
                        </a>
                    </div>
                )}
            </div>
        </div >
    )
}
