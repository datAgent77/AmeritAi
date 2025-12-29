"use client"

import { useEffect, useState } from "react"
import { useLanguage } from "@/context/LanguageContext"
import { motion, AnimatePresence } from "framer-motion"
import { VionLogo } from "@/components/vion-logo"

interface Message {
    role: 'user' | 'ai';
    content: { tr: string; en: string };
}

interface AnimatedChatProps {
    conversation?: Message[];
}

export function AnimatedChat({ conversation }: AnimatedChatProps) {
    const { language } = useLanguage()
    const [visibleMessages, setVisibleMessages] = useState<number>(0)
    const [isTyping, setIsTyping] = useState(false)

    useEffect(() => {
        if (!conversation || conversation.length === 0) return

        let currentIndex = 0

        const showNextMessage = () => {
            if (currentIndex >= conversation.length) {
                // Restart loop after a long delay
                setTimeout(() => {
                    setVisibleMessages(0)
                    currentIndex = 0
                    showNextMessage()
                }, 8000)
                return
            }

            // If it's AI's turn, show typing indicator first
            const msg = conversation[currentIndex]
            if (msg.role === 'ai') {
                setIsTyping(true)
                setTimeout(() => {
                    setIsTyping(false)
                    setVisibleMessages(prev => prev + 1)
                    currentIndex++
                    setTimeout(showNextMessage, 2500) // Reading time
                }, 1500) // Typing duration
            } else {
                // User message
                setTimeout(() => {
                    setVisibleMessages(prev => prev + 1)
                    currentIndex++
                    setTimeout(showNextMessage, 1000) // Response delay
                }, 1000)
            }
        }

        const timeout = setTimeout(showNextMessage, 1000)
        return () => clearTimeout(timeout)
    }, [conversation])

    if (!conversation || conversation.length === 0) return null

    return (
        <div className="w-full max-w-3xl mx-auto relative min-h-[400px] flex flex-col justify-end p-4">
            {/* Subtle ambient glow behind the chat, not a box */}
            <div className="absolute inset-0 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />

            <div className="flex flex-col space-y-6 relative z-10 sticky bottom-0">
                <AnimatePresence mode='popLayout'>
                    {conversation.slice(0, visibleMessages).map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {msg.role === 'ai' ? (
                                <div className="flex gap-3 max-w-[85%] md:max-w-[80%]">
                                    <div className="flex-shrink-0 mt-1">
                                        <div className="w-8 h-8 rounded-full bg-black/50 border border-white/20 flex items-center justify-center p-1.5">
                                            <VionLogo className="w-full h-full text-white" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-white">Vion AI</span>
                                            <div className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-[10px] font-medium text-blue-300 border border-blue-500/20">
                                                AI Agent
                                            </div>
                                        </div>
                                        <div className="bg-zinc-900/90 border border-white/10 text-zinc-100 px-5 py-3 rounded-2xl rounded-tl-sm shadow-xl backdrop-blur-sm">
                                            {msg.content[language as 'en' | 'tr']}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-blue-600 text-white px-5 py-3 rounded-2xl rounded-tr-sm shadow-lg max-w-[85%] md:max-w-[70%]">
                                    {msg.content[language as 'en' | 'tr']}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isTyping && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex gap-3 max-w-[80%]"
                    >
                        <div className="flex-shrink-0 mt-1">
                            <div className="w-8 h-8 rounded-full bg-black/50 border border-white/20 flex items-center justify-center p-1.5">
                                <VionLogo className="w-full h-full text-white" />
                            </div>
                        </div>
                        <div>
                            <span className="text-sm font-semibold text-white block mb-1">Vion AI</span>
                            <div className="bg-zinc-900/90 border border-white/10 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1 items-center w-fit shadow-xl">
                                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"></span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    )
}
