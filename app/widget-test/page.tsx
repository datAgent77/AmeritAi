"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { MessageSquare, Moon, Sun } from "lucide-react"

import { Suspense } from "react"

function WidgetTestPageContent() {
    const searchParams = useSearchParams()
    const id = searchParams?.get("id")
    const [scriptLoaded, setScriptLoaded] = useState(false)
    const [theme, setTheme] = useState<"light" | "dark">("light")
    const isDark = theme === "dark"

    useEffect(() => {
        const savedTheme = window.localStorage.getItem("widget-test-theme")
        if (savedTheme === "light" || savedTheme === "dark") {
            setTheme(savedTheme)
        }
    }, [])

    const handleThemeChange = (nextTheme: "light" | "dark") => {
        setTheme(nextTheme)
        window.localStorage.setItem("widget-test-theme", nextTheme)
    }

    useEffect(() => {
        if (!id) return

        // Remove existing widget if any
        const existingScript = document.querySelector('script[src*="widget.js"]')
        if (existingScript) {
            existingScript.remove()
        }
        const existingLauncher = document.getElementById('userex-chatbot-launcher')
        if (existingLauncher) {
            existingLauncher.remove()
        }
        const existingLauncherWrapper = document.getElementById('userex-launcher-wrapper')
        if (existingLauncherWrapper) {
            existingLauncherWrapper.remove()
        }
        const existingContainer = document.getElementById('userex-chatbot-container')
        if (existingContainer) {
            existingContainer.remove()
        }

        // Add new script
        const script = document.createElement("script")
        script.src = `/widget.js?t=${Date.now()}`
        script.setAttribute("data-chatbot-id", id)
        // We can optionally fetch the brand color here if we want to be precise, 
        // but the widget.js fetches settings from API anyway. 
        // We'll just set a default or let the widget handle it.
        // script.setAttribute("data-color", "#000000")

        script.onload = () => setScriptLoaded(true)
        document.body.appendChild(script)

        return () => {
            // Cleanup on unmount
            if (document.body.contains(script)) {
                document.body.removeChild(script)
            }
            const launcher = document.getElementById('userex-chatbot-launcher')
            if (launcher) launcher.remove()
            const launcherWrapper = document.getElementById('userex-launcher-wrapper')
            if (launcherWrapper) launcherWrapper.remove()
            const container = document.getElementById('userex-chatbot-container')
            if (container) container.remove()
        }
    }, [id])

    if (!id) {
        return (
            <div className={`flex h-screen items-center justify-center transition-colors ${isDark ? "bg-zinc-950" : "bg-gray-100"}`}>
                <div className={`text-center p-8 rounded-xl shadow-sm border ${isDark ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-white border-gray-100 text-gray-900"}`}>
                    <h1 className="text-2xl font-bold mb-2">Missing ID</h1>
                    <p className={isDark ? "text-zinc-400" : "text-muted-foreground"}>Please provide a chatbot ID in the URL.</p>
                </div>
            </div>
        )
    }

    return (
        <div className={`min-h-screen p-8 font-sans transition-colors ${isDark ? "bg-zinc-950 text-zinc-100" : "bg-gray-100 text-gray-900"}`}>
            <div className={`max-w-3xl mx-auto rounded-xl shadow-sm border p-12 transition-colors ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-100"}`}>
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <MessageSquare className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Widget Integration Test</h1>
                            <p className={isDark ? "text-zinc-400" : "text-muted-foreground"}>
                                Testing environment for chatbot ID: <code className={`px-2 py-1 rounded text-sm ${isDark ? "bg-zinc-800 text-zinc-200" : "bg-gray-100 text-gray-800"}`}>{id}</code>
                            </p>
                        </div>
                    </div>
                    <div className={`inline-flex items-center rounded-full p-1 border ${isDark ? "bg-zinc-800 border-zinc-700" : "bg-gray-100 border-gray-200"}`}>
                        <button
                            type="button"
                            onClick={() => handleThemeChange("light")}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${!isDark ? "bg-white text-gray-900 shadow-sm" : "text-zinc-300 hover:text-zinc-100"}`}
                            aria-pressed={!isDark}
                        >
                            <Sun className="h-4 w-4" />
                            Light
                        </button>
                        <button
                            type="button"
                            onClick={() => handleThemeChange("dark")}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${isDark ? "bg-zinc-700 text-zinc-100 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
                            aria-pressed={isDark}
                        >
                            <Moon className="h-4 w-4" />
                            Dark
                        </button>
                    </div>
                </div>

                <div className={`space-y-4 ${isDark ? "text-zinc-300" : "text-gray-600"}`}>
                    <p>
                        This page simulates a client website where the chatbot widget is installed.
                    </p>
                    <div className={`p-4 rounded-lg text-sm border ${isDark ? "bg-blue-500/10 border-blue-500/30 text-blue-200" : "bg-blue-50 border-blue-100 text-blue-800"}`}>
                        <strong>Status:</strong> {scriptLoaded ? "Widget script loaded." : "Loading widget script..."}
                        {scriptLoaded && (
                            <span className="block mt-1">
                                Look for the launcher button in the bottom-right (or configured) corner of the screen.
                            </span>
                        )}
                    </div>

                    <h3 className={`font-semibold mt-8 ${isDark ? "text-zinc-100" : "text-gray-900"}`}>Test Checklist:</h3>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                        <li>Verify the launcher icon appears.</li>
                        <li>Click the launcher to open the chat modal.</li>
                        <li>Check if the branding (colors, logo) matches the settings.</li>
                        <li>Send a test message to verify functionality.</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default function WidgetTestPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-100">Loading...</div>}>
            <WidgetTestPageContent />
        </Suspense>
    )
}
