"use client"

import { useCookieConsent } from "@/context/CookieConsentContext"
import Script from "next/script"
import { useEffect } from "react"

const GTM_ID = "GTM-K5ZJL5W2"

export function GoogleTagManager() {
    const { consent } = useCookieConsent()

    // 1. Initial Consent Defaults (Consent Mode v2)
    // We execute this immediately to ensure GTM knows the default state before loading tags.
    const initialConsentScript = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        
        // Default: Deny everything
        gtag('consent', 'default', {
            'ad_storage': 'denied',
            'ad_user_data': 'denied',
            'ad_personalization': 'denied',
            'analytics_storage': 'denied',
            'functionality_storage': 'denied',
            'personalization_storage': 'denied',
            'security_storage': 'granted', // Always granted
            'wait_for_update': 500
        });
    `

    // 2. Update Consent when user choices change
    useEffect(() => {
        if (!consent) return

        // Map our simple consent keys to Google's detailed consent types
        // necessary -> security_storage (and functionality usually)
        // analytics -> analytics_storage
        // marketing -> ad_storage, ad_user_data, ad_personalization
        // preferences -> personalization_storage

        const consentUpdate = {
            'ad_storage': consent.marketing ? 'granted' : 'denied',
            'ad_user_data': consent.marketing ? 'granted' : 'denied',
            'ad_personalization': consent.marketing ? 'granted' : 'denied',
            'analytics_storage': consent.analytics ? 'granted' : 'denied',
            'functionality_storage': consent.preferences ? 'granted' : 'denied',
            'personalization_storage': consent.preferences ? 'granted' : 'denied',
            'security_storage': 'granted'
        }

        if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('consent', 'update', consentUpdate)
            // Push a custom event to signal GTM that consent has been updated (optional but helpful for triggers)
            ;(window as any).dataLayer.push({ event: 'consent_updated' })
        }
    }, [consent])

    return (
        <>
            {/* Initialize DataLayer & Consent Defaults */}
            <Script id="gtm-consent-mode" strategy="beforeInteractive">
                {initialConsentScript}
            </Script>

            {/* Google Tag Manager Main Script */}
            <Script id="gtm-script" strategy="afterInteractive">
                {`
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${GTM_ID}');
                `}
            </Script>
        </>
    )
}
