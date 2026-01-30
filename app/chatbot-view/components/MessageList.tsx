import { ChatbotSettings } from "@/types/chatbot"
import { Sparkles } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ProductCard } from "@/components/chatbot/product-card"
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
    onLeadSubmit: (data: any) => Promise<void>
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
    onLeadSubmit
}: MessageListProps) {
    return (
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth bg-gray-50">
            {messages.length === 0 ? (
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
            ) : (
                <>
                    {messages.map((m: any) => {
                        // Render-time image recovery
                        const cached = imageMap[m.id] || (m.role === 'user' && !m.image && m.content ? Object.values(imageMap).find((x: any) => x.content === m.content) : null)
                        const displayImage = m.image || cached?.image
                        const displayMime = m.imageMimeType || cached?.mimeType

                        // Hide empty messages (prevent empty bubble while loading or if failed)
                        if (!m.content?.trim() && !displayImage) return null;

                        const isAssistant = m.role !== 'user';
                        // Only animate USER messages. Assistant messages should appear instantly to replace the loader without a gap.
                        const animationClasses = isAssistant ? '' : 'animate-in fade-in slide-in-from-bottom-2 duration-300';
                        
                        return (
                            <div key={m.id} className={`flex gap-3 max-w-3xl mx-auto ${m.role === 'user' ? 'flex-row-reverse' : ''} ${animationClasses} group/msg`}>
                                {m.role !== 'user' && (
                                    <div
                                        className="relative w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs mt-auto mb-1 shadow-sm overflow-hidden text-white"
                                        style={{ backgroundColor: settings.brandColor || '#000000' }}
                                    >
                                        <Sparkles className="w-4 h-4" />
                                    </div>
                                )}
                                <div className={`space-y-1 max-w-[85%] ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                                    <div className="flex items-center gap-2 justify-between px-1 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-300">
                                        {m.role === 'assistant' && (
                                            <span className="text-[10px] font-medium text-gray-400">{settings.companyName}</span>
                                        )}
                                    </div>
                                    <div
                                        className={`text-sm leading-relaxed px-4 py-3 rounded-2xl shadow-sm inline-block text-left relative transition-all hover:shadow-md ${m.role === 'user'
                                            ? 'bg-blue-600 text-white rounded-tr-sm'
                                            : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                                            }`}
                                        style={m.role === 'user' ? { backgroundColor: settings.headerBackgroundColor || settings.brandColor } : {}}
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

                                                    if (content.trim().startsWith('{') && content.includes('"price"')) {
                                                        try {
                                                            const product = JSON.parse(content)
                                                            if (product.name && product.price) {
                                                                return <ProductCard product={product} brandColor={settings.brandColor} />
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
                                                        <code className={`${m.role === 'user' ? 'bg-white/20 text-white' : 'bg-gray-100 text-red-500'} px-1 py-0.5 rounded text-xs font-mono`} {...props}>
                                                            {children}
                                                        </code>
                                                    )
                                                },
                                                a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className={`underline font-medium ${m.role === 'user' ? 'text-white' : 'text-blue-600 hover:text-blue-800'}`} />,
                                                table: ({ node, ...props }) => <table className="border-collapse table-auto w-full text-xs my-2 bg-white/5 rounded overflow-hidden" {...props} />,
                                                th: ({ node, ...props }) => <th className={`border px-2 py-1 font-semibold ${m.role === 'user' ? 'border-white/20' : 'border-gray-200 bg-gray-50'}`} {...props} />,
                                                td: ({ node, ...props }) => <td className={`border px-2 py-1 ${m.role === 'user' ? 'border-white/20' : 'border-gray-200'}`} {...props} />,
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
                                                onSubmit={onLeadSubmit}
                                                settings={settings}
                                                t={t}
                                            />
                                        )}
                                        <div className={`text-[10px] mt-1 opacity-70 flex justify-end ${m.role === 'user' ? 'text-white' : 'text-gray-400'}`}>
                                            {m.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}

                    {/* Typing Indicator */}
                    {isTyping && (
                        <div className="flex gap-3 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div 
                                className="relative w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white mt-auto mb-1 shadow-sm overflow-hidden order-first"
                                style={{ backgroundColor: settings.brandColor || '#000000' }}
                            >
                                <Sparkles className="w-4 h-4" />
                            </div>
                            <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                </div>
                                <span className="text-xs text-gray-400">
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
