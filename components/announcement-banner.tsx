"use client"

import { useState, useEffect } from "react"
import { auth } from "@/lib/firebase"
import { X, Megaphone } from "lucide-react"

export function AnnouncementBanner() {
    const [message, setMessage] = useState("")
    const [isActive, setIsActive] = useState(false)
    const [isDismissed, setIsDismissed] = useState(false)

    useEffect(() => {
        // Check if already dismissed in this session
        const dismissed = sessionStorage.getItem('announcement_dismissed')
        if (dismissed) {
            setIsDismissed(true)
        }

        // Fetch announcement via API (bypasses Firestore rules)
        const fetchAnnouncement = async () => {
            try {
                const currentUser = auth.currentUser
                if (!currentUser) return

                const token = await currentUser.getIdToken()
                const response = await fetch("/api/admin/dashboard-stats", {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                })

                if (response.ok) {
                    const data = await response.json()
                    if (data.announcement) {
                        setMessage(data.announcement.message || "")
                        setIsActive(data.announcement.isActive || false)

                        // If message changes, reset dismissed state
                        const currentMessage = sessionStorage.getItem('announcement_message')
                        if (currentMessage !== data.announcement.message) {
                            setIsDismissed(false)
                            sessionStorage.removeItem('announcement_dismissed')
                        }
                    }
                }
            } catch (error) {
                // Silently fail - banner is non-critical
                console.warn("AnnouncementBanner: Could not fetch announcement")
            }
        }

        // Wait for auth to be ready
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                fetchAnnouncement()
            }
        })

        return () => unsubscribe()
    }, [])

    const handleDismiss = () => {
        setIsDismissed(true)
        sessionStorage.setItem('announcement_dismissed', 'true')
        sessionStorage.setItem('announcement_message', message)
    }

    // Don't render if not active, no message, or dismissed
    if (!isActive || !message || isDismissed) {
        return null
    }

    return (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2.5 relative animate-in slide-in-from-top duration-300">
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
                <Megaphone className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm font-medium text-center">{message}</p>
                <button
                    onClick={handleDismiss}
                    className="absolute right-4 p-1 hover:bg-white/20 rounded-full transition-colors"
                    aria-label="Duyuruyu kapat"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}
