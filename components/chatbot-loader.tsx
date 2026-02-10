"use client"

import { useEffect, useRef, useState } from "react"
import { useAuth } from "@/context/AuthContext"

interface ChatbotLoaderProps {
    chatbotId: string
    color?: string
}

export function ChatbotLoader({ chatbotId, color }: ChatbotLoaderProps) {
    const scriptRef = useRef<HTMLScriptElement | null>(null)
    const [shouldLoad, setShouldLoad] = useState(false)

    useEffect(() => {
        const handleInteraction = () => {
             setShouldLoad(true)
        }

        // Load on first user interaction to improve TBT (Total Blocking Time)
        // 94KB widget script will only load when user actually interacts
        window.addEventListener('click', handleInteraction, { once: true })
        window.addEventListener('scroll', handleInteraction, { once: true })
        window.addEventListener('mousemove', handleInteraction, { once: true })
        window.addEventListener('touchstart', handleInteraction, { once: true })
        
        // Also load after 4 seconds automatically if no interaction (for SEO/bots/passive users)
        const timer = setTimeout(() => {
            setShouldLoad(true)
        }, 4000)

        return () => {
            window.removeEventListener('click', handleInteraction)
            window.removeEventListener('scroll', handleInteraction)
            window.removeEventListener('mousemove', handleInteraction)
            window.removeEventListener('touchstart', handleInteraction)
            clearTimeout(timer)
        }
    }, [])

    useEffect(() => {
        if (!chatbotId || !shouldLoad) return

        // Cleanup function to remove existing widget elements
        const cleanup = () => {
            const elementsToRemove = [
                'userex-chatbot-launcher',
                'userex-chatbot-container',
                'userex-voice-launcher',
                'userex-engagement-bubble',
                'userex-mobile-styles',
                'userex-animation-styles',
                'userex-engagement-animations',
                'userex-lucide-script'
            ]

            elementsToRemove.forEach(id => {
                const el = document.getElementById(id)
                if (el) el.remove()
            })

            // Remove the script tag itself if we tracked it
            if (scriptRef.current) {
                scriptRef.current.remove()
                scriptRef.current = null
            } else {
                // Fallback: try to find script by src if ref wasn't set (e.g. from previous nav)
                // Only remove exact widget.js matches to avoid removing other scripts
                const scripts = document.querySelectorAll(`script[src="/widget.js"], script[src^="/widget.js?"]`)
                scripts.forEach(s => s.remove())
            }
        }

        // Run cleanup first to ensure clean slate
        cleanup()

        // Create and inject script
        const script = document.createElement("script")
        script.src = "/widget.js"
        script.dataset.chatbotId = chatbotId
        if (color) script.dataset.color = color
        script.async = true
        script.defer = true // Defer execution

        scriptRef.current = script
        document.body.appendChild(script)

        return () => {
            cleanup()
        }
    }, [chatbotId, color, shouldLoad])

    return null
}
