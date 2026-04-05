import { useState, useRef, useEffect, useCallback } from "react"
import { ChatbotSettings } from "@/types/chatbot"

export type VoiceStatus = "idle" | "listening" | "processing" | "speaking"

const SILENCE_THRESHOLD_MULTIPLIER = 1.8
const MIN_SILENCE_THRESHOLD = 15
const SILENCE_DURATION = 2000
const MAX_RECORDING_DURATION = 30000
const CALIBRATION_DURATION = 500
const VAD_CHECK_INTERVAL = 100

type PlaySpeechOptions = {
    speakingKey: string
    resumeSessionAfterPlayback: boolean
    clearLocalInput: boolean
}

export function useVoiceInput(
    chatbotId: string,
    language: string,
    settings: ChatbotSettings,
    setLocalInput: (val: string) => void,
    sendMessage: (text: string, speakResponse?: boolean) => Promise<string>
) {
    const [isListening, setIsListening] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState<string | null>(null)
    const [isVoiceSessionActive, setIsVoiceSessionActive] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle")

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const streamRef = useRef<MediaStream | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const vadTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const resumeListeningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const synthesisRef = useRef<SpeechSynthesis | null>(null)
    const currentAudioRef = useRef<HTMLAudioElement | null>(null)
    const hasSpeechStartedRef = useRef(false)
    const silenceStartRef = useRef<number>(0)
    const baselineNoiseRef = useRef<number>(0)
    const isStoppingRef = useRef(false)
    const discardRecordingRef = useRef(false)
    const isListeningRef = useRef(false)
    const isSpeakingRef = useRef<string | null>(null)
    const isVoiceSessionActiveRef = useRef(false)
    const isMutedRef = useRef(false)

    useEffect(() => {
        if (typeof window !== "undefined" && window.speechSynthesis) {
            synthesisRef.current = window.speechSynthesis
        }
    }, [])

    useEffect(() => {
        isListeningRef.current = isListening
    }, [isListening])

    useEffect(() => {
        isSpeakingRef.current = isSpeaking
    }, [isSpeaking])

    useEffect(() => {
        isVoiceSessionActiveRef.current = isVoiceSessionActive
    }, [isVoiceSessionActive])

    useEffect(() => {
        isMutedRef.current = isMuted
    }, [isMuted])

    const clearRecordingTimers = useCallback(() => {
        if (vadTimerRef.current) {
            clearInterval(vadTimerRef.current)
            vadTimerRef.current = null
        }

        if (maxTimerRef.current) {
            clearTimeout(maxTimerRef.current)
            maxTimerRef.current = null
        }
    }, [])

    const clearResumeListeningTimer = useCallback(() => {
        if (resumeListeningTimerRef.current) {
            clearTimeout(resumeListeningTimerRef.current)
            resumeListeningTimerRef.current = null
        }
    }, [])

    const teardownInputResources = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop())
            streamRef.current = null
        }

        if (audioContextRef.current && audioContextRef.current.state !== "closed") {
            void audioContextRef.current.close().catch(() => undefined)
        }

        audioContextRef.current = null
        analyserRef.current = null
        mediaRecorderRef.current = null
        audioChunksRef.current = []
        hasSpeechStartedRef.current = false
        silenceStartRef.current = 0
        baselineNoiseRef.current = 0
        isStoppingRef.current = false
    }, [])

    const finishSpeaking = useCallback((options: Omit<PlaySpeechOptions, "speakingKey">) => {
        setIsSpeaking(null)
        setVoiceStatus("idle")
        currentAudioRef.current = null

        if (options.clearLocalInput) {
            setLocalInput("")
        }
    }, [setLocalInput])

    const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string> => {
        const formData = new FormData()
        const mimeType = audioBlob.type || "audio/webm"
        let ext = "webm"

        if (mimeType.includes("mp4")) ext = "mp4"
        else if (mimeType.includes("ogg")) ext = "ogg"
        else if (mimeType.includes("wav")) ext = "wav"

        formData.append("audio", audioBlob, `recording.${ext}`)
        formData.append("language", language)

        const response = await fetch("/api/voice/transcribe", {
            method: "POST",
            body: formData,
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `Transcription failed: ${response.status}`)
        }

        const data = await response.json()
        return data.text || ""
    }, [language])

    const getAudioLevel = useCallback((): number => {
        if (!analyserRef.current) return 0

        const dataArray = new Uint8Array(analyserRef.current.fftSize)
        analyserRef.current.getByteTimeDomainData(dataArray)

        let sumSquares = 0
        for (let i = 0; i < dataArray.length; i += 1) {
            const normalized = (dataArray[i] - 128) / 128
            sumSquares += normalized * normalized
        }

        return Math.sqrt(sumSquares / dataArray.length) * 100
    }, [])

    const startRecording = useCallback(async () => {
        if (!isVoiceSessionActiveRef.current || isMutedRef.current || isListeningRef.current || isSpeakingRef.current) {
            return
        }

        clearResumeListeningTimer()

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000,
                },
            })

            streamRef.current = stream
            setLocalInput("")

            const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)()
            audioContextRef.current = audioContext

            const source = audioContext.createMediaStreamSource(stream)
            const analyser = audioContext.createAnalyser()
            analyser.fftSize = 2048
            analyser.smoothingTimeConstant = 0.3
            source.connect(analyser)
            analyserRef.current = analyser

            let mimeType = "audio/webm;codecs=opus"
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = "audio/webm"
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = "audio/mp4"
                    if (!MediaRecorder.isTypeSupported(mimeType)) {
                        mimeType = ""
                    }
                }
            }

            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
            mediaRecorderRef.current = recorder
            audioChunksRef.current = []
            discardRecordingRef.current = false

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data)
                }
            }

            recorder.onstop = async () => {
                const shouldDiscard = discardRecordingRef.current
                discardRecordingRef.current = false

                const chunks = [...audioChunksRef.current]
                const actualMimeType = recorder.mimeType || "audio/webm"

                teardownInputResources()
                setIsListening(false)

                if (shouldDiscard) {
                    if (!isSpeakingRef.current) {
                        setVoiceStatus("idle")
                    }
                    setLocalInput("")
                    return
                }

                if (chunks.length === 0) {
                    setVoiceStatus("idle")
                    setLocalInput("")
                    return
                }

                const audioBlob = new Blob(chunks, { type: actualMimeType })
                if (audioBlob.size < 1000) {
                    setVoiceStatus("idle")
                    setLocalInput("")
                    return
                }

                setVoiceStatus("processing")
                setLocalInput(language === "tr" ? "Metin yazıya dönüştürülüyor..." : "Transcribing...")

                try {
                    const text = await transcribeAudio(audioBlob)

                    if (!text.trim()) {
                        setVoiceStatus("idle")
                        setLocalInput("")
                        return
                    }

                    setLocalInput(text.trim())
                    setVoiceStatus("processing")

                    const responseText = await sendMessage(text.trim(), false)
                    if (!responseText) {
                        setVoiceStatus("idle")
                        setLocalInput("")
                        return
                    }

                    const playSpeech = async (speechText: string, options: PlaySpeechOptions) => {
                        const scheduleResumeAfterPlayback = () => {
                            finishSpeaking(options)

                            if (options.resumeSessionAfterPlayback && isVoiceSessionActiveRef.current && !isMutedRef.current) {
                                resumeListeningTimerRef.current = setTimeout(() => {
                                    if (isVoiceSessionActiveRef.current && !isMutedRef.current && !isListeningRef.current && !isSpeakingRef.current) {
                                        void startRecording()
                                    }
                                }, 300)
                            }
                        }

                        const fallbackToBrowserTTS = () => {
                            if (typeof window === "undefined" || !window.speechSynthesis) {
                                scheduleResumeAfterPlayback()
                                return
                            }

                            const utterance = new SpeechSynthesisUtterance(speechText)
                            utterance.lang = language === "tr" ? "tr-TR" : "en-US"
                            utterance.onend = scheduleResumeAfterPlayback
                            utterance.onerror = scheduleResumeAfterPlayback
                            window.speechSynthesis.cancel()
                            window.speechSynthesis.speak(utterance)
                        }

                        setIsSpeaking(options.speakingKey)
                        setVoiceStatus("speaking")

                        try {
                            const response = await fetch("/api/voice/elevenlabs", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    text: speechText,
                                    voiceId: settings.elevenLabsVoiceId,
                                    chatbotId,
                                }),
                            })

                            if (!response.ok) {
                                throw new Error("ElevenLabs TTS failed")
                            }

                            const blob = await response.blob()
                            const url = URL.createObjectURL(blob)
                            const audio = new Audio(url)

                            currentAudioRef.current = audio

                            audio.onended = () => {
                                URL.revokeObjectURL(url)
                                scheduleResumeAfterPlayback()
                            }

                            audio.onerror = () => {
                                URL.revokeObjectURL(url)
                                currentAudioRef.current = null
                                fallbackToBrowserTTS()
                            }

                            await audio.play()
                        } catch (error) {
                            console.error("[Voice] ElevenLabs TTS error, falling back to browser TTS:", error)
                            currentAudioRef.current = null
                            fallbackToBrowserTTS()
                        }
                    }

                    await playSpeech(responseText, {
                        speakingKey: "voice-session",
                        resumeSessionAfterPlayback: true,
                        clearLocalInput: true,
                    })
                } catch (error) {
                    console.error("[Voice] Voice turn error:", error)
                    setVoiceStatus("idle")
                    setLocalInput(language === "tr" ? "Sesli görüşme sırasında bir hata oluştu." : "Voice session error.")
                }
            }

            recorder.start(250)
            setIsListening(true)
            setVoiceStatus("listening")

            hasSpeechStartedRef.current = false
            silenceStartRef.current = 0
            isStoppingRef.current = false

            const calibrationSamples: number[] = []
            const calibrationEnd = Date.now() + CALIBRATION_DURATION

            vadTimerRef.current = setInterval(() => {
                if (isStoppingRef.current) return

                const level = getAudioLevel()
                const now = Date.now()

                if (now < calibrationEnd) {
                    calibrationSamples.push(level)
                    return
                }

                if (calibrationSamples.length > 0 && baselineNoiseRef.current === 0) {
                    const avgNoise = calibrationSamples.reduce((sum, current) => sum + current, 0) / calibrationSamples.length
                    baselineNoiseRef.current = Math.max(avgNoise * SILENCE_THRESHOLD_MULTIPLIER, MIN_SILENCE_THRESHOLD)
                }

                const threshold = baselineNoiseRef.current || MIN_SILENCE_THRESHOLD

                if (level > threshold) {
                    if (!hasSpeechStartedRef.current) {
                        hasSpeechStartedRef.current = true
                        setLocalInput(language === "tr" ? "Sizi dinliyorum..." : "Listening...")
                    }
                    silenceStartRef.current = 0
                } else if (hasSpeechStartedRef.current) {
                    if (silenceStartRef.current === 0) {
                        silenceStartRef.current = now
                    } else if (now - silenceStartRef.current > SILENCE_DURATION) {
                        clearRecordingTimers()
                        isStoppingRef.current = true
                        recorder.stop()
                    }
                }
            }, VAD_CHECK_INTERVAL)

            maxTimerRef.current = setTimeout(() => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                    clearRecordingTimers()
                    isStoppingRef.current = true
                    mediaRecorderRef.current.stop()
                }
            }, MAX_RECORDING_DURATION)
        } catch (error) {
            console.error("[Voice] Microphone error:", error)
            setIsVoiceSessionActive(false)
            setVoiceStatus("idle")
            setLocalInput(language === "tr" ? "Mikrofon erişimi sağlanamadı." : "Could not access microphone.")
        }
    }, [chatbotId, clearRecordingTimers, clearResumeListeningTimer, finishSpeaking, getAudioLevel, language, sendMessage, setLocalInput, settings.elevenLabsVoiceId, teardownInputResources, transcribeAudio])

    const discardCurrentRecording = useCallback(() => {
        clearRecordingTimers()

        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            discardRecordingRef.current = true
            isStoppingRef.current = true
            mediaRecorderRef.current.stop()
        } else {
            teardownInputResources()
        }

        setIsListening(false)
    }, [clearRecordingTimers, teardownInputResources])

    const endVoiceSession = useCallback(() => {
        clearResumeListeningTimer()
        clearRecordingTimers()

        if (currentAudioRef.current) {
            currentAudioRef.current.pause()
            currentAudioRef.current = null
        }

        if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.cancel()
        }

        discardCurrentRecording()
        setIsVoiceSessionActive(false)
        setIsMuted(false)
        setIsSpeaking(null)
        setVoiceStatus("idle")
        setLocalInput("")
    }, [clearRecordingTimers, clearResumeListeningTimer, discardCurrentRecording, setLocalInput])

    const startVoiceSession = useCallback(() => {
        clearResumeListeningTimer()
        setIsVoiceSessionActive(true)
        setIsMuted(false)
        setVoiceStatus("idle")
        setLocalInput("")

        resumeListeningTimerRef.current = setTimeout(() => {
            void startRecording()
        }, 60)
    }, [clearResumeListeningTimer, setLocalInput, startRecording])

    const toggleMute = useCallback(() => {
        if (!isVoiceSessionActiveRef.current) return

        const nextMuted = !isMutedRef.current
        setIsMuted(nextMuted)

        if (nextMuted) {
            discardCurrentRecording()
            setVoiceStatus(isSpeakingRef.current ? "speaking" : "idle")
            setLocalInput("")
            return
        }

        setVoiceStatus(isSpeakingRef.current ? "speaking" : "idle")
        setLocalInput("")

        if (!isSpeakingRef.current) {
            resumeListeningTimerRef.current = setTimeout(() => {
                void startRecording()
            }, 120)
        }
    }, [discardCurrentRecording, setLocalInput, startRecording])

    useEffect(() => {
        return () => {
            endVoiceSession()
        }
    }, [endVoiceSession])

    const speakText = useCallback(async (text: string, messageId: string | null = null) => {
        if (!text) return

        const scheduleFinish = () => {
            setIsSpeaking(null)
            currentAudioRef.current = null
        }

        const fallbackToBrowserTTS = () => {
            if (typeof window === "undefined" || !window.speechSynthesis) {
                scheduleFinish()
                return
            }

            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = language === "tr" ? "tr-TR" : "en-US"
            utterance.onend = scheduleFinish
            utterance.onerror = scheduleFinish
            window.speechSynthesis.cancel()
            window.speechSynthesis.speak(utterance)
        }

        setIsSpeaking(messageId || "auto")

        try {
            const response = await fetch("/api/voice/elevenlabs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text,
                    chatbotId,
                    voiceId: settings.elevenLabsVoiceId,
                }),
            })

            if (!response.ok) {
                throw new Error("ElevenLabs TTS failed")
            }

            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const audio = new Audio(url)

            currentAudioRef.current = audio

            audio.onended = () => {
                URL.revokeObjectURL(url)
                scheduleFinish()
            }

            audio.onerror = () => {
                URL.revokeObjectURL(url)
                currentAudioRef.current = null
                fallbackToBrowserTTS()
            }

            await audio.play()
        } catch (error) {
            console.error("TTS Error:", error)
            currentAudioRef.current = null
            fallbackToBrowserTTS()
        }
    }, [chatbotId, language, settings.elevenLabsVoiceId])

    const handleSpeak = useCallback((text: string, messageId: string) => {
        if (isSpeaking === messageId) {
            if (currentAudioRef.current) {
                currentAudioRef.current.pause()
                currentAudioRef.current = null
            }

            if (typeof window !== "undefined" && window.speechSynthesis) {
                window.speechSynthesis.cancel()
            }

            setIsSpeaking(null)
            return
        }

        void speakText(text, messageId)
    }, [isSpeaking, speakText])

    return {
        isListening,
        isSpeaking,
        isVoiceSessionActive,
        isMuted,
        voiceStatus,
        startVoiceSession,
        endVoiceSession,
        toggleMute,
        speakText,
        handleSpeak,
    }
}
