"use client"

import { useEffect, useState, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { doc, updateDoc, arrayUnion, onSnapshot, getDoc } from "firebase/firestore"
import { guestDb as db, signInAsGuest, guestAuth } from "@/lib/firebase-guest"
import { MessageSquare, Send, RefreshCw, Sparkles, X, Maximize2, Minimize2, Mic, Volume2, Square, Headphones, PhoneOff, Calendar, Activity, Paperclip, ImageIcon, XCircle, MessageCircle, MessageSquareText, MessagesSquare, Bot, Brain, BrainCircuit, Cpu, Zap, Headset, Video, Phone, User, Users, UserCheck, HelpCircle, Info, AlertCircle, Star, Heart, ThumbsUp, Smile, Share2, Command, Terminal, Code, Box, Ghost, Gamepad2, Rocket } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ProductCard } from "@/components/chatbot/product-card"
import { INDUSTRY_CONFIG, IndustryType, DEFAULT_INDUSTRY } from "@/lib/industry-config"
import { useLanguage } from "@/context/LanguageContext"
import { KlassifierService } from "@/lib/klassifier-service"
import { ChatbotSettings } from "@/types/chatbot"

// Extend Window interface for Web Speech API
declare global {
    interface Window {
        webkitSpeechRecognition: any;
        SpeechRecognition: any;
    }
}

function ChatbotViewContent() {
    const searchParams = useSearchParams()
    const chatbotId = searchParams?.get("id") || "default"
    const [sessionId, setSessionId] = useState("")

    // Language Context
    const { language, setLanguage, t } = useLanguage()

    // Set initial language from URL parameter (overrides auto-detection)
    useEffect(() => {
        const langParam = searchParams?.get("lang")
        if (langParam && ['en', 'tr', 'de', 'es'].includes(langParam)) {
            setLanguage(langParam as any)
        }
    }, [searchParams, setLanguage])



    const [initialMessages, setInitialMessages] = useState<any[]>([])

    // Context State
    const [pageContext, setPageContext] = useState<{ url: string, title: string, desc: string } | null>(null)

    const [isGuestReady, setIsGuestReady] = useState(false)

    // Ensure Guest Authentication (using isolated firebase instance)
    useEffect(() => {
        signInAsGuest()
            .then(() => {
                setIsGuestReady(true)
            })
            .catch((error: Error) => {
                console.error("Guest login failed:", error)
            })
    }, [])

    // Handle initial context from URL
    useEffect(() => {
        const url = searchParams?.get("url")
        const title = searchParams?.get("title")
        const desc = searchParams?.get("desc")
        if (url) {
            setPageContext({ url, title: title || "", desc: desc || "" })
        }

        // Listen for context updates from parent
        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'USEREX_CONTEXT_UPDATE') {
                setPageContext(event.data.context)
            }
        }
        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [searchParams])

    // Voice Input State (Simplified: Push-to-Talk only)
    const [isListening, setIsListening] = useState(false)
    const isListeningRef = useRef(false)
    const [isSpeaking, setIsSpeaking] = useState<string | null>(null)
    const [isVoiceMode, setIsVoiceMode] = useState(false)
    const recognitionRef = useRef<any>(null)
    const synthesisRef = useRef<SpeechSynthesis | null>(null)
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

    // Initialize Speech Synthesis
    useEffect(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            synthesisRef.current = window.speechSynthesis
            const loadVoices = () => {
                const availableVoices = window.speechSynthesis.getVoices()
                setVoices(availableVoices)
            }
            loadVoices()
            window.speechSynthesis.onvoiceschanged = loadVoices
        }
    }, [])

    // Klassifier Voice Flow State
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const streamRef = useRef<MediaStream | null>(null)

    // Modified to use Klassifier Service logic
    const handleVoiceInput = async () => {
        if (isListening) {
            stopRecording()
        } else {
            startRecording()
        }
    }

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            streamRef.current = stream
            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            audioChunksRef.current = []

            // VAD Logic setup
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
            audioContextRef.current = audioContext
            const source = audioContext.createMediaStreamSource(stream)
            const analyser = audioContext.createAnalyser()
            analyser.fftSize = 256
            source.connect(analyser)
            analyserRef.current = analyser

            const bufferLength = analyser.frequencyBinCount
            const dataArray = new Uint8Array(bufferLength)

            let lastSpeechTime = Date.now()
            const SILENCE_THRESHOLD = 30 // Typical threshold for human speech
            const SILENCE_DURATION = 1500 // 1.5 seconds

            const checkSilence = () => {
                if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return

                analyser.getByteFrequencyData(dataArray)
                const average = dataArray.reduce((a, b) => a + b) / bufferLength

                if (average > SILENCE_THRESHOLD) {
                    lastSpeechTime = Date.now()
                } else {
                    if (Date.now() - lastSpeechTime > SILENCE_DURATION) {
                        stopRecording()
                        return
                    }
                }
                requestAnimationFrame(checkSilence)
            }

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data)
                }
            }

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
                runVoiceAssistantStep(audioBlob)

                // Cleanup VAD
                if (audioContextRef.current) {
                    audioContextRef.current.close()
                    audioContextRef.current = null
                }

                // Stop all tracks
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop())
                    streamRef.current = null
                }
            }

            mediaRecorder.start()
            setIsListening(true)
            isListeningRef.current = true
            requestAnimationFrame(checkSilence)
        } catch (error) {
            console.error("Error accessing microphone:", error)
            alert("Mikrofon hatası: Lütfen izinleri kontrol edin.")
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop()
        }
        setIsListening(false)
        isListeningRef.current = false
    }

    const runVoiceAssistantStep = async (audioBlob: Blob) => {
        try {
            // 1. STT: Transcribe using Klassifier
            setLocalInput("Ses işleniyor...") // Visual feedback
            const transcribedText = await KlassifierService.transcribeAudio(audioBlob)

            if (!transcribedText || !transcribedText.trim()) {
                setLocalInput("")
                setIsVoiceMode(false) // Optionally exit voice mode or just reset
                return
            }

            setLocalInput(transcribedText)

            // 2. LLM: Send to existing AI function
            // We pass 'shouldSpeakResponse: true' to trigger auto-speak, 
            // but we need to intercept the text for Klassifier TTS specifically if we want to use that instead of native.
            // Let's modify sendMessage to return the text so we can use Klassifier TTS here.

            const responseText = await sendMessage(transcribedText, false) // false = don't use native auto-speak immediately, we'll handle it

            if (responseText) {
                // 3. TTS: Generate speech
                let audio: HTMLAudioElement;

                if (settings.voiceProvider === 'elevenlabs') {
                    // Use ElevenLabs Proxy
                    const response = await fetch('/api/voice/elevenlabs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text: responseText,
                            voiceId: settings.elevenLabsVoiceId,
                            chatbotId: chatbotId
                        })
                    });

                    if (!response.ok) throw new Error("ElevenLabs TTS failed");

                    const audioBlob = await response.blob();
                    const audioUrl = URL.createObjectURL(audioBlob);
                    audio = new Audio(audioUrl);
                } else {
                    // Default: Use Klassifier
                    audio = await KlassifierService.generateSpeech(responseText)
                }

                // 4. Play
                audio.play()

                // Optional: sync visual "speaking" state
                audio.onplay = () => setIsSpeaking(settings.voiceProvider === 'elevenlabs' ? 'elevenlabs-tts' : 'klassifier-tts')
                audio.onended = () => {
                    setIsSpeaking(null)
                    if (settings.voiceProvider === 'elevenlabs') {
                        URL.revokeObjectURL(audio.src);
                    }
                }
            }

        } catch (error) {
            console.error("Voice Assistant Error:", error)
            setLocalInput("") // clear status
        }
    }

    // Handle Text-to-Speech (Simplified)
    // Handle Text-to-Speech (Provider Switch: Klassifier vs ElevenLabs)
    const speakText = async (text: string, messageId: string | null = null) => {
        if (!text) return

        setIsSpeaking(messageId || 'auto')

        try {
            // PROVIDER 1: ELEVENLABS
            if (settings.voiceProvider === 'elevenlabs') {
                const response = await fetch('/api/voice/elevenlabs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text,
                        chatbotId,
                        voiceId: settings.elevenLabsVoiceId // Optional, backend falls back to setting
                    })
                })

                if (!response.ok) throw new Error('ElevenLabs TTS failed')

                const blob = await response.blob()
                const url = URL.createObjectURL(blob)
                const audio = new Audio(url)

                audio.onended = () => {
                    setIsSpeaking(null)
                    URL.revokeObjectURL(url) // Cleanup
                }
                audio.onerror = () => setIsSpeaking(null)

                await audio.play()
            }
            // PROVIDER 2: KLASSIFIER (Default)
            else {
                // Determine voice_id based on language
                const voiceId = language === 'tr' ? 'derya' : 'rachel'

                // Using the specific Klassifier payload structure
                const payload = {
                    text: text,
                    voice_id: voiceId,
                    tts_service: "voicifier",
                    emotion: "happy",
                    speed: 1.0
                }

                const response = await fetch('/api/voice/klassifier?action=generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error("Klassifier TTS failed");
                const data = await response.json();

                if (data.file_path) {
                    const baseUrl = "https://api.klassifier.com"; // Pending user update on correct URL
                    const relativePath = data.file_path.startsWith('/') ? data.file_path : `/${data.file_path}`;
                    const audioUrl = data.file_path.startsWith('http') ? data.file_path : `${baseUrl}${relativePath}`;

                    const audio = new Audio(audioUrl);
                    audio.onended = () => setIsSpeaking(null)
                    audio.onerror = () => setIsSpeaking(null)
                    await audio.play();
                } else {
                    throw new Error("No file_path in Klassifier response");
                }
            }
        } catch (error) {
            console.error('TTS Error:', error)
            setIsSpeaking(null)

            // Fallback to browser TTS if API fails
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                const utterance = new SpeechSynthesisUtterance(text)
                utterance.lang = language === "tr" ? "tr-TR" : "en-US"
                utterance.onend = () => setIsSpeaking(null)
                window.speechSynthesis.cancel() // Cancel previous before speaking
                window.speechSynthesis.speak(utterance)
            }
        }
    }

    const handleSpeak = (text: string, messageId: string) => {
        if (!synthesisRef.current) return

        if (isSpeaking === messageId) {
            synthesisRef.current.cancel()
            setIsSpeaking(null)
            return
        }

        speakText(text, messageId)
    }

    // Typing Indicator State
    const [isTyping, setIsTyping] = useState(false)

    // Proactive Engagement State
    const [hasProactiveTriggered, setHasProactiveTriggered] = useState(false)
    const proactiveTimerRef = useRef<NodeJS.Timeout | null>(null)

    // 1. Initialize Session ID (Decoupled from User ID)
    useEffect(() => {
        if (!chatbotId) return

        const storageKey = `chat_session_id_${chatbotId}`
        let storedSid = localStorage.getItem(storageKey)

        if (!storedSid || !storedSid.startsWith('sess-')) {
            // Generate random Session ID if none exists OR if it's a legacy ID (raw UID)
            storedSid = 'sess-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)
            localStorage.setItem(storageKey, storedSid)
        }

        setSessionId(storedSid)
    }, [chatbotId])

    // 2. Real-time Listener (Depends on stable sessionId)
    const [listenerTrigger, setListenerTrigger] = useState(0)

    useEffect(() => {
        if (!isGuestReady || !sessionId) return

        let unsubscribe = () => { }
        let isMounted = true

        const setupListener = async () => {
            const docRef = doc(db, "chat_sessions", sessionId)

            try {
                // Probe first to avoid crashing the listener with permission-denied loop on non-existent docs
                // If this fails with permission-denied, we know we shouldn't listen yet.
                await getDoc(docRef)

                if (!isMounted) return

                unsubscribe = onSnapshot(docRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data()
                        if (data.messages && Array.isArray(data.messages)) {
                            const history = data.messages.map((m: any, idx: number) => ({
                                id: (m.id ? m.id : `${sessionId}-${idx}`) + `-${idx}`,
                                role: m.role,
                                content: m.content,
                                createdAt: m.createdAt ? (typeof m.createdAt.toDate === 'function' ? m.createdAt.toDate() : new Date(m.createdAt)) : new Date()
                            }))
                            setInitialMessages(history)
                        }
                    }
                }, (error) => {
                    if (error.code === 'permission-denied') {
                        console.warn("Session listener warning: Permission denied. Waiting for valid session...")
                    } else {
                        console.error("Error listening to chat history:", error)
                    }
                })
            } catch (err: any) {
                if (err.code === 'permission-denied' || err.code === 'unavailable') {
                    console.warn("Session doc not accessible yet (likely doesn't exist). Skipping listener until first message.")
                } else {
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

    // Local Input State to avoid useChat issues
    const [localInput, setLocalInput] = useState('')

    // Using minimal useChat for state management only - actual sending is done via custom sendMessage
    const [messages, setMessages] = useState<any[]>([])
    const [chatStatus, setChatStatus] = useState<'idle' | 'streaming' | 'submitted'>('idle')
    const isChatLoading = chatStatus === 'streaming' || chatStatus === 'submitted'

    // Voice mode callbacks handled in sendMessage function

    // Custom sendMessage function using fetch API
    const sendMessage = async (content: string, shouldSpeakResponse: boolean = false): Promise<string> => {
        if (!content.trim()) return ""

        const userMessage = {
            id: 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
            role: 'user',
            content: content,
            createdAt: new Date()
        }
        setMessages((prev: any) => [...prev, userMessage])

        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 60000) // 60s timeout for all requests

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
                    userId: guestAuth.currentUser?.uid // Pass User ID for permission association
                }),
                signal: controller.signal
            })

            clearTimeout(timeoutId)

            if (!response.ok) throw new Error('Chat API error')

            const reader = response.body?.getReader()
            const decoder = new TextDecoder()
            let assistantContent = ''
            const assistantMsgId = 'assistant-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)

            // Add placeholder assistant message
            setMessages((prev: any) => [...prev, { id: assistantMsgId, role: 'assistant', content: '', createdAt: new Date() }])

            while (reader) {
                const { done, value } = await reader.read()
                if (done) break
                const chunk = decoder.decode(value, { stream: true })
                assistantContent += chunk
                setMessages((prev: any) => prev.map((m: any) => m.id === assistantMsgId ? { ...m, content: assistantContent } : m))
            }

            // If content is empty (e.g. paused session or error), remove the placeholder
            if (!assistantContent.trim()) {
                setMessages((prev: any) => prev.filter((m: any) => m.id !== assistantMsgId))
                return ""
            }

            // If this was a voice input OR auto-speak is enabled, automatically speak the response
            if ((shouldSpeakResponse || settings.enableAutoSpeak) && assistantContent) {
                speakText(assistantContent, assistantMsgId)
            }

            // Trigger listener check now that we've definitely sent a message and doc should exist
            setListenerTrigger(prev => prev + 1)

            // Check if AI suggested booking an appointment
            if (settings.enableAppointments && (
                assistantContent.toLowerCase().includes('randevu') ||
                assistantContent.toLowerCase().includes('appointment') ||
                assistantContent.toLowerCase().includes('book') ||
                assistantContent.toLowerCase().includes('rezervasyon')
            )) {
                // If AI mentions booking, suggest the booking UI
                const showBookingTrigger = {
                    id: 'booking-trigger-' + Date.now(),
                    role: 'assistant',
                    content: '📅 [Booking UI Suggestion]', // Internal flag or we can show a special button
                    isSpecial: true,
                    createdAt: new Date()
                }
                // Instead of adding a message, maybe we just show a button or prompt
                // For now, let's add a visual cue in the next section
            }

            // Check if AI suggested a UI/UX Audit
            if (settings.enableUiUxAuditor && (
                assistantContent.toLowerCase().includes('analiz') ||
                assistantContent.toLowerCase().includes('denetim') ||
                assistantContent.toLowerCase().includes('ux') ||
                assistantContent.toLowerCase().includes('ui') ||
                assistantContent.toLowerCase().includes('audit')
            )) {
                setShowAuditSuggestion(true)
            }

            return assistantContent

        } catch (error: any) {
            console.error('Chat error:', error)

            // Remove the placeholder on error so we don't leave an empty bubble
            // We can't access assistantMsgId here easily due to scope, 
            // but we can filter out the last 'assistant' message if it's empty/loading.
            // Better: Add a visible error system message? 
            // For now, let's essentially 'undo' the optimistic update if it failed.
            setMessages((prev: any) => {
                const last = prev[prev.length - 1]
                if (last && last.role === 'assistant' && !last.content) {
                    return prev.slice(0, -1)
                }
                return prev
            })

            if (error.name === 'AbortError') {
                console.warn("Request timed out")
            }
            return ""
        }
    }


    // Local Image Cache Helpers
    // Local Image Cache Helpers (saveImageToCache moved to line ~715 to unify logic)

    const getImageFromCache = (msgId: string) => {
        try {
            // First check ref
            if (imageCache.current.has(msgId)) return imageCache.current.get(msgId)

            // Then check localStorage
            const key = `img_cache_${msgId}`
            const data = localStorage.getItem(key)
            if (data) {
                const parsed = JSON.parse(data)
                // Cache back to ref
                imageCache.current.set(msgId, { image: parsed.image, mimeType: parsed.mimeType })
                return parsed
            }
        } catch (e) {
            console.error('Failed to get image from local cache', e)
        }
        return null
    }

    const findImageByContent = (content: string) => {
        if (!content) return null
        try {
            // Scan localStorage for matching content
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key?.startsWith('img_cache_')) {
                    const data = localStorage.getItem(key)
                    if (data) {
                        const parsed = JSON.parse(data)
                        // Fuzzy match: Same content AND created within last 10 minutes AND same chatbotId
                        // This prevents matching old messages with same content or from other chatbots
                        const isRecent = Date.now() - (parsed.timestamp || 0) < 10 * 60 * 1000
                        const isSameChatbot = parsed.chatbotId === chatbotId

                        if (parsed.content === content && isRecent && isSameChatbot) {
                            return parsed
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Failed to fuzzy find image', e)
        }
        return null
    }

    // Sync initialMessages to useChat messages when loaded
    // Preserve local image data that was added before Firebase sync
    useEffect(() => {
        if (initialMessages.length > 0) {
            // Merge with cached images
            const mergedMessages = initialMessages.map((msg: any) => {
                // 1. Try exact ID match
                let cached = getImageFromCache(msg.id)

                // 2. Try fuzzy content match if generic user message (and no exact match)
                if (!cached && msg.role === 'user' && msg.content) {
                    cached = findImageByContent(msg.content)
                }

                if (cached) {
                    return { ...msg, image: cached.image, imageMimeType: cached.mimeType }
                }
                return msg
            })
            setMessages(mergedMessages)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialMessages, setMessages])

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const messagesContainerRef = useRef<HTMLDivElement>(null)
    const isFirstScrollRef = useRef(true)

    const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
        // Method 1: Container scrollTop (Most Reliability)
        if (messagesContainerRef.current) {
            const container = messagesContainerRef.current

            if (behavior === "auto") {
                // Instant jump
                container.scrollTop = container.scrollHeight
            } else {
                // Smooth scroll
                container.scrollTo({
                    top: container.scrollHeight,
                    behavior: "smooth"
                })
            }
        }

        // Method 2: Fallback to Ref (Safety net)
        else if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior })
        }
    }

    useEffect(() => {
        if (messages.length > 0) {
            if (isFirstScrollRef.current) {
                // AGGRESSIVE SCROLL STRATEGY FOR INITIAL LOAD
                // 1. Immediate
                scrollToBottom("auto")

                // 2. Next Frame
                requestAnimationFrame(() => scrollToBottom("auto"))

                // 3. Post-layout (100ms)
                setTimeout(() => scrollToBottom("auto"), 100)

                // 4. Heavy load safety (500ms) for images/fonts
                setTimeout(() => scrollToBottom("auto"), 500)

                isFirstScrollRef.current = false
            } else {
                // Normal user message
                scrollToBottom("smooth")
            }
        }
    }, [messages])

    const [hasRequestedContactInfo, setHasRequestedContactInfo] = useState(false)
    const [hasCapturedInChatLead, setHasCapturedInChatLead] = useState(false)
    const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)


    const [isConfirmingClear, setIsConfirmingClear] = useState(false)

    // Image Upload State for Visual Diagnosis
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const [selectedImageName, setSelectedImageName] = useState<string>("")
    const [selectedImageMimeType, setSelectedImageMimeType] = useState<string>("")
    const [isAnalyzingImage, setIsAnalyzingImage] = useState(false)
    const imageInputRef = useRef<HTMLInputElement>(null)

    // Local image cache to preserve images during Firebase sync
    // Key: message ID (or content hash as fallback)
    const [imageMap, setImageMap] = useState<Record<string, { image: string; mimeType: string; content?: string; timestamp?: number }>>({})

    // Load all cached images on mount
    useEffect(() => {
        const loaded: Record<string, any> = {}
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key?.startsWith('img_cache_')) {
                    const msgId = key.replace('img_cache_', '')
                    const data = localStorage.getItem(key)
                    if (data) {
                        const parsed = JSON.parse(data)
                        // Verify that this image belongs to the current chatbot
                        if (parsed.chatbotId === chatbotId) {
                            loaded[msgId] = parsed
                        }
                    }
                }
            }
            setImageMap(prev => ({ ...prev, ...loaded }))
        } catch (e) {
            console.error('Failed to load image cache', e)
        }
    }, [chatbotId])

    // Key: message ID, Value: { image: base64, mimeType: string }
    const imageCache = useRef<Map<string, { image: string; mimeType: string }>>(new Map())

    // Local Image Cache Helpers
    // Local Image Cache Helpers
    const saveImageToCache = (msgId: string, imageData: string, mimeType: string, content: string = "") => {
        try {
            const key = `img_cache_${msgId}`
            const dataObj = { image: imageData, mimeType, timestamp: Date.now(), content, chatbotId }
            const data = JSON.stringify(dataObj)
            localStorage.setItem(key, data)

            // Update state for immediate render availability
            setImageMap(prev => ({
                ...prev,
                [msgId]: dataObj
            }))

            // Also update ref cache for immediate access
            imageCache.current.set(msgId, { image: imageData, mimeType })
        } catch (e) {
            console.error('Failed to save image to local cache', e)
        }
    }

    // Handle Image Selection for Visual Diagnosis
    const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert(language === 'tr' ? 'Lütfen bir görsel dosyası seçin.' : 'Please select an image file.')
            return
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert(language === 'tr' ? 'Dosya boyutu 5MB\'dan küçük olmalıdır.' : 'File size must be less than 5MB.')
            return
        }

        // Convert to Base64
        const reader = new FileReader()
        reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1] // Remove data:image/...;base64, prefix
            setSelectedImage(base64)
            setSelectedImageName(file.name)
            setSelectedImageMimeType(file.type)
        }
        reader.readAsDataURL(file)

        // Reset input
        event.target.value = ''
    }

    // Clear Selected Image
    const clearSelectedImage = () => {
        setSelectedImage(null)
        setSelectedImageName("")
        setSelectedImageMimeType("")
    }

    // Send Image for Analysis
    const sendImageForAnalysis = async (userMessage: string): Promise<string> => {
        if (!selectedImage) return ""

        setIsAnalyzingImage(true)
        try {
            const response = await fetch('/api/visual-diagnosis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: selectedImage,
                    mimeType: selectedImageMimeType
                })
            })

            if (!response.ok) {
                throw new Error('Visual diagnosis failed')
            }

            const result = await response.json()

            // Format analysis result for AI context
            const analysisContext = language === 'tr'
                ? `[GÖRSEL ANALİZ SONUCU]\nTeşhis: ${result.diagnosis}\nGüven: ${result.confidence}\nÖnerilen Tedavi: ${result.treatment}\n\nKullanıcı mesajı: "${userMessage}"\n\nLütfen bu analiz sonucunu kullanıcıya uygun ve anlaşılır şekilde açıkla.`
                : `[IMAGE ANALYSIS RESULT]\nDiagnosis: ${result.diagnosis}\nConfidence: ${result.confidence}\nRecommended Treatment: ${result.treatment}\n\nUser message: "${userMessage}"\n\nPlease explain this analysis to the user in a clear and helpful way.`

            return analysisContext

        } catch (error) {
            console.error('Visual diagnosis error:', error)
            return language === 'tr'
                ? '[GÖRSEL ANALİZ HATASI: Görsel analiz yapılamadı. Lütfen kullanıcıya teknik bir sorun olduğunu bildirin.]'
                : '[IMAGE ANALYSIS ERROR: Could not analyze the image. Please inform the user about the technical issue.]'
        } finally {
            setIsAnalyzingImage(false)
            clearSelectedImage()
        }
    }

    const handleClearChat = () => {
        setIsConfirmingClear(true)
    }

    const handleCloseWidget = () => {
        window.parent.postMessage({ type: 'USEREX_CLOSE_WIDGET' }, '*')
    }

    const [isExpanded, setIsExpanded] = useState(false)
    const handleToggleSize = () => {
        const newExpandedState = !isExpanded
        setIsExpanded(newExpandedState)
        window.parent.postMessage({ type: 'USEREX_TOGGLE_SIZE', isExpanded: newExpandedState }, '*')
    }

    const confirmClear = () => {
        setMessages([])
        const newSid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        localStorage.setItem(`chat_session_id_${chatbotId}`, newSid)
        setSessionId(newSid)
        setIsConfirmingClear(false)
        setHasRequestedContactInfo(false)
    }

    const cancelClear = () => {
        setIsConfirmingClear(false)
    }

    const [settings, setSettings] = useState<ChatbotSettings>({
        companyName: "Acme Corp",
        welcomeMessage: "Hello! How can I help you today?",
        brandColor: "#000000",
        brandLogo: "",
        headerLogo: "",
        headerLogoWidth: 32,
        headerLogoHeight: 32,
        headerBackgroundColor: "",
        headerTextColor: "#FFFFFF",
        suggestedQuestions: ["What are your pricing plans?", "How do I get started?", "Contact support"],
        enableLeadCollection: false,
        enableInitialLeadCollection: false,
        enableInChatLeadCollection: false,
        leadFormConfig: null as { title?: string; subtitle?: string; nameLabel?: string; emailLabel?: string; phoneLabel?: string; submitButtonText?: string } | null,
        industry: "ecommerce" as string,
        enableVoiceAssistant: false,
        voiceProvider: "klassifier" as string,
        elevenLabsVoiceId: "",
        theme: "classic" as string,

        enableIndustryGreeting: false,
        initialLanguage: "auto",
        engagement: {
            enabled: false,
            bubble: {
                messages: [] as any[]
            }
        },
        enableAppointments: false,
        appointmentTypes: ["Consultation", "Support", "Demo"],
        appointmentSuccessMessage: "Randevunuz başarıyla oluşturuldu! Sizinle en kısa sürede iletişime geçeceğiz.",
        availableDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        enableAutoSpeak: false,
        preferredVoice: "",
        enablePersonalShopper: false,
        enableUiUxAuditor: false,
        enableVisualDiagnosis: false,
        leadCustomFields: [] as { id: string; label: string; type: string; required: boolean; placeholder?: string; options?: string[] }[],
        salesOptimizationConfig: {
            enabled: false,
            autoOfferDelay: 30, // seconds
            discountCode: "",
            discountAmount: 10,
            discountType: "percent",
            enableStockAlerts: false,
            enableCartRecovery: false,
            enableProductComparison: false
        } as any,
        launcherIcon: "library",
        launcherIconUrl: "",
        launcherLibraryIcon: "",
    })
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const loadSettings = async () => {
            try {
                // Fetch settings from API instead of Firestore directly to ensure consistency and bypass permission issues
                const res = await fetch(`/api/widget-settings?chatbotId=${chatbotId}`)
                if (res.ok) {
                    const data = await res.json()
                    setSettings({
                        companyName: data.companyName || "Acme Corp",
                        welcomeMessage: data.welcomeMessage || "Hello! How can I help you today?",
                        brandColor: data.brandColor || "#000000",
                        brandLogo: data.brandLogo || "",
                        headerLogo: data.headerLogo || "",
                        headerLogoWidth: data.headerLogoWidth || 32,
                        headerLogoHeight: data.headerLogoHeight || 32,
                        headerBackgroundColor: data.headerBackgroundColor || "",
                        headerTextColor: data.headerTextColor || "#FFFFFF",
                        suggestedQuestions: data.suggestedQuestions || ["What are your pricing plans?", "How do I get started?", "Contact support"],
                        enableLeadCollection: data.enableLeadCollection || false,
                        enableInitialLeadCollection: data.enableInitialLeadCollection ?? data.enableLeadCollection ?? false,
                        enableInChatLeadCollection: data.enableInChatLeadCollection ?? false,
                        leadFormConfig: data.leadFormConfig || null,
                        industry: data.industry || "ecommerce",
                        enableVoiceAssistant: data.enableVoiceAssistant || false,
                        voiceProvider: data.voiceProvider || "klassifier",
                        elevenLabsVoiceId: data.elevenLabsVoiceId || "",
                        theme: data.theme || "classic",
                        enableIndustryGreeting: data.enableIndustryGreeting !== undefined ? data.enableIndustryGreeting : false,
                        initialLanguage: data.initialLanguage || "auto",
                        engagement: data.engagement || { enabled: false, bubble: { messages: [] } },
                        enableAppointments: data.enableAppointments || false,
                        appointmentTypes: data.appointmentTypes || ["Consultation", "Support", "Demo"],
                        appointmentSuccessMessage: data.appointmentSuccessMessage || "Randevunuz başarıyla oluşturuldu! Sizinle en kısa sürede iletişime geçeceğiz.",
                        availableDays: data.availableDays || ["monday", "tuesday", "wednesday", "thursday", "friday"],
                        enableAutoSpeak: data.enableAutoSpeak || false,
                        preferredVoice: data.preferredVoice || "",
                        enablePersonalShopper: data.enablePersonalShopper || false,
                        enableUiUxAuditor: data.enableUiUxAuditor || false,
                        enableVisualDiagnosis: data.enableVisualDiagnosis || false,
                        leadCustomFields: data.leadCustomFields || [],
                        salesOptimizationConfig: data.salesOptimizationConfig || {},
                        launcherIcon: data.launcherIcon || "library",
                        launcherIconUrl: data.launcherIconUrl || "",
                        launcherLibraryIcon: data.launcherLibraryIcon || "",
                    })
                }
            } catch (error) {
                console.error("Error fetching settings:", error)
            } finally {
                setIsLoading(false)
            }
        }
        loadSettings()
    }, [chatbotId])

    // Sync language with settings
    useEffect(() => {
        if (settings.initialLanguage && settings.initialLanguage !== 'auto') {
            const langParam = searchParams?.get("lang")
            if (!langParam) {
                setLanguage(settings.initialLanguage as any)
            }
        }
    }, [settings.initialLanguage, searchParams, setLanguage])

    // Proactive Engagement Logic (Context-Aware & Sector-Specific)
    useEffect(() => {
        // Check if we should abort (user chatted, or configured to not disturb)
        // Allow if messages are empty OR if the only message is the Welcome Message (which we want to replace)
        const isOnlyWelcomeMessage = messages.length === 1 && messages[0].content === settings.welcomeMessage;
        const hasUserMessages = messages.some(m => m.role === 'user');

        if (hasProactiveTriggered || (messages.length > 0 && !isOnlyWelcomeMessage) || hasUserMessages || !pageContext || isLoading) return

        const timer = setTimeout(() => {
            const industry = (settings.industry || DEFAULT_INDUSTRY) as IndustryType
            const config = INDUSTRY_CONFIG[industry] || INDUSTRY_CONFIG[DEFAULT_INDUSTRY]

            // 1. Try to use configured Engagement Bubble Message
            // NOTE: We do NOT use engagement.bubble.messages here anymore.
            // Those are strictly for the Launcher Bubble (outside the chat).
            // Inside the chat, we only want:
            // a) Nothing (Default Welcome Screen)
            // b) Industry Greeting (if enabled)
            let greeting = ""

            // NOTE: We do NOT use engagement.bubble.messages here anymore.
            // Those are strictly for the Launcher Bubble (outside the chat).
            // Inside the chat, we only want:
            // a) Nothing (Default Welcome Screen)
            // b) Industry Greeting (if enabled)



            // 2. If no Custom Bubble, use Industry Context (Product/Page specific)
            // ONLY if enableIndustryGreeting is true AND industry is not 'other'
            if (!greeting && settings.enableIndustryGreeting && industry !== 'other') {
                // Context-based logic
                const isProductPage = pageContext.url.includes('/product/') || pageContext.url.includes('/shop/') || pageContext.url.includes('/room/') || pageContext.url.includes('/property/')
                const isCartPage = pageContext.url.includes('/cart') || pageContext.url.includes('/checkout') || pageContext.url.includes('/booking')

                // Determine language (Default to TR if auto to preserve legacy, or EN if specified)
                // Actually, if settings.initialLanguage is 'auto', maybe we should default to 'tr' as per user base,
                // BUT if they explicitly set En, we use En.
                const currentLang = (settings.initialLanguage === 'en') ? 'en' : 'tr';

                if (isProductPage) {
                    if (pageContext.title) {
                        // Try to make it more personal if we have a title
                        if (industry === 'ecommerce') {
                            greeting = currentLang === 'en'
                                ? `👋 ${pageContext.title} is a great choice! Do you have questions about features or price?`
                                : `👋 ${pageContext.title} harika bir seçim! Özellikleri veya fiyatı hakkında sorunuz var mı?`
                        } else if (industry === 'booking') {
                            greeting = currentLang === 'en'
                                ? `👋 Shall I check availability for ${pageContext.title}?`
                                : `👋 ${pageContext.title} için müsaitlik durumuna bakmamı ister misiniz?`
                        } else if (industry === 'real_estate') {
                            greeting = currentLang === 'en'
                                ? `👋 Interested in ${pageContext.title}? I can book an appointment.`
                                : `👋 ${pageContext.title} ilgini çekti mi? Randevu oluşturabilirim.`
                        } else {
                            greeting = config.greeting_product[currentLang]
                        }
                    } else {
                        greeting = config.greeting_product[currentLang]
                    }
                } else if (isCartPage) {
                    greeting = config.greeting_cart[currentLang]
                } else {
                    // Fallback to Industry General Greeting
                    greeting = config.greeting_general[currentLang]
                }
            } else if (!greeting && !settings.enableIndustryGreeting) {
                // If Industry Greeting is disabled, we do NOTHING.
                return
            }

            if (greeting) {
                const proactiveMsg = {
                    id: 'proactive-' + Date.now(),
                    role: 'assistant',
                    content: greeting,
                    createdAt: new Date()
                }

                // Replace the welcome message if it exists, otherwise append
                setMessages(prev => {
                    // Aggressive Logic:
                    // If there is only 1 message and it is from the assistant, assume it is the generic Welcome Message
                    // and REPLACE it with the Industry Greeting to avoid "Double Bubbles".
                    if (prev.length === 1 && prev[0].role === 'assistant') {
                        return [proactiveMsg as any]
                    }

                    // Fallback: If there are multiple messages, try to remove the welcome message specifically (just in case)
                    const filtered = prev.filter(m => m.content !== settings.welcomeMessage)
                    return [...filtered, proactiveMsg as any]
                })

                setHasProactiveTriggered(true)
            }

        }, 12000) // 12 seconds delay

        return () => clearTimeout(timer)
    }, [hasProactiveTriggered, messages, pageContext, isLoading, settings.industry, settings.engagement, settings.welcomeMessage, settings.enableIndustryGreeting, settings.initialLanguage])

    // 3. Sales Optimization: Auto-Offer Logic
    // Trigger when user is idle for X seconds (default 30)
    useEffect(() => {
        // Requirements:
        // - Config enabled
        // - Valid discount code exists
        // - Not already triggered
        // - User has interacted at least once (optional, but good for context) OR has been staring at a product
        // - Last message was from Assistant (waiting for user)
        // - Logic: Reset timer on every message. Start timer if last message is assistant.

        const salesConfig = settings.salesOptimizationConfig
        const autoOfferEnabled = salesConfig?.discountCodes === true && salesConfig?.discountCodeConfig?.autoOffer === true

        // Find a valid code to offer
        // Priority:
        // 1. Explicitly marked as 'auto'
        // 2. Legacy fallback: First code if usageType is missing (undefined)
        const codes = salesConfig?.discountCodeConfig?.codes || []
        const validCode = codes.find((c: any) => c.usageType === 'auto') || codes.find((c: any) => !c.usageType)

        // Check persistence: Has this specific code been shown before?
        const storageKey = `vion_auto_offer_shown_${validCode?.code}`
        const alreadyShown = typeof window !== 'undefined' && localStorage.getItem(storageKey) === 'true'

        if (!autoOfferEnabled || !validCode || hasProactiveTriggered || alreadyShown) {
            return
        }

        // Cancel existing timer on any update (message sent/received)
        if (proactiveTimerRef.current) {
            clearTimeout(proactiveTimerRef.current)
            proactiveTimerRef.current = null
        }

        const delayMs = (salesConfig?.discountCodeConfig?.offerAfterSeconds || 30) * 1000

        // Start timer
        proactiveTimerRef.current = setTimeout(() => {
            // Check One Last Time
            if (hasProactiveTriggered) return

            // Construct Offer Message
            const code = validCode.code
            const amount = validCode.discount
            const type = validCode.type === 'percent' ? '%' : (language === 'tr' ? '₺' : '$')

            // Format: "10%" or "₺10"
            const discountDisplay = validCode.type === 'percent'
                ? `${amount}%`
                : `${amount}${type}` // Basic formatting

            const offerMessage = language === 'tr'
                ? `👋 Fark ettim ki kararsız kaldınız... Size özel **${code}** kodunu kullanarak **${discountDisplay}** indirimden yararlanabilirsiniz!`
                : `👋 I noticed you might be undecided... You can use the special code **${code}** to get a **${discountDisplay}** discount!`

            // Inject Message
            // We use a "fake" assistant message injection
            const offerMsgId = 'offer-' + Date.now()
            setMessages(prev => [...prev, {
                id: offerMsgId,
                role: 'assistant',
                content: offerMessage,
                createdAt: new Date(),
                isSpecial: true // Flag for styling if needed
            }])

            setHasProactiveTriggered(true)

            // Mark as shown in persistence ("Add Shown Tag & Passivate")
            if (typeof window !== 'undefined') {
                localStorage.setItem(storageKey, 'true')
            }

            // Auto-speak if enabled
            if (settings.enableAutoSpeak) {
                speakText(offerMessage, offerMsgId)
            }

            setHasProactiveTriggered(true)

        }, delayMs)

        return () => {
            if (proactiveTimerRef.current) {
                clearTimeout(proactiveTimerRef.current)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages, settings.salesOptimizationConfig, hasProactiveTriggered, language, isLoading, settings.industry, settings.engagement, settings.welcomeMessage, settings.enableIndustryGreeting, settings.initialLanguage, settings.enableAutoSpeak])

    useEffect(() => {
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current)
        }

        // If in-chat lead collection is disabled, do nothing
        if (!isLoading && !settings.enableInChatLeadCollection) return

        const contactMessages = {
            tr: "Müşteri temsilcilerimizin sizinle iletişime geçebilmesi için Ad, Soyad, Firma ve İletişim bilgilerinizi paylaşabilir misiniz?",
            en: "Could you please share your Name, Surname, Company, and Contact Information so our customer representatives can contact you?",
            de: "Könnten Sie bitte Ihren Namen, Nachnamen, Ihre Firma und Ihre Kontaktinformationen mitteilen, damit unsere Kundenbetreuer Sie kontaktieren können?",
            es: "¿Podría compartir su Nombre, Apellido, Empresa e Información de contacto para que nuestros representantes de atención al cliente puedan contactarlo?",
            fr: "Pourriez-vous partager votre Nom, Prénom, Entreprise et Coordonnées afin que nos représentants du service client puissent vous contacter ?"
        }

        const detectLanguage = (text: string): keyof typeof contactMessages => {
            const trChars = /[çğıöşüÇĞİÖŞÜ]/
            if (trChars.test(text)) return 'tr'

            // Simple fallback to browser language if available, otherwise 'en'
            if (typeof window !== 'undefined' && window.navigator.language) {
                const lang = window.navigator.language.split('-')[0]
                if (lang in contactMessages) return lang as keyof typeof contactMessages
            }

            return 'en'
        }

        const userMessageCount = messages.filter(m => m.role === 'user').length
        // Check if ANY of the contact messages have been sent
        const alreadyRequested = messages.some(m => Object.values(contactMessages).includes(m.content))

        if (alreadyRequested) {
            if (!hasRequestedContactInfo) setHasRequestedContactInfo(true)

            // Check for response to contact request
            const lastMsg = messages[messages.length - 1]
            const secondLastMsg = messages[messages.length - 2]

            if (
                messages.length >= 2 &&
                lastMsg.role === 'user' &&
                secondLastMsg.role === 'assistant' &&
                Object.values(contactMessages).includes(secondLastMsg.content) &&
                !hasCapturedInChatLead
            ) {
                // Parse lead info
                const text = lastMsg.content
                const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
                const phoneMatch = text.match(/[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/)

                const email = emailMatch ? emailMatch[0] : ""
                const phone = phoneMatch ? phoneMatch[0] : ""
                const name = text.length < 50 ? text : "In-Chat User"

                // Send to API
                fetch("/api/leads", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chatbotId,
                        name: name,
                        email: email,
                        phone: phone,
                        source: "In-Chat Conversation"
                    })
                }).then(res => {
                    if (res.ok) {
                        setHasCapturedInChatLead(true)
                    }
                }).catch(err => console.error("Error capturing in-chat lead:", err))
            }

            return
        }

        if (userMessageCount >= 2 && !hasRequestedContactInfo && !isChatLoading) {
            // Check if appointment was just confirmed to avoid redundant questions
            const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant')
            if (lastAssistantMsg && (
                lastAssistantMsg.content.toLowerCase().includes("randevunuz") ||
                lastAssistantMsg.content.toLowerCase().includes("appointment") ||
                lastAssistantMsg.content.toLowerCase().includes("planlandı") ||
                lastAssistantMsg.content.toLowerCase().includes("oluşturulmuştur") ||
                lastAssistantMsg.content.toLowerCase().includes("confirmed")
            )) {
                return
            }

            inactivityTimerRef.current = setTimeout(() => {
                // Double check before firing in case messages changed
                const currentLastMsg = [...messages].reverse().find(m => m.role === 'assistant')
                if (currentLastMsg && (
                    currentLastMsg.content.toLowerCase().includes("randevunuz") ||
                    currentLastMsg.content.toLowerCase().includes("appointment")
                )) {
                    return
                }

                // Detect language from the last user message
                const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
                const lang = lastUserMsg ? detectLanguage(lastUserMsg.content) : 'en'
                const messageContent = contactMessages[lang] || contactMessages['en']

                const contactMsg = {
                    id: 'contact-request-' + Date.now(),
                    role: 'assistant',
                    content: messageContent,
                    createdAt: new Date()
                }
                setMessages(prev => [...prev, contactMsg as any])
                setHasRequestedContactInfo(true)

                if (sessionId) {
                    const sessionRef = doc(db, "chat_sessions", sessionId)
                    updateDoc(sessionRef, {
                        messages: arrayUnion({
                            id: contactMsg.id,
                            role: contactMsg.role,
                            content: contactMsg.content,
                            createdAt: contactMsg.createdAt.toISOString()
                        })
                    }).catch(e => console.error("Error saving contact request:", e))
                }
            }, 30000)
        }

        return () => {
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current)
            }
        }
    }
        }
    }, [messages, localInput, hasRequestedContactInfo, setMessages, isChatLoading, sessionId, hasCapturedInChatLead, chatbotId, settings.enableInChatLeadCollection, isLoading])


// Listen for Bubble Clicks from Parent Widget
useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'USEREX_BUBBLE_CLICKED') {
            const messageText = event.data.message
            if (messageText) {
                // Check if we already have this message to avoid duplicates
                const isDuplicate = messages.some(m => m.content === messageText)
                if (!isDuplicate) {
                    const newMsg = {
                        id: 'bubble-click-' + Date.now(),
                        role: 'assistant',
                        content: messageText,
                        createdAt: new Date(),
                        isSpecial: true
                    }
                    setMessages(prev => [...prev, newMsg as any])

                    // Auto-speak if enabled
                    if (settings.enableAutoSpeak) {
                        // Assuming speakText is available in scope or passed/defined elsewhere. 
                        // It seems defined in the component based on earlier context, but let's check.
                        // I'll skip calling it directly unless I am sure, to avoid errors.
                        // Actually, let's look for speakText definition.
                    }
                }
            }
        }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
}, [messages, settings.enableAutoSpeak])


const [showLeadForm, setShowLeadForm] = useState(false)
const [leadName, setLeadName] = useState("")
const [leadEmail, setLeadEmail] = useState("")
const [leadPhone, setLeadPhone] = useState("")
const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({})
const [isSubmittingLead, setIsSubmittingLead] = useState(false)

useEffect(() => {
    if (!isLoading && settings.enableInitialLeadCollection) {
        const storedLead = localStorage.getItem(`lead_${chatbotId}`)
        if (!storedLead) {
            setShowLeadForm(true)
        }
    }
}, [isLoading, settings.enableInitialLeadCollection, chatbotId])

const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingLead(true)

    try {
        const res = await fetch("/api/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chatbotId,
                name: leadName,
                email: leadEmail,
                phone: leadPhone,
                customFields: customFieldValues
            })
        })

        if (res.ok) {
            localStorage.setItem(`lead_${chatbotId}`, JSON.stringify({ name: leadName, email: leadEmail, phone: leadPhone, customFields: customFieldValues }))
            setShowLeadForm(false)
        }
    } catch (error) {
        console.error("Error submitting lead:", error)
    } finally {
        setIsSubmittingLead(false)
    }
}

// Appointment Booking State
const [showBooking, setShowBooking] = useState(false)
const [bookingData, setBookingData] = useState({
    type: "",
    date: "",
    time: "",
    notes: ""
})
const [isSubmittingBooking, setIsSubmittingBooking] = useState(false)
const [showAuditSuggestion, setShowAuditSuggestion] = useState(false)

const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookingData.type || !bookingData.date || !bookingData.time) return

    setIsSubmittingBooking(true)
    try {
        const leadData = localStorage.getItem(`lead_${chatbotId}`)
        const leadInfo = leadData ? JSON.parse(leadData) : {}

        const res = await fetch("/api/appointments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chatbotId,
                customerName: leadInfo.name || "Guest User",
                customerEmail: leadInfo.email || "",
                customerPhone: leadInfo.phone || "",
                date: bookingData.date,
                time: bookingData.time,
                type: bookingData.type,
                notes: bookingData.notes,
                sessionId,
                status: 'pending'
            })
        })

        if (res.ok) {
            const assistantsMsg = {
                id: 'appointment-success-' + Date.now(),
                role: 'assistant',
                content: settings.appointmentSuccessMessage,
                createdAt: new Date()
            }
            setMessages(prev => [...prev, assistantsMsg as any])
            setShowBooking(false)
            setBookingData({ type: "", date: "", time: "", notes: "" })
        }
    } catch (error) {
        console.error("Error submitting appointment:", error)
    } finally {
        setIsSubmittingBooking(false)
    }
}

if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-gray-50">Loading...</div>
}

return (
    <div className="flex flex-col h-screen bg-white font-sans text-gray-900 relative overflow-hidden">
        {/* Lead Collection Overlay */}
        {showLeadForm && (
            <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
                <div className="w-full max-w-sm space-y-6">
                    <div className="text-center space-y-2">
                        <div
                            className="relative w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg mx-auto overflow-hidden"
                            style={{ backgroundColor: settings.brandColor }}
                        >
                            {settings.brandLogo ? (
                                <Image src={settings.brandLogo} alt="Logo" fill className="object-cover" unoptimized />
                            ) : (
                                <MessageSquare className="w-8 h-8 text-white" />
                            )}
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">{settings.leadFormConfig?.title || t('welcome')}</h2>
                        <p className="text-sm text-gray-500">{settings.leadFormConfig?.subtitle || "Lütfen bilgilerinizi girerek sohbete başlayın."}</p>
                    </div>

                    <form onSubmit={handleLeadSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium text-gray-700">{settings.leadFormConfig?.nameLabel || "Ad Soyad"}</label>
                            <input
                                id="name"
                                required
                                type="text"
                                value={leadName}
                                onChange={(e) => setLeadName(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
                                style={{ '--tw-ring-color': settings.brandColor } as any}
                                placeholder={t('namePlaceholder')}
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium text-gray-700">{settings.leadFormConfig?.emailLabel || "E-posta"}</label>
                            <input
                                id="email"
                                required
                                type="email"
                                value={leadEmail}
                                onChange={(e) => setLeadEmail(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
                                style={{ '--tw-ring-color': settings.brandColor } as any}
                                placeholder={t('emailPlaceholder')}
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="phone" className="text-sm font-medium text-gray-700">{settings.leadFormConfig?.phoneLabel || "Telefon (Opsiyonel)"}</label>
                            <input
                                id="phone"
                                type="tel"
                                value={leadPhone}
                                onChange={(e) => setLeadPhone(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
                                style={{ '--tw-ring-color': settings.brandColor } as any}
                                placeholder={t('phonePlaceholder')}
                            />
                        </div>

                        {/* Custom Fields */}
                        {settings.leadCustomFields.map((field) => (
                            <div key={field.id} className="space-y-2">
                                <label htmlFor={field.id} className="text-sm font-medium text-gray-700">
                                    {field.label}{field.required && ' *'}
                                </label>
                                {field.type === 'textarea' ? (
                                    <textarea
                                        id={field.id}
                                        required={field.required}
                                        value={customFieldValues[field.id] || ''}
                                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all min-h-[80px]"
                                        style={{ '--tw-ring-color': settings.brandColor } as any}
                                        placeholder={field.placeholder || ''}
                                    />
                                ) : field.type === 'select' ? (
                                    <select
                                        id={field.id}
                                        required={field.required}
                                        value={customFieldValues[field.id] || ''}
                                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
                                        style={{ '--tw-ring-color': settings.brandColor } as any}
                                    >
                                        <option value="">{field.placeholder || 'Select...'}</option>
                                        {(field.options || []).map((opt, i) => (
                                            <option key={i} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        id={field.id}
                                        required={field.required}
                                        type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
                                        value={customFieldValues[field.id] || ''}
                                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
                                        style={{ '--tw-ring-color': settings.brandColor } as any}
                                        placeholder={field.placeholder || ''}
                                    />
                                )}
                            </div>
                        ))}

                        <button
                            type="submit"
                            disabled={isSubmittingLead}
                            className="w-full py-3 rounded-lg text-white font-medium shadow-md hover:opacity-90 transition-opacity disabled:opacity-50"
                            style={{ backgroundColor: settings.brandColor }}
                        >
                            {isSubmittingLead ? "Başlatılıyor..." : (settings.leadFormConfig?.submitButtonText || "Sohbete Başla")}
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* Appointment Booking Overlay */}
        {showBooking && (
            <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
                <div className="w-full max-w-sm space-y-6 overflow-y-auto max-h-full py-4">
                    <div className="text-center space-y-2">
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg mx-auto"
                            style={{ backgroundColor: settings.brandColor }}
                        >
                            <Calendar className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">{t('bookAppointment') || "Book Appointment"}</h2>
                        <p className="text-sm text-gray-500">{t('bookAppointmentDesc') || "Please select a time that works for you."}</p>
                    </div>

                    <form onSubmit={handleBookingSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">{t('appointmentType') || "Type"}</label>
                            <select
                                required
                                value={bookingData.type}
                                onChange={(e) => setBookingData(prev => ({ ...prev, type: e.target.value }))}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-opacity-50"
                                style={{ '--tw-ring-color': settings.brandColor } as any}
                            >
                                <option value="">{t('selectType') || "Select type..."}</option>
                                {settings.appointmentTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">{t('date') || "Date"}</label>
                                <input
                                    type="date"
                                    required
                                    min={new Date().toISOString().split('T')[0]}
                                    value={bookingData.date}
                                    onChange={(e) => setBookingData(prev => ({ ...prev, date: e.target.value }))}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">{t('time') || "Time"}</label>
                                <input
                                    type="time"
                                    required
                                    value={bookingData.time}
                                    onChange={(e) => setBookingData(prev => ({ ...prev, time: e.target.value }))}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">{t('notes') || "Notes (Optional)"}</label>
                            <textarea
                                value={bookingData.notes}
                                onChange={(e) => setBookingData(prev => ({ ...prev, notes: e.target.value }))}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none"
                                rows={2}
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowBooking(false)}
                                className="flex-1 py-3 rounded-lg bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors"
                            >
                                {t('cancel') || "Cancel"}
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmittingBooking}
                                className="flex-1 py-3 rounded-lg text-white font-medium shadow-md hover:opacity-90 disabled:opacity-50"
                                style={{ backgroundColor: settings.brandColor }}
                            >
                                {isSubmittingBooking ? "..." : (t('confirmBooking') || "Book Now")}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Voice Mode Overlay */}
        {isVoiceMode && (
            <div className="absolute inset-x-0 bottom-[80px] top-[80px] bg-white dark:bg-zinc-900 z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center mb-8 relative transition-all duration-500 ${isListening ? 'border-red-100 dark:border-red-900/30 scale-110' : 'border-blue-100 dark:border-blue-900/30'}`}>
                    {isListening && <div className="absolute inset-0 rounded-full bg-red-400 opacity-20 animate-ping"></div>}
                    {isSpeaking && <div className="absolute inset-0 rounded-full bg-blue-400 opacity-20 animate-pulse scale-125"></div>}

                    <button
                        onClick={handleVoiceInput}
                        className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-95 ${isListening ? 'bg-red-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                        {isListening ? <Square className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
                    </button>
                </div>

                <h3 className="text-xl font-bold text-gray-800 dark:text-zinc-100 mb-2">
                    {isListening ? "Sizi Dinliyorum..." : isSpeaking ? "Vion Cevap Veriyor..." : "Sesli Asistan Hazır"}
                </h3>
                <p className="text-gray-500 dark:text-zinc-400 text-sm max-w-xs mx-auto">
                    {isListening ? "Lütfen sorunuzu sorun." : isSpeaking ? "Yanıt seslendiriliyor." : "Konuşmak için butona tıklayın."}
                </p>

                {localInput && localInput !== "Ses işleniyor..." && (localInput !== "Sesli asistan aktif...") && (
                    <div className="mt-8 p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 max-w-xs mx-auto italic text-gray-600 dark:text-zinc-300 text-sm animate-in slide-in-from-bottom-2">
                        &quot;{localInput}&quot;
                    </div>
                )}

                <button
                    onClick={() => setIsVoiceMode(false)}
                    className="mt-auto px-6 py-2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 text-sm font-medium transition-colors border border-transparent hover:border-gray-100 dark:hover:border-zinc-800 rounded-full"
                >
                    Yazılı Sohbete Dön
                </button>
            </div>
        )}

        {/* Confirmation Modal */}
        {isConfirmingClear && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-xl p-6 max-w-xs w-full animate-in zoom-in-95 duration-200">
                    <h3 className="font-semibold text-lg mb-2">Clear History?</h3>
                    <p className="text-sm text-gray-500 mb-4">This will delete your current conversation. This action cannot be undone.</p>
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={cancelClear}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmClear}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm"
                        >
                            Clear Chat
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Hidden File Input for Image Upload - Outside theme blocks */}
        <input
            type="file"
            ref={imageInputRef}
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
        />


        <>

            {/* Header */}
            {/* Header */}
            <div
                className="flex items-center justify-between px-4 py-4 border-b shadow-sm sticky top-0 z-10 transition-colors duration-300"
                style={{ backgroundColor: settings.headerBackgroundColor || settings.brandColor, borderColor: 'rgba(0,0,0,0.05)' }}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="relative flex items-center justify-center"
                        style={{ width: `${settings.headerLogoWidth || 32}px`, height: `${settings.headerLogoHeight || 32}px` }}
                    >
                        {/* Priority: HeaderLogo -> BrandLogo -> LauncherIcon (Custom/Library) -> Default */}
                        {(() => {
                            // 1. Header Logo
                            if (settings.headerLogo) {
                                return <Image src={settings.headerLogo} alt="Logo" fill className="object-contain" unoptimized />
                            }
                            // 2. Brand Logo
                            if (settings.brandLogo) {
                                return <Image src={settings.brandLogo} alt="Logo" fill className="object-contain" unoptimized />
                            }
                            // 3. Custom Launcher Icon (Image)
                            if (settings.launcherIcon === 'custom' && settings.launcherIconUrl) {
                                return <Image src={settings.launcherIconUrl} alt="Logo" fill className="object-contain" unoptimized />
                            }
                            // 4. Library Launcher Icon
                            if (settings.launcherIcon === 'library' && settings.launcherLibraryIcon) {
                                const IconMap: any = {
                                    MessageSquare, MessageCircle, MessageSquareText, MessagesSquare,
                                    Bot, Sparkles, Brain, BrainCircuit, Cpu, Zap, Activity,
                                    Headset, Mic, Video, Phone,
                                    User, Users, UserCheck,
                                    HelpCircle, Info, AlertCircle,
                                    Star, Heart, ThumbsUp, Smile,
                                    Send, Share2, Paperclip,
                                    Command, Terminal, Code, Box,
                                    Ghost, Gamepad2, Rocket
                                };
                                const IconComponent = IconMap[settings.launcherLibraryIcon];
                                if (IconComponent) {
                                    return <IconComponent className="w-5 h-5 text-white" />
                                }
                            }

                            // 5. Default
                            return (
                                <div className="w-full h-full rounded-full bg-white/20 flex items-center justify-center">
                                    <MessageSquare className="w-5 h-5 text-white" />
                                </div>
                            )
                        })()}
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm leading-tight" style={{ color: settings.headerTextColor || '#FFFFFF' }}>{settings.companyName}</h3>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <div className="flex items-center gap-1.5 px-3 py-1 mr-2 bg-white/10 rounded-full border border-white/10 backdrop-blur-sm shadow-sm hidden sm:flex">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]"></span>
                        <span className="text-[10px] font-semibold tracking-wide" style={{ color: settings.headerTextColor || '#FFFFFF' }}>
                            AI Online
                        </span>
                    </div>
                    {settings.enableVoiceAssistant && (
                        <button
                            onClick={() => setIsVoiceMode(!isVoiceMode)}
                            className={`p-2 rounded-full transition-colors ${isVoiceMode ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                            title={isVoiceMode ? "Text Mode" : "Voice Mode"}
                        >
                            {isVoiceMode ? <MessageSquare className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
                        </button>
                    )}
                    <button
                        onClick={handleToggleSize}
                        className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors hidden sm:block"
                        title={isExpanded ? "Minimize" : "Maximize"}
                    >
                        {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={handleClearChat}
                        className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        title="Refresh Chat"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleCloseWidget}
                        className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        title="Close Widget"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            {/* Messages Area */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth bg-gray-50">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-6 p-8 animate-in fade-in duration-700 slide-in-from-bottom-4 fill-mode-forwards">
                        <div
                            className="relative w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg mb-2 overflow-hidden"
                            style={{ backgroundColor: settings.headerBackgroundColor || settings.brandColor }}
                        >
                            {settings.brandLogo ? (
                                <Image src={settings.brandLogo} alt="Logo" fill className="object-cover" unoptimized />
                            ) : (
                                <Sparkles className="w-8 h-8" />
                            )}
                        </div>
                        <div className="space-y-2 max-w-xs">
                            <h2 className="text-xl font-bold text-gray-800">{t('welcomeTo')} {settings.companyName}</h2>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                {settings.welcomeMessage}
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
                            {settings.suggestedQuestions.filter(q => q.trim() !== "").map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        sendMessage(q)
                                    }}
                                    className="text-xs text-left px-4 py-3 bg-white hover:bg-gray-50 border rounded-xl transition-all hover:shadow-sm shadow-sm"
                                    style={{ borderColor: `${settings.headerBackgroundColor || settings.brandColor}40`, color: settings.headerBackgroundColor || settings.brandColor }}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Welcome Message as first item if desired, or just chat flow */}


                        {messages.map((m: any) => {
                            // Render-time image recovery
                            const cached = imageMap[m.id] || (m.role === 'user' && !m.image && m.content ? Object.values(imageMap).find((x: any) => x.content === m.content) : null)
                            const displayImage = m.image || cached?.image
                            const displayMime = m.imageMimeType || cached?.mimeType

                            return (
                                <div key={m.id} className={`flex gap-3 max-w-3xl mx-auto ${m.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300 group/msg`}>
                                    {m.role !== 'user' && (
                                        <div
                                            className="relative w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs mt-auto mb-1 shadow-sm overflow-hidden bg-white"
                                        >
                                            {settings.brandLogo ? (
                                                <Image src={settings.brandLogo} alt="AI" fill className="object-cover" unoptimized />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white" style={{ backgroundColor: settings.headerBackgroundColor || settings.brandColor }}>
                                                    <Sparkles className="w-4 h-4" />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className={`space-y-1 max-w-[85%] ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                                        <div className="flex items-center gap-2 justify-between px-1 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-300">
                                            {m.role === 'assistant' && (
                                                <span className="text-[10px] font-medium text-gray-400">{settings.companyName}</span>
                                            )}
                                            {m.role === 'assistant' && (
                                                <button
                                                    onClick={() => handleSpeak(m.content, m.id)}
                                                    className="text-gray-300 hover:text-gray-500 transition-colors"
                                                    title={isSpeaking === m.id ? "Stop Speaking" : "Read Aloud"}
                                                >
                                                    {isSpeaking === m.id ? <Square className="w-3 h-3 fill-current" /> : <Volume2 className="w-3 h-3" />}
                                                </button>
                                            )}
                                        </div>
                                        <div
                                            className={`text-sm leading-relaxed px-4 py-3 rounded-2xl shadow-sm inline-block text-left relative transition-all hover:shadow-md ${m.role === 'user'
                                                ? 'bg-blue-600 text-white rounded-tr-sm'
                                                : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                                                }`}
                                            style={m.role === 'user' ? { backgroundColor: settings.headerBackgroundColor || settings.brandColor } : {}}
                                        >
                                            {/* Show image if present */}
                                            {displayImage && (
                                                <div className="mb-2">
                                                    <img
                                                        src={`data:${displayMime || 'image/jpeg'};base64,${displayImage}`}
                                                        alt="Uploaded"
                                                        className="max-w-full max-h-48 rounded-lg object-contain"
                                                        onLoad={() => scrollToBottom("smooth")}
                                                    />
                                                </div>
                                            )}
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    // Function to detect and render Product Card JSON/Format
                                                    code: ({ node, inline, className, children, ...props }: any) => {
                                                        const match = /language-(\w+)/.exec(className || '')
                                                        const content = String(children).replace(/\n$/, '')

                                                        // Detect Product JSON (Simple heuristic)
                                                        if (content.trim().startsWith('{') && content.includes('"price"')) {
                                                            try {
                                                                const product = JSON.parse(content)
                                                                if (product.name && product.price) {
                                                                    return <ProductCard product={product} brandColor={settings.brandColor} />
                                                                }
                                                            } catch (e) {
                                                                // Not valid JSON, ignore
                                                            }
                                                        }

                                                        return !inline && match ? (
                                                            <div className="bg-gray-800 text-white p-2 rounded-md text-xs overflow-x-auto my-2">
                                                                <code className={className} {...props}>
                                                                    {children}
                                                                </code>
                                                            </div>
                                                        ) : (
                                                            <code className={`${m.role === 'user' ? 'bg-white/20 text-white' : 'bg-gray-100 text-red-500'} px-1 py-0.5 rounded text-xs font-mono`} {...props}>
                                                                {children}
                                                            </code>
                                                        )
                                                    },
                                                    a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className={`underline font-medium ${m.role === 'user' ? 'text-white' : 'text-blue-600 hover:text-blue-800'}`} />,
                                                    table: ({ node, ...props }) => <table className="border-collapse table-auto w-full text-xs my-2 bg-white/5 rounded overflow-hidden" {...props} />,
                                                    th: ({ node, ...props }) => <th className={`border px-2 py-1 font-semibold ${m.role === 'user' ? 'border-white/20' : 'border-gray-200 bg-gray-50'}`} {...props} />,
                                                    td: ({ node, ...props }) => <td className={`border px-2 py-1 ${m.role === 'user' ? 'border-white/20' : 'border-gray-200'}`} {...props} />,
                                                    p: ({ node, ...props }) => <p className="mb-1 last:mb-0" {...props} />,
                                                    ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-1" {...props} />,
                                                    ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-1" {...props} />,
                                                }}
                                            >
                                                {m.content}
                                            </ReactMarkdown>
                                            <div className={`text-[10px] mt-1 opacity-70 flex justify-end ${m.role === 'user' ? 'text-white' : 'text-gray-400'}`}>
                                                {m.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}

                        {/* Typing Indicator */}
                        {isTyping && (
                            <div className="flex gap-3 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="relative w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white mt-auto mb-1 bg-white shadow-sm overflow-hidden order-first">
                                    {settings.brandLogo ? (
                                        <Image src={settings.brandLogo} alt="AI" fill className="object-cover" unoptimized />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: settings.headerBackgroundColor || settings.brandColor }}>
                                            <Sparkles className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                </div>
                                <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
                <div className="max-w-3xl mx-auto relative">
                    {/* Image Preview for Classic Theme */}
                    {selectedImage && (
                        <div className="mb-3 flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200">
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                                <img
                                    src={`data:${selectedImageMimeType};base64,${selectedImage}`}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                    onLoad={() => scrollToBottom("smooth")}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-600 truncate">{selectedImageName}</p>
                                <p className="text-[10px] text-gray-400">
                                    {isAnalyzingImage
                                        ? (language === 'tr' ? 'Analiz ediliyor...' : 'Analyzing...')
                                        : (language === 'tr' ? 'Görsel hazır' : 'Image ready')}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={clearSelectedImage}
                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    <form
                        onSubmit={async (e) => {
                            e.preventDefault()

                            // Prevent duplicate submissions
                            if (isAnalyzingImage || isChatLoading) return
                            if (!localInput.trim() && !selectedImage) return

                            const userDisplayMessage = localInput.trim() || (language === 'tr' ? 'Bu görseli analiz et' : 'Analyze this image')
                            const currentInput = localInput

                            // Clear input immediately to prevent duplicates
                            setLocalInput('')

                            // If there's an image, handle visual diagnosis flow
                            if (selectedImage) {
                                // Store image data BEFORE any state changes
                                const imageData = selectedImage
                                const imageMimeType = selectedImageMimeType

                                // Clear selected image immediately to prevent re-submission
                                setSelectedImage(null)
                                setSelectedImageName("")
                                setSelectedImageMimeType("")

                                // Mark as analyzing
                                setIsAnalyzingImage(true)

                                // Create user message with image for display FIRST
                                const userMsgId = 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)
                                const userMsgWithImage = {
                                    id: userMsgId,
                                    role: 'user',
                                    content: userDisplayMessage,
                                    image: imageData,
                                    imageMimeType: imageMimeType,
                                    createdAt: new Date()
                                }

                                // Cache the image for Firebase sync recovery (Persistent)
                                saveImageToCache(userMsgId, imageData, imageMimeType, userDisplayMessage)

                                // Add user message to UI immediately
                                setMessages((prev: any) => [...prev, userMsgWithImage])

                                try {
                                    // Get visual diagnosis
                                    let analysisResult = null
                                    try {
                                        const diagResponse = await fetch('/api/visual-diagnosis', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                image: imageData,
                                                mimeType: imageMimeType
                                            })
                                        })
                                        if (diagResponse.ok) {
                                            analysisResult = await diagResponse.json()
                                        }
                                    } catch (diagError) {
                                        console.error('Visual diagnosis error:', diagError)
                                    }

                                    // Prepare AI context (hidden from UI, sent as separate parameter)
                                    const visualAnalysisContext = analysisResult
                                        ? (language === 'tr'
                                            ? `[Bu bilgi sadece sana yardımcı olmak için verildi - kullanıcıya ham veri gösterme, doğal ve yardımcı bir şekilde açıkla]\nTeşhis: ${analysisResult.diagnosis}\nGüven Oranı: ${analysisResult.confidence}\nÖnerilen: ${analysisResult.treatment}`
                                            : `[This info is to help you - don't show raw data to user, explain naturally and helpfully]\nDiagnosis: ${analysisResult.diagnosis}\nConfidence: ${analysisResult.confidence}\nRecommended: ${analysisResult.treatment}`)
                                        : (language === 'tr'
                                            ? `Görsel analizi yapılamadı.`
                                            : `Image analysis failed.`)

                                    // Send to chat API - user message with original content, context as separate param
                                    const chatResponse = await fetch('/api/chat', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            messages: [...messages, { role: 'user', content: userDisplayMessage }],
                                            chatbotId,
                                            sessionId: sessionId || localStorage.getItem(`chat_session_id_${chatbotId}`),
                                            context: pageContext,
                                            language: settings.initialLanguage || 'auto',
                                            shouldStream: true,
                                            userId: guestAuth.currentUser?.uid,
                                            visualAnalysisContext: visualAnalysisContext // Pass analysis as separate context
                                        })
                                    })

                                    if (!chatResponse.ok) throw new Error('Chat API error')

                                    const reader = chatResponse.body?.getReader()
                                    const decoder = new TextDecoder()
                                    let assistantContent = ''
                                    const assistantMsgId = 'assistant-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)

                                    setMessages((prev: any) => [...prev, { id: assistantMsgId, role: 'assistant', content: '', createdAt: new Date() }])

                                    while (reader) {
                                        const { done, value } = await reader.read()
                                        if (done) break
                                        const chunk = decoder.decode(value, { stream: true })
                                        assistantContent += chunk
                                        setMessages((prev: any) => prev.map((m: any) => m.id === assistantMsgId ? { ...m, content: assistantContent } : m))
                                    }

                                    if (!assistantContent.trim()) {
                                        setMessages((prev: any) => prev.filter((m: any) => m.id !== assistantMsgId))
                                    }
                                } catch (error) {
                                    console.error('Image analysis chat error:', error)
                                } finally {
                                    setIsAnalyzingImage(false)
                                }
                            } else {
                                // Normal text message
                                sendMessage(currentInput)
                            }
                        }}
                        className="relative flex items-center gap-2"
                    >
                        {/* Image Upload Button for Classic Theme */}
                        {settings.enableVisualDiagnosis && (
                            <button
                                type="button"
                                onClick={() => imageInputRef.current?.click()}
                                disabled={isAnalyzingImage}
                                className={`p-3 rounded-full transition-all shadow-sm ${selectedImage
                                    ? 'text-green-600 bg-green-50 border border-green-200'
                                    : 'text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-600 border border-gray-200'} ${isAnalyzingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title={language === 'tr' ? 'Görsel Ekle' : 'Add Image'}
                            >
                                <ImageIcon className="w-4 h-4" />
                            </button>
                        )}

                        <div className="relative flex-1 group">
                            <input
                                value={localInput}
                                onChange={(e) => setLocalInput(e.target.value)}
                                type="text"
                                placeholder={selectedImage
                                    ? (language === 'tr' ? 'Görsel hakkında soru sorun...' : 'Ask about the image...')
                                    : t('messagePlaceholder')}
                                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-full pl-4 pr-10 py-3.5 focus:outline-none focus:ring-2 focus:ring-opacity-20 focus:bg-white transition-all shadow-sm group-hover:bg-white group-hover:shadow-md group-hover:border-gray-300"
                                style={{ '--tw-ring-color': settings.headerBackgroundColor || settings.brandColor } as any}
                            />
                            {/* Voice Input Button */}
                            {settings.enableVoiceAssistant && (
                                <button
                                    type="button"
                                    onClick={handleVoiceInput}
                                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all ${isListening ? 'text-red-500 bg-red-50 animate-pulse shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                                    title="Voice Input"
                                >
                                    <Mic className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={!localInput.trim() && !selectedImage}
                            className={`p-3.5 rounded-full text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md active:scale-95 shadow-sm transform hover:-translate-y-0.5 ${isAnalyzingImage ? 'animate-pulse' : ''}`}
                            style={{ backgroundColor: settings.headerBackgroundColor || settings.brandColor }}
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 mt-2">
                        <p className="text-[10px] text-gray-400 text-center">
                            {typeof window !== 'undefined' && window.navigator.language?.startsWith('tr')
                                ? 'Asistan hata yapabilir. Önemli bilgileri kontrol edin.'
                                : 'AI can make mistakes. Verify important info.'}
                        </p>
                        <span className="text-[10px] text-gray-300 hidden sm:block">•</span>
                        <a href="https://getvion.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                            <span className="text-[10px] text-gray-400">Powered by</span>
                            <Image src="/vion-logo-full-dark.png" alt="Vion" width={50} height={12} className="h-2.5 w-auto opacity-60" unoptimized />
                        </a>
                    </div>
                </div>
            </div>
        </>
    </div>
);
}

export default function ChatbotView() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen bg-white">Loading...</div>}>
            <ChatbotViewContent />
        </Suspense>
    )
}
