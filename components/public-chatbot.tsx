"use client"

import { usePathname } from "next/navigation"
import { ChatbotLoader } from "./chatbot-loader"

const PUBLIC_CHATBOT_ID = process.env.NEXT_PUBLIC_PUBLIC_CHATBOT_ID || "zOh4ScBMyfMdlCMj5nrvzcuKtSi2"

export function PublicChatbot() {
    const pathname = usePathname()

    // Don't show on admin, console, or tenant menu pages
    if (pathname?.startsWith("/admin") ||
        pathname?.startsWith("/console") ||
        pathname?.startsWith("/menu") ||
        pathname?.startsWith("/onboarding") ||
        pathname?.startsWith("/chatbot-view") ||
        pathname?.startsWith("/widget-test")) {
        return null
    }

    // Marketing sites should always load the shared public demo widget.
    // Tenant-specific widgets are loaded explicitly where needed.
    return <ChatbotLoader chatbotId={PUBLIC_CHATBOT_ID} color="#c20054" />
}
