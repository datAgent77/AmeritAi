"use client"

import { useState, useEffect, useRef, useCallback, type PointerEvent as ReactPointerEvent } from "react"
import { useSearchParams } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import { signInAsGuest } from "@/lib/firebase-guest"
import type { GuidedSkillClientEvent } from "@/lib/guided-skills/types"
import type { QuickActionButton } from "@/types/chatbot"
import { event as trackEvent } from "@/lib/gtag"

// Hooks
import { useWidgetSettings } from "./hooks/useWidgetSettings"
import { useVisualContext } from "./hooks/useVisualContext"
import { useVoiceInput } from "./hooks/useVoiceInput"
import { useChatCore, type UserMessageMediaPayload } from "./hooks/useChatCore"

import { ChatHeader } from "./components/ChatHeader"
import { MessageList } from "./components/MessageList"
import { ChatInput } from "./components/ChatInput"
import { WidgetLoader } from './components/WidgetLoader';
import { BookingOverlay } from "./components/BookingOverlay"
import { ConfirmationModal } from "./components/ConfirmationModal"
import { VoiceOverlay } from "./components/VoiceOverlay"
import { LeadCollectionOverlay } from "./components/LeadCollectionOverlay"
import { KvkkConsentModal } from "./components/KvkkConsentModal"
import { KvkkConsentOverlay } from "./components/KvkkConsentOverlay"
import { SpinWheelOverlay } from "./components/SpinWheelOverlay"
import { SurveyWidgetOverlay } from "@/components/surveys/survey-widget-overlay"
import { resolveAmbientDeviceSettings } from "@/lib/ambient-device-settings"
import { resolveClassicDeviceSettings } from "@/lib/classic-device-settings"
import { shouldShowClassicEntryOnboarding } from "@/lib/classic-entry-onboarding"
import { getHumanHandoffContactPromptMessage, getHumanHandoffUnavailableMessage } from "@/lib/human-handoff"
import { resolveQuickActionRuntimeAction } from "@/lib/quick-action-runtime"

type LeadSubmitOptions = {
    source?: "inline" | "overlay"
    flow?: "lead" | "handoff"
}

type BookingFormData = {
    type: string
    date: string
    time: string
    notes: string
    name: string
    email: string
    phone: string
}

function readStoredLeadData(chatbotId: string) {
    if (typeof window === "undefined") return null

    try {
        const raw = localStorage.getItem(`lead_${chatbotId}`)
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

function getAppointmentSuccessMessage(language: string) {
    return language === "tr"
        ? "Randevunuz başarıyla oluşturuldu! Sizinle en kısa sürede iletişime geçeceğiz."
        : "Your appointment has been created successfully. We will contact you shortly."
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
    const [conversationMode, setConversationMode] = useState<"text" | "voice">("text")
    const [isExpanded, setIsExpanded] = useState(false)
    const [isConfirmingClear, setIsConfirmingClear] = useState(false)
    const [showBooking, setShowBooking] = useState(false)
    const [bookingData, setBookingData] = useState<BookingFormData>(() => {
        const storedLead = readStoredLeadData(chatbotId)
        return {
            type: "",
            date: "",
            time: "",
            notes: "",
            name: storedLead?.name || "",
            email: storedLead?.email || "",
            phone: storedLead?.phone || "",
        }
    })
    const [isSubmittingBooking, setIsSubmittingBooking] = useState(false)

    // Ambient mode: manual override to collapse feed
    const [ambientFeedManuallyClosed, setAmbientFeedManuallyClosed] = useState(true)

    // Gamification spin wheel state
    const [showSpinWheel, setShowSpinWheel] = useState(false)
    const [spinWheelPrizes, setSpinWheelPrizes] = useState<any[]>([])
    const [spinWheelShownThisSession, setSpinWheelShownThisSession] = useState(false)

    // Lead Collection State
    const [showLeadCollection, setShowLeadCollection] = useState(false)
    const [leadCollectionFlow, setLeadCollectionFlow] = useState<"lead" | "handoff">("lead")
    const [isSubmittingLead, setIsSubmittingLead] = useState(false)
    const [showSurvey, setShowSurvey] = useState(false)
    const [isKvkkAccepted, setIsKvkkAccepted] = useState(false)
    const [isKvkkModalOpen, setIsKvkkModalOpen] = useState(false)



    // Mobile Keyboard Fix: Visual Viewport
    const [viewportStyle, setViewportStyle] = useState({ height: '100%', top: 0 });

    useEffect(() => {
        if (!showBooking) return

        const storedLead = readStoredLeadData(chatbotId)
        if (!storedLead) return

        setBookingData((current) => ({
            ...current,
            name: current.name || storedLead.name || "",
            email: current.email || storedLead.email || "",
            phone: current.phone || storedLead.phone || "",
        }))
    }, [chatbotId, showBooking])

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

        const isAmbient = settings.chatDisplayMode === "ambient" || searchParams?.get("chatDisplayMode") === "ambient"
        
        const cleanupTransparent = () => {
            const elements = [
                document.documentElement, 
                document.body, 
                document.getElementById('__next'), 
                document.querySelector('main')
            ]
            elements.forEach(el => {
                if (!el) return
                el.classList.remove('ambient-transparent-bg')
                el.style.removeProperty("background")
                el.style.removeProperty("background-color")
                if (el === document.documentElement || el === document.body) {
                    el.classList.add('bg-background')
                }
            })
        }

        if (isAmbient) {
            const applyTransparent = (el: HTMLElement) => {
                el.style.setProperty("background", "transparent", "important")
                el.style.setProperty("background-color", "transparent", "important")
            }
            applyTransparent(document.documentElement)
            applyTransparent(document.body)
            document.documentElement.classList.add('ambient-transparent-bg')
            document.body.classList.add('ambient-transparent-bg')
            document.documentElement.classList.remove('bg-background')
            document.body.classList.remove('bg-background')

            const nextRoot = document.getElementById('__next')
            if (nextRoot) {
                applyTransparent(nextRoot)
                nextRoot.classList.remove('bg-background')
            }
            const main = document.querySelector('main')
            if (main) applyTransparent(main as HTMLElement)
        } else {
            // Ensure any residual ambient styles are cleaned up if booting in classic mode
            cleanupTransparent()
        }

        return cleanupTransparent
    }, [settings.chatDisplayMode, isClient, searchParams])

    // 4. Initialization Effects
    useEffect(() => {
        setIsClient(true)
        signInAsGuest()
            .then(() => setIsGuestReady(true))
            .catch((error) => console.error("Guest login failed:", error))
    }, [])

    // GAMIFICATION — load config and register triggers
    useEffect(() => {
        if (isLoading || spinWheelShownThisSession) return
        fetch(`/api/gamification/config?chatbotId=${chatbotId}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (!data?.enabled || !data.prizes?.length) return
                setSpinWheelPrizes(data.prizes)
                const { triggers } = data
                // onEntry with delay
                if (triggers?.onEntry) {
                    const delay = (triggers.entryDelay ?? 5) * 1000
                    const t = setTimeout(() => {
                        const alreadySpun = localStorage.getItem(`spun_${chatbotId}`)
                        if (!alreadySpun) setShowSpinWheel(true)
                    }, delay)
                    return () => clearTimeout(t)
                }
            })
            .catch(() => {})
    }, [isLoading, chatbotId, spinWheelShownThisSession])

    // Exit intent trigger for spin wheel — listener registered once per chatbotId
    // spinWheelPrizes and spinWheelShownThisSession read from closure via current ref
    const spinWheelPrizesRef = useRef(spinWheelPrizes)
    spinWheelPrizesRef.current = spinWheelPrizes
    const spinWheelShownRef = useRef(spinWheelShownThisSession)
    spinWheelShownRef.current = spinWheelShownThisSession

    useEffect(() => {
        const handleMouseLeave = (e: MouseEvent) => {
            if (e.clientY <= 0 && spinWheelPrizesRef.current.length > 0 && !spinWheelShownRef.current) {
                const alreadySpun = localStorage.getItem(`spun_${chatbotId}`)
                if (!alreadySpun) {
                    setShowSpinWheel(true)
                    setSpinWheelShownThisSession(true)
                }
            }
        }
        document.addEventListener("mouseleave", handleMouseLeave)
        return () => document.removeEventListener("mouseleave", handleMouseLeave)
    }, [chatbotId])

    // INITIAL LEAD COLLECTION CHECK — gated on KVKK acceptance
    useEffect(() => {
        if (isLoading) return
        if (!settings.enableInitialLeadCollection) return
        if (settings.kvkkConsent?.enabled === true && !isKvkkAccepted) return

        const hasSubmitted = localStorage.getItem(`vion_lead_submitted_${chatbotId}`)
        if (!hasSubmitted) {
            setShowLeadCollection(true)
        }
    }, [isLoading, settings.enableInitialLeadCollection, settings.kvkkConsent?.enabled, isKvkkAccepted, chatbotId])

    const kvkkEnabled = settings.kvkkConsent?.enabled === true
    const kvkkVersionHash = settings.kvkkConsent?.versionHash || ""

    useEffect(() => {
        if (!isClient) return

        if (!kvkkEnabled || !kvkkVersionHash) {
            setIsKvkkAccepted(true)
            setIsKvkkModalOpen(false)
            return
        }

        const storageKey = `vion_kvkk_${chatbotId}_${kvkkVersionHash}`
        const accepted = window.localStorage.getItem(storageKey) === "accepted"
        setIsKvkkAccepted(accepted)
        setIsKvkkModalOpen(false)
    }, [chatbotId, isClient, kvkkEnabled, kvkkVersionHash])

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
        speakText,
        isMuted,
        voiceStatus,
        startVoiceSession,
        endVoiceSession,
        toggleMute
    } = useVoiceInput(chatbotId, language, settings, setLocalInput, proxySendMessage)

    // 7. Chat Core Hook (Uses speakText)
    const {
        messages,
        setMessages,
        sendMessage, // The REAL function
        sendGuidedMessage,
        chatStatus,
        isTyping,
        isChatLoading,
        isSessionPaused,
        pauseStateVersion,
        sessionId,
        guidedSkillState,
        resetSession
    } = useChatCore({
        chatbotId,
        language,
        settings,
        pageContext,
        isGuestReady,
        kvkkConsentVersion: isKvkkAccepted ? settings.kvkkConsent?.versionHash || null : null,
        speakText: (text, id) => speakText(text, id), // Wrap to match signature
        saveImageToCache: visualContext.saveImageToCache,
        getImageFromCache: visualContext.getImageFromCache,
        findImageByContent: visualContext.findImageByContent,
        onShowLeadForm: () => {
            if (settings.kvkkConsent?.enabled === true && !isKvkkAccepted) {
                setIsKvkkModalOpen(true)
                return
            }

            setLeadCollectionFlow("lead")
            setShowLeadCollection(true)
        },
        onKvkkConsentRequired: () => setIsKvkkModalOpen(true),
    })
    const [isKvkkRejected, setIsKvkkRejected] = useState(false)
    const requiresKvkkConsent = settings.kvkkConsent?.enabled === true && !isKvkkAccepted

    useEffect(() => {
        setIsKvkkRejected(false)
    }, [chatbotId, kvkkEnabled, kvkkVersionHash])

    useEffect(() => {
        if (!requiresKvkkConsent) return

        setShowLeadCollection(false)
        setShowBooking(false)
        setLeadCollectionFlow("lead")
    }, [requiresKvkkConsent])

    const acceptKvkkConsent = () => {
        if (kvkkVersionHash && typeof window !== "undefined") {
            window.localStorage.setItem(`vion_kvkk_${chatbotId}_${kvkkVersionHash}`, "accepted")
        }
        setIsKvkkRejected(false)
        setIsKvkkAccepted(true)
        setIsKvkkModalOpen(false)
    }

    const rejectKvkkConsent = () => {
        setIsKvkkRejected(true)
    }

    const guiltyOpenKvkkModal = () => {
        setIsKvkkModalOpen(true)
    }

    const guardedSendMessage = useCallback(async (
        text: string,
        speakResponse?: boolean,
        visualCtx?: string,
        guidedEvent?: GuidedSkillClientEvent | null,
        mediaPayload?: UserMessageMediaPayload | null
    ) => {
        if (requiresKvkkConsent) {
            // KVKK consent logic is handled via inline message in MessageList
            return ""
        }

        return sendMessage(text, speakResponse, visualCtx, guidedEvent, mediaPayload)
    }, [requiresKvkkConsent, sendMessage])

    const guardedSendGuidedMessage = useCallback(async (guidedEvent: GuidedSkillClientEvent) => {
        if (requiresKvkkConsent) {
            setIsKvkkModalOpen(true)
            return ""
        }

        return sendGuidedMessage(guidedEvent)
    }, [requiresKvkkConsent, sendGuidedMessage])

    // Assign real sendMessage to ref
    useEffect(() => {
        sendMessageRef.current = (text, speakResponse, visualCtx) => guardedSendMessage(text, speakResponse, visualCtx)
    }, [guardedSendMessage])

    useEffect(() => {
        if (settings.enableVoiceAssistant) return

        setConversationMode("text")
        endVoiceSession()
    }, [endVoiceSession, settings.enableVoiceAssistant])

    const handleConversationModeChange = (nextMode: "text" | "voice") => {
        if (nextMode === "voice" && requiresKvkkConsent) {
            setIsKvkkModalOpen(true)
            return
        }

        if (nextMode === "voice") {
            setConversationMode("voice")
            startVoiceSession()
            return
        }

        setConversationMode("text")
        endVoiceSession()
    }

    // 8. Scrolling Logic
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const messagesContainerRef = useRef<HTMLDivElement>(null)
    const isFirstScrollRef = useRef(true)
    const ambientFeedAreaRef = useRef<HTMLDivElement>(null)
    const ambientDockAreaRef = useRef<HTMLDivElement>(null)

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

    useEffect(() => {
        const findScrollableElement = (target: EventTarget | null): HTMLElement | null => {
            let node = target instanceof HTMLElement ? target : null

            while (node && node !== document.body && node !== document.documentElement) {
                const style = window.getComputedStyle(node)
                const canScrollY = /(auto|scroll)/.test(style.overflowY)
                    && node.scrollHeight > node.clientHeight + 1

                if (canScrollY) {
                    return node
                }

                node = node.parentElement
            }

            return null
        }

        const handleWheelContain = (event: WheelEvent) => {
            if (event.ctrlKey || event.metaKey) return

            const scrollable = findScrollableElement(event.target)
            if (!scrollable) {
                event.preventDefault()
                return
            }

            const { scrollTop, scrollHeight, clientHeight } = scrollable
            const isAtTop = scrollTop <= 0
            const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1

            if ((event.deltaY < 0 && isAtTop) || (event.deltaY > 0 && isAtBottom)) {
                event.preventDefault()
            }
        }

        document.addEventListener("wheel", handleWheelContain, { capture: true, passive: false })
        return () => document.removeEventListener("wheel", handleWheelContain, { capture: true } as AddEventListenerOptions)
    }, [])

    // 9. Handlers
    const handleToggleSize = () => {
        const newExpandedState = !isExpanded
        setIsExpanded(newExpandedState)
        window.parent.postMessage({ type: 'USEREX_TOGGLE_SIZE', isExpanded: newExpandedState }, '*')
    }

    const handleCloseWidget = () => {
        window.parent.postMessage({ type: 'USEREX_CLOSE_WIDGET' }, '*')
    }

    const handleTriggerAction = (button: QuickActionButton) => {
        const action = resolveQuickActionRuntimeAction({
            button,
            language,
            settings,
            requiresKvkkConsent,
            isKvkkAccepted,
        })

        if (action.type === "blocked") {
            setIsKvkkModalOpen(true)
            return
        }

        if (action.type === "open-kvkk-modal") {
            setIsKvkkModalOpen(true)
            return
        }

        if (action.type === "open-survey") {
            setShowSurvey(true)
            return
        }

        if (button.moduleId === "humanHandoff") {
            const canRequestHumanHandoff = settings.enableHumanHandoff
                && settings.humanHandoffSettings?.triggerOnUserRequest !== false

            if (!canRequestHumanHandoff) {
                setMessages((prev: any[]) => [...prev, {
                    id: `quick_action_handoff_disabled_${Date.now()}`,
                    role: "assistant",
                    content: getHumanHandoffUnavailableMessage(language),
                    createdAt: new Date(),
                }])
                return
            }

            setLeadCollectionFlow("handoff")
            setMessages((prev: any[]) => [...prev, {
                id: `quick_action_handoff_${Date.now()}`,
                role: "assistant",
                content: getHumanHandoffContactPromptMessage(language, {
                    enabled: settings.enableHumanHandoff === true,
                    notificationEmail: "",
                    notifyEmail: false,
                    notifyInApp: false,
                    triggerOnUserRequest: settings.humanHandoffSettings?.triggerOnUserRequest !== false,
                    triggerOnAssistantHandoff: true,
                    customWaitMessage: "",
                    notifyWhatsApp: false,
                    whatsappNumber: "",
                    notifyInstagram: false,
                    instagramAccountId: "",
                    businessHoursEnabled: settings.humanHandoffSettings?.businessHoursEnabled === true,
                    businessHoursStart: settings.humanHandoffSettings?.businessHoursStart || "09:00",
                    businessHoursEnd: settings.humanHandoffSettings?.businessHoursEnd || "18:00",
                    businessHoursTimezone: settings.humanHandoffSettings?.businessHoursTimezone || settings.timezone || "UTC",
                    businessDays: settings.humanHandoffSettings?.businessDays || ["Mon", "Tue", "Wed", "Thu", "Fri"],
                }),
                createdAt: new Date(),
            }])
            return
        }

        if (action.type === "append-form-message") {
            if (action.form === "handoff") {
                setLeadCollectionFlow("handoff")
            } else if (action.form === "lead") {
                setLeadCollectionFlow("lead")
            }

            setMessages((prev: any[]) => [...prev, {
                id: `quick_action_${action.form}_${Date.now()}`,
                role: "assistant",
                content: action.content,
                createdAt: new Date(),
            }])
            return
        }

        if (action.type === "append-message") {
            setMessages((prev: any[]) => [...prev, {
                id: `quick_action_message_${Date.now()}`,
                role: "assistant",
                content: action.content,
                createdAt: new Date(),
            }])
            return
        }

        if (action.type === "send-message") {
            void guardedSendMessage(action.message, false, undefined, undefined, null)
            return
        }
    }

    const handleSurveySubmit = async (payload: {
        consentAccepted: boolean
        answers: Record<string, { value: string | string[] | number | null; otherText?: string }>
        contact: {
            name?: string
            email?: string
            phone?: string
        }
    }) => {
        const activeSurvey = settings.surveyWidgetConfig?.activeSurvey
        if (!activeSurvey) {
            throw new Error(language === "tr" ? "Aktif bir anket bulunamadı." : "No active survey was found.")
        }

        const response = await fetch(`/api/public/surveys/${activeSurvey.slug}/responses`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                ...payload,
                source: "widget",
            }),
        })

        if (!response.ok) {
            const data = await response.json().catch(() => ({}))
            throw new Error(typeof data?.error === "string" ? data.error : (language === "tr" ? "Anket gönderilemedi." : "Survey could not be submitted."))
        }

        setShowSurvey(false)
        setMessages((prev: any[]) => [
            ...prev,
            {
                id: `survey_thank_you_${Date.now()}`,
                role: "assistant",
                content: `${activeSurvey.thankYouTitle}\n${activeSurvey.thankYouText}`.trim(),
                createdAt: new Date(),
            },
        ])
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
            const flow = options?.flow || "lead"
            const submitSource = options?.source === "inline" ? "inline" : "overlay"

            if (flow === "handoff") {
                const leadName = String(formData?.name || "").trim()
                const leadEmail = String(formData?.email || "").trim()
                const leadPhone = String(formData?.phone || "").trim()
                const customFields = formData?.customFields && typeof formData.customFields === "object"
                    ? Object.entries(formData.customFields)
                        .map(([key, value]) => [String(key).trim(), String(value || "").trim()] as const)
                        .filter(([, value]) => value)
                    : []

                try {
                    localStorage.setItem(`lead_${chatbotId}`, JSON.stringify(formData))
                } catch {
                    // Ignore storage errors during handoff capture.
                }

                const structuredDetails = [
                    leadName ? (language === "tr" ? `Adım ${leadName}.` : `My name is ${leadName}.`) : "",
                    leadEmail ? (language === "tr" ? `E-posta adresim ${leadEmail}.` : `My email is ${leadEmail}.`) : "",
                    leadPhone ? (language === "tr" ? `Telefon numaram ${leadPhone}.` : `My phone number is ${leadPhone}.`) : "",
                    ...customFields.map(([key, value]) =>
                        language === "tr"
                            ? `${key}: ${value}.`
                            : `${key}: ${value}.`
                    ),
                ].filter(Boolean)

                setShowLeadCollection(false)
                await guardedSendMessage(
                    [
                        language === "tr"
                            ? "Temsilci talebim için iletişim bilgilerimi paylaşıyorum."
                            : "I am sharing my contact details for the human handoff request.",
                        ...structuredDetails,
                    ].join(" "),
                    false,
                    undefined,
                    undefined,
                    null
                )
                return
            }

            const response = await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatbotId,
                    sessionId,
                    sourceChannel: "web",
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

                if (submitSource === "inline") {
                    // Inline form submit finalizes a pending handoff on backend if one exists.
                    guardedSendMessage("İletişim bilgilerimi doldurdum.", false, undefined, undefined, null)
                } else {
                    // Overlay formlar için mevcut statik teşekkür mesajı
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

        const trimmedName = String(bookingData.name || "").trim()
        const trimmedEmail = String(bookingData.email || "").trim()
        const trimmedPhone = String(bookingData.phone || "").trim()
        const phoneDigits = trimmedPhone.replace(/\D/g, "")
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        const phoneRegex = /^[\d\s+\-()]+$/

        if (!bookingData.date || !bookingData.time) {
            alert("Lutfen tarih ve saat secin.")
            return
        }

        if (!trimmedName) {
            alert(t("nameRequired") === "nameRequired" ? "Ad Soyad gereklidir" : t("nameRequired"))
            return
        }

        if (!trimmedEmail && !trimmedPhone) {
            alert(t("contactRequired") === "contactRequired" ? "E-posta veya telefon gereklidir" : t("contactRequired"))
            return
        }

        if (trimmedEmail && !emailRegex.test(trimmedEmail)) {
            alert(t("invalidEmail") === "invalidEmail" ? "Geçersiz e-posta adresi" : t("invalidEmail"))
            return
        }

        if (trimmedPhone && (!phoneRegex.test(trimmedPhone) || phoneDigits.length < 7)) {
            alert(t("invalidPhone") === "invalidPhone" ? "Geçersiz telefon numarası" : t("invalidPhone"))
            return
        }

        setIsSubmittingBooking(true)
        try {
            try {
                const storedLead = readStoredLeadData(chatbotId) || {}
                localStorage.setItem(`lead_${chatbotId}`, JSON.stringify({
                    ...storedLead,
                    name: trimmedName,
                    email: trimmedEmail,
                    phone: trimmedPhone,
                }))
            } catch { /* ignore */ }

            const res = await fetch("/api/appointments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chatbotId,
                    sessionId,
                    customerName: trimmedName,
                    customerEmail: trimmedEmail,
                    customerPhone: trimmedPhone,
                    date: bookingData.date,
                    time: bookingData.time,
                    type: bookingData.type,
                    notes: bookingData.notes,
                }),
            })

            if (res.ok) {
                setShowBooking(false)
                const successMsg = getAppointmentSuccessMessage(language)
                setMessages((prev: any[]) => [
                    ...prev,
                    { id: `booking_confirm_${Date.now()}`, role: "assistant", content: successMsg, createdAt: new Date() }
                ])
            } else {
                const json = await res.json()
                alert(json.error || "Bir hata oluştu. Lütfen tekrar deneyin.")
            }
        } catch {
            alert("Bağlantı hatası. Lütfen tekrar deneyin.")
        } finally {
            setIsSubmittingBooking(false)
        }
    }

    const handleBookingSuccess = (appointmentId: string) => {
        const successMsg = getAppointmentSuccessMessage(language)
        setMessages((prev: any[]) => [
            ...prev,
            { id: `booking_confirm_${Date.now()}`, role: "assistant", content: successMsg, createdAt: new Date() }
        ])
    }

    const urlTheme = searchParams?.get("theme")
    const inheritedTheme = urlTheme === "dark" || urlTheme === "light" ? urlTheme : null
    const isAmbientMode = settings.chatDisplayMode === "ambient" || searchParams?.get("chatDisplayMode") === "ambient"
    const runtimeDevice = (isClient && typeof window !== "undefined" && window.innerWidth < 768) ? "mobile" : "desktop"
    const resolvedClassicTheme = settings.theme === "dark" || settings.theme === "light"
        ? settings.theme
        : "light"
    const resolvedAmbientTheme: "light" | "dark" =
        // URL param (passed by widget.js from saved ambientTheme) takes priority
        inheritedTheme
            ? inheritedTheme
            : settings.ambientTheme === "dark" || settings.ambientTheme === "light"
                ? settings.ambientTheme
                : "light"
    
    const effectiveAmbientSettings = {
        ...settings,
        ...resolveAmbientDeviceSettings(settings, runtimeDevice),
        theme: resolvedAmbientTheme
    }
    const effectiveClassicSettings = {
        ...settings,
        ...resolveClassicDeviceSettings(settings, runtimeDevice),
        theme: resolvedClassicTheme
    }
    const effectiveSettings = isAmbientMode ? effectiveAmbientSettings : effectiveClassicSettings

    // Open ambient feed automatically when there's an active interaction (typing)
    useEffect(() => {
        if (isAmbientMode && isTyping) {
            setAmbientFeedManuallyClosed(false)
        }
    }, [isTyping, isAmbientMode])

    // Sync dark class to <html> so CSS custom properties (--background etc.) resolve correctly in ambient mode
    useEffect(() => {
        if (!isClient) return
        if (!isAmbientMode) return
        const isDark = effectiveSettings.theme === 'dark'
        if (isDark) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
        return () => {
            document.documentElement.classList.remove('dark')
        }
    }, [effectiveSettings.theme, isClient, isAmbientMode])
    const ambientOverlayOpacity = Math.max(0.2, Math.min(0.9, effectiveSettings.ambientOverlayOpacity || 0.55))
    const ambientRailHeight = Math.max(220, Math.min(900, effectiveSettings.ambientMaxHeight || 300))
    // Read bottom margin: prefer settings value, fallback to URL param (passed by widget.js)
    const ambientBottomMarginFromUrl = effectiveSettings.ambientBottomMargin || Number(searchParams?.get('ambientBottomMargin') || 0)
    const hasUserMessage = messages.some((m: any) => m.role === "user")
    const showClassicEntryOnboarding = shouldShowClassicEntryOnboarding({
        chatDisplayMode: settings.chatDisplayMode,
        enableClassicEntryOnboarding: settings.enableClassicEntryOnboarding,
        hasUserMessage,
        hasMessages: messages.length > 0,
    })
    const showAmbientFeed = ambientFeedManuallyClosed ? false : (hasUserMessage || isTyping || showClassicEntryOnboarding)

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

    const ambientAlignmentStyle = {
        maxWidth: ambientMaxWidthStyle,
        marginLeft: 'auto',
        marginRight: 'auto',
        paddingLeft: `${effectiveSettings.ambientSideMargin || 0}px`,
        paddingRight: `${effectiveSettings.ambientSideMargin || 0}px`,
        boxSizing: 'border-box' as const,
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

    const runtimeViewportStyle = isAmbientMode
        ? { height: '100%', top: 0 }
        : viewportStyle

    return (
        <div
            style={{
                height: runtimeViewportStyle.height,
                top: runtimeViewportStyle.top,
                position: 'fixed',
                backgroundColor: isAmbientMode ? 'transparent' : undefined
            }}
            className={`vion-widget-runtime-root fixed inset-0 w-full overflow-hidden font-sans text-gray-800 transition-colors duration-300 ${effectiveSettings.theme === 'dark' ? 'dark' : ''}`}
        >
            {isAmbientMode && (
                <style dangerouslySetInnerHTML={{ __html: `
                    html, body, #__next, #root, main { 
                        background: transparent !important; 
                        background-color: transparent !important; 
                        box-shadow: none !important; 
                    } 
                    body { 
                        --background: transparent !important; 
                        color-scheme: ${effectiveSettings.theme === 'dark' ? 'dark' : 'light'};
                    } 
                    .vion-ambient-card { 
                        background-color: ${effectiveSettings.theme === 'dark' ? '#18181b' : 'white'} !important; 
                        background: ${effectiveSettings.theme === 'dark' ? '#18181b' : 'white'} !important; 
                    }
                ` }} />
            )}
            {isAmbientMode ? (
                <div
                    className="relative flex h-full w-full flex-col justify-end overflow-visible"
                    onPointerDownCapture={handleAmbientBackdropPointerDown}
                >

                    <div
                        className="relative z-10 flex h-full flex-col justify-end w-full"
                        style={{
                            ...ambientAlignmentStyle,
                            paddingBottom: `${ambientBottomMarginFromUrl || 4}px`
                        }}
                    >
                        <div
                            ref={ambientFeedAreaRef}
                            className={`w-full transition-[height,opacity,margin,padding] duration-300 ease-in-out ${showAmbientFeed ? 'mb-4 opacity-100 flex flex-col' : 'mb-0 opacity-0 pointer-events-none'}`}
                            style={{ 
                                height: showAmbientFeed ? `${ambientRailHeight}px` : '0px',
                                paddingLeft: runtimeDevice === 'mobile' ? '16px' : '0',
                                paddingRight: runtimeDevice === 'mobile' ? '16px' : '0',
                                paddingTop: runtimeDevice === 'mobile' ? '16px' : '0'
                            }}
                        >
                            <div
                                className="vion-ambient-card flex-1 flex flex-col bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-700 overflow-hidden"
                                style={{ boxShadow: '0 8px 40px -4px rgba(0,0,0,0.20), 0 4px 20px -4px rgba(0,0,0,0.14)' }}
                            >
                                {/* Ambient Card Header — same as Classic mode */}
                                <ChatHeader
                                    settings={effectiveSettings}
                                    isExpanded={false}
                                    handleToggleSize={() => {}}
                                    handleCloseWidget={() => setAmbientFeedManuallyClosed(true)}
                                    handleClearChat={handleClearChat}
                                    t={t}
                                    showSizeToggle={false}
                                    showCloseButton={true}
                                    sticky={false}
                                    showShadow={false}
                                    compact={true}
                                />
                                <div className="flex-1 overflow-hidden relative">
                                    <MessageList
                                        mode="ambient"
                                        messages={messages}
                                        settings={effectiveSettings}
                                        isTyping={isTyping}
                                        isSessionPaused={isSessionPaused}
                                        pauseStateVersion={pauseStateVersion}
                                        language={language}
                                        imageMap={visualContext.imageMap}
                                        scrollToBottom={scrollToBottom}
                                        sendMessage={(text) => guardedSendMessage(text)}
                                        sendGuidedMessage={guardedSendGuidedMessage}
                                        guidedSkillState={guidedSkillState}
                                        messagesContainerRef={messagesContainerRef}
                                        messagesEndRef={messagesEndRef}
                                        t={t}
                                        onLeadSubmit={handleLeadSubmit}
                                        chatbotId={chatbotId}
                                        sessionId={sessionId}
                                        onBookingSuccess={handleBookingSuccess}
                                        showClassicEntryOnboarding={showClassicEntryOnboarding}
                                    />
                                </div>
                                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 px-2">
                                    <p className="text-[10px] text-gray-400 text-center text-balance">
                                        {t('aiDisclaimer')}
                                    </p>
                                    <a href="https://getvion.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity whitespace-nowrap">
                                        <span className="text-[10px] text-gray-400">{t("poweredBy")}</span>
                                        <img src="/vion-logo-full-dark.png" alt="Vion" style={{ height: '10px', width: 'auto', opacity: 0.5 }} />
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div ref={ambientDockAreaRef}>
                            <ChatInput
                                mode="ambient"
                                settings={effectiveSettings}
                                localInput={localInput}
                                setLocalInput={setLocalInput}
                                sendMessage={(
                                    text: string,
                                    speakResponse?: boolean,
                                    visualCtx?: string,
                                    guidedEvent?: GuidedSkillClientEvent | null,
                                    mediaPayload?: UserMessageMediaPayload | null
                                ) => {
                                    setAmbientFeedManuallyClosed(false)
                                    return guardedSendMessage(text, speakResponse, visualCtx, guidedEvent, mediaPayload)
                                }}
                                isChatLoading={isChatLoading}
                                visualContext={visualContext}
                                language={language}
                                t={t}
                                setMessages={setMessages}
                                ambientInputOnly={!showAmbientFeed}
                                onClearChat={handleClearChat}
                                onCloseWidget={() => setAmbientFeedManuallyClosed(true)}
                                onToggleAmbientFeed={handleToggleAmbientFeed}
                                showUtilityActions
                                showConversationModeSwitch={effectiveSettings.enableVoiceAssistant}
                                conversationMode={conversationMode}
                                onConversationModeChange={handleConversationModeChange}
                                disabled={requiresKvkkConsent}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex h-full flex-col bg-white dark:bg-zinc-900 rounded-t-[20px] overflow-hidden">
                    {!showClassicEntryOnboarding && (
                        <ChatHeader
                            settings={effectiveSettings}
                            isExpanded={isExpanded}
                            handleToggleSize={handleToggleSize}
                            handleCloseWidget={handleCloseWidget}
                            handleClearChat={handleClearChat}
                            t={t}
                        />
                    )}

                    <MessageList
                        mode="classic"
                        messages={messages}
                        settings={effectiveSettings}
                        isTyping={isTyping}
                        isSessionPaused={isSessionPaused}
                        pauseStateVersion={pauseStateVersion}
                        language={language}
                        imageMap={visualContext.imageMap}
                        scrollToBottom={scrollToBottom}
                        sendMessage={(text) => guardedSendMessage(text)}
                        sendGuidedMessage={guardedSendGuidedMessage}
                        guidedSkillState={guidedSkillState}
                        messagesContainerRef={messagesContainerRef}
                        messagesEndRef={messagesEndRef}
                        t={t}
                        onLeadSubmit={handleLeadSubmit}
                        chatbotId={chatbotId}
                        sessionId={sessionId}
                        onBookingSuccess={handleBookingSuccess}
                        showClassicEntryOnboarding={showClassicEntryOnboarding}
                        onCloseWidget={handleCloseWidget}
                    />

                    <ChatInput
                        mode={effectiveSettings.chatDisplayMode === "sidecar" ? "sidecar" : "classic"}
                        settings={effectiveSettings}
                        localInput={localInput}
                        setLocalInput={setLocalInput}
                        sendMessage={guardedSendMessage}
                        isChatLoading={isChatLoading}
                        visualContext={visualContext}
                        language={language}
                        t={t}
                        setMessages={setMessages}
                        showConversationModeSwitch={effectiveSettings.enableVoiceAssistant}
                        conversationMode={conversationMode}
                        onConversationModeChange={handleConversationModeChange}
                        disabled={requiresKvkkConsent}
                        quickActions={effectiveSettings.quickActions}
                        onTriggerAction={handleTriggerAction}
                    />
                </div>
            )}

            {/* Overlays */}
            <KvkkConsentOverlay
                show={requiresKvkkConsent}
                isRejected={isKvkkRejected}
                rejectionContactText={settings.kvkkConsent?.rejectionContactText || t("kvkkDefaultRejectionContact")}
                onAccept={acceptKvkkConsent}
                onReject={rejectKvkkConsent}
                onReadFull={guiltyOpenKvkkModal}
                t={t}
                theme={effectiveSettings.theme}
            />

            <LeadCollectionOverlay
                show={showLeadCollection}
                onSubmit={(data, opts) => handleLeadSubmit(data, { ...opts, flow: leadCollectionFlow })}
                isSubmitting={isSubmittingLead}
                settings={effectiveSettings}
                t={t}
                description={settings.leadFormConfig?.subtitle}
                variant={leadCollectionFlow}
            />

            <SurveyWidgetOverlay
                show={showSurvey}
                survey={settings.surveyWidgetConfig?.activeSurvey}
                brandColor={settings.brandColor}
                language={language}
                onClose={() => setShowSurvey(false)}
                onSubmit={handleSurveySubmit}
            />

            {showSpinWheel && spinWheelPrizes.length > 0 && (
                <SpinWheelOverlay
                    chatbotId={chatbotId}
                    sessionId={sessionId}
                    prizes={spinWheelPrizes}
                    onClose={() => {
                        setShowSpinWheel(false)
                        setSpinWheelShownThisSession(true)
                    }}
                    onPrize={(prize, code) => {
                        localStorage.setItem(`spun_${chatbotId}`, "1")
                        setSpinWheelShownThisSession(true)
                    }}
                />
            )}

            <BookingOverlay
                chatbotId={chatbotId}
                showBooking={showBooking}
                setShowBooking={setShowBooking}
                bookingData={bookingData}
                setBookingData={setBookingData}
                handleBookingSubmit={handleBookingSubmit}
                isSubmittingBooking={isSubmittingBooking}
                settings={effectiveSettings}
                t={t}
            />

            <ConfirmationModal
                isOpen={isConfirmingClear}
                onConfirm={confirmClear}
                onCancel={() => setIsConfirmingClear(false)}
                t={t}
            />

            <VoiceOverlay
                isOpen={effectiveSettings.enableVoiceAssistant && conversationMode === "voice"}
                voiceStatus={voiceStatus}
                localInput={localInput}
                isMuted={isMuted}
                settings={effectiveSettings}
                language={language}
                onConversationModeChange={handleConversationModeChange}
                onToggleMute={toggleMute}
                onEndCall={() => handleConversationModeChange("text")}
                t={t}
            />

            <KvkkConsentModal
                isOpen={isKvkkModalOpen}
                text={settings.kvkkConsent?.text || ""}
                onClose={() => setIsKvkkModalOpen(false)}
                t={t}
                language={language}
                theme={effectiveSettings.theme}
            />
        </div>
    )
}
