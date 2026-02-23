import React from "react"
import { ChatbotSettings } from "@/types/chatbot"
import { Send, ImageIcon, Mic, X, ChevronDown, ChevronUp, RefreshCw, MessageCircle } from "lucide-react"
import { useVisualContext } from "../hooks/useVisualContext"
import Image from "next/image"
import { event as trackEvent } from "@/lib/gtag"
import { getAmbientDockStateKey, resolveAmbientDockStyle } from "@/lib/ambient-dock-style"

interface ChatInputProps {
    settings: ChatbotSettings
    localInput: string
    setLocalInput: (val: string) => void
    sendMessage: (text: string, speakResponse?: boolean, visualContext?: string) => Promise<string>
    isChatLoading: boolean
    handleVoiceInput: () => void
    isListening: boolean
    visualContext: ReturnType<typeof useVisualContext>
    language: string
    t: (key: string) => string
    setMessages: React.Dispatch<React.SetStateAction<any[]>>
    mode?: "classic" | "ambient"
    ambientInputOnly?: boolean
    onClearChat?: () => void
    onCloseWidget?: () => void
    onToggleAmbientFeed?: () => void
    showUtilityActions?: boolean
}

export function ChatInput({
    settings,
    localInput,
    setLocalInput,
    sendMessage,
    isChatLoading,
    handleVoiceInput,
    isListening,
    visualContext,
    language,
    t,
    setMessages,
    mode = "classic",
    ambientInputOnly = false,
    onClearChat,
    onCloseWidget,
    onToggleAmbientFeed,
    showUtilityActions = false
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
    const isAmbientInputOnly = isAmbientMode && ambientInputOnly
    const ambientPlaceholder = language === "tr" ? "Ai Asistanına Sor" : "Ask to Ai Assistant"

    // Ambient input size system
    const inputSize = settings.ambientInputSize || "lg"
    const sizeConfig = {
        sm: { height: 'h-11', btnSize: 'h-8 w-8', iconSize: 'w-4 h-4', textSize: 'text-sm', inputPy: 'py-2', inputPl: 'pl-4', inputPr: 'pr-2', gap: 'gap-1.5' },
        md: { height: 'h-[52px]', btnSize: 'h-9 w-9', iconSize: 'w-[18px] h-[18px]', textSize: 'text-base', inputPy: 'py-2.5', inputPl: 'pl-5', inputPr: 'pr-2', gap: 'gap-2' },
        lg: { height: 'h-[60px]', btnSize: 'h-10 w-10', iconSize: 'w-5 h-5', textSize: 'text-lg', inputPy: 'py-3', inputPl: 'pl-5', inputPr: 'pr-2', gap: 'gap-2' },
        xl: { height: 'h-[68px]', btnSize: 'h-11 w-11', iconSize: 'w-5 h-5', textSize: 'text-xl', inputPy: 'py-3.5', inputPl: 'pl-6', inputPr: 'pr-2', gap: 'gap-2.5' },
    }[inputSize]

    const ambientActionButtonClass = `${sizeConfig.btnSize} rounded-full bg-white/90 backdrop-blur-sm text-gray-500 border border-gray-200/60 shadow-sm flex items-center justify-center transition-all hover:bg-white hover:shadow-md hover:text-gray-700 dark:bg-zinc-800/90 dark:text-zinc-300 dark:border-zinc-700/70 dark:hover:bg-zinc-700/95 dark:hover:text-zinc-100 dark:hover:border-zinc-600`
    const ambientSendButtonClass = `${sizeConfig.btnSize} rounded-full text-white shadow-sm flex items-center justify-center transition-all hover:brightness-90 hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed`

    const [isInputFocused, setIsInputFocused] = React.useState(false)
    const [isMobileViewport, setIsMobileViewport] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement>(null)
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

                    await sendMessage(textToSend, false, analysisResult.context)
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
                    createdAt: new Date()
                };

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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e as any)
        }
    }

    const ambientDockWrapperClassName = isAmbientMode
        ? `rounded-[999px] p-[2px] transition-all duration-500 ${isAmbientInputOnly
            ? (ambientDockStyles?.borderMode === 'animated'
                ? 'ambient-border-animated shadow-md hover:shadow-lg'
                : 'shadow-md hover:shadow-lg')
            : ambientDockStyles?.borderMode === 'animated'
                ? 'ambient-border-animated shadow-[0_18px_36px_rgba(0,0,0,0.24)]'
                : ambientDockStyles?.borderMode === 'gradient'
                    ? 'shadow-[0_18px_36px_rgba(0,0,0,0.24)]'
                    : 'shadow-[0_18px_36px_rgba(0,0,0,0.24)]'
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
                    ? "px-4 pt-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-transparent"
                    : "px-4 pt-1 pb-[calc(0.85rem+env(safe-area-inset-bottom))] bg-transparent")
                : "p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white border-t border-gray-100"}
            style={{ backgroundColor: isAmbientMode ? 'transparent' : undefined }}
        >
            <div
                className={`relative mx-auto ${isAmbientMode ? "w-full bg-transparent" : "max-w-3xl"}`}
                style={{ backgroundColor: isAmbientMode ? 'transparent' : undefined }}
            >
                {/* Rainbow Border Style is now in globals.css */}
                <div
                    className={ambientDockWrapperClassName}
                    style={ambientDockWrapperStyle}
                >
                    <form
                        onSubmit={handleSubmit}
                        className={isAmbientMode
                            ? `relative flex items-center gap-2 rounded-[999px] px-3 py-2.5 shadow-sm transition-all duration-300 border border-gray-200/50 ${!isAmbientInputOnly ? 'shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_48px_rgba(0,0,0,0.18)]' : ''}`
                            : "relative flex items-center gap-2"}
                        style={isAmbientMode ? { backgroundColor: ambientDockStyles?.formBackgroundColor || '#f3f4f6' } : undefined}
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

                        {/* Classic: Left-side controls */}
                        {!isAmbientMode && settings.enableVoiceAssistant && (
                            <button
                                type="button"
                                onClick={handleVoiceInput}
                                className={`p-3 rounded-full transition-all shadow-sm border ${isListening
                                    ? 'text-white bg-red-500 border-red-400 animate-pulse shadow-md shadow-red-200'
                                    : 'text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-600 border-gray-200'}`}
                                title={t('voiceReady')}
                            >
                                <Mic className="w-4 h-4" />
                            </button>
                        )}

                        {!isAmbientMode && settings.enableVisualDiagnosis && (
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
                        {isAmbientMode && settings.showAmbientIcon !== false && (
                            <div className={`ml-2 flex-shrink-0 flex items-center justify-center rounded-full overflow-hidden transition-all ${sizeConfig.iconSize} bg-transparent`}>
                                {settings.ambientIconType === "custom" && (settings.ambientIconUrl || settings.launcherIconUrl) ? (
                                    <img
                                        src={settings.ambientIconUrl || settings.launcherIconUrl}
                                        alt="Widget Icon"
                                        className="w-full h-full object-contain p-[2px]"
                                    />
                                ) : (
                                    (() => {
                                        // Dynamically resolve library icon or fallback
                                        const LucideIcons = require('lucide-react');
                                        const IconComponent = (settings.ambientIconType === "library" && settings.ambientLibraryIcon)
                                            ? LucideIcons[settings.ambientLibraryIcon] || LucideIcons.MessageCircle
                                            : LucideIcons.MessageCircle;

                                        return (
                                            <IconComponent
                                                className="w-5 h-5"
                                                color={settings.ambientIconColor || settings.brandColor || '#3b82f6'}
                                            />
                                        );
                                    })()
                                )}
                            </div>
                        )}

                        <div className={`relative flex-1 ${isAmbientMode ? '-ml-3' : 'group'}`}>
                            <input
                                ref={inputRef}
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
                                    ? `w-full ${sizeConfig.textSize} leading-tight bg-transparent border-0 rounded-full ${sizeConfig.inputPl} ${sizeConfig.inputPr} ${sizeConfig.inputPy} focus:outline-none placeholder:text-gray-400`
                                    : "w-full text-base bg-gray-50 border border-gray-200 rounded-full pl-4 pr-10 py-3.5 focus:outline-none focus:ring-2 focus:ring-opacity-20 focus:bg-white transition-all shadow-sm group-hover:bg-white group-hover:shadow-md group-hover:border-gray-300"}
                                style={isAmbientMode
                                    ? {
                                        color: settings.ambientInputTextColor || '#4b5563',
                                        fontSize: isMobileViewport ? '16px' : undefined,
                                    }
                                    : ({
                                        '--tw-ring-color': settings.headerBackgroundColor || settings.brandColor,
                                        fontSize: isMobileViewport ? '16px' : undefined,
                                    } as any)}
                                onFocus={() => isAmbientMode && setIsInputFocused(true)}
                                onBlur={() => isAmbientMode && setIsInputFocused(false)}
                            />
                        </div>

                        {/* Ambient: controls inside the dock, on the right side */}
                        {isAmbientMode && showUtilityActions && !ambientInputOnly && (
                            <button
                                type="button"
                                onClick={onClearChat}
                                className={ambientActionButtonClass}
                                title={language === 'tr' ? 'Yazışmayı yenile' : 'Refresh chat'}
                            >
                                <RefreshCw className={sizeConfig.iconSize} />
                            </button>
                        )}

                        {isAmbientMode && showUtilityActions && !ambientInputOnly && (
                            <button
                                type="button"
                                onClick={onCloseWidget}
                                className={ambientActionButtonClass}
                                title={language === 'tr' ? 'Sohbeti küçült' : 'Collapse chat'}
                            >
                                <ChevronDown className={sizeConfig.iconSize} />
                            </button>
                        )}

                        {isAmbientMode && showUtilityActions && ambientInputOnly && onToggleAmbientFeed && (
                            <button
                                type="button"
                                onClick={onToggleAmbientFeed}
                                className={ambientActionButtonClass}
                                title={language === 'tr' ? 'Sohbeti aç' : 'Expand chat'}
                            >
                                <ChevronUp className={sizeConfig.iconSize} />
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
                                <ImageIcon className={sizeConfig.iconSize} />
                            </button>
                        )}

                        {isAmbientMode && settings.enableVoiceAssistant && (
                            <button
                                type="button"
                                onClick={handleVoiceInput}
                                className={`${ambientActionButtonClass} ${isListening ? '!bg-red-50 !text-red-600 !border-red-200 dark:!bg-red-950/60 dark:!text-red-300 dark:!border-red-800/70 animate-pulse' : ''}`}
                                title={t('voiceReady')}
                            >
                                <Mic className={sizeConfig.iconSize} />
                            </button>
                        )}

                        <button
                            type="submit"
                            disabled={isChatLoading || (!localInput.trim() && !selectedImage)}
                            className={isAmbientMode
                                ? ambientSendButtonClass
                                : `p-3.5 rounded-full text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md active:scale-95 shadow-sm transform hover:-translate-y-0.5 ${isAnalyzingImage ? 'animate-pulse' : ''}`}
                            style={isAmbientMode ? { backgroundColor: settings.ambientIconColor || settings.brandColor || '#1f2937' } : { backgroundColor: settings.headerBackgroundColor || settings.brandColor }}
                        >
                            <Send className={isAmbientMode ? sizeConfig.iconSize : "w-5 h-5"} />
                        </button>
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
