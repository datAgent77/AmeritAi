"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

export interface CookieConsent {
    necessary: boolean // Always true
    analytics: boolean
    marketing: boolean
    preferences: boolean
}

interface CookieConsentContextType {
    consent: CookieConsent | null
    saveConsent: (consent: CookieConsent) => void
    acceptAll: () => void
    declineAll: () => void
    resetConsent: () => void
}

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined)

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
    const [consent, setConsent] = useState<CookieConsent | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        // Load from localStorage on mount
        const saved = localStorage.getItem("vion_cookie_settings")
        if (saved) {
            try {
                setConsent(JSON.parse(saved))
            } catch (e) {
                console.error("Failed to parse cookie settings", e)
            }
        }
        setIsLoaded(true)
    }, [])

    const saveConsent = (newConsent: CookieConsent) => {
        setConsent(newConsent)
        localStorage.setItem("vion_cookie_settings", JSON.stringify(newConsent))
        // Legacy support for simple check
        localStorage.setItem("cookie_consent", "custom") 
    }

    const acceptAll = () => {
        saveConsent({
            necessary: true,
            analytics: true,
            marketing: true,
            preferences: true
        })
    }

    const declineAll = () => {
        saveConsent({
            necessary: true,
            analytics: false,
            marketing: false,
            preferences: false
        })
    }

    const resetConsent = () => {
        setConsent(null)
        localStorage.removeItem("vion_cookie_settings")
        localStorage.removeItem("cookie_consent")
    }

    return (
        <CookieConsentContext.Provider value={{ consent, saveConsent, acceptAll, declineAll, resetConsent }}>
            {children}
        </CookieConsentContext.Provider>
    )
}

export const useCookieConsent = () => {
    const context = useContext(CookieConsentContext)
    if (context === undefined) {
        throw new Error("useCookieConsent must be used within a CookieConsentProvider")
    }
    return context
}
