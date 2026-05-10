"use client"

import { useState, useEffect, useRef, useCallback, type PointerEvent as ReactPointerEvent } from "react"
import { useSearchParams } from "next/navigation"
import { ConversationProvider } from "@elevenlabs/react"
import { useLanguage } from "@/context/LanguageContext"
import { signInAsGuest } from "@/lib/firebase-guest"
import type { GuidedSkillClientEvent } from "@/lib/guided-skills/types"
import type { QuickActionButton } from "@/types/chatbot"
import { event as trackEvent } from "@/lib/gtag"

// Hooks
import { useWidgetSettings } from "./hooks/useWidgetSettings"
import { useVisualContext } from "./hooks/useVisualContext"
import { useVoiceInput } from "./hooks/useVoiceInput"
import { useRealtimeVoiceConversation } from "./hooks/useRealtimeVoiceConversation"
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

const PRIVACY_LANGUAGE_CODES = ["tr", "en", "de", "es"] as const

function resolvePrivacyLanguage(language: string) {
    const normalized = String(language || "").toLowerCase().split("-")[0]
    return PRIVACY_LANGUAGE_CODES.includes(normalized as any) ? normalized as "tr" | "en" | "de" | "es" : "en"
}

function getPrivacyDocument(settings: any, language: string, documentType: string) {
    const privacyLanguage = resolvePrivacyLanguage(language)
    const docsByLanguage = settings.privacyCompliance?.documentsByLanguage || {}
    return docsByLanguage[privacyLanguage]?.[documentType]
        || docsByLanguage.en?.[documentType]
        || docsByLanguage.tr?.[documentType]
        || null
}

function getPrivacyNoticeDocument(settings: any, language: string) {
    return resolvePrivacyLanguage(language) === "tr"
        ? getPrivacyDocument(settings, language, "kvkkNotice")
        : getPrivacyDocument(settings, language, "gdprPrivacyNotice")
}

function getRequiredConsentLabel(settings: any, language: string, purpose: string) {
    const privacyLanguage = resolvePrivacyLanguage(language)
    const consent = Array.isArray(settings.privacyCompliance?.requiredConsents)
        ? settings.privacyCompliance.requiredConsents.find((item: any) => item?.purpose === purpose)
        : null
    return consent?.checkboxLabelByLanguage?.[privacyLanguage]
        || consent?.checkboxLabelByLanguage?.en
        || consent?.checkboxLabelByLanguage?.tr
        || ""
}

function ChatbotContainerContent() {
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
        metadata?: Record<string, any>
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
    const autoSurveyOpenedRef = useRef(false)
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

    // INITIAL LEAD COLLECTION CHECK — lead submit itself handles explicit consent.
    useEffect(() => {
        if (isLoading) return
        if (!settings.enableInitialLeadCollection) return

        const hasSubmitted = localStorage.getItem(`vion_lead_submitted_${chatbotId}`)
        if (!hasSubmitted) {
            setShowLeadCollection(true)
        }
    }, [isLoading, settings.enableInitialLeadCollection, chatbotId])

    const privacyComplianceEnabled = settings.privacyCompliance?.enabled === true
    const privacyLanguage = resolvePrivacyLanguage(language)
    const privacyNoticeDocument = getPrivacyNoticeDocument(settings, language)
    const kvkkEnabled = privacyComplianceEnabled || settings.kvkkConsent?.enabled === true
    const kvkkVersionHash = privacyNoticeDocument?.versionHash || settings.kvkkConsent?.versionHash || ""
    const privacyTextHash = privacyNoticeDocument?.textHash || ""
    const privacyShortNotice = settings.privacyCompliance?.shortNoticeByLanguage?.[privacyLanguage]
        || settings.privacyCompliance?.shortNoticeByLanguage?.en
        || settings.privacyCompliance?.shortNoticeByLanguage?.tr
        || ""

    useEffect(() => {
        if (!isClient) return

        if (!kvkkEnabled || !kvkkVersionHash) {
            setIsKvkkAccepted(true)
            setIsKvkkModalOpen(false)
            return
        }

        const storageKey = `vion_kvkk_${chatbotId}_${kvkkVersionHash}`
        const accepted = ["accepted", "acknowledged", "continued"].includes(window.localStorage.getItem(storageKey) || "")
        setIsKvkkAccepted(accepted)
        setIsKvkkModalOpen(false)
    }, [chatbotId, isClient, kvkkEnabled, kvkkVersionHash])

    useEffect(() => {
        if (!isClient || isLoading || autoSurveyOpenedRef.current) return
        if (settings.enableSurveyManager !== true) return
        if (settings.surveyWidgetConfig?.autoOpenOnLoad !== true) return
        if (!settings.surveyWidgetConfig?.activeSurvey) return

        autoSurveyOpenedRef.current = true
        setShowSurvey(true)
    }, [
        isClient,
        isLoading,
        settings.enableSurveyManager,
        settings.surveyWidgetConfig?.activeSurvey,
        settings.surveyWidgetConfig?.autoOpenOnLoad,
    ])

    useEffect(() => {
        const url = searchParams?.get("url")
        const title = searchParams?.get("title")
        const desc = searchParams?.get("desc")
        const masa = searchParams?.get("masa")
        const mobileSession = searchParams?.get("mobileSession")
        if (url) {
            setPageContext({ 
                url, 
                title: title || "", 
                desc: desc || "",
                metadata: masa ? { masa } : undefined
            })
        }

        if (mobileSession && chatbotId) {
            const controller = new AbortController()
            fetch(`/api/mobile-assistant/session-context?chatbotId=${encodeURIComponent(chatbotId)}&mobileSession=${encodeURIComponent(mobileSession)}`, {
                cache: "no-store",
                signal: controller.signal,
            })
                .then(async (response) => {
                    const data = await response.json().catch(() => null)
                    if (!response.ok) throw new Error(data?.error || "Failed to resolve mobile session")
                    if (data?.context) setPageContext(data.context)
                    if (data?.language) setLanguage(data.language)
                })
                .catch((error) => {
                    if (error?.name !== "AbortError") {
                        console.warn("[ChatbotContainer] Mobile session context could not be loaded", error)
                    }
                })

            return () => controller.abort()
        }

        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'USEREX_CONTEXT_UPDATE') {
                const masa = searchParams?.get("masa")
                setPageContext({
                    ...event.data.context,
                    metadata: masa ? { masa } : event.data.context?.metadata
                })
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
    }, [chatbotId, searchParams, setLanguage])

    // 5. Circular Dependency Resolution (Voice <-> Chat)
    // We create a mutable ref for sendMessage so Voice hook can use it before Chat hook is fully initialized
    const sendMessageRef = useRef<((
        text: string,
        speakResponse?: boolean,
        visualContext?: string,
        guidedEvent?: GuidedSkillClientEvent | null,
        mediaPayload?: UserMessageMediaPayload | null,
        isVoiceTurn?: boolean
    ) => Promise<string>) | null>(null)

    const proxySendMessage = async (
        text: string,
        speakResponse?: boolean,
        visualContext?: string,
        guidedEvent?: GuidedSkillClientEvent | null,
        mediaPayload?: UserMessageMediaPayload | null,
        isVoiceTurn?: boolean
    ) => {
        if (sendMessageRef.current) {
            return sendMessageRef.current(text, speakResponse, visualContext, guidedEvent, mediaPayload, isVoiceTurn)
        }
        return ""
    }

    // 6. Voice Hook (Uses proxySendMessage)
    const legacyVoice = useVoiceInput(chatbotId, language, settings, setLocalInput, proxySendMessage)
    const realtimeVoice = useRealtimeVoiceConversation(chatbotId, language, settings, setLocalInput)
    const [realtimeFailed, setRealtimeFailed] = useState(false)
    const isRealtimeVoiceMode = settings.voiceInteractionMode === "realtime" && !realtimeFailed
    const legacyEndVoiceSession = legacyVoice.endVoiceSession
    const realtimeEndVoiceSession = realtimeVoice.endVoiceSession
    const speakText = legacyVoice.speakText
    const isMuted = isRealtimeVoiceMode ? realtimeVoice.isMuted : legacyVoice.isMuted
    const voiceStatus = isRealtimeVoiceMode ? realtimeVoice.voiceStatus : legacyVoice.voiceStatus
    const startVoiceSession = isRealtimeVoiceMode ? realtimeVoice.startVoiceSession : legacyVoice.startVoiceSession
    const endVoiceSession = isRealtimeVoiceMode ? realtimeVoice.endVoiceSession : legacyVoice.endVoiceSession
    const toggleMute = isRealtimeVoiceMode ? realtimeVoice.toggleMute : legacyVoice.toggleMute

    // Automatic fallback: if realtime voice fails, switch to legacy mode and auto-start
    const conversationModeRef = useRef(conversationMode)
    useEffect(() => { conversationModeRef.current = conversationMode }, [conversationMode])

    useEffect(() => {
        if (
            settings.voiceInteractionMode === "realtime" &&
            !realtimeFailed &&
            realtimeVoice.lastError &&
            conversationMode === "voice"
        ) {
            console.warn("[Voice] Realtime failed, falling back to legacy mode:", realtimeVoice.lastError)
            realtimeVoice.endVoiceSession()
            setRealtimeFailed(true)
            // Start legacy voice session after a short delay — but only if still in voice mode
            setTimeout(() => {
                if (conversationModeRef.current === "voice") {
                    legacyVoice.startVoiceSession()
                }
            }, 150)
        }
    }, [realtimeVoice.lastError, realtimeFailed, settings.voiceInteractionMode, conversationMode, realtimeVoice, legacyVoice])

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
            setLeadCollectionFlow("lead")
            setShowLeadCollection(true)
        },
        onKvkkConsentRequired: () => setIsKvkkModalOpen(true),
    })
    const [isKvkkRejected, setIsKvkkRejected] = useState(false)
    const requiresKvkkConsent = false
    const showPrivacyNotice = kvkkEnabled && !isKvkkAccepted && Boolean(kvkkVersionHash)

    useEffect(() => {
        setIsKvkkRejected(false)
    }, [chatbotId, kvkkEnabled, kvkkVersionHash])

    const recordPrivacyConsentEvent = useCallback(async (params: {
        eventType: string
        purpose: string
        documentType?: string
        documentVersionHash?: string
        textHash?: string
    }) => {
        const activeSessionId = sessionId || (typeof window !== "undefined" ? localStorage.getItem(`chat_session_id_${chatbotId}`) || "" : "")
        if (!privacyComplianceEnabled || !activeSessionId || !chatbotId) return false

        try {
            const response = await fetch("/api/privacy/consent-events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chatbotId,
                    sessionId: activeSessionId,
                    visitorId: activeSessionId,
                    language: privacyLanguage,
                    documentType: privacyNoticeDocument?.type,
                    documentVersionHash: privacyNoticeDocument?.versionHash,
                    textHash: privacyNoticeDocument?.textHash,
                    ...params,
                }),
            })
            return response.ok
        } catch (error) {
            console.warn("[privacy] consent event could not be recorded", error)
            return false
        }
    }, [chatbotId, privacyComplianceEnabled, privacyLanguage, privacyNoticeDocument?.textHash, privacyNoticeDocument?.type, privacyNoticeDocument?.versionHash, sessionId])

    useEffect(() => {
        if (!privacyComplianceEnabled || !sessionId || !kvkkVersionHash || typeof window === "undefined") return

        const storageKey = `vion_kvkk_notice_shown_${chatbotId}_${sessionId}_${kvkkVersionHash}`
        if (window.localStorage.getItem(storageKey) === "1") return
        window.localStorage.setItem(storageKey, "1")
        recordPrivacyConsentEvent({
            eventType: "notice_shown",
            purpose: "basic_chat",
            documentType: privacyNoticeDocument?.type || "kvkkNotice",
            documentVersionHash: kvkkVersionHash,
            textHash: privacyTextHash,
        })
    }, [chatbotId, kvkkVersionHash, privacyComplianceEnabled, privacyNoticeDocument?.type, privacyTextHash, recordPrivacyConsentEvent, sessionId])

    const acceptKvkkConsent = async () => {
        if (kvkkVersionHash && typeof window !== "undefined") {
            window.localStorage.setItem(`vion_kvkk_${chatbotId}_${kvkkVersionHash}`, "acknowledged")
        }
        await recordPrivacyConsentEvent({
            eventType: "notice_acknowledged",
            purpose: "basic_chat",
            documentType: privacyNoticeDocument?.type || "kvkkNotice",
            documentVersionHash: kvkkVersionHash,
            textHash: privacyTextHash,
        })
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

    const markContinuedAfterNotice = useCallback(async () => {
        if (!showPrivacyNotice || !kvkkVersionHash) return

        if (typeof window !== "undefined") {
            window.localStorage.setItem(`vion_kvkk_${chatbotId}_${kvkkVersionHash}`, "continued")
        }
        setIsKvkkAccepted(true)
        await recordPrivacyConsentEvent({
            eventType: "continued_after_notice",
            purpose: "basic_chat",
            documentType: privacyNoticeDocument?.type || "kvkkNotice",
            documentVersionHash: kvkkVersionHash,
            textHash: privacyTextHash,
        })
    }, [chatbotId, kvkkVersionHash, privacyNoticeDocument?.type, privacyTextHash, recordPrivacyConsentEvent, showPrivacyNotice])

    const recordExplicitPrivacyConsent = useCallback(async (purpose: "lead_capture" | "appointment_request") => {
        const documentType = purpose === "appointment_request" ? "explicitConsentAppointment" : "explicitConsentLead"
        const document = getPrivacyDocument(settings, language, documentType)
        await recordPrivacyConsentEvent({
            eventType: "explicit_consent_granted",
            purpose,
            documentType,
            documentVersionHash: document?.versionHash || kvkkVersionHash,
            textHash: document?.textHash || privacyTextHash,
        })
    }, [kvkkVersionHash, language, privacyTextHash, recordPrivacyConsentEvent, settings])

    const guardedSendMessage = useCallback(async (
        text: string,
        speakResponse?: boolean,
        visualCtx?: string,
        guidedEvent?: GuidedSkillClientEvent | null,
        mediaPayload?: UserMessageMediaPayload | null,
        isVoiceTurn?: boolean
    ) => {
        await markContinuedAfterNotice()

        return sendMessage(text, speakResponse, visualCtx, guidedEvent, mediaPayload, isVoiceTurn)
    }, [markContinuedAfterNotice, sendMessage])

    const guardedSendGuidedMessage = useCallback(async (guidedEvent: GuidedSkillClientEvent) => {
        await markContinuedAfterNotice()

        return sendGuidedMessage(guidedEvent)
    }, [markContinuedAfterNotice, sendGuidedMessage])

    // Assign real sendMessage to ref
    useEffect(() => {
        sendMessageRef.current = (text, speakResponse, visualCtx, guidedEvent, mediaPayload, isVoiceTurn) => (
            guardedSendMessage(text, speakResponse, visualCtx, guidedEvent, mediaPayload, isVoiceTurn)
        )
    }, [guardedSendMessage])

    useEffect(() => {
        if (settings.enableVoiceAssistant) return

        setConversationMode("text")
        legacyEndVoiceSession()
        realtimeEndVoiceSession()
    }, [legacyEndVoiceSession, realtimeEndVoiceSession, settings.enableVoiceAssistant])

    useEffect(() => {
        if (typeof window === "undefined") return

        const shouldIgnore = (value: unknown) => {
            const msg = typeof value === "string"
                ? value
                : value instanceof Error
                    ? value.message
                    : typeof (value as any)?.message === "string"
                        ? String((value as any).message)
                        : ""

            const stack = value instanceof Error
                ? (value.stack || "")
                : typeof (value as any)?.stack === "string"
                    ? String((value as any).stack)
                    : ""

            if (!msg) return false

            const isClosedPeerConnection = msg.includes("RTCPeerConnection") && msg.includes("signalingState") && msg.includes("closed")
            if (!isClosedPeerConnection) return false

            const isNegotiationEdge = msg.includes("setRemoteDescription") || msg.includes("addIceCandidate")
            if (!isNegotiationEdge) return false

            return !stack || stack.includes("livekit-client") || stack.includes("@elevenlabs")
        }

        const onUnhandledRejection = (event: PromiseRejectionEvent) => {
            if (shouldIgnore(event.reason)) {
                event.preventDefault()
            }
        }

        const onError = (event: ErrorEvent) => {
            if (shouldIgnore(event.error || event.message)) {
                event.preventDefault()
            }
        }

        window.addEventListener("unhandledrejection", onUnhandledRejection)
        window.addEventListener("error", onError)

        return () => {
            window.removeEventListener("unhandledrejection", onUnhandledRejection)
            window.removeEventListener("error", onError)
        }
    }, [])

    const handleConversationModeChange = (nextMode: "text" | "voice") => {
        if (nextMode === "voice") {
            void markContinuedAfterNotice()
            setConversationMode("voice")
            startVoiceSession()
            return
        }

        setConversationMode("text")
        legacyEndVoiceSession()
        realtimeEndVoiceSession()
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
    // and end any active voice session when the widget is hidden
    useEffect(() => {
        const handleVisibilityToggle = (event: MessageEvent) => {
            if (event.data.type === 'USEREX_WIDGET_TOGGLED') {
                if (event.data.isOpen) {
                    scrollToBottom("auto")
                    // Fallback attempt in case layout takes a moment
                    setTimeout(() => scrollToBottom("auto"), 50)
                } else {
                    // Widget is being hidden — end any active voice session
                    if (conversationModeRef.current === "voice") {
                        setConversationMode("text")
                        legacyEndVoiceSession()
                        realtimeEndVoiceSession()
                    }
                }
            }
        }
        window.addEventListener('message', handleVisibilityToggle)
        return () => window.removeEventListener('message', handleVisibilityToggle)
    }, [legacyEndVoiceSession, realtimeEndVoiceSession])

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
        // End any active voice session before closing
        if (conversationMode === "voice") {
            setConversationMode("text")
            legacyEndVoiceSession()
            realtimeEndVoiceSession()
        }
        window.parent.postMessage({ type: 'USEREX_CLOSE_WIDGET' }, '*')
    }

    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                handleCloseWidget()
            }
        }
        window.addEventListener("keydown", handleGlobalKeyDown)
        return () => window.removeEventListener("keydown", handleGlobalKeyDown)
    }, [])

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
                testMode: typeof window !== "undefined" && window.location.pathname === "/widget-test",
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
            const { privacyConsentAccepted, ...leadPayload } = formData || {}

            if (privacyComplianceEnabled && privacyConsentAccepted !== true) {
                alert(t("privacyConsentRequired") === "privacyConsentRequired" ? "Devam etmek için gizlilik/onay kutusunu işaretleyin." : t("privacyConsentRequired"))
                return
            }

            if (privacyComplianceEnabled) {
                await recordExplicitPrivacyConsent("lead_capture")
            }

            if (flow === "handoff") {
                const leadName = String(leadPayload?.name || "").trim()
                const leadEmail = String(leadPayload?.email || "").trim()
                const leadPhone = String(leadPayload?.phone || "").trim()
                const customFields = leadPayload?.customFields && typeof leadPayload.customFields === "object"
                    ? Object.entries(leadPayload.customFields)
                        .map(([key, value]) => [String(key).trim(), String(value || "").trim()] as const)
                        .filter(([, value]) => value)
                    : []

                try {
                    localStorage.setItem(`lead_${chatbotId}`, JSON.stringify(leadPayload))
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
                            ? "Müşteri temsilcisi talebim için iletişim bilgilerimi paylaşıyorum."
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
                    ...leadPayload,
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
                localStorage.setItem(`lead_${chatbotId}`, JSON.stringify(leadPayload))
                setShowLeadCollection(false)

                if (submitSource === "inline") {
                    // Inline form submit finalizes a pending handoff on backend if one exists.
                    guardedSendMessage("İletişim bilgilerimi doldurdum.", false, undefined, undefined, null)
                } else {
                    // Overlay formlar için mevcut statik teşekkür mesajı
                    const leadName = String(leadPayload?.name || "").trim()
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
            if (privacyComplianceEnabled) {
                await recordExplicitPrivacyConsent("appointment_request")
            }

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

    // Automatically inject Digital Waiter Quick Actions if enabled
    const enhancedQuickActions = { 
        enabled: effectiveSettings.quickActions?.enabled || false,
        buttons: [...(effectiveSettings.quickActions?.buttons || [])]
    }
    
    if (effectiveSettings.enableDigitalWaiter) {
        enhancedQuickActions.enabled = true
        // Add them to the beginning of the list
        enhancedQuickActions.buttons = [
            {
                id: "dw_call_staff",
                moduleId: "custom",
                label: language === "tr" ? "Garson Çağır" : "Call Staff",
                triggerMessage: language === "tr" ? "Lütfen masama bir garson yönlendirin. [CALL_STAFF]" : "Please send a waiter to my table. [CALL_STAFF]",
                visible: true,
                order: -2
            },
            {
                id: "dw_request_bill",
                moduleId: "custom",
                label: language === "tr" ? "Hesap İste" : "Request Bill",
                triggerMessage: language === "tr" ? "Hesabı alabilir miyim? [REQUEST_BILL]" : "Can I get the bill please? [REQUEST_BILL]",
                visible: true,
                order: -1
            },
            ...enhancedQuickActions.buttons
        ]
    }

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
                                        leadPrivacyConsent={privacyComplianceEnabled ? {
                                            required: true,
                                            checkboxLabel: getRequiredConsentLabel(settings, language, "lead_capture")
                                                || (language === "tr"
                                                    ? "Iletisim bilgilerimin talebime donus yapilmasi amaciyla islenmesine acik riza veriyorum."
                                                    : "I consent to the processing of my contact details to respond to my request."),
                                            errorText: t("privacyConsentRequired") === "privacyConsentRequired" ? "Devam etmek için gizlilik/onay kutusunu işaretleyin." : t("privacyConsentRequired"),
                                            onReadNotice: guiltyOpenKvkkModal,
                                        } : undefined}
                                        bookingPrivacyConsent={privacyComplianceEnabled ? {
                                            required: true,
                                            checkboxLabel: getRequiredConsentLabel(settings, language, "appointment_request")
                                                || (language === "tr"
                                                    ? "Randevu talebim icin kisisel verilerimin islenmesine acik riza veriyorum."
                                                    : "I consent to the processing of my personal data for my appointment request."),
                                            errorText: t("privacyConsentRequired") === "privacyConsentRequired" ? "Devam etmek için gizlilik/onay kutusunu işaretleyin." : t("privacyConsentRequired"),
                                            onReadNotice: guiltyOpenKvkkModal,
                                            onGrant: () => recordExplicitPrivacyConsent("appointment_request"),
                                        } : undefined}
                                    />
                                </div>
                                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 px-2">
                                    <p className="text-[10px] text-gray-400 text-center text-balance">
                                        {t('aiDisclaimer')}
                                    </p>
                                    {effectiveSettings.hideVionBranding !== true && (
                                        <a href="https://getvion.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity whitespace-nowrap">
                                            <span className="text-[10px] text-gray-400">{t("poweredBy")}</span>
                                            <img src="/vion-logo-full-dark.png" alt="Vion" style={{ height: '10px', width: 'auto', opacity: 0.5 }} />
                                        </a>
                                    )}
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
                                disabled={false}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex h-full flex-col bg-white dark:bg-zinc-900 rounded-none md:rounded-[20px] overflow-hidden">
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
                        leadPrivacyConsent={privacyComplianceEnabled ? {
                            required: true,
                            checkboxLabel: getRequiredConsentLabel(settings, language, "lead_capture")
                                || (language === "tr"
                                    ? "Iletisim bilgilerimin talebime donus yapilmasi amaciyla islenmesine acik riza veriyorum."
                                    : "I consent to the processing of my contact details to respond to my request."),
                            errorText: t("privacyConsentRequired") === "privacyConsentRequired" ? "Devam etmek için gizlilik/onay kutusunu işaretleyin." : t("privacyConsentRequired"),
                            onReadNotice: guiltyOpenKvkkModal,
                        } : undefined}
                        bookingPrivacyConsent={privacyComplianceEnabled ? {
                            required: true,
                            checkboxLabel: getRequiredConsentLabel(settings, language, "appointment_request")
                                || (language === "tr"
                                    ? "Randevu talebim icin kisisel verilerimin islenmesine acik riza veriyorum."
                                    : "I consent to the processing of my personal data for my appointment request."),
                            errorText: t("privacyConsentRequired") === "privacyConsentRequired" ? "Devam etmek için gizlilik/onay kutusunu işaretleyin." : t("privacyConsentRequired"),
                            onReadNotice: guiltyOpenKvkkModal,
                            onGrant: () => recordExplicitPrivacyConsent("appointment_request"),
                        } : undefined}
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
                        disabled={false}
                        quickActions={enhancedQuickActions}
                        onTriggerAction={handleTriggerAction}
                    />
                </div>
            )}

            {/* Overlays */}
            <KvkkConsentOverlay
                show={showPrivacyNotice}
                isRejected={isKvkkRejected}
                rejectionContactText={settings.kvkkConsent?.rejectionContactText || t("kvkkDefaultRejectionContact")}
                shortNoticeText={privacyShortNotice}
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
                privacyConsent={privacyComplianceEnabled ? {
                    required: true,
                    checkboxLabel: getRequiredConsentLabel(settings, language, "lead_capture")
                        || (language === "tr"
                            ? "Iletisim bilgilerimin talebime donus yapilmasi amaciyla islenmesine acik riza veriyorum."
                            : "I consent to the processing of my contact details to respond to my request."),
                    errorText: t("privacyConsentRequired") === "privacyConsentRequired" ? "Devam etmek için gizlilik/onay kutusunu işaretleyin." : t("privacyConsentRequired"),
                    onReadNotice: guiltyOpenKvkkModal,
                } : undefined}
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
                privacyConsent={privacyComplianceEnabled ? {
                    required: true,
                    checkboxLabel: getRequiredConsentLabel(settings, language, "appointment_request")
                        || (language === "tr"
                            ? "Randevu talebim icin kisisel verilerimin islenmesine acik riza veriyorum."
                            : "I consent to the processing of my personal data for my appointment request."),
                    errorText: t("privacyConsentRequired") === "privacyConsentRequired" ? "Devam etmek için gizlilik/onay kutusunu işaretleyin." : t("privacyConsentRequired"),
                    onReadNotice: guiltyOpenKvkkModal,
                } : undefined}
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
                onToggleMute={toggleMute}
                onEndCall={() => handleConversationModeChange("text")}
                t={t}
            />

            <KvkkConsentModal
                isOpen={isKvkkModalOpen}
                text={privacyNoticeDocument?.text || settings.kvkkConsent?.text || ""}
                onClose={() => setIsKvkkModalOpen(false)}
                t={t}
                language={language}
                theme={effectiveSettings.theme}
            />
        </div>
    )
}

export default function ChatbotContainer() {
    return (
        <ConversationProvider>
            <ChatbotContainerContent />
        </ConversationProvider>
    )
}
