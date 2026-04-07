"use client"

import { useEffect, useRef, useState } from "react"
import { cleanupVionWidgetRuntime } from "@/lib/widget-runtime-dom"

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

        const cleanup = () => {
            cleanupVionWidgetRuntime()
            scriptRef.current = null
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
