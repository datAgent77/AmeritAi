import './chatbot-transparent.css'

/**
 * Layout for the chatbot-view iframe route.
 * Forces transparent background regardless of dark/light theme,
 * because this page runs inside a transparent iframe overlay (Ambient mode).
 */
export default function ChatbotViewLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
