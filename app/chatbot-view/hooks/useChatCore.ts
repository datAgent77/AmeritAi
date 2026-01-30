import { useState, useRef, useEffect } from "react"
import { doc, updateDoc, arrayUnion, onSnapshot, getDoc } from "firebase/firestore"
import { guestDb as db, guestAuth } from "@/lib/firebase-guest"
import { ChatbotSettings } from "@/types/chatbot"
import { INDUSTRY_CONFIG, IndustryType, DEFAULT_INDUSTRY } from "@/lib/industry-config"

export interface UseChatCoreProps {
    chatbotId: string
    settings: ChatbotSettings
    pageContext: any
    isGuestReady: boolean
    speakText?: (text: string, id: string) => void
    getImageFromCache: (msgId: string) => any
    findImageByContent: (content: string) => any
    onShowLeadForm?: () => void
}

export function useChatCore({
    chatbotId,
    settings,
    pageContext,
    isGuestReady,
    speakText,
    getImageFromCache,
    findImageByContent,
    onShowLeadForm
}: UseChatCoreProps) {
    const [messages, setMessages] = useState<any[]>([])
    const [initialMessages, setInitialMessages] = useState<any[]>([])
    const [sessionId, setSessionId] = useState("")
    const [chatStatus, setChatStatus] = useState<'idle' | 'streaming' | 'submitted'>('idle')
    const [isTyping, setIsTyping] = useState(false)
    const [hasProactiveTriggered, setHasProactiveTriggered] = useState(false)
    const [listenerTrigger, setListenerTrigger] = useState(0)
    
    // Lead capture states
    const [hasRequestedContactInfo, setHasRequestedContactInfo] = useState(false)
    const [hasCapturedInChatLead, setHasCapturedInChatLead] = useState(false)
    const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
    const proactiveTimerRef = useRef<NodeJS.Timeout | null>(null)
    
    // Store callback refs to prevent infinite loops from recreated functions
    const getImageFromCacheRef = useRef(getImageFromCache)
    const findImageByContentRef = useRef(findImageByContent)
    
    // Update refs when callbacks change (but don't trigger re-renders)
    useEffect(() => {
        getImageFromCacheRef.current = getImageFromCache
        findImageByContentRef.current = findImageByContent
    })

    const isChatLoading = chatStatus === 'streaming' || chatStatus === 'submitted'

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
                        if (data.messages && Array.isArray(data.messages)) {
                            const history = data.messages.map((m: any, idx: number) => ({
                                id: m.id || `${sessionId}-${idx}`,
                                role: m.role,
                                content: m.content,
                                createdAt: m.createdAt ? (typeof m.createdAt.toDate === 'function' ? m.createdAt.toDate() : new Date(m.createdAt)) : new Date()
                            }))
                            
                            // Create a hash to detect actual changes and prevent infinite loops
                            const messageHash = JSON.stringify(history.map(m => ({ id: m.id, role: m.role, content: m.content })))
                            
                            // Only update if messages actually changed
                            if (messageHash !== lastMessageHash) {
                                lastMessageHash = messageHash
                                setInitialMessages(history)
                            }
                        }
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
                            if (prevMessages[i].content !== newMessages[i].content) {
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
    const sendMessage = async (content: string, shouldSpeakResponse: boolean = false, visualAnalysisContext?: string): Promise<string> => {
        if (!content.trim()) return ""

        const userMessage = {
            id: 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
            role: 'user',
            content: content,
            createdAt: new Date()
        }
        setMessages((prev: any) => [...prev, userMessage])
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
                    messages: [...messages, userMessage],
                    chatbotId,
                    sessionId: sessionId || localStorage.getItem(`chat_session_id_${chatbotId}`),
                    context: pageContext,
                    language: settings.initialLanguage || 'auto',
                    isVoice: shouldSpeakResponse,
                    shouldStream: true,
                    userId: guestAuth.currentUser?.uid,
                    industry: settings.industry,
                    visualAnalysisContext, // Pass dynamic context
                    assistantMessageId: assistantMsgId // <--- PASS THIS ID
                }),
                signal: controller.signal
            })

            clearTimeout(timeoutId)
            if (!response.ok) throw new Error('Chat API error')

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

            if ((shouldSpeakResponse || settings.enableAutoSpeak) && assistantContent && speakText) {
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
                const last = prev[prev.length - 1]
                if (last && last.role === 'assistant' && !last.content) {
                    return prev.slice(0, -1)
                }
                return prev
            })
            return ""
        }
    }

    // 5. Proactive Engagement
    useEffect(() => {
        const isOnlyWelcomeMessage = messages.length === 1 && messages[0].content === settings.welcomeMessage;
        const hasUserMessages = messages.some(m => m.role === 'user');

        if (hasProactiveTriggered || (messages.length > 0 && !isOnlyWelcomeMessage) || hasUserMessages || !pageContext || !settings.industry) return

        const timer = setTimeout(() => {
            const industry = (settings.industry || DEFAULT_INDUSTRY) as IndustryType
            const config = INDUSTRY_CONFIG[industry] || INDUSTRY_CONFIG[DEFAULT_INDUSTRY]
            let greeting = ""

            if (settings.enableIndustryGreeting && industry !== 'other') {
                const isProductPage = pageContext.url.includes('/product/') || pageContext.url.includes('/shop/')
                
                // Always use browser language for greeting
                const browserLang = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'en';
                const currentLang: 'en' | 'tr' = browserLang === 'tr' ? 'tr' : 'en';

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
    }, [hasProactiveTriggered, messages, pageContext, settings.industry, settings.enableIndustryGreeting, settings.welcomeMessage])

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
        chatStatus,
        isTyping,
        isChatLoading,
        sessionId,
        hasProactiveTriggered, // Exposed if needed
        resetSession
    }
}
