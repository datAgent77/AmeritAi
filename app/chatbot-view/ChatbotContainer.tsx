"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import { signInAsGuest } from "@/lib/firebase-guest"
import { event as trackEvent } from "@/lib/gtag"

// Hooks
import { useWidgetSettings } from "./hooks/useWidgetSettings"
import { useVisualContext } from "./hooks/useVisualContext"
import { useVoiceInput } from "./hooks/useVoiceInput"
import { useChatCore } from "./hooks/useChatCore"

import { ChatHeader } from "./components/ChatHeader"
import { MessageList } from "./components/MessageList"
import { ChatInput } from "./components/ChatInput"
import { WidgetLoader } from './components/WidgetLoader';
import { BookingOverlay } from "./components/BookingOverlay"
import { ConfirmationModal } from "./components/ConfirmationModal"
import { VoiceOverlay } from "./components/VoiceOverlay"
import { LeadCollectionOverlay } from "./components/LeadCollectionOverlay"
import { resolveAmbientDeviceSettings } from "@/lib/ambient-device-settings"
import { resolveClassicDeviceSettings } from "@/lib/classic-device-settings"

type LeadSubmitOptions = {
    source?: "inline" | "overlay"
}

export default function ChatbotContainer() {
    // 1. Contexts & Params
    const searchParams = useSearchParams()
    const chatbotId = searchParams?.get("id") || "default"
    const { language, setLanguage, t } = useLanguage()

    // 2. Logic Hooks
    const { settings, isLoading } = useWidgetSettings(chatbotId, searchParams, setLanguage)
    const visualContext = useVisualContext(chatbotId, language)

    // 3. Local State (Top Level)
    const [pageContext, setPageContext] = useState<{ url: string, title: string, desc: string, pageText?: string } | null>(null)
    const [isGuestReady, setIsGuestReady] = useState(false)
    const [isClient, setIsClient] = useState(false)
    const [localInput, setLocalInput] = useState("")
    const [isExpanded, setIsExpanded] = useState(false)
    const [isConfirmingClear, setIsConfirmingClear] = useState(false)
    const [showBooking, setShowBooking] = useState(false)
    const [bookingData, setBookingData] = useState({ type: "", date: "", time: "", notes: "" })
    const [isSubmittingBooking, setIsSubmittingBooking] = useState(false)

    // Ambient mode: manual override to collapse feed
    const [ambientFeedManuallyClosed, setAmbientFeedManuallyClosed] = useState(true)

    // Lead Collection State
    const [showLeadCollection, setShowLeadCollection] = useState(false)
    const [isSubmittingLead, setIsSubmittingLead] = useState(false)



    // Mobile Keyboard Fix: Visual Viewport
    const [viewportStyle, setViewportStyle] = useState({ height: '100%', top: 0 });

    useEffect(() => {
        if (typeof window !== 'undefined' && window.visualViewport) {
            const handleResize = () => {
                // Only apply on mobile where keyboard creates visual viewport shift
                if (window.innerWidth < 768) {
                    const vvHeight = window.visualViewport?.height ?? window.innerHeight
                    const keyboardDelta = window.innerHeight - vvHeight
                    setViewportStyle({
                        height: keyboardDelta > 80 ? `${vvHeight}px` : '100%',
                        top: 0
                    })
                } else {
                    setViewportStyle({ height: '100%', top: 0 })
                }
            }

            window.visualViewport.addEventListener('resize', handleResize)

            // Initial check
            handleResize()

            return () => {
                window.visualViewport?.removeEventListener('resize', handleResize)
            }
        }
    }, [])

    useEffect(() => {
        if (!isClient) return

        const isAmbient = settings.chatDisplayMode === "ambient"
        if (isAmbient) {
            // Apply via both JS and a dedicated strict style tag injected later
            document.documentElement.style.setProperty("background-color", "transparent", "important")
            document.body.style.setProperty("background-color", "transparent", "important")
            document.documentElement.classList.add('ambient-transparent-bg')
            document.body.classList.add('ambient-transparent-bg')
            document.documentElement.classList.remove('bg-background')
            document.body.classList.remove('bg-background')

            const nextRoot = document.getElementById('__next')
            if (nextRoot) {
                nextRoot.style.setProperty("background-color", "transparent", "important")
                nextRoot.classList.remove('bg-background')
            }
        }

        return () => {
            document.documentElement.classList.remove('ambient-transparent-bg')
            document.body.classList.remove('ambient-transparent-bg')
            document.documentElement.style.backgroundColor = ''
            document.body.style.backgroundColor = ''
        }
    }, [settings.chatDisplayMode, isClient])

    // 4. Initialization Effects
    useEffect(() => {
        setIsClient(true)
        signInAsGuest()
            .then(() => setIsGuestReady(true))
            .catch((error) => console.error("Guest login failed:", error))
    }, [])

    // INITIAL LEAD COLLECTION CHECK
    useEffect(() => {
        if (!isLoading && settings.enableInitialLeadCollection) {
            // Check if user already submitted lead (via localStorage)
            const hasSubmitted = localStorage.getItem(`vion_lead_submitted_${chatbotId}`)
            if (!hasSubmitted) {
                setShowLeadCollection(true)
            }
        }
    }, [isLoading, settings.enableInitialLeadCollection, chatbotId])

    useEffect(() => {
        const url = searchParams?.get("url")
        const title = searchParams?.get("title")
        const desc = searchParams?.get("desc")
        if (url) {
            setPageContext({ url, title: title || "", desc: desc || "" })
        }

        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'USEREX_CONTEXT_UPDATE') {
                setPageContext(event.data.context)
            }
        }
        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [searchParams])

    // 5. Circular Dependency Resolution (Voice <-> Chat)
    // We create a mutable ref for sendMessage so Voice hook can use it before Chat hook is fully initialized
    const sendMessageRef = useRef<((text: string, speakResponse?: boolean, visualContext?: string) => Promise<string>) | null>(null)

    const proxySendMessage = async (text: string, speakResponse?: boolean, visualContext?: string) => {
        if (sendMessageRef.current) {
            return sendMessageRef.current(text, speakResponse, visualContext)
        }
        return ""
    }

    // 6. Voice Hook (Uses proxySendMessage)
    const {
        handleVoiceInput,
        cancelVoiceMode,
        speakText,
        handleSpeak,
        isListening,
        isSpeaking,
        isVoiceMode,
        voiceStatus,
        setIsVoiceMode
    } = useVoiceInput(chatbotId, language, settings, setLocalInput, proxySendMessage)

    // 7. Chat Core Hook (Uses speakText)
    const {
        messages,
        setMessages,
        sendMessage, // The REAL function
        chatStatus,
        isTyping,
        isChatLoading,
        sessionId,
        resetSession
    } = useChatCore({
        chatbotId,
        settings,
        pageContext,
        isGuestReady,
        speakText: (text, id) => speakText(text, id), // Wrap to match signature
        getImageFromCache: visualContext.getImageFromCache,
        findImageByContent: visualContext.findImageByContent,
        onShowLeadForm: () => setShowLeadCollection(true)
    })

    // Assign real sendMessage to ref
    useEffect(() => {
        sendMessageRef.current = sendMessage
    }, [sendMessage])

    // 8. Scrolling Logic
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const messagesContainerRef = useRef<HTMLDivElement>(null)
    const isFirstScrollRef = useRef(true)

    const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
        if (messagesContainerRef.current) {
            const container = messagesContainerRef.current
            if (behavior === "auto") {
                container.scrollTop = container.scrollHeight
            } else {
                container.scrollTo({ top: container.scrollHeight, behavior })
            }
        } else if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior })
        }
    }

    // Instantly teleport to bottom when the widget transitions from hidden to visible
    useEffect(() => {
        const handleVisibilityToggle = (event: MessageEvent) => {
            if (event.data.type === 'USEREX_WIDGET_TOGGLED' && event.data.isOpen) {
                scrollToBottom("auto")
                // Fallback attempt in case layout takes a moment
                setTimeout(() => scrollToBottom("auto"), 50)
            }
        }
        window.addEventListener('message', handleVisibilityToggle)
        return () => window.removeEventListener('message', handleVisibilityToggle)
    }, [])

    // Keep the latest message visible, including token-by-token streaming updates.
    useEffect(() => {
        if (messages.length === 0) {
            isFirstScrollRef.current = true
            return
        }

        if (isFirstScrollRef.current) {
            scrollToBottom("auto")
            const frameId = requestAnimationFrame(() => scrollToBottom("auto"))
            const timeout100 = setTimeout(() => scrollToBottom("auto"), 100)
            const timeout500 = setTimeout(() => scrollToBottom("auto"), 500)
            isFirstScrollRef.current = false

            return () => {
                cancelAnimationFrame(frameId)
                clearTimeout(timeout100)
                clearTimeout(timeout500)
            }
        }

        const behavior: ScrollBehavior = chatStatus === "streaming" || isTyping ? "auto" : "smooth"
        const frameId = requestAnimationFrame(() => scrollToBottom(behavior))
        return () => cancelAnimationFrame(frameId)
    }, [messages, isTyping, chatStatus])

    // Mobile keyboard / visual viewport changes can shift the layout, so pin to bottom again.
    useEffect(() => {
        if (messages.length === 0) return
        const frameId = requestAnimationFrame(() => scrollToBottom("auto"))
        return () => cancelAnimationFrame(frameId)
    }, [messages.length, viewportStyle.height, viewportStyle.top])

    // 9. Handlers
    const handleToggleSize = () => {
        const newExpandedState = !isExpanded
        setIsExpanded(newExpandedState)
        window.parent.postMessage({ type: 'USEREX_TOGGLE_SIZE', isExpanded: newExpandedState }, '*')
    }

    const handleCloseWidget = () => {
        window.parent.postMessage({ type: 'USEREX_CLOSE_WIDGET' }, '*')
    }

    const handleClearChat = () => setIsConfirmingClear(true)

    const confirmClear = () => {
        resetSession()
        setIsConfirmingClear(false)
    }

    // LEAD SUBMIT HANDLER
    const handleLeadSubmit = async (formData: any, options?: LeadSubmitOptions) => {
        setIsSubmittingLead(true)
        try {
            const submitSource = options?.source === "inline" ? "inline" : "overlay"
            const response = await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatbotId,
                    ...formData,
                    source: submitSource === "inline" ? 'In-Chat Lead Form' : 'Initial Lead Form'
                })
            })


            if (response.ok) {
                // Track GA Event
                trackEvent({
                    action: 'lead_form_submit',
                    category: 'Lead',
                    label: chatbotId,
                    value: 1
                })

                // Save legacy format for compatibility with Booking Overlay
                localStorage.setItem(`lead_${chatbotId}`, JSON.stringify(formData))
                setShowLeadCollection(false)

                // Inline lead form already renders an in-bubble success state.
                // Avoid appending an extra assistant message to prevent duplicate acknowledgements.
                if (submitSource !== "inline") {
                    const leadName = String(formData?.name || "").trim()
                    const translatedTemplate = t('leadThankYou')
                    const fallbackText = leadName
                        ? `Thank you ${leadName}, we received your information. Our team will contact you shortly.`
                        : "Thank you, we received your information. Our team will contact you shortly."
                    const thankYouText = translatedTemplate === 'leadThankYou'
                        ? fallbackText
                        : translatedTemplate
                            .replace('{name}', leadName)
                            .replace(/\s+,/g, ',')
                            .replace(/\s{2,}/g, ' ')
                            .trim()

                    const thankYouMsg = {
                        id: Date.now().toString(),
                        role: 'assistant',
                        content: thankYouText,
                        createdAt: new Date()
                    }
                    setMessages((prev: any) => [...prev, thankYouMsg])
                }
            } else {
                alert(t('errorOccurred') || "An error occurred. Please try again.")
            }
        } catch (error) {
            console.error("Lead submit error:", error)
            alert(t('errorOccurred') || "An error occurred. Please try again.")
        } finally {
            setIsSubmittingLead(false)
        }
    }

    const handleBookingSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmittingBooking(true)
        // ... (Booking Logic)
        setTimeout(() => {
            setIsSubmittingBooking(false)
            setShowBooking(false)
            alert(settings.appointmentSuccessMessage || "Randevu oluşturuldu!")
        }, 1000)
    }

    const isAmbientMode = settings.chatDisplayMode === "ambient"
    const runtimeDevice = (isClient && typeof window !== "undefined" && window.innerWidth < 768) ? "mobile" : "desktop"
    const effectiveAmbientSettings = {
        ...settings,
        ...resolveAmbientDeviceSettings(settings, runtimeDevice),
    }
    const effectiveClassicSettings = {
        ...settings,
        ...resolveClassicDeviceSettings(settings, runtimeDevice),
    }
    const effectiveSettings = isAmbientMode ? effectiveAmbientSettings : effectiveClassicSettings

    // Open ambient feed automatically when there's an active interaction (typing)
    useEffect(() => {
        if (isAmbientMode && isTyping) {
            setAmbientFeedManuallyClosed(false)
        }
    }, [isTyping, isAmbientMode])
    const ambientOverlayOpacity = Math.max(0.2, Math.min(0.9, effectiveSettings.ambientOverlayOpacity || 0.55))
    const ambientRailHeight = Math.max(220, Math.min(460, effectiveSettings.ambientMaxHeight || 300))
    // Read bottom margin: prefer settings value, fallback to URL param (passed by widget.js)
    const ambientBottomMarginFromUrl = effectiveSettings.ambientBottomMargin || Number(searchParams?.get('ambientBottomMargin') || 0)
    const hasUserMessage = messages.some((m: any) => m.role === "user")
    const showAmbientFeed = ambientFeedManuallyClosed ? false : (hasUserMessage || isTyping)

    // Scroll to bottom when the widget expands or ambient feed manually opens
    useEffect(() => {
        if (isExpanded || showAmbientFeed) {
            scrollToBottom("auto")
            const timeoutId = setTimeout(() => scrollToBottom("auto"), 300)
            return () => clearTimeout(timeoutId)
        }
    }, [isExpanded, showAmbientFeed])
    const ambientOverlayHeight = Math.max(300, Math.min(820, ambientRailHeight + 280))
    // Keep internal gradient alpha values constant! 
    // The parent div handles hiding via `opacity-0 transition-opacity` smoothly.
    // Dynamically dropping this to 0 causes CSS interpolation artifacts (striped lines) during close.
    const visibleOverlayOpacity = ambientOverlayOpacity

    const handleToggleAmbientFeed = () => {
        setAmbientFeedManuallyClosed(prev => !prev)
    }

    const ambientAlignmentStyle = {
        maxWidth: effectiveSettings.ambientWidth ? `${effectiveSettings.ambientWidth}px` : '1080px',
        marginLeft: 'auto',
        marginRight: 'auto',
        paddingLeft: `${effectiveSettings.ambientSideMargin || 0}px`,
        paddingRight: `${effectiveSettings.ambientSideMargin || 0}px`,
    }

    useEffect(() => {
        if (!isAmbientMode) return
        window.parent.postMessage({
            type: 'USEREX_AMBIENT_FEED_VISIBILITY',
            hasFeed: showAmbientFeed
        }, '*')
    }, [isAmbientMode, showAmbientFeed])

    if (isLoading) {
        return (
            <WidgetLoader
                loaderStyle={(searchParams?.get("loaderStyle") as any) || "skeleton"}
                ambientBottomMargin={Number(searchParams?.get("ambientBottomMargin") || 0)}
                showAmbientIcon={false} // ChatInput checks its own settings, but loader can be simple
            />
        )
    }



    if (!isClient || !settings) return null

    return (
        <div
            style={{
                height: viewportStyle.height,
                top: viewportStyle.top,
                position: 'fixed',
                backgroundColor: isAmbientMode ? 'transparent' : undefined
            }}
            className={`vion-widget-runtime-root fixed inset-0 w-full overflow-hidden font-sans text-gray-800 transition-colors duration-300 ${isAmbientMode ? (effectiveSettings.ambientTheme === 'dark' || (effectiveSettings.ambientTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : '') : (effectiveSettings.theme === 'dark' ? 'dark' : '')}`}
        >
            {isAmbientMode && (
                <style>{`
                    html, body, #__next, #root, body.bg-background, div.bg-background {
                        background: transparent !important;
                        background-color: transparent !important;
                        box-shadow: none !important;
                    }
                    :root {
                        color-scheme: light dark !important;
                    }
                `}</style>
            )}
            {isAmbientMode ? (
                <div className="relative flex h-full w-full flex-col justify-end px-4 sm:px-6 overflow-visible">
                    {showAmbientFeed && (
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 overflow-visible transition-opacity duration-200 ease-in-out opacity-100">
                            {/* Radial glow — fades to transparent on top, left, right */}
                            <div
                                style={{
                                    width: '140vw',
                                    marginLeft: '-20vw',
                                    height: `${ambientOverlayHeight + 220}px`,
                                    background: `radial-gradient(ellipse 70% 85% at 50% 100%, rgba(0,0,0,${visibleOverlayOpacity + 0.1}) 0%, rgba(0,0,0,${Math.max(0.2, visibleOverlayOpacity * 0.7)}) 25%, rgba(0,0,0,${Math.max(0.08, visibleOverlayOpacity * 0.35)}) 50%, rgba(0,0,0,0) 75%)`,
                                    transition: 'height 0.4s ease-out, opacity 0.5s ease-out',
                                }}
                            />
                            {/* Solid base — covers the very bottom edge below input bar */}
                            <div
                                style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    height: '80px',
                                    background: `linear-gradient(to top, rgba(0,0,0,${visibleOverlayOpacity + 0.1}) 0%, rgba(0,0,0,${visibleOverlayOpacity * 0.5}) 60%, transparent 100%)`,
                                }}
                            />
                        </div>
                    )}

                    <div
                        className="relative z-10 flex h-full flex-col justify-end w-full"
                        style={{
                            ...ambientAlignmentStyle,
                            paddingBottom: `${ambientBottomMarginFromUrl || 4}px`
                        }}
                    >
                        <div
                            className={`w-full overflow-y-auto overflow-x-clip transition-[height,opacity,margin,padding] duration-200 ease-in-out ${showAmbientFeed ? 'mb-1 pt-2 pb-1 opacity-100' : 'mb-0 pt-0 pb-0 opacity-0 pointer-events-none overflow-hidden'}`}
                            style={{ height: showAmbientFeed ? `${ambientRailHeight}px` : '0px' }}
                        >
                            <MessageList
                                mode="ambient"
                                messages={messages}
                                settings={effectiveSettings}
                                isTyping={isTyping}
                                language={language}
                                imageMap={visualContext.imageMap}
                                scrollToBottom={scrollToBottom}
                                sendMessage={(text) => sendMessage(text)}
                                messagesContainerRef={messagesContainerRef}
                                messagesEndRef={messagesEndRef}
                                t={t}
                                onLeadSubmit={handleLeadSubmit}
                            />
                        </div>

                        <ChatInput
                            mode="ambient"
                            settings={effectiveSettings}
                            localInput={localInput}
                            setLocalInput={setLocalInput}
                            sendMessage={(text: string, speakResponse?: boolean, visualCtx?: string) => {
                                setAmbientFeedManuallyClosed(false)
                                return sendMessage(text, speakResponse, visualCtx)
                            }}
                            isChatLoading={isChatLoading}
                            handleVoiceInput={handleVoiceInput}
                            isListening={isListening}
                            visualContext={visualContext}
                            language={language}
                            t={t}
                            setMessages={setMessages}
                            ambientInputOnly={!showAmbientFeed}
                            onClearChat={handleClearChat}
                            onCloseWidget={() => setAmbientFeedManuallyClosed(true)}
                            onToggleAmbientFeed={handleToggleAmbientFeed}
                            showUtilityActions
                        />
                    </div>
                </div>
            ) : (
                <div className="flex h-full flex-col">
                    <ChatHeader
                        settings={effectiveSettings}
                        isExpanded={isExpanded}
                        handleVoiceInput={handleVoiceInput}
                        isListening={isListening}
                        handleToggleSize={handleToggleSize}
                        handleCloseWidget={handleCloseWidget}
                        handleClearChat={handleClearChat}
                        t={t}
                    />

                    <MessageList
                        mode="classic"
                        messages={messages}
                        settings={effectiveSettings}
                        isTyping={isTyping}
                        language={language}
                        imageMap={visualContext.imageMap}
                        scrollToBottom={scrollToBottom}
                        sendMessage={(text) => sendMessage(text)}
                        messagesContainerRef={messagesContainerRef}
                        messagesEndRef={messagesEndRef}
                        t={t}
                        onLeadSubmit={handleLeadSubmit}
                    />

                    <ChatInput
                        mode="classic"
                        settings={effectiveSettings}
                        localInput={localInput}
                        setLocalInput={setLocalInput}
                        sendMessage={sendMessage}
                        isChatLoading={isChatLoading}
                        handleVoiceInput={handleVoiceInput}
                        isListening={isListening}
                        visualContext={visualContext}
                        language={language}
                        t={t}
                        setMessages={setMessages}
                    />
                </div>
            )}

            {/* Overlays */}
            <LeadCollectionOverlay
                show={showLeadCollection}
                onSubmit={handleLeadSubmit}
                isSubmitting={isSubmittingLead}
                settings={settings}
                t={t}
                description={settings.leadFormConfig?.title}
            />

            <BookingOverlay
                showBooking={showBooking}
                setShowBooking={setShowBooking}
                bookingData={bookingData}
                setBookingData={setBookingData}
                handleBookingSubmit={handleBookingSubmit}
                isSubmittingBooking={isSubmittingBooking}
                settings={settings}
                t={t}
            />

            <ConfirmationModal
                isOpen={isConfirmingClear}
                onConfirm={confirmClear}
                onCancel={() => setIsConfirmingClear(false)}
                t={t}
            />

            <VoiceOverlay
                isVoiceMode={isVoiceMode}
                voiceStatus={voiceStatus}
                localInput={localInput}
                cancelVoiceMode={cancelVoiceMode}
                t={t}
            />
        </div>
    )
}
