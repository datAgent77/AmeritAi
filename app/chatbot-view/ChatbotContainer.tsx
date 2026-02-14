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

// Components
import { ChatHeader } from "./components/ChatHeader"
import { MessageList } from "./components/MessageList"
import { ChatInput } from "./components/ChatInput"
import { BookingOverlay } from "./components/BookingOverlay"
import { ConfirmationModal } from "./components/ConfirmationModal"
import { VoiceOverlay } from "./components/VoiceOverlay"
import { LeadCollectionOverlay } from "./components/LeadCollectionOverlay"

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
    const [pageContext, setPageContext] = useState<{ url: string, title: string, desc: string } | null>(null)
    const [isGuestReady, setIsGuestReady] = useState(false)
    const [isClient, setIsClient] = useState(false)
    const [localInput, setLocalInput] = useState("")
    const [isExpanded, setIsExpanded] = useState(false)
    const [isConfirmingClear, setIsConfirmingClear] = useState(false)
    const [showBooking, setShowBooking] = useState(false)
    const [bookingData, setBookingData] = useState({ type: "", date: "", time: "", notes: "" })
    const [isSubmittingBooking, setIsSubmittingBooking] = useState(false)
    
    // Lead Collection State
    const [showLeadCollection, setShowLeadCollection] = useState(false)
    const [isSubmittingLead, setIsSubmittingLead] = useState(false)

    // Offline mode - when business hours are not active
    const offlineMessage = searchParams?.get("offlineMessage") || null
    const isOffline = !!offlineMessage

    // Mobile Keyboard Fix: Visual Viewport
    const [viewportStyle, setViewportStyle] = useState({ height: '100%', top: 0 });

    useEffect(() => {
        if (typeof window !== 'undefined' && window.visualViewport) {
            const handleResize = () => {
                // Only apply on mobile where keyboard creates visual viewport shift
                if (window.innerWidth < 768) {
                    setViewportStyle({
                        height: `${window.visualViewport?.height}px`,
                        top: window.visualViewport?.offsetTop || 0
                    })
                } else {
                    setViewportStyle({ height: '100%', top: 0 })
                }
            }

            window.visualViewport.addEventListener('resize', handleResize)
            window.visualViewport.addEventListener('scroll', handleResize)
            
            // Initial check
            handleResize()

            return () => {
                window.visualViewport?.removeEventListener('resize', handleResize)
                window.visualViewport?.removeEventListener('scroll', handleResize)
            }
        }
    }, [])

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

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen bg-white">Loading...</div>
    }

    // Show offline message when outside business hours
    if (isOffline) {
        return (
            <div className={`flex flex-col h-screen overflow-hidden font-sans text-gray-800 ${settings.theme === 'dark' ? 'dark bg-gray-900' : 'bg-white'}`}>
                {/* Header */}
                <div 
                    className="p-4 flex items-center gap-3"
                    style={{ backgroundColor: settings.headerBackgroundColor || settings.brandColor }}
                >
                    {settings.headerLogo && (
                        <img 
                            src={settings.headerLogo} 
                            alt={settings.companyName} 
                            className="h-8 w-auto object-contain"
                        />
                    )}
                    <div className="text-white">
                        <h1 className="font-semibold text-sm">{settings.companyName}</h1>
                        <p className="text-xs opacity-80">{t('offline') || 'Çevrimdışı'}</p>
                    </div>
                </div>
                
                {/* Offline Content */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div 
                        className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
                        style={{ backgroundColor: `${settings.brandColor}20` }}
                    >
                        <svg 
                            className="w-8 h-8" 
                            style={{ color: settings.brandColor }}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-gray-600 max-w-sm text-lg font-medium">
                        {decodeURIComponent(settings?.offlineMessage || "We are currently offline.")}
                    </p>
                </div>
            </div>
        )
    }

    if (!isClient || !settings) return null

    return (
        <div 
            style={{ 
                height: viewportStyle.height,
                top: viewportStyle.top,
                position: viewportStyle.top > 0 ? 'fixed' : 'fixed' // Ensure fixed
            }}
            className={`flex flex-col fixed inset-0 w-full overflow-hidden font-sans text-gray-800 transition-colors duration-300 ${settings.theme === 'dark' ? 'dark' : ''}`}
        >
             
             <ChatHeader 
                settings={settings}
                isExpanded={isExpanded}
                handleVoiceInput={handleVoiceInput}
                isListening={isListening}
                handleToggleSize={handleToggleSize}
                handleCloseWidget={handleCloseWidget}
                handleClearChat={handleClearChat}
                t={t}
             />

             <MessageList 
                messages={messages}
                settings={settings}
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
                settings={settings}
                localInput={localInput}
                setLocalInput={setLocalInput}
                sendMessage={sendMessage}
                handleVoiceInput={handleVoiceInput}
                isListening={isListening}
                visualContext={visualContext}
                language={language}
                t={t}
                setMessages={setMessages}
             />

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
