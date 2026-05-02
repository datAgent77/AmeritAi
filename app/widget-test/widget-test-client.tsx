"use client"

import Script from "next/script"
import { useEffect, useState } from "react"
import { MessageSquare, Moon, Sun } from "lucide-react"
import { cleanupVionWidgetRuntime } from "@/lib/widget-runtime-dom"

type WidgetTestClientProps = {
    chatbotId: string | null
}

export default function WidgetTestClient({ chatbotId }: WidgetTestClientProps) {
    const [scriptLoaded, setScriptLoaded] = useState(false)
    const [scriptInstance, setScriptInstance] = useState(0)
    const [theme, setTheme] = useState<"light" | "dark">("light")
    const isDark = theme === "dark"

    useEffect(() => {
        const savedTheme = window.localStorage.getItem("widget-test-theme")
        if (savedTheme === "light" || savedTheme === "dark") {
            setTheme(savedTheme)
        }
    }, [])

    useEffect(() => {
        cleanupVionWidgetRuntime()
        setScriptLoaded(false)
        setScriptInstance((current) => current + 1)
        return () => cleanupVionWidgetRuntime()
    }, [chatbotId])

    const handleThemeChange = (nextTheme: "light" | "dark") => {
        setTheme(nextTheme)
        window.localStorage.setItem("widget-test-theme", nextTheme)
    }

    if (!chatbotId) {
        return (
            <div className={`flex h-screen items-center justify-center transition-colors ${isDark ? "bg-zinc-950" : "bg-gray-100"}`}>
                <div className={`rounded-xl border p-8 text-center shadow-sm ${isDark ? "border-zinc-800 bg-zinc-900 text-zinc-100" : "border-gray-100 bg-white text-gray-900"}`}>
                    <h1 className="mb-2 text-2xl font-bold">Missing ID</h1>
                    <p className={isDark ? "text-zinc-400" : "text-muted-foreground"}>Please provide a chatbot ID in the URL.</p>
                </div>
            </div>
        )
    }

    return (
        <>
            <Script
                key={`vion-widget-test-script-${chatbotId}-${scriptInstance}`}
                id={`vion-widget-test-script-${chatbotId}-${scriptInstance}`}
                src="/widget.js"
                strategy="afterInteractive"
                data-chatbot-id={chatbotId}
                onLoad={() => setScriptLoaded(true)}
                onReady={() => setScriptLoaded(true)}
            />

            <div className={`min-h-screen px-3 py-4 font-sans transition-colors sm:p-8 ${isDark ? "bg-zinc-950 text-zinc-100" : "bg-gray-100 text-gray-900"}`}>
                <div className={`mx-auto w-full max-w-3xl rounded-xl border p-4 shadow-sm transition-colors sm:p-8 lg:p-12 ${isDark ? "border-zinc-800 bg-zinc-900" : "border-gray-100 bg-white"}`}>
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 sm:h-12 sm:w-12">
                                <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-xl font-bold leading-tight sm:text-2xl">Widget Integration Test</h1>
                                <p className={isDark ? "text-zinc-400" : "text-muted-foreground"}>
                                    Testing environment for chatbot ID:
                                    <code className={`mt-1 inline-block break-all rounded px-2 py-1 align-middle text-xs sm:ml-1 sm:mt-0 sm:text-sm ${isDark ? "bg-zinc-800 text-zinc-200" : "bg-gray-100 text-gray-800"}`}>{chatbotId}</code>
                                </p>
                            </div>
                        </div>
                        <div className={`inline-flex items-center rounded-full border p-1 self-start sm:self-auto ${isDark ? "border-zinc-700 bg-zinc-800" : "border-gray-200 bg-gray-100"}`}>
                            <button
                                type="button"
                                onClick={() => handleThemeChange("light")}
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs transition-colors sm:px-3 sm:text-sm ${!isDark ? "bg-white text-gray-900 shadow-sm" : "text-zinc-300 hover:text-zinc-100"}`}
                                aria-pressed={!isDark}
                            >
                                <Sun className="h-4 w-4" />
                                Light
                            </button>
                            <button
                                type="button"
                                onClick={() => handleThemeChange("dark")}
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs transition-colors sm:px-3 sm:text-sm ${isDark ? "bg-zinc-700 text-zinc-100 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
                                aria-pressed={isDark}
                            >
                                <Moon className="h-4 w-4" />
                                Dark
                            </button>
                        </div>
                    </div>

                    <div className={`space-y-4 text-sm sm:text-base ${isDark ? "text-zinc-300" : "text-gray-600"}`}>
                        <p>This page simulates a client website where the chatbot widget is installed.</p>
                        <div className={`rounded-lg border p-4 text-sm ${isDark ? "border-blue-500/30 bg-blue-500/10 text-blue-200" : "border-blue-100 bg-blue-50 text-blue-800"}`}>
                            <strong>Status:</strong> {scriptLoaded ? "Widget script loaded." : "Loading widget script..."}
                            {scriptLoaded && (
                                <span className="mt-1 block">
                                    Look for the launcher button in the bottom-right (or configured) corner of the screen.
                                </span>
                            )}
                        </div>

                        <h3 className={`mt-6 font-semibold sm:mt-8 ${isDark ? "text-zinc-100" : "text-gray-900"}`}>Test Checklist:</h3>
                        <ul className="ml-2 list-inside list-disc space-y-2">
                            <li>Verify the launcher icon appears.</li>
                            <li>Click the launcher to open the chat modal.</li>
                            <li>Check if the branding (colors, logo) matches the settings.</li>
                            <li>Send a test message to verify functionality.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </>
    )
}
