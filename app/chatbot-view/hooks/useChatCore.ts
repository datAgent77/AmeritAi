import { useState, useRef, useEffect } from "react"
import { doc, updateDoc, arrayUnion, onSnapshot, getDoc } from "firebase/firestore"
import { guestDb as db, guestAuth } from "@/lib/firebase-guest"
import { ChatbotSettings } from "@/types/chatbot"
import { INDUSTRY_CONFIG, IndustryType, DEFAULT_INDUSTRY } from "@/lib/industry-config"
import { hydrateChatSessionMessage } from "@/lib/chat-session-messages"
import { normalizeGuidedSkillState } from "@/lib/guided-skills"
import type { GuidedSkillClientEvent, GuidedSkillState } from "@/lib/guided-skills/types"

export interface UseChatCoreProps {
    chatbotId: string
    language: string
    settings: ChatbotSettings
    pageContext: any
    isGuestReady: boolean
    speakText?: (text: string, id: string) => void
    saveImageToCache: (msgId: string, imageData: string, mimeType: string, content?: string) => void
    getImageFromCache: (msgId: string) => any
    findImageByContent: (content: string) => any
    onShowLeadForm?: () => void
    kvkkConsentVersion?: string | null
    onKvkkConsentRequired?: () => void
}

export interface UserMessageMediaPayload {
    image: string
    imageMimeType?: string
}

function getImageFingerprint(message: any) {
    if (!message) return null
    const image = typeof message.image === "string" ? message.image : ""
    if (!image.trim()) return null
    const mimeType = typeof message.imageMimeType === "string" ? message.imageMimeType : ""
    return `${mimeType}:${image.length}:${image.slice(0, 32)}`
}

export function useChatCore({
    chatbotId,
    language,
    settings,
    pageContext,
    isGuestReady,
    speakText,
    saveImageToCache,
    getImageFromCache,
    findImageByContent,
    onShowLeadForm,
    kvkkConsentVersion: _kvkkConsentVersion,
    onKvkkConsentRequired: _onKvkkConsentRequired
}: UseChatCoreProps) {
    const [messages, setMessages] = useState<any[]>([])
    const [initialMessages, setInitialMessages] = useState<any[]>([])
    const [sessionId, setSessionId] = useState("")
    const [chatStatus, setChatStatus] = useState<'idle' | 'streaming' | 'submitted'>('idle')
    const [isTyping, setIsTyping] = useState(false)
    const [hasProactiveTriggered, setHasProactiveTriggered] = useState(false)
    const [listenerTrigger, setListenerTrigger] = useState(0)
    const [guidedSkillState, setGuidedSkillState] = useState<GuidedSkillState | null>(null)
    const messagesRef = useRef<any[]>([])
    const sendQueueRef = useRef<Promise<string>>(Promise.resolve(""))
    
    // Lead capture states
    const [hasRequestedContactInfo, setHasRequestedContactInfo] = useState(false)
    const [hasCapturedInChatLead, setHasCapturedInChatLead] = useState(false)
    const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
    const proactiveTimerRef = useRef<NodeJS.Timeout | null>(null)
    
    // Store callback refs to prevent infinite loops from recreated functions
    const saveImageToCacheRef = useRef(saveImageToCache)
    const getImageFromCacheRef = useRef(getImageFromCache)
    const findImageByContentRef = useRef(findImageByContent)
    
    // Update refs when callbacks change (but don't trigger re-renders)
    useEffect(() => {
        saveImageToCacheRef.current = saveImageToCache
        getImageFromCacheRef.current = getImageFromCache
        findImageByContentRef.current = findImageByContent
    })

    const isChatLoading = chatStatus === 'streaming' || chatStatus === 'submitted'

    useEffect(() => {
        messagesRef.current = messages
    }, [messages])

    // 1. Session Initialization
    useEffect(() => {
        if (!chatbotId) return
        const storageKey = `chat_session_id_${chatbotId}`
        let storedSid = localStorage.getItem(storageKey)

        if (!storedSid || !storedSid.startsWith('sess-')) {
            storedSid = 'sess-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)
            localStorage.setItem(storageKey, storedSid)
        }
        setSessionId(storedSid)
    }, [chatbotId])

    const ensureSessionId = () => {
        if (!chatbotId || typeof window === "undefined") {
            return sessionId
        }

        const storageKey = `chat_session_id_${chatbotId}`
        let activeSessionId = sessionId || localStorage.getItem(storageKey) || ""

        if (!activeSessionId || !activeSessionId.startsWith("sess-")) {
            activeSessionId = 'sess-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)
            localStorage.setItem(storageKey, activeSessionId)
        }

        if (activeSessionId !== sessionId) {
            setSessionId(activeSessionId)
        }

        return activeSessionId
    }

    // 2. Firebase Listener
    useEffect(() => {
        if (!isGuestReady || !sessionId) return

        let unsubscribe = () => { }
        let isMounted = true
        let lastMessageHash = ''

        const setupListener = async () => {
            const docRef = doc(db, "chat_sessions", sessionId)
            try {
                await getDoc(docRef) // Probe
                if (!isMounted) return

                unsubscribe = onSnapshot(docRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data()
                        setGuidedSkillState(normalizeGuidedSkillState(data.guidedSkillState))
                        if (data.messages && Array.isArray(data.messages)) {
                            const history = data.messages
                                .map((m: any, idx: number) => {
                                    const hydrated = hydrateChatSessionMessage(m)
                                    if (hydrated) return hydrated

                                    return {
                                        id: m.id || `${sessionId}-${idx}`,
                                        role: m.role,
                                        content: m.content,
                                        createdAt: m.createdAt ? (typeof m.createdAt.toDate === 'function' ? m.createdAt.toDate() : new Date(m.createdAt)) : new Date(),
                                        guidedUi: undefined,
                                        guidedEvent: undefined,
                                    }
                                })
                                .filter(Boolean)
                            
                            // Create a hash to detect actual changes and prevent infinite loops
                            const messageHash = JSON.stringify(history.map(m => ({
                                id: m.id,
                                role: m.role,
                                content: m.content,
                                hasImage: Boolean(getImageFingerprint(m)),
                                guidedUi: m.guidedUi || null,
                                guidedEvent: m.guidedEvent || null
                            })))
                            
                            // Only update if messages actually changed
                            if (messageHash !== lastMessageHash) {
                                lastMessageHash = messageHash
                                setInitialMessages(history)
                            }
                        } else {
                            setInitialMessages([])
                        }
                    } else {
                        setGuidedSkillState(null)
                        setInitialMessages([])
                    }
                })
            } catch (err: any) {
                if (err.code !== 'permission-denied' && err.code !== 'unavailable') {
                    console.error("Error checking session doc:", err)
                }
            }
        }

        setupListener()
        return () => {
            isMounted = false
            unsubscribe()
        }
    }, [sessionId, isGuestReady, listenerTrigger])

    // 3. Sync Logic (Race Condition Fix)
    useEffect(() => {
        if (initialMessages.length > 0) {
            setMessages((prevMessages: any[]) => {
                const firebaseMessageIds = new Set(initialMessages.map((m: any) => m.id))
                
                const pendingLocalMessages = prevMessages.filter((m: any) => {
                    const isLocalAssistant = m.id && m.id.startsWith('assistant-')
                    const isLocalUser = m.id && m.id.startsWith('user-')
                    const isNotInFirebaseById = !firebaseMessageIds.has(m.id)
                    
                    if (isLocalAssistant || isLocalUser) {
                        return isNotInFirebaseById
                    }

                    return false
                })
                
                // Use refs to access callbacks - prevents infinite loop from dependency changes
                const mergedFirebaseMessages = initialMessages.map((msg: any) => {
                    let cached = getImageFromCacheRef.current(msg.id)
                    if (!cached && msg.role === 'user' && msg.content) {
                        cached = findImageByContentRef.current(msg.content)
                    }
                    if (cached) {
                        return { ...msg, image: cached.image, imageMimeType: cached.mimeType }
                    }
                    return msg
                })
                
                const newMessages = pendingLocalMessages.length > 0 
                    ? [...mergedFirebaseMessages, ...pendingLocalMessages]
                    : mergedFirebaseMessages
                
                // Prevent unnecessary updates if messages are identical
                if (prevMessages.length === newMessages.length) {
                    const prevIds = prevMessages.map(m => m.id).join(',')
                    const newIds = newMessages.map(m => m.id).join(',')
                    if (prevIds === newIds) {
                        // Check if content changed
                        let contentChanged = false
                        for (let i = 0; i < prevMessages.length; i++) {
                            const prevGuidedUi = JSON.stringify(prevMessages[i].guidedUi || null)
                            const nextGuidedUi = JSON.stringify(newMessages[i].guidedUi || null)
                            const prevGuidedEvent = JSON.stringify(prevMessages[i].guidedEvent || null)
                            const nextGuidedEvent = JSON.stringify(newMessages[i].guidedEvent || null)
                            const prevImage = getImageFingerprint(prevMessages[i])
                            const nextImage = getImageFingerprint(newMessages[i])
                            if (
                                prevMessages[i].content !== newMessages[i].content ||
                                prevImage !== nextImage ||
                                prevGuidedUi !== nextGuidedUi ||
                                prevGuidedEvent !== nextGuidedEvent
                            ) {
                                contentChanged = true
                                break
                            }
                        }
                        if (!contentChanged) {
                            return prevMessages // Return same reference to prevent re-render
                        }
                    }
                }
                
                return newMessages
            })
        }
    }, [initialMessages]) // Only depend on initialMessages - callbacks accessed via refs

    // 4. Send Message
    const sendMessage = async (
        content: string,
        shouldSpeakResponse: boolean = false,
        visualAnalysisContext?: string,
        guidedEvent?: GuidedSkillClientEvent | null,
        mediaPayload?: UserMessageMediaPayload | null,
        isVoiceTurn: boolean = false
    ): Promise<string> => {
        if (!content.trim()) return ""

        const run = async (): Promise<string> => {
            const activeSessionId = ensureSessionId()
            const normalizedMedia = mediaPayload && typeof mediaPayload.image === "string" && mediaPayload.image.trim()
                ? {
                    image: mediaPayload.image.trim(),
                    imageMimeType: typeof mediaPayload.imageMimeType === "string" && mediaPayload.imageMimeType.trim()
                        ? mediaPayload.imageMimeType.trim()
                        : "image/jpeg",
                }
                : null

            const userMessage = {
                id: 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
                role: 'user',
                content: content,
                createdAt: new Date(),
                guidedEvent: guidedEvent || undefined,
                ...(normalizedMedia ? {
                    image: normalizedMedia.image,
                    imageMimeType: normalizedMedia.imageMimeType,
                } : {}),
            }

            if (normalizedMedia) {
                saveImageToCacheRef.current(userMessage.id, normalizedMedia.image, normalizedMedia.imageMimeType, content)
            }

            const outboundMessages = [...messagesRef.current, userMessage]
            const requestMessages = outboundMessages.map((message: any) => ({
                id: message.id,
                role: message.role,
                content: message.content,
            }))
            setMessages((prev: any) => {
                const next = [...prev, userMessage]
                messagesRef.current = next
                return next
            })
            setChatStatus('submitted')
            setIsTyping(true)

            // Generate Assistant ID beforehand to prevent duplicates during sync
            const assistantMsgId = 'assistant-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)

            try {
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 60000)

                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: requestMessages,
                        chatbotId,
                        sessionId: activeSessionId,
                        context: pageContext,
                        language,
                        isVoice: isVoiceTurn,
                        shouldStream: isVoiceTurn ? false : true,
                        userId: guestAuth.currentUser?.uid,
                        industry: settings.industry,
                        visualAnalysisContext, // Pass dynamic context
                        assistantMessageId: assistantMsgId, // <--- PASS THIS ID
                        guidedEvent: guidedEvent || undefined,
                    }),
                    signal: controller.signal
                })

            clearTimeout(timeoutId)
            if (!response.ok) {
                let serverMessage = `Chat API error (${response.status})`
                try {
                    const payload = await response.json()
                    if (typeof payload?.message === 'string' && payload.message.trim()) {
                        serverMessage = payload.message
                    } else if (typeof payload?.details === 'string' && payload.details.trim()) {
                        serverMessage = payload.details
                    } else if (typeof payload?.error === 'string' && payload.error.trim()) {
                        serverMessage = payload.error
                    }
                } catch {
                    // Keep generic message when body isn't JSON
                }
                throw new Error(serverMessage)
            }

            const responseType = response.headers.get('content-type') || ''
            if (responseType.includes('application/json')) {
                const payload = await response.json()
                const assistantContent = typeof payload?.content === 'string' ? payload.content : ''
                const resolvedAssistantId = typeof payload?.assistantMessageId === 'string' && payload.assistantMessageId.trim()
                    ? payload.assistantMessageId
                    : assistantMsgId
                const resolvedSessionId = typeof payload?.sessionId === 'string' && payload.sessionId.trim()
                    ? payload.sessionId
                    : activeSessionId

                if (resolvedSessionId && chatbotId) {
                    localStorage.setItem(`chat_session_id_${chatbotId}`, resolvedSessionId)
                    if (resolvedSessionId !== sessionId) {
                        setSessionId(resolvedSessionId)
                    }
                }

                setGuidedSkillState(normalizeGuidedSkillState(payload?.guidedSkillState))
                setMessages((prev: any) => {
                    const nextAssistantMessage = {
                        id: resolvedAssistantId,
                        role: 'assistant',
                        content: assistantContent,
                        createdAt: new Date(),
                        guidedUi: payload?.guidedUi || undefined,
                    }
                    const next = [...prev, nextAssistantMessage]
                    messagesRef.current = next
                    return next
                })
                setIsTyping(false)
                setChatStatus('idle')
                setListenerTrigger(prev => prev + 1)

                if (!isVoiceTurn && (shouldSpeakResponse || settings.enableAutoSpeak) && assistantContent && speakText) {
                    speakText(assistantContent, resolvedAssistantId)
                }

                return assistantContent
            }

            setChatStatus('streaming')
            const reader = response.body?.getReader()
            const decoder = new TextDecoder()
            let assistantContent = ''
            let hasReceivedFirstChunk = false

            setMessages((prev: any) => [...prev, { id: assistantMsgId, role: 'assistant', content: '', createdAt: new Date() }])

            while (reader) {
                const { done, value } = await reader.read()
                if (done) break
                const chunk = decoder.decode(value, { stream: true })
                assistantContent += chunk
                
                // Only stop typing indicator if we have enough visible content or a significant chunk
                if (!hasReceivedFirstChunk && chunk.trim().length > 0) {
                    hasReceivedFirstChunk = true
                    // Small delay to ensure render catches up?
                    // actually, let's keep it simple: just set it false
                    setIsTyping(false)
                }
                
                setMessages((prev: any) => prev.map((m: any) => m.id === assistantMsgId ? { ...m, content: assistantContent } : m))
            }

            setIsTyping(false)
            setChatStatus('idle')

            if (!assistantContent.trim()) {
                setMessages((prev: any) => prev.filter((m: any) => m.id !== assistantMsgId))
                return ""
            }

            if (!isVoiceTurn && (shouldSpeakResponse || settings.enableAutoSpeak) && assistantContent && speakText) {
                speakText(assistantContent, assistantMsgId)
            }

            // Force listener update
            setListenerTrigger(prev => prev + 1)

            // Booking Trigger
            if (settings.enableAppointments && (
                assistantContent.toLowerCase().includes('randevu') ||
                assistantContent.toLowerCase().includes('appointment') ||
                assistantContent.toLowerCase().includes('book') ||
                assistantContent.toLowerCase().includes('rezervasyon')
            )) {
                // UI should handle special messages
            }

            return assistantContent

        } catch (error: any) {
            console.error('Chat error:', error)
            setIsTyping(false)
            setChatStatus('idle')
            setMessages((prev: any) => {
                // Remove the stuck "empty" assistant message
                const last = prev[prev.length - 1]
                let newPrev = prev
                if (last && last.role === 'assistant' && !last.content) {
                    newPrev = prev.slice(0, -1)
                }
                
                // Add System Error Message
                const runtimeError = typeof error?.message === 'string' ? error.message.trim() : ''
                const isTurkishUi = language === 'tr'
                const defaultFallbackMessage = isTurkishUi
                    ? "⚠️ Bir bağlantı hatası oluştu. Lütfen tekrar deneyin."
                    : "⚠️ A connection error occurred. Please try again."
                const fallbackMessage = settings.errorMessage || defaultFallbackMessage
                const safeErrorMessage = runtimeError && !runtimeError.toLowerCase().includes("chat api error")
                    ? runtimeError
                    : fallbackMessage

                const errorMsg = {
                    id: 'system-error-' + Date.now(),
                    role: 'assistant', // Use assistant role so it shows up in bubble
                    content: safeErrorMessage,
                    createdAt: new Date(),
                    isError: true // We can use this for styling if needed
                }
                return [...newPrev, errorMsg]
            })
            return ""
        }
        }

        const queued = sendQueueRef.current.then(run, run)
        sendQueueRef.current = queued.then(() => "", () => "")
        return queued
    }

    const sendGuidedMessage = async (guidedEvent: GuidedSkillClientEvent): Promise<string> => {
        const content = (guidedEvent.label || "").trim()
            || settings.guidedSkills?.find((skill) => skill.id === guidedEvent.skillId)?.title
            || "guided-skill"
        return sendMessage(content, false, undefined, guidedEvent)
    }

    // 5. Proactive Engagement
    useEffect(() => {
        const isOnlyWelcomeMessage = messages.length === 1 && messages[0].content === settings.welcomeMessage;
        const hasUserMessages = messages.some(m => m.role === 'user');
        const holdProactiveForEntryOnboarding =
            settings.chatDisplayMode !== "ambient"
            && settings.enableClassicEntryOnboarding !== false
            && !hasUserMessages;

        if (holdProactiveForEntryOnboarding) return
        if (hasProactiveTriggered || (messages.length > 0 && !isOnlyWelcomeMessage) || hasUserMessages || !pageContext || !settings.industry) return

        const timer = setTimeout(() => {
            const industry = (settings.industry || DEFAULT_INDUSTRY) as IndustryType
            const config = INDUSTRY_CONFIG[industry] || INDUSTRY_CONFIG[DEFAULT_INDUSTRY]
            let greeting = ""

            if (settings.enableIndustryGreeting && industry !== 'other') {
                const isProductPage = pageContext.url.includes('/product/') || pageContext.url.includes('/shop/')
                const currentLang: 'en' | 'tr' = language === 'tr' ? 'tr' : 'en';

                if (isProductPage) {
                   greeting = config.greeting_product[currentLang] || config.greeting_general[currentLang]
                } else {
                    greeting = config.greeting_general[currentLang]
                }
            }

            if (greeting) {
                const proactiveMsg = { id: 'proactive-' + Date.now(), role: 'assistant', content: greeting, createdAt: new Date() }
                setMessages(prev => {
                    if (prev.length === 1 && prev[0].role === 'assistant') {
                        return [proactiveMsg]
                    }
                    const filtered = prev.filter(m => m.content !== settings.welcomeMessage)
                    return [...filtered, proactiveMsg]
                })
                setHasProactiveTriggered(true)
            }
        }, 12000)

        return () => clearTimeout(timer)
    }, [hasProactiveTriggered, messages, pageContext, settings.industry, settings.enableIndustryGreeting, settings.welcomeMessage, settings.chatDisplayMode, settings.enableClassicEntryOnboarding, language])

    // 6. Reset Session
    const resetSession = () => {
        console.log('[RESET SESSION] Called. Clearing chat...')
        const newSid = 'sess-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)
        localStorage.setItem(`chat_session_id_${chatbotId}`, newSid)
        console.log('[RESET SESSION] New session ID:', newSid)
        
        // Clear all states synchronously
        setSessionId(newSid)
        setMessages([])
        setInitialMessages([])
        setHasProactiveTriggered(false)
        setChatStatus('idle')
        setIsTyping(false)
        setGuidedSkillState(null)
        
        // Force reload iframe to ensure clean state
        setTimeout(() => {
            console.log('[RESET SESSION] Reloading widget...')
            window.location.reload()
        }, 100)
    }

    return {
        messages,
        setMessages,
        sendMessage,
        sendGuidedMessage,
        chatStatus,
        isTyping,
        isChatLoading,
        isSessionPaused: false as boolean,
        pauseStateVersion: 0 as number,
        sessionId,
        guidedSkillState,
        hasProactiveTriggered, // Exposed if needed
        resetSession
    }
}
