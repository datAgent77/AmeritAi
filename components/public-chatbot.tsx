"use client"

import { usePathname } from "next/navigation"
import { ChatbotLoader } from "./chatbot-loader"

export function PublicChatbot() {
    const pathname = usePathname()

    // Don't show on admin, console, or tenant menu pages
    if (pathname?.startsWith("/admin") ||
        pathname?.startsWith("/console") ||
        pathname?.startsWith("/menu")) {
        return null
    }

    return <ChatbotLoader chatbotId="zOh4ScBMyfMdlCMj5nrvzcuKtSi2" color="#6366f1" />
}
