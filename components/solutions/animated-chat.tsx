"use client"

import { useEffect, useState } from "react"
import { useLanguage } from "@/context/LanguageContext"
import { motion, AnimatePresence } from "framer-motion"

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
                // Optional: Restart loop after a long delay
                setTimeout(() => {
                    setVisibleMessages(0)
                    currentIndex = 0
                    showNextMessage()
                }, 5000)
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
                    setTimeout(showNextMessage, 2000) // Reading time
                }, 1500) // Typing duration
            } else {
                // User message appears slightly faster
                setTimeout(() => {
                    setVisibleMessages(prev => prev + 1)
                    currentIndex++
                    setTimeout(showNextMessage, 1000) // Response delay
                }, 1000)
            }
        }

        // Start the sequence
        const timeout = setTimeout(showNextMessage, 1000)
        return () => clearTimeout(timeout)
    }, [conversation])

    if (!conversation || conversation.length === 0) return null

    return (
        <div className="w-full max-w-3xl mx-auto bg-black border border-white/10 rounded-2xl p-4 md:p-8 shadow-2xl relative overflow-hidden min-h-[400px] flex flex-col justify-end">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[80px] rounded-full pointer-events-none" />

            <div className="flex flex-col space-y-4">
                <AnimatePresence mode='popLayout'>
                    {conversation.slice(0, visibleMessages).map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`
                                max-w-[85%] md:max-w-[75%] px-5 py-3 rounded-2xl text-sm md:text-base leading-relaxed shadow-lg
                                ${msg.role === 'user'
                                    ? 'bg-zinc-800 text-zinc-100 rounded-tr-sm'
                                    : 'bg-blue-600 text-white rounded-tl-sm shadow-blue-900/20'}
                            `}>
                                {msg.content[language as 'en' | 'tr']}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isTyping && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex justify-start"
                    >
                        <div className="bg-zinc-900/50 border border-white/5 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1 items-center">
                            <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"></span>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    )
}
