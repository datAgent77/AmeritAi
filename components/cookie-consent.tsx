"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

export function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // Check if user has already made a choice
        const consent = localStorage.getItem("cookie_consent")
        if (!consent) {
            // Show banner after a short delay
            const timer = setTimeout(() => setIsVisible(true), 1000)
            return () => clearTimeout(timer)
        }
    }, [])

    const handleAccept = () => {
        localStorage.setItem("cookie_consent", "accepted")
        setIsVisible(false)
    }

    const handleDecline = () => {
        localStorage.setItem("cookie_consent", "declined")
        setIsVisible(false)
    }

    if (!isVisible) return null

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[99999] p-4 bg-black/90 backdrop-blur-md border-t border-white/10 text-white shadow-2xl animate-in slide-in-from-bottom-full duration-500">
            <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-300 flex-1">
                    <p>
                        We use cookies to improve your experience and analyze our traffic. By clicking &quot;Accept&quot;, you consent to our use of cookies as described in our <a href="/privacy" className="text-lime-400 hover:underline">Privacy Policy</a>.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={handleDecline} className="bg-transparent border-white text-white hover:bg-white hover:text-black h-9">
                        Decline
                    </Button>
                    <Button onClick={handleAccept} className="bg-lime-500 hover:bg-lime-600 text-black font-medium h-9 px-6">
                        Accept
                    </Button>
                </div>
            </div>
        </div>
    )
}
