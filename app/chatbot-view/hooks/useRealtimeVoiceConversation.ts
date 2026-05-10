"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useConversation } from "@elevenlabs/react"
import type { ChatbotSettings } from "@/types/chatbot"
import type { VoiceStatus } from "./useVoiceInput"

type RealtimeSessionResponse = {
    provider: "elevenlabs"
    token: string
    agentId: string
    serverLocation: "global" | "eu-residency" | "us" | "in-residency"
}

function resolveErrorMessage(error: unknown, language: string) {
    const fallback = language === "tr"
        ? "Canli sesli gorusme baslatilamadi."
        : "Could not start the live voice session."

    if (error instanceof Error && error.message) {
        return error.message
    }

    return fallback
}

async function requestRealtimeSession(chatbotId: string, language: string): Promise<RealtimeSessionResponse> {
    const response = await fetch("/api/voice/realtime/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatbotId, language }),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
        throw new Error(payload?.details || payload?.error || `Realtime session failed: ${response.status}`)
    }

    if (payload?.provider !== "elevenlabs" || typeof payload?.token !== "string" || !payload.token) {
        throw new Error("Realtime session response is invalid")
    }

    return payload as RealtimeSessionResponse
}

export function useRealtimeVoiceConversation(
    chatbotId: string,
    language: string,
    settings: ChatbotSettings,
    setLocalInput: (val: string) => void
) {
    const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle")
    const [micMuted, setMicMuted] = useState(false)
    const [lastError, setLastError] = useState<string | null>(null)
    const isStartingRef = useRef(false)
    const isSessionRequestedRef = useRef(false)
    const everListenedRef = useRef(false)
    const connectTimeRef = useRef(0)

    const {
        status,
        isSpeaking,
        startSession,
        endSession,
        setMuted,
    } = useConversation({
        micMuted,
        serverLocation: settings.elevenLabsServerLocation || "global",
        onConnect: () => {
            console.log("[Voice] Realtime connected")
            setLastError(null)
            everListenedRef.current = true
            connectTimeRef.current = Date.now()
            setVoiceStatus("listening")
            setLocalInput(language === "tr" ? "Sizi dinliyorum..." : "Listening...")
        },
        onDisconnect: () => {
            const wasRequested = isSessionRequestedRef.current
            const hadListened = everListenedRef.current
            const timeSinceConnect = connectTimeRef.current > 0 ? Date.now() - connectTimeRef.current : 0

            console.log("[Voice] Realtime disconnected", { wasRequested, hadListened, timeSinceConnect })

            isSessionRequestedRef.current = false
            isStartingRef.current = false
            everListenedRef.current = false
            connectTimeRef.current = 0
            setVoiceStatus("idle")
            setLocalInput("")

            // If session disconnected too quickly after connect (< 3s) or never connected at all,
            // treat as failure so fallback to legacy mode can activate
            if (wasRequested && (!hadListened || timeSinceConnect < 3000)) {
                const msg = language === "tr"
                    ? "Canlı ses bağlantısı kesildi. Standart moda geçiliyor."
                    : "Live voice disconnected. Switching to standard mode."
                console.warn("[Voice] Realtime disconnected prematurely, triggering fallback")
                setLastError(msg)
            }
        },
        onError: (message) => {
            const errorText = typeof message === "string" && message ? message : resolveErrorMessage(message, language)
            console.error("[Voice] Realtime onError:", errorText)
            isStartingRef.current = false
            everListenedRef.current = false
            connectTimeRef.current = 0
            setLastError(errorText)
            setVoiceStatus("idle")
            setLocalInput(errorText)
        },
    })

    useEffect(() => {
        if (!isSessionRequestedRef.current) return

        if (status === "error") {
            console.error("[Voice] Realtime status changed to error")
            setVoiceStatus("idle")
            isStartingRef.current = false
            isSessionRequestedRef.current = false
            return
        }

        if (status === "connecting") {
            setVoiceStatus("processing")
            return
        }

        if (status === "connected") {
            setVoiceStatus(isSpeaking ? "speaking" : "listening")
        }
    }, [isSpeaking, status])

    const startVoiceSession = useCallback(async () => {
        if (isStartingRef.current || status === "connected" || status === "connecting") {
            return
        }

        isStartingRef.current = true
        isSessionRequestedRef.current = true
        everListenedRef.current = false
        connectTimeRef.current = 0
        setLastError(null)
        setMicMuted(false)
        setVoiceStatus("processing")
        setLocalInput(language === "tr" ? "Canli sesli gorusme baslatiliyor..." : "Starting live voice session...")

        try {
            if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                stream.getTracks().forEach((track) => track.stop())
            }

            const session = await requestRealtimeSession(chatbotId, language)
            console.log("[Voice] Realtime session token received, starting WebRTC...")
            startSession({
                conversationToken: session.token,
                connectionType: "webrtc",
                userId: chatbotId,
                serverLocation: session.serverLocation,
            })
        } catch (error) {
            const errorText = resolveErrorMessage(error, language)
            console.error("[Voice] Realtime startVoiceSession failed:", error)
            isStartingRef.current = false
            isSessionRequestedRef.current = false
            everListenedRef.current = false
            connectTimeRef.current = 0
            setLastError(errorText)
            setVoiceStatus("idle")
            setLocalInput(errorText)
        }
    }, [chatbotId, language, setLocalInput, startSession, status])

    const endVoiceSession = useCallback(() => {
        isStartingRef.current = false
        isSessionRequestedRef.current = false
        everListenedRef.current = false
        connectTimeRef.current = 0
        try {
            endSession()
        } catch (error) {
            console.warn("[Voice] Realtime endSession failed:", error)
        }
        setMicMuted(false)
        setVoiceStatus("idle")
        setLocalInput("")
    }, [endSession, setLocalInput])

    const toggleMute = useCallback(() => {
        const nextMuted = !micMuted
        setMicMuted(nextMuted)

        if (status === "connected") {
            try {
                setMuted(nextMuted)
            } catch (error) {
                console.error("[Voice] Realtime mute failed:", error)
            }
        }
    }, [micMuted, setMuted, status])

    useEffect(() => {
        return () => {
            endSession()
        }
    }, [endSession])

    return {
        isMuted: micMuted,
        voiceStatus,
        lastError,
        startVoiceSession,
        endVoiceSession,
        toggleMute,
    }
}

export default useRealtimeVoiceConversation
