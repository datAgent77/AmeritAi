import { useState, useRef, useEffect, useCallback } from "react"
import { ChatbotSettings } from "@/types/chatbot"

type VoiceStatus = 'idle' | 'listening' | 'processing' | 'speaking'

// VAD Configuration
const SILENCE_THRESHOLD_MULTIPLIER = 1.8  // How much above baseline counts as speech
const MIN_SILENCE_THRESHOLD = 15          // Minimum threshold for very quiet environments
const SILENCE_DURATION = 2000             // ms of silence before auto-stop
const MAX_RECORDING_DURATION = 30000      // Max recording duration (30s)
const CALIBRATION_DURATION = 500          // ms to calibrate ambient noise
const VAD_CHECK_INTERVAL = 100            // ms between VAD checks

export function useVoiceInput(
    chatbotId: string,
    language: string,
    settings: ChatbotSettings,
    setLocalInput: (val: string) => void,
    sendMessage: (text: string, speakResponse?: boolean) => Promise<string>
) {
    const [isListening, setIsListening] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState<string | null>(null)
    const [isVoiceMode, setIsVoiceMode] = useState(false)
    const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle')

    // Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const streamRef = useRef<MediaStream | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const vadTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const synthesisRef = useRef<SpeechSynthesis | null>(null)
    const currentAudioRef = useRef<HTMLAudioElement | null>(null)
    const hasSpeechStartedRef = useRef(false)
    const silenceStartRef = useRef<number>(0)
    const baselineNoiseRef = useRef<number>(0)
    const isStoppingRef = useRef(false)

    // Initialize Speech Synthesis
    useEffect(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            synthesisRef.current = window.speechSynthesis
        }
    }, [])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanupRecording()
        }
    }, [])

    const cleanupRecording = useCallback(() => {
        if (vadTimerRef.current) {
            clearInterval(vadTimerRef.current)
            vadTimerRef.current = null
        }
        if (maxTimerRef.current) {
            clearTimeout(maxTimerRef.current)
            maxTimerRef.current = null
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try { mediaRecorderRef.current.stop() } catch (_) {}
        }
        mediaRecorderRef.current = null
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop())
            streamRef.current = null
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            try { audioContextRef.current.close() } catch (_) {}
            audioContextRef.current = null
        }
        analyserRef.current = null
        audioChunksRef.current = []
        hasSpeechStartedRef.current = false
        silenceStartRef.current = 0
        isStoppingRef.current = false
    }, [])

    const processVoiceResponse = useCallback(async (transcribedText: string) => {
        try {
            console.log("[Voice] Transcribed:", transcribedText)
            setLocalInput(transcribedText)
            setVoiceStatus('processing')

            // Send to AI
            const responseText = await sendMessage(transcribedText, false)
            console.log("[Voice] AI Response:", responseText)

            if (!responseText) {
                setVoiceStatus('idle')
                setIsVoiceMode(false)
                setLocalInput("")
                return
            }

            // TTS via ElevenLabs
            setVoiceStatus('speaking')

            try {
                const response = await fetch('/api/voice/elevenlabs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: responseText,
                        voiceId: settings.elevenLabsVoiceId,
                        chatbotId
                    })
                })
                if (!response.ok) throw new Error("ElevenLabs TTS failed")
                const blob = await response.blob()
                const url = URL.createObjectURL(blob)
                const audio = new Audio(url)

                audio.onended = () => {
                    URL.revokeObjectURL(url)
                    setIsSpeaking(null)
                    setVoiceStatus('idle')
                    setIsVoiceMode(false)
                    setLocalInput("")
                    currentAudioRef.current = null
                }
                audio.onerror = () => {
                    console.error("[Voice] TTS playback error, falling back to browser TTS")
                    fallbackBrowserTTS(responseText)
                }

                currentAudioRef.current = audio
                setIsSpeaking('tts')
                await audio.play()
            } catch (ttsError) {
                console.error("[Voice] ElevenLabs TTS error, falling back to browser TTS:", ttsError)
                fallbackBrowserTTS(responseText)
            }
        } catch (error) {
            console.error("[Voice] Pipeline error:", error)
            setLocalInput("")
            setVoiceStatus('idle')
            setIsVoiceMode(false)
        }
    }, [sendMessage, settings, chatbotId, setLocalInput])

    const fallbackBrowserTTS = (text: string) => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = language === "tr" ? "tr-TR" : "en-US"
            setIsSpeaking('browser-tts')
            utterance.onend = () => {
                setIsSpeaking(null)
                setVoiceStatus('idle')
                setIsVoiceMode(false)
                setLocalInput("")
            }
            utterance.onerror = () => {
                setIsSpeaking(null)
                setVoiceStatus('idle')
                setIsVoiceMode(false)
                setLocalInput("")
            }
            window.speechSynthesis.cancel()
            window.speechSynthesis.speak(utterance)
        } else {
            setIsSpeaking(null)
            setVoiceStatus('idle')
            setIsVoiceMode(false)
            setLocalInput("")
        }
    }

    /**
     * Transcribe audio blob using OpenAI Whisper via our API
     */
    const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string> => {
        const formData = new FormData()
        // Determine file extension from MIME type
        const mimeType = audioBlob.type || 'audio/webm'
        let ext = 'webm'
        if (mimeType.includes('mp4')) ext = 'mp4'
        else if (mimeType.includes('ogg')) ext = 'ogg'
        else if (mimeType.includes('wav')) ext = 'wav'

        formData.append('audio', audioBlob, `recording.${ext}`)
        formData.append('language', language)

        const response = await fetch('/api/voice/transcribe', {
            method: 'POST',
            body: formData
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `Transcription failed: ${response.status}`)
        }

        const data = await response.json()
        return data.text || ''
    }, [language])

    /**
     * Get the current audio volume level from the analyser
     */
    const getAudioLevel = (): number => {
        if (!analyserRef.current) return 0
        const dataArray = new Uint8Array(analyserRef.current.fftSize)
        analyserRef.current.getByteTimeDomainData(dataArray)

        // Calculate RMS (root mean square) for more accurate volume
        let sumSquares = 0
        for (let i = 0; i < dataArray.length; i++) {
            const normalized = (dataArray[i] - 128) / 128
            sumSquares += normalized * normalized
        }
        return Math.sqrt(sumSquares / dataArray.length) * 100
    }

    /**
     * Start recording with VAD (Voice Activity Detection)
     */
    const startRecording = useCallback(async () => {
        try {
            console.log("[Voice] Requesting microphone access...")

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000
                }
            })

            console.log("[Voice] Microphone access granted")
            streamRef.current = stream

            // Set up AudioContext + Analyser for VAD
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
            audioContextRef.current = audioContext

            const source = audioContext.createMediaStreamSource(stream)
            const analyser = audioContext.createAnalyser()
            analyser.fftSize = 2048
            analyser.smoothingTimeConstant = 0.3
            source.connect(analyser)
            analyserRef.current = analyser

            // Determine supported MIME type
            let mimeType = 'audio/webm;codecs=opus'
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/webm'
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = 'audio/mp4'
                    if (!MediaRecorder.isTypeSupported(mimeType)) {
                        mimeType = '' // Let browser choose
                    }
                }
            }

            // Create MediaRecorder
            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
            mediaRecorderRef.current = recorder
            audioChunksRef.current = []

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data)
                }
            }

            recorder.onstop = async () => {
                console.log("[Voice] MediaRecorder stopped, chunks:", audioChunksRef.current.length)

                const chunks = [...audioChunksRef.current]
                const actualMimeType = recorder.mimeType || 'audio/webm'

                // Cleanup recording resources
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(t => t.stop())
                    streamRef.current = null
                }
                if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                    try { audioContextRef.current.close() } catch (_) {}
                    audioContextRef.current = null
                }
                analyserRef.current = null

                if (chunks.length === 0) {
                    console.log("[Voice] No audio data recorded")
                    setLocalInput("")
                    setVoiceStatus('idle')
                    setIsVoiceMode(false)
                    return
                }

                const audioBlob = new Blob(chunks, { type: actualMimeType })
                console.log("[Voice] Audio blob size:", audioBlob.size, "type:", actualMimeType)

                // Minimum blob size check (very short/empty recordings)
                if (audioBlob.size < 1000) {
                    console.log("[Voice] Audio too short, ignoring")
                    setLocalInput("")
                    setVoiceStatus('idle')
                    setIsVoiceMode(false)
                    return
                }

                // Transcribe using Whisper
                setVoiceStatus('processing')
                setLocalInput(language === 'tr' ? "Metin yazıya dönüştürülüyor..." : "Transcribing...")

                try {
                    const text = await transcribeAudio(audioBlob)
                    console.log("[Voice] Whisper result:", text)

                    if (text.trim()) {
                        processVoiceResponse(text.trim())
                    } else {
                        console.log("[Voice] Empty transcription")
                        setLocalInput("")
                        setVoiceStatus('idle')
                        setIsVoiceMode(false)
                    }
                } catch (error) {
                    console.error("[Voice] Transcription error:", error)
                    setLocalInput(language === 'tr'
                        ? "Ses tanıma hatası oluştu."
                        : "Speech recognition error.")
                    setTimeout(() => {
                        setLocalInput("")
                        setVoiceStatus('idle')
                        setIsVoiceMode(false)
                    }, 2000)
                }
            }

            // Start recording
            recorder.start(250) // Collect data every 250ms
            setIsListening(true)
            setVoiceStatus('listening')
            console.log("[Voice] Recording started")

            // Calibration phase: measure ambient noise for 500ms
            hasSpeechStartedRef.current = false
            silenceStartRef.current = 0
            isStoppingRef.current = false

            const calibrationSamples: number[] = []
            const calibrationEnd = Date.now() + CALIBRATION_DURATION

            // Start VAD check interval
            vadTimerRef.current = setInterval(() => {
                if (isStoppingRef.current) return

                const level = getAudioLevel()
                const now = Date.now()

                // Calibration phase
                if (now < calibrationEnd) {
                    calibrationSamples.push(level)
                    return
                }

                // Calculate baseline after calibration
                if (calibrationSamples.length > 0 && baselineNoiseRef.current === 0) {
                    const avgNoise = calibrationSamples.reduce((a, b) => a + b, 0) / calibrationSamples.length
                    baselineNoiseRef.current = Math.max(avgNoise * SILENCE_THRESHOLD_MULTIPLIER, MIN_SILENCE_THRESHOLD)
                    console.log("[Voice] Baseline noise:", avgNoise.toFixed(2), "Threshold:", baselineNoiseRef.current.toFixed(2))
                }

                const threshold = baselineNoiseRef.current || MIN_SILENCE_THRESHOLD

                if (level > threshold) {
                    // Speech detected
                    if (!hasSpeechStartedRef.current) {
                        hasSpeechStartedRef.current = true
                        console.log("[Voice] Speech detected! Level:", level.toFixed(2))
                        setLocalInput(language === 'tr' ? "Sizi dinliyorum..." : "Listening...")
                    }
                    silenceStartRef.current = 0
                } else if (hasSpeechStartedRef.current) {
                    // Silence after speech
                    if (silenceStartRef.current === 0) {
                        silenceStartRef.current = now
                    } else if (now - silenceStartRef.current > SILENCE_DURATION) {
                        // Enough silence after speech - auto stop
                        console.log("[Voice] Silence detected after speech, auto-stopping")
                        stopRecording()
                    }
                }
            }, VAD_CHECK_INTERVAL)

            // Max recording duration safety
            maxTimerRef.current = setTimeout(() => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                    console.log("[Voice] Max recording duration reached")
                    stopRecording()
                }
            }, MAX_RECORDING_DURATION)

        } catch (error: any) {
            console.error("[Voice] Microphone error:", error)
            setLocalInput(language === 'tr'
                ? "Mikrofon erişimi sağlanamadı."
                : "Could not access microphone.")
            setTimeout(() => {
                setLocalInput("")
                setVoiceStatus('idle')
                setIsVoiceMode(false)
            }, 2500)
        }
    }, [language, processVoiceResponse, transcribeAudio, setLocalInput])

    const stopRecording = useCallback(() => {
        if (isStoppingRef.current) return
        isStoppingRef.current = true

        console.log("[Voice] Stopping recording...")
        setIsListening(false)

        // Clear timers
        if (vadTimerRef.current) {
            clearInterval(vadTimerRef.current)
            vadTimerRef.current = null
        }
        if (maxTimerRef.current) {
            clearTimeout(maxTimerRef.current)
            maxTimerRef.current = null
        }

        // Stop MediaRecorder (triggers onstop which handles transcription)
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop()
        } else {
            // No active recording
            setLocalInput("")
            setVoiceStatus('idle')
            setIsVoiceMode(false)
        }

        // Reset VAD state
        hasSpeechStartedRef.current = false
        silenceStartRef.current = 0
        baselineNoiseRef.current = 0
    }, [setLocalInput])

    const handleVoiceInput = useCallback(() => {
        if (isListening) {
            // Manual stop - triggers onstop which processes the text
            stopRecording()
        } else if (!isVoiceMode) {
            setIsVoiceMode(true)
            setLocalInput("")
            startRecording()
        }
    }, [isListening, isVoiceMode, startRecording, stopRecording, setLocalInput])

    const cancelVoiceMode = useCallback(() => {
        // Clean up everything
        cleanupRecording()

        // Stop audio playback
        if (currentAudioRef.current) {
            currentAudioRef.current.pause()
            currentAudioRef.current = null
        }
        // Stop browser TTS
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel()
        }
        setIsListening(false)
        setIsSpeaking(null)
        setVoiceStatus('idle')
        setIsVoiceMode(false)
        setLocalInput("")
    }, [setLocalInput, cleanupRecording])

    // Standalone speakText (for message read-aloud) - ElevenLabs only
    const speakText = async (text: string, messageId: string | null = null) => {
        if (!text) return
        setIsSpeaking(messageId || 'auto')
        try {
            const response = await fetch('/api/voice/elevenlabs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, chatbotId, voiceId: settings.elevenLabsVoiceId })
            })
            if (!response.ok) throw new Error('ElevenLabs TTS failed')
            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const audio = new Audio(url)
            audio.onended = () => { setIsSpeaking(null); URL.revokeObjectURL(url) }
            audio.onerror = () => setIsSpeaking(null)
            await audio.play()
        } catch (error) {
            console.error('TTS Error:', error)
            setIsSpeaking(null)
            // Fallback to browser TTS
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                const utterance = new SpeechSynthesisUtterance(text)
                utterance.lang = language === "tr" ? "tr-TR" : "en-US"
                utterance.onend = () => setIsSpeaking(null)
                window.speechSynthesis.cancel()
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

    return {
        isListening,
        isSpeaking,
        isVoiceMode,
        voiceStatus,
        setIsVoiceMode,
        handleVoiceInput,
        cancelVoiceMode,
        speakText,
        handleSpeak
    }
}
