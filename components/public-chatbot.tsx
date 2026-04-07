"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { ChatbotLoader } from "./chatbot-loader"
import { cleanupVionWidgetRuntime, shouldDisablePublicWidget } from "@/lib/widget-runtime-dom"

export function PublicChatbot() {
    const pathname = usePathname()
    const shouldDisableWidget = shouldDisablePublicWidget(pathname)

    useEffect(() => {
        if (shouldDisableWidget) {
            cleanupVionWidgetRuntime()
        }
    }, [pathname, shouldDisableWidget])

    if (shouldDisableWidget) {
        return null
    }

    return <ChatbotLoader chatbotId="zOh4ScBMyfMdlCMj5nrvzcuKtSi2" color="#c20054" />
}
