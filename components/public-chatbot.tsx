"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { ChatbotLoader } from "./chatbot-loader"
import { cleanupVionWidgetRuntime, shouldDisablePublicWidget } from "@/lib/widget-runtime-dom"

const PUBLIC_CHATBOT_ID = process.env.NEXT_PUBLIC_PUBLIC_CHATBOT_ID || "zOh4ScBMyfMdlCMj5nrvzcuKtSi2"

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

    // Marketing sites should always load the shared public demo widget.
    // Tenant-specific widgets are loaded explicitly where needed.
    return <ChatbotLoader chatbotId={PUBLIC_CHATBOT_ID} color="#c20054" />
}
