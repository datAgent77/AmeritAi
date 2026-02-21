"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2, MessageSquare } from "lucide-react"

import { Suspense } from "react"

function WidgetTestPageContent() {
    const searchParams = useSearchParams()
    const id = searchParams?.get("id")
    const [scriptLoaded, setScriptLoaded] = useState(false)

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
            <div className="flex h-screen items-center justify-center bg-gray-100">
                <div className="text-center p-8 bg-white rounded-xl shadow-sm">
                    <h1 className="text-2xl font-bold mb-2">Missing ID</h1>
                    <p className="text-muted-foreground">Please provide a chatbot ID in the URL.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8 font-sans">
            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-12">
                <div className="flex items-center gap-4 mb-6">
                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <MessageSquare className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Widget Integration Test</h1>
                        <p className="text-muted-foreground">Testing environment for chatbot ID: <code className="bg-gray-100 px-2 py-1 rounded text-sm">{id}</code></p>
                    </div>
                </div>

                <div className="space-y-4 text-gray-600">
                    <p>
                        This page simulates a client website where the chatbot widget is installed.
                    </p>
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
                        <strong>Status:</strong> {scriptLoaded ? "Widget script loaded." : "Loading widget script..."}
                        {scriptLoaded && (
                            <span className="block mt-1">
                                Look for the launcher button in the bottom-right (or configured) corner of the screen.
                            </span>
                        )}
                    </div>

                    <h3 className="font-semibold text-gray-900 mt-8">Test Checklist:</h3>
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
