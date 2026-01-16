import { useState, useRef, useEffect } from "react"
import { KlassifierService } from "@/lib/klassifier-service"
import { ChatbotSettings } from "@/types/chatbot"

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
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
    
    // Refs
    const isListeningRef = useRef(false)
    const recognitionRef = useRef<any>(null)
    const synthesisRef = useRef<SpeechSynthesis | null>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const audioContextRef = useRef<AudioContext | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const streamRef = useRef<MediaStream | null>(null)

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
            setLocalInput("Ses işleniyor...") 
            const transcribedText = await KlassifierService.transcribeAudio(audioBlob)

            if (!transcribedText || !transcribedText.trim()) {
                setLocalInput("")
                setIsVoiceMode(false)
                return
            }

            setLocalInput(transcribedText)

            // 2. LLM: Send to existing AI function
            // We intercept response to handle TTS manually
            const responseText = await sendMessage(transcribedText, false)

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

                // Sync visual "speaking" state
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
            setLocalInput("") 
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

    const handleVoiceInput = async () => {
        if (isListening) {
            stopRecording()
        } else {
            startRecording()
        }
    }

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
                        voiceId: settings.elevenLabsVoiceId 
                    })
                })

                if (!response.ok) throw new Error('ElevenLabs TTS failed')

                const blob = await response.blob()
                const url = URL.createObjectURL(blob)
                const audio = new Audio(url)

                audio.onended = () => {
                    setIsSpeaking(null)
                    URL.revokeObjectURL(url) 
                }
                audio.onerror = () => setIsSpeaking(null)

                await audio.play()
            }
            // PROVIDER 2: KLASSIFIER (Default)
            else {
                // Determine voice_id based on language
                const voiceId = language === 'tr' ? 'derya' : 'rachel'

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
                    const baseUrl = "https://api.klassifier.com"; 
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
        setIsVoiceMode,
        handleVoiceInput,
        speakText,
        handleSpeak
    }
}
