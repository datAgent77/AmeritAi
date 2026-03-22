"use client"

import { useState, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react"
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
import { shouldShowClassicEntryOnboarding } from "@/lib/classic-entry-onboarding"

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
    const [pageContext, setPageContext] = useState<{
        url: string
        title: string
        desc: string
        description?: string
        pageText?: string
        dynamicData?: Record<string, any>
        siteSessionContext?: Record<string, any>
        crawlStatus?: Record<string, any>
    } | null>(null)
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
    const [isAmbientFeedHydrated, setIsAmbientFeedHydrated] = useState(false)

    // Lead Collection State
    const [showLeadCollection, setShowLeadCollection] = useState(false)
    const [isSubmittingLead, setIsSubmittingLead] = useState(false)



    // Mobile Keyboard Fix: Visual Viewport
    const [viewportStyle, setViewportStyle] = useState({ height: '100%', top: 0 });
    const [ambientViewportHeight, setAmbientViewportHeight] = useState(0)
    const [ambientDockHeight, setAmbientDockHeight] = useState(132)

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
        if (typeof window === "undefined") return

        const updateAmbientViewportHeight = () => {
            const nextHeight = window.visualViewport?.height ?? window.innerHeight
            setAmbientViewportHeight(Math.round(nextHeight))
        }

        updateAmbientViewportHeight()
        window.addEventListener("resize", updateAmbientViewportHeight)
        window.visualViewport?.addEventListener("resize", updateAmbientViewportHeight)

        return () => {
            window.removeEventListener("resize", updateAmbientViewportHeight)
            window.visualViewport?.removeEventListener("resize", updateAmbientViewportHeight)
        }
    }, [])

    useEffect(() => {
        if (!isClient) return

        const isAmbient = settings?.chatDisplayMode === "ambient" || searchParams?.get("chatDisplayMode") === "ambient"
        const isForcedEmbed = searchParams?.get("embed") === "1"
        const shouldUseTransparentFrame = isAmbient || isForcedEmbed

        if (shouldUseTransparentFrame) {
            // Apply via both JS and a dedicated strict style tag injected later
            document.documentElement.style.setProperty("background", "transparent", "important")
            document.documentElement.style.setProperty("background-color", "transparent", "important")
            document.body.style.setProperty("background", "transparent", "important")
            document.body.style.setProperty("background-color", "transparent", "important")
            document.documentElement.classList.add('ambient-transparent-bg')
            document.body.classList.add('ambient-transparent-bg')
            document.documentElement.classList.remove('bg-background')
            document.body.classList.remove('bg-background')

            const nextRoot = document.getElementById('__next')
            if (nextRoot) {
                nextRoot.style.setProperty("background", "transparent", "important")
                nextRoot.style.setProperty("background-color", "transparent", "important")
                nextRoot.classList.remove('bg-background')
            }
        }

        return () => {
            document.documentElement.classList.remove('ambient-transparent-bg')
            document.body.classList.remove('ambient-transparent-bg')
            document.documentElement.style.background = ''
            document.documentElement.style.backgroundColor = ''
            document.body.style.background = ''
            document.body.style.backgroundColor = ''
            const nextRoot = document.getElementById('__next')
            if (nextRoot) {
                nextRoot.style.background = ''
                nextRoot.style.backgroundColor = ''
            }
        }
    }, [settings.chatDisplayMode, isClient, searchParams])

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
            if (event.data.type === 'USEREX_SITE_SESSION_CONTEXT_UPDATE') {
                setPageContext((prev) => prev ? { ...prev, siteSessionContext: event.data.siteSessionContext } : prev)
            }
            if (event.data.type === 'USEREX_FORCE_AMBIENT_FEED_CLOSE') {
                setAmbientFeedManuallyClosed(true)
                if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur()
                }
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
    const ambientFeedAreaRef = useRef<HTMLDivElement>(null)
    const ambientDockAreaRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!ambientDockAreaRef.current || typeof ResizeObserver === "undefined") return

        const dockNode = ambientDockAreaRef.current
        const updateAmbientDockHeight = () => {
            const height = dockNode.getBoundingClientRect().height
            if (Number.isFinite(height) && height > 0) {
                setAmbientDockHeight(Math.round(height))
            }
        }

        updateAmbientDockHeight()
        const observer = new ResizeObserver(() => updateAmbientDockHeight())
        observer.observe(dockNode)

        return () => observer.disconnect()
    }, [ambientViewportHeight])

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
    const isSidecarMode = settings.chatDisplayMode === "sidecar"
    const runtimeDevice = (isClient && typeof window !== "undefined" && window.innerWidth < 768) ? "mobile" : "desktop"
    const isMobileRuntime = runtimeDevice === "mobile"
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
            setIsAmbientFeedHydrated(true)
            setAmbientFeedManuallyClosed(false)
        }
    }, [isTyping, isAmbientMode])
    useEffect(() => {
        if (!isAmbientMode) return
        if (!ambientFeedManuallyClosed || localInput.trim().length > 0) {
            setIsAmbientFeedHydrated(true)
        }
    }, [isAmbientMode, ambientFeedManuallyClosed, localInput])
    const ambientRailHeight = Math.max(220, Math.min(460, effectiveSettings.ambientMaxHeight || 300))
    // Read bottom margin: prefer settings value, fallback to URL param (passed by widget.js)
    const ambientBottomMarginFromUrl = effectiveSettings.ambientBottomMargin || Number(searchParams?.get('ambientBottomMargin') || 0)
    const mobileOpenInset = 16
    const mobileTopInset = 16
    const mobileFeedToDockGap = 16
    const resolvedAmbientViewportHeight = ambientViewportHeight > 0
        ? ambientViewportHeight
        : (typeof window !== "undefined" ? window.innerHeight : 0)
    const mobileAdaptiveFeedAvailableHeight = resolvedAmbientViewportHeight
        - mobileTopInset
        - mobileFeedToDockGap
        - ambientBottomMarginFromUrl
        - ambientDockHeight
    const mobileAdaptiveFeedHeight = Math.max(120, mobileAdaptiveFeedAvailableHeight)
    const hasUserMessage = messages.some((m: any) => m.role === "user")
    const showClassicEntryOnboarding = shouldShowClassicEntryOnboarding({
        chatDisplayMode: settings.chatDisplayMode,
        enableClassicEntryOnboarding: settings.enableClassicEntryOnboarding,
        hasUserMessage,
    })
    const showAmbientFeed = ambientFeedManuallyClosed ? false : (hasUserMessage || isTyping)

    // Scroll to bottom when the widget expands or ambient feed manually opens
    useEffect(() => {
        if (isExpanded || showAmbientFeed) {
            scrollToBottom("auto")
            const timeoutId = setTimeout(() => scrollToBottom("auto"), 300)
            return () => clearTimeout(timeoutId)
        }
    }, [isExpanded, showAmbientFeed])
    const handleToggleAmbientFeed = () => {
        setAmbientFeedManuallyClosed(prev => {
            const next = !prev
            if (!next) {
                setIsAmbientFeedHydrated(true)
            }
            return next
        })
    }

    const handleAmbientBackdropPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!isAmbientMode || !showAmbientFeed) return

        const target = event.target
        if (!(target instanceof Node)) return

        if (ambientFeedAreaRef.current?.contains(target)) return
        if (ambientDockAreaRef.current?.contains(target)) return

        setAmbientFeedManuallyClosed(true)
        if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
        }
    }

    const ambientWidthValue = typeof effectiveSettings.ambientWidth === "number"
        ? effectiveSettings.ambientWidth
        : Number(effectiveSettings.ambientWidth)
    const ambientMaxWidthStyle = Number.isFinite(ambientWidthValue)
        ? (ambientWidthValue > 0 ? `${ambientWidthValue}px` : '100%')
        : '1080px'

    const ambientInputWidthValue = typeof effectiveSettings.ambientInputWidth === "number"
        ? effectiveSettings.ambientInputWidth
        : (effectiveSettings.ambientInputWidth !== undefined ? Number(effectiveSettings.ambientInputWidth) : ambientWidthValue)
    const ambientInputMaxWidthStyle = Number.isFinite(ambientInputWidthValue)
        ? (ambientInputWidthValue > 0 ? `${ambientInputWidthValue}px` : '100%')
        : ambientMaxWidthStyle
    const ambientFeedHeightStyle = showAmbientFeed
        ? (isMobileRuntime ? `${Math.round(mobileAdaptiveFeedHeight)}px` : `${ambientRailHeight}px`)
        : '0px'
    const ambientFeedWidthStyle = isMobileRuntime
        ? `calc(100% - ${mobileOpenInset * 2}px)`
        : '100%'
    const ambientFeedMaxWidthStyle = isMobileRuntime
        ? ambientFeedWidthStyle
        : ambientMaxWidthStyle

    const ambientAlignmentStyle = {
        width: '100%',
        boxSizing: 'border-box' as const,
        backgroundColor: 'transparent'
    }

    useEffect(() => {
        if (!isAmbientMode) return
        window.parent.postMessage({
            type: 'USEREX_AMBIENT_FEED_VISIBILITY',
            hasFeed: showAmbientFeed
        }, '*')
    }, [isAmbientMode, showAmbientFeed])

    const loaderStyleFromUrl = (searchParams?.get("loaderStyle") as any) || "skeleton"
    const loaderAmbientBottomMargin = Number(searchParams?.get("ambientBottomMargin") || 0)

    if (isLoading || !isClient || !settings) {
        return (
            <WidgetLoader
                loaderStyle={loaderStyleFromUrl}
                ambientBottomMargin={loaderAmbientBottomMargin}
                showAmbientIcon={false}
            />
        )
    }

    const runtimeViewportStyle = isAmbientMode
        ? { height: '100%', top: 0 }
        : viewportStyle

    const runtimeDarkClass = isAmbientMode
        ? (effectiveSettings.ambientTheme === 'dark' ? 'dark' : '')
        : (effectiveSettings.theme === 'dark' ? 'dark' : '')
    const isForcedEmbed = searchParams?.get("embed") === "1"
    const shouldUseTransparentFrame = isAmbientMode || isForcedEmbed

    return (
        <div
            style={{
                height: runtimeViewportStyle.height,
                top: runtimeViewportStyle.top,
                position: 'fixed',
                background: shouldUseTransparentFrame ? 'transparent' : undefined,
                backgroundColor: shouldUseTransparentFrame ? 'transparent' : undefined
            }}
            className={`vion-widget-runtime-root fixed inset-0 w-full overflow-hidden font-sans text-gray-800 transition-colors duration-300 ${runtimeDarkClass} ${shouldUseTransparentFrame ? '!bg-transparent' : ''}`}
        >
            {shouldUseTransparentFrame && (
                <style>{`
                    html, body, #__next, #root, .vion-widget-runtime-root {
                        color-scheme: light dark !important;
                        background: transparent !important;
                        background-color: transparent !important;
                        background-image: none !important;
                        box-shadow: none !important;
                    }
                `}</style>
            )}
            {isAmbientMode ? (
                <div
                    className={`relative flex h-full w-full flex-col justify-end overflow-visible ${shouldUseTransparentFrame ? '!bg-transparent' : ''}`}
                    style={shouldUseTransparentFrame ? { backgroundColor: 'transparent', background: 'transparent' } : undefined}
                    onPointerDownCapture={handleAmbientBackdropPointerDown}
                >
                    <div
                        className={`relative z-10 flex h-full flex-col justify-end w-full ${shouldUseTransparentFrame ? '!bg-transparent' : ''}`}
                        style={{
                            ...ambientAlignmentStyle,
                            paddingTop: isMobileRuntime && showAmbientFeed ? `${mobileTopInset}px` : "0px",
                            paddingBottom: `${ambientBottomMarginFromUrl}px`,
                            ...(shouldUseTransparentFrame ? { backgroundColor: 'transparent', background: 'transparent' } : {})
                        }}
                    >
                        {isAmbientFeedHydrated && (
                            <div
                                ref={ambientFeedAreaRef}
                                className={`w-full mx-auto transition-[height,opacity,margin,padding] duration-200 ease-in-out ${showAmbientFeed
                                    ? (isMobileRuntime ? 'mb-4 pt-0 pb-0 opacity-100 overflow-visible' : 'mb-4 pt-2 pb-1 opacity-100 overflow-visible')
                                    : 'mb-0 pt-0 pb-0 opacity-0 pointer-events-none overflow-hidden'} ${shouldUseTransparentFrame ? '!bg-transparent' : ''}`}
                                style={{
                                    height: ambientFeedHeightStyle,
                                    width: ambientFeedWidthStyle,
                                    maxWidth: ambientFeedMaxWidthStyle,
                                    ...(shouldUseTransparentFrame ? { backgroundColor: 'transparent' } : {})
                                }}
                            >
                                <div
                                    className="h-full w-full rounded-3xl overflow-hidden flex flex-col border border-gray-200 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.16)] dark:border-zinc-800 dark:bg-zinc-900"
                                >
                                    <ChatHeader
                                        settings={effectiveSettings}
                                        isExpanded={isExpanded}
                                        handleVoiceInput={handleVoiceInput}
                                        isListening={isListening}
                                        handleToggleSize={handleToggleSize}
                                        handleCloseWidget={() => setAmbientFeedManuallyClosed(true)}
                                        handleClearChat={handleClearChat}
                                        t={t}
                                        showCloseButton
                                        showSizeToggle={false}
                                        sticky={false}
                                        showShadow={false}
                                        compact
                                    />
                                    <div className="flex-1 min-h-0">
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
                                </div>
                            </div>
                        )}

                        <div ref={ambientDockAreaRef} className={`w-full mx-auto ${shouldUseTransparentFrame ? '!bg-transparent' : ''}`} style={{ 
                            maxWidth: ambientInputMaxWidthStyle, 
                            paddingLeft: `${effectiveSettings.ambientSideMargin || 0}px`,
                            paddingRight: `${effectiveSettings.ambientSideMargin || 0}px`,
                            ...(shouldUseTransparentFrame ? { backgroundColor: 'transparent', background: 'transparent' } : {}) 
                        }}>
                            <ChatInput
                                mode="ambient"
                                settings={effectiveSettings}
                                localInput={localInput}
                                setLocalInput={setLocalInput}
                                sendMessage={(text: string, speakResponse?: boolean, visualCtx?: string) => {
                                    setIsAmbientFeedHydrated(true)
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
                </div>
            ) : (
                <div className="flex h-full flex-col">
                    {!showClassicEntryOnboarding && (
                        <ChatHeader
                            settings={effectiveSettings}
                            isExpanded={isExpanded}
                            handleVoiceInput={handleVoiceInput}
                            isListening={isListening}
                            handleToggleSize={handleToggleSize}
                            handleCloseWidget={handleCloseWidget}
                            handleClearChat={handleClearChat}
                            t={t}
                            showCloseButton={!isSidecarMode}
                        />
                    )}

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
                        showClassicEntryOnboarding={showClassicEntryOnboarding}
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
