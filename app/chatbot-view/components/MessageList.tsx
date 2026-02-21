import { ChatbotSettings } from "@/types/chatbot"
import { Sparkles } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ProductCard } from "@/components/chatbot/product-card"
import { ProductCarousel } from "@/components/chatbot/product-carousel"
import Image from "next/image"
import { RefObject } from "react"

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
}
import { InlineLeadForm } from "./InlineLeadForm"

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
    mode = "classic"
}: MessageListProps) {
    const isAmbientMode = mode === "ambient"
    const ambientMaxHeight = Math.max(220, Math.min(460, settings.ambientMaxHeight || 300))

    return (
        <div
            ref={messagesContainerRef}
            className={isAmbientMode
                ? "h-full overflow-y-auto overflow-x-hidden px-1 py-1 space-y-3 sm:px-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                : "flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6 bg-gray-50"}
            style={isAmbientMode
                ? {
                    maxHeight: `${ambientMaxHeight}px`,
                    WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 100%)",
                    maskImage: "linear-gradient(to top, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 100%)",
                }
                : undefined}
        >
            {messages.length === 0 ? (
                isAmbientMode ? (
                    <div className="h-full" />
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
                <>
                    {messages.map((m: any) => {
                        // Render-time image recovery
                        const cached = imageMap[m.id] || (m.role === 'user' && !m.image && m.content ? Object.values(imageMap).find((x: any) => x.content === m.content) : null)
                        const displayImage = m.image || cached?.image
                        const displayMime = m.imageMimeType || cached?.mimeType
                        const hasProductCarousel = typeof m.content === 'string' && m.content.includes('"product-carousel"')

                        // Hide empty messages (prevent empty bubble while loading or if failed)
                        if (!m.content?.trim() && !displayImage) return null;

                        const isAssistant = m.role !== 'user';
                        // Remove slide-in animation to prevent replay on display toggle (widget open/close)
                        const animationClasses = '';
                        const bubbleClassName = isAmbientMode
                            ? (m.role === 'user'
                                ? 'bg-white/75 text-gray-800 rounded-2xl rounded-br-md shadow-[0_4px_16px_rgba(0,0,0,0.06)] backdrop-blur-xl border border-white/50'
                                : 'text-white rounded-2xl rounded-bl-md shadow-[0_4px_16px_rgba(0,0,0,0.08)] backdrop-blur-xl border border-white/20')
                            : (m.role === 'user'
                                ? 'bg-blue-600 text-white rounded-tr-sm'
                                : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm');
                        const ambientWidthClass = isAmbientMode
                            ? (m.role === 'user' ? 'max-w-[70%] ml-auto' : 'max-w-[80%] mr-auto')
                            : (hasProductCarousel && m.role !== 'user' ? 'w-[calc(100%-2.75rem)] max-w-[calc(100%-2.75rem)]' : 'max-w-[85%]');

                        return (
                            <div key={m.id} className={`flex w-full gap-3 ${isAmbientMode ? 'max-w-[1080px]' : 'max-w-3xl'} mx-auto ${m.role === 'user' ? 'justify-end' : 'justify-start'} ${isAmbientMode ? 'mb-2 px-2' : ''} ${animationClasses} group/msg`}>
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
                                        className={`text-sm leading-relaxed px-5 py-4 text-left relative transition-all ${isAmbientMode ? '' : 'rounded-2xl hover:shadow-md shadow-sm'} ${hasProductCarousel && m.role !== 'user' ? 'block w-full max-w-full overflow-hidden' : 'inline-block'} ${bubbleClassName}`}
                                        style={
                                            isAmbientMode
                                                ? (m.role === 'user'
                                                    ? undefined
                                                    : { backgroundColor: settings.ambientAiBubbleColor || settings.brandColor || '#3b82f6' })
                                                : (m.role === 'user'
                                                    ? { backgroundColor: settings.headerBackgroundColor || settings.brandColor }
                                                    : undefined)
                                        }
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
                                                        <code className={`${m.role === 'user' || isAmbientMode ? 'bg-white/20 text-white' : 'bg-gray-100 text-red-500'} px-1 py-0.5 rounded text-xs font-mono`} {...props}>
                                                            {children}
                                                        </code>
                                                    )
                                                },
                                                a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className={`underline font-medium ${m.role === 'user' || isAmbientMode ? 'text-white' : 'text-blue-600 hover:text-blue-800'}`} />,
                                                pre: ({ node, ...props }) => (
                                                    <div className="max-w-full overflow-hidden my-0">
                                                        {props.children}
                                                    </div>
                                                ),
                                                table: ({ node, ...props }) => <table className={`border-collapse table-auto w-full text-xs my-2 rounded overflow-hidden ${isAmbientMode ? 'bg-white/5' : 'bg-white/5'}`} {...props} />,
                                                th: ({ node, ...props }) => <th className={`border px-2 py-1 font-semibold ${m.role === 'user' || isAmbientMode ? 'border-white/20' : 'border-gray-200 bg-gray-50'}`} {...props} />,
                                                td: ({ node, ...props }) => <td className={`border px-2 py-1 ${m.role === 'user' || isAmbientMode ? 'border-white/20' : 'border-gray-200'}`} {...props} />,
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
                            <div className={`px-5 py-4 rounded-2xl rounded-bl-md shadow-sm flex items-center gap-2 ${isAmbientMode ? 'bg-white/75 text-gray-800 backdrop-blur-xl border border-white/50' : 'bg-white border border-gray-100'}`}>
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.3s] ${isAmbientMode ? 'bg-gray-500' : 'bg-gray-400'}`}></div>
                                    <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.15s] ${isAmbientMode ? 'bg-gray-500' : 'bg-gray-400'}`}></div>
                                    <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${isAmbientMode ? 'bg-gray-500' : 'bg-gray-400'}`}></div>
                                </div>
                                <span className={`text-xs ${isAmbientMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {language === 'tr' ? 'Düşünüyor...' : 'Thinking...'}
                                </span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </>
            )}
        </div>
    )
}
