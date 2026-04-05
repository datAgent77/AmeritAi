"use client"

import { usePathname } from "next/navigation"
import { AuthProvider } from "@/context/AuthContext"

// Public routes that should NOT use AuthProvider to prevent session conflicts
const PUBLIC_WIDGET_ROUTES = ['/chatbot-view', '/widget-test']

export function ConditionalAuthProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    // Check if current path is a public widget route
    const isPublicWidgetRoute = PUBLIC_WIDGET_ROUTES.some(route => pathname?.startsWith(route))

    if (isPublicWidgetRoute) {
        // Skip AuthProvider entirely for widget routes
        // This prevents any Firebase auth operations that could affect the main session
        return <>{children}</>
    }

    // Normal routes get AuthProvider
    return <AuthProvider>{children}</AuthProvider>
}
