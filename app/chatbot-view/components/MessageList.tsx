import { ChatbotSettings } from "@/types/chatbot"
import { Sparkles } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ProductCard } from "@/components/chatbot/product-card"
import { ProductCarousel } from "@/components/chatbot/product-carousel"
import Image from "next/image"
import { RefObject, WheelEvent } from "react"

interface MessageListProps {
    messages: any[]
    settings: ChatbotSettings
    isTyping: boolean
    language: string
    imageMap: Record<string, any>
    scrollToBottom: (behavior?: ScrollBehavior) => void
    sendMessage: (text: string) => void
    messagesContainerRef: RefObject<HTMLDivElement | null>
    messagesEndRef: RefObject<HTMLDivElement | null>
    t: (key: string) => string
    onLeadSubmit: (data: any, options?: { source?: "inline" | "overlay" }) => Promise<void>
    mode?: "classic" | "ambient"
    showClassicEntryOnboarding?: boolean
}
import { InlineLeadForm } from "./InlineLeadForm"

type RgbColor = { r: number; g: number; b: number }

function parseToRgb(color: string | undefined): RgbColor | null {
    if (!color) return null
    const value = color.trim()
    if (!value) return null

    const shortHex = value.match(/^#([0-9a-f]{3})$/i)
    if (shortHex) {
        const [r, g, b] = shortHex[1].split("")
        return {
            r: parseInt(r + r, 16),
            g: parseInt(g + g, 16),
            b: parseInt(b + b, 16),
        }
    }

    const fullHex = value.match(/^#([0-9a-f]{6})$/i)
    if (fullHex) {
        return {
            r: parseInt(fullHex[1].slice(0, 2), 16),
            g: parseInt(fullHex[1].slice(2, 4), 16),
            b: parseInt(fullHex[1].slice(4, 6), 16),
        }
    }

    const rgb = value.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*[0-9.]+\s*)?\)$/i)
    if (rgb) {
        return {
            r: Math.max(0, Math.min(255, Number(rgb[1]))),
            g: Math.max(0, Math.min(255, Number(rgb[2]))),
            b: Math.max(0, Math.min(255, Number(rgb[3]))),
        }
    }

    return null
}

function getReadableTextColor(background: string | undefined, darkText = "#111827", lightText = "#ffffff"): string {
    const rgb = parseToRgb(background)
    if (!rgb) return darkText

    const srgb = [rgb.r, rgb.g, rgb.b].map((v) => {
        const n = v / 255
        return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4)
    })
    const luminance = (0.2126 * srgb[0]) + (0.7152 * srgb[1]) + (0.0722 * srgb[2])

    return luminance > 0.54 ? darkText : lightText
}

export function MessageList({
    messages,
    settings,
    isTyping,
    language,
    imageMap,
    scrollToBottom,
    sendMessage,
    messagesContainerRef,
    messagesEndRef,
    t,
    onLeadSubmit,
    mode = "classic",
    showClassicEntryOnboarding = false,
}: MessageListProps) {
    const isAmbientMode = mode === "ambient"
    const isTransparentEmbed = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("embed") === "1"
    const handleWheelContain = (event: WheelEvent<HTMLDivElement>) => {
        if (!isAmbientMode) return

        const container = event.currentTarget
        const { scrollTop, scrollHeight, clientHeight } = container
        const canScroll = scrollHeight > clientHeight + 1
        const isAtTop = scrollTop <= 0
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1

        // Prevent wheel momentum from escaping to the host page when the feed
        // is already at the top/bottom (scroll chaining bug in embedded widget).
        if (!canScroll || (isAtTop && event.deltaY < 0) || (isAtBottom && event.deltaY > 0)) {
            event.preventDefault()
        }

        event.stopPropagation()
    }

    return (
        <div
            ref={messagesContainerRef}
            onWheel={isAmbientMode && !showClassicEntryOnboarding ? handleWheelContain : undefined}
            className={isAmbientMode && !showClassicEntryOnboarding
                ? "flex flex-col h-full overflow-y-auto overflow-x-hidden overscroll-contain px-2 py-2 sm:px-3 sm:py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                : (showClassicEntryOnboarding
                    ? "flex-1 overflow-y-auto overflow-x-hidden bg-white"
                    : (isTransparentEmbed ? "flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6 bg-transparent" : "flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6 bg-gray-50"))}
            style={isAmbientMode && !showClassicEntryOnboarding
                ? {
                    WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,1) 94%, rgba(0,0,0,0.45) 98%, rgba(0,0,0,0) 100%)",
                    maskImage: "linear-gradient(to top, rgba(0,0,0,1) 94%, rgba(0,0,0,0.45) 98%, rgba(0,0,0,0) 100%)",
                    overscrollBehaviorY: "contain",
                }
                : undefined}
        >
            {showClassicEntryOnboarding ? (
                <div className="flex h-full w-full flex-col">
                    <div
                        className="px-6 pb-8 pt-6"
                        style={{
                            backgroundColor: settings.headerBackgroundColor || settings.brandColor || "#111827",
                            color: settings.headerTextColor || "#FFFFFF"
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-white/20"
                                style={{ width: settings.headerLogoWidth || 40, height: settings.headerLogoHeight || 40 }}
                            >
                                {settings.headerLogo || settings.brandLogo ? (
                                    <Image
                                        src={settings.headerLogo || settings.brandLogo}
                                        alt={`${settings.companyName} logo`}
                                        fill
                                        className="object-contain p-1"
                                        unoptimized
                                    />
                                ) : (
                                    <Sparkles className="h-5 w-5 text-white" />
                                )}
                            </div>
                            <p className="text-sm font-semibold" style={{ color: settings.headerTextColor || "#FFFFFF" }}>{settings.companyName}</p>
                        </div>
                        <div className="mt-7 space-y-2">
                            <h2 className="text-4xl font-bold leading-tight tracking-tight">
                                {settings.welcomeTitle || `${t("welcomeTo")} ${settings.companyName}`}
                            </h2>
                            <p className="text-base leading-relaxed opacity-90">
                                {settings.welcomeMessage}
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 bg-white px-5 py-4">
                        <div className="space-y-2">
                            {settings.suggestedQuestions.filter((question) => question.trim() !== "").length > 0 ? (
                                settings.suggestedQuestions
                                    .filter((question) => question.trim() !== "")
                                    .map((question, index) => (
                                        <button
                                            key={`${question}-${index}`}
                                            onClick={() => sendMessage(question)}
                                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                                        >
                                            {question}
                                        </button>
                                    ))
                            ) : (
                                <p className="px-1 py-2 text-xs text-gray-500">
                                    {language === "tr"
                                        ? "Öneri bulunamadı. Doğrudan mesaj yazabilirsin."
                                        : "No suggestion found. You can type a direct message below."}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            ) : messages.length === 0 ? (
                isAmbientMode ? (
                    <div className="flex-1 min-h-0" />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-6 p-8 animate-in fade-in duration-700 slide-in-from-bottom-4 fill-mode-forwards">
                        <div
                            className="relative w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg mb-2 overflow-hidden"
                            style={{ backgroundColor: settings.headerBackgroundColor || settings.brandColor }}
                        >
                            <Sparkles className="w-8 h-8" />
                        </div>
                        <div className="space-y-2 max-w-xs">
                            <h2 className="text-xl font-bold text-gray-800">{settings.welcomeTitle || `${t('welcomeTo')} ${settings.companyName}`}</h2>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                {settings.welcomeMessage}
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
                            {settings.suggestedQuestions.filter(q => q.trim() !== "").map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        sendMessage(q)
                                    }}
                                    className="text-xs text-left px-4 py-3 bg-white hover:bg-gray-50 border rounded-xl transition-all hover:shadow-sm shadow-sm"
                                    style={{ borderColor: `${settings.headerBackgroundColor || settings.brandColor}40`, color: settings.headerBackgroundColor || settings.brandColor }}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )
            ) : (
                <div className={isAmbientMode ? "mt-auto flex flex-col gap-3 w-full pb-1" : "w-full space-y-6"}>
                    {messages.map((m: any) => {
                        // Render-time image recovery
                        const cached = imageMap[m.id] || (m.role === 'user' && !m.image && m.content ? Object.values(imageMap).find((x: any) => x.content === m.content) : null)
                        const displayImage = m.image || cached?.image
                        const displayMime = m.imageMimeType || cached?.mimeType
                        const hasProductCarousel = typeof m.content === 'string' && m.content.includes('"product-carousel"')
                        const ambientUserBg = typeof settings.headerBackgroundColor === "string" && settings.headerBackgroundColor.trim()
                            ? settings.headerBackgroundColor.trim()
                            : typeof settings.brandColor === "string" && settings.brandColor.trim()
                                ? settings.brandColor.trim()
                            : undefined

                        // Hide empty messages (prevent empty bubble while loading or if failed)
                        if (!m.content?.trim() && !displayImage) return null;

                        // Remove slide-in animation to prevent replay on display toggle (widget open/close)
                        const animationClasses = '';
                        const ambientUserTextColor = ambientUserBg ? getReadableTextColor(ambientUserBg, "#111827", "#ffffff") : "#ffffff"
                        const ambientAssistantTextColor = "#111827"
                        const userTextIsLight = ambientUserTextColor === "#ffffff"
                        const assistantTextIsLight = false
                        const bubbleClassName = m.role === 'user'
                                ? 'text-white rounded-tr-sm'
                                : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm';
                        const ambientWidthClass = hasProductCarousel && m.role !== 'user' ? 'w-[calc(100%-2.75rem)] max-w-[calc(100%-2.75rem)]' : 'max-w-[85%]';
                        const messageContentClassName = `text-sm leading-relaxed px-5 py-4 text-left relative transition-all rounded-2xl hover:shadow-md shadow-sm ${hasProductCarousel && m.role !== 'user' ? 'block w-full max-w-full overflow-hidden' : 'inline-block'} ${bubbleClassName}`
                        const messageContentStyle = m.role === 'user'
                            ? { backgroundColor: ambientUserBg || settings.headerBackgroundColor || settings.brandColor }
                            : undefined
                        const inlineCodeClassName = m.role === 'user'
                            ? (userTextIsLight ? 'bg-white/20 text-white' : 'bg-black/10 text-gray-900')
                            : (assistantTextIsLight ? 'bg-white/20 text-white' : 'bg-gray-100 text-red-500')
                        const anchorClassName = m.role === 'user'
                            ? (userTextIsLight ? 'underline font-medium text-white' : 'underline font-medium text-gray-900')
                            : (assistantTextIsLight ? 'underline font-medium text-white' : 'underline font-medium text-blue-600 hover:text-blue-800')
                        const tableBaseClassName = isAmbientMode
                            ? (m.role === 'user' ? (userTextIsLight ? 'bg-white/10' : 'bg-black/5') : (assistantTextIsLight ? 'bg-white/10' : 'bg-white'))
                            : 'bg-white/5'
                        const tableBorderClassName = m.role === 'user'
                            ? (userTextIsLight ? 'border-white/20' : 'border-black/20')
                            : (assistantTextIsLight ? 'border-white/20' : 'border-gray-200')

                        return (
                            <div key={m.id} className={`flex w-full ${isAmbientMode ? 'gap-2' : 'gap-3'} ${isAmbientMode ? 'max-w-[1080px]' : 'max-w-3xl'} mx-auto ${m.role === 'user' ? 'justify-end' : 'justify-start'} ${isAmbientMode ? 'px-1.5' : ''} ${animationClasses} group/msg`}>
                                {m.role !== 'user' && !isAmbientMode && (
                                    <div
                                        className="relative w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs mt-auto mb-1 shadow-sm overflow-hidden text-white"
                                        style={{ backgroundColor: settings.brandColor || '#000000' }}
                                    >
                                        <Sparkles className="w-4 h-4" />
                                    </div>
                                )}
                                <div className={`space-y-1 ${ambientWidthClass} ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                                    <div className={`flex items-center gap-2 justify-between px-1 transition-opacity duration-300 ${isAmbientMode ? 'hidden' : 'opacity-0 group-hover/msg:opacity-100'}`}>
                                        {m.role === 'assistant' && (
                                            <span className={`text-[10px] font-medium ${isAmbientMode ? 'text-white/60' : 'text-gray-400'}`}>{settings.companyName}</span>
                                        )}
                                    </div>
                                    <div
                                        className={messageContentClassName}
                                        style={messageContentStyle}
                                    >
                                        {/* Show image if present */}
                                        {displayImage && (
                                            <div className="mb-2">
                                                <Image
                                                    src={`data:${displayMime || 'image/jpeg'};base64,${displayImage}`}
                                                    alt="Uploaded"
                                                    width={500}
                                                    height={300}
                                                    className="max-w-full max-h-48 rounded-lg object-contain w-auto h-auto"
                                                    unoptimized
                                                    onLoad={() => scrollToBottom("smooth")}
                                                />
                                            </div>
                                        )}
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                code: ({ node, inline, className, children, ...props }: any) => {
                                                    const match = /language-(\w+)/.exec(className || '')
                                                    const content = String(children).replace(/\n$/, '')

                                                    if (content.trim().startsWith('[') && content.includes('"price"')) {
                                                        try {
                                                            const products = JSON.parse(content)
                                                            if (Array.isArray(products) && products.length > 0) {
                                                                const validProducts = products.filter((p: any) => p?.name && (p?.price !== undefined && p?.price !== null))
                                                                if (validProducts.length > 0) {
                                                                    return <ProductCarousel products={validProducts} brandColor={settings.brandColor} language={language} />
                                                                }
                                                            }
                                                        } catch (e) {
                                                        }
                                                    }

                                                    if (content.trim().startsWith('{') && content.includes('"product-carousel"')) {
                                                        try {
                                                            const payload = JSON.parse(content)
                                                            if (payload?.type === 'product-carousel' && Array.isArray(payload?.items)) {
                                                                const validProducts = payload.items.filter((p: any) => p?.name && (p?.price !== undefined && p?.price !== null))
                                                                if (validProducts.length > 0) {
                                                                    return <ProductCarousel products={validProducts} brandColor={settings.brandColor} language={language} />
                                                                }
                                                            }
                                                        } catch (e) {
                                                        }
                                                    }

                                                    if (content.trim().startsWith('{') && content.includes('"price"')) {
                                                        try {
                                                            const product = JSON.parse(content)
                                                            if (product.name && (product.price !== undefined && product.price !== null)) {
                                                                return <ProductCard product={product} brandColor={settings.brandColor} language={language} />
                                                            }
                                                        } catch (e) {
                                                        }
                                                    }

                                                    return !inline && match ? (
                                                        <div className="bg-gray-800 text-white p-2 rounded-md text-xs overflow-x-auto my-2">
                                                            <code className={className} {...props}>
                                                                {children}
                                                            </code>
                                                        </div>
                                                    ) : (
                                                        <code className={`${inlineCodeClassName} px-1 py-0.5 rounded text-xs font-mono`} {...props}>
                                                            {children}
                                                        </code>
                                                    )
                                                },
                                                a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className={anchorClassName} />,
                                                pre: ({ node, ...props }) => (
                                                    <div className="max-w-full overflow-hidden my-0">
                                                        {props.children}
                                                    </div>
                                                ),
                                                table: ({ node, ...props }) => <table className={`border-collapse table-auto w-full text-xs my-2 rounded overflow-hidden ${tableBaseClassName}`} {...props} />,
                                                th: ({ node, ...props }) => <th className={`border px-2 py-1 font-semibold ${tableBorderClassName} ${m.role === 'user' ? '' : 'bg-gray-50 text-gray-900'}`} {...props} />,
                                                td: ({ node, ...props }) => <td className={`border px-2 py-1 ${tableBorderClassName}`} {...props} />,
                                                p: ({ node, ...props }) => <p className="mb-1 last:mb-0" {...props} />,
                                                ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-1" {...props} />,
                                                ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-1" {...props} />,
                                            }}
                                        >
                                            {m.content.replace('[SHOW_LEAD_FORM]', '')}
                                        </ReactMarkdown>

                                        {/* Inline Lead Form */}
                                        {m.content.includes('[SHOW_LEAD_FORM]') && (
                                            <InlineLeadForm
                                                onSubmit={(data) => onLeadSubmit(data, { source: "inline" })}
                                                settings={settings}
                                                t={t}
                                            />
                                        )}
                                        {!isAmbientMode && (
                                            <div className={`text-[10px] mt-1 opacity-70 flex justify-end ${m.role === 'user' || isAmbientMode ? 'text-white/70' : 'text-gray-400'}`}>
                                                {m.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}

                    {/* Typing Indicator */}
                    {isTyping && (
                        <div className={`flex w-full gap-3 ${isAmbientMode ? 'max-w-[1080px] mr-auto' : 'max-w-3xl mx-auto'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                            {!isAmbientMode && (
                                <div
                                    className="relative w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white mt-auto mb-1 shadow-sm overflow-hidden order-first"
                                    style={{ backgroundColor: settings.brandColor || '#000000' }}
                                >
                                    <Sparkles className="w-4 h-4" />
                                </div>
                            )}
                            <div className={isAmbientMode ? "px-6 py-4 rounded-[24px] rounded-bl-[4px] bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-750 shadow-sm flex items-center gap-3 text-gray-500" : "px-5 py-4 rounded-2xl rounded-bl-md shadow-sm flex items-center gap-2 bg-white border border-gray-100"}>
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.3s] ${isAmbientMode ? 'bg-indigo-500' : 'bg-gray-400'}`}></div>
                                    <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.15s] ${isAmbientMode ? 'bg-indigo-500' : 'bg-gray-400'}`}></div>
                                    <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${isAmbientMode ? 'bg-indigo-500' : 'bg-gray-400'}`}></div>
                                </div>
                                <span className={`text-[13px] font-medium ${isAmbientMode ? 'text-gray-500 dark:text-zinc-400' : 'text-gray-400'}`}>
                                    {language === 'tr' ? 'Düşünüyor...' : 'Thinking...'}
                                </span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            )}
        </div>
    )
}
