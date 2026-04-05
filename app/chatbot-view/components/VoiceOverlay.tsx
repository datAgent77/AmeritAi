import { Mic, MicOff, Loader2, Volume2, PhoneOff } from "lucide-react"
import { ChatbotSettings } from "@/types/chatbot"
import { ConversationModeSwitch } from "./ConversationModeSwitch"
import type { VoiceStatus } from "../hooks/useVoiceInput"

interface VoiceOverlayProps {
    isOpen: boolean
    voiceStatus: VoiceStatus
    localInput: string
    isMuted: boolean
    settings: ChatbotSettings
    language: string
    onConversationModeChange: (mode: "text" | "voice") => void
    onToggleMute: () => void
    onEndCall: () => void
    t: (key: string) => string
}

export function VoiceOverlay({
    isOpen,
    voiceStatus,
    localInput,
    isMuted,
    settings,
    language,
    onConversationModeChange,
    onToggleMute,
    onEndCall,
    t,
}: VoiceOverlayProps) {
    if (!isOpen) return null

    const accentColor = settings.headerBackgroundColor || settings.brandColor || "#111827"
    const textLabel = language === "tr" ? "Yazi" : "Text"
    const voiceLabel = language === "tr" ? "Ses" : "Voice"
    const muteLabel = isMuted
        ? (language === "tr" ? "Mikrofonu Ac" : "Unmute")
        : "Mute"
    const endCallLabel = language === "tr" ? "Cagriyi Bitir" : "End Call"

    const statusTitle = (() => {
        if (isMuted) return language === "tr" ? "Mikrofon susturuldu" : "Microphone muted"
        if (voiceStatus === "listening") return t("listening")
        if (voiceStatus === "processing") return t("processing")
        if (voiceStatus === "speaking") return t("answering")
        return t("voiceReady")
    })()

    const statusDescription = (() => {
        if (isMuted) {
            return language === "tr"
                ? "Mikrofon kapali. Devam etmek icin sesi acin."
                : "Microphone is muted. Unmute to continue the call."
        }
        if (voiceStatus === "listening") return t("askQuestion")
        if (voiceStatus === "processing") return t("processingDesc")
        if (voiceStatus === "speaking") return t("speakingAnswer")
        return language === "tr" ? "Tarayiciniz uzerinden canli sesli gorusme hazir." : "Your browser voice call is ready."
    })()

    const shouldShowTranscript = localInput
        && !localInput.startsWith("Metin yaziya")
        && !localInput.startsWith("Transcribing")
        && !localInput.startsWith("Sizi dinliyorum")
        && !localInput.startsWith("Listening")
        && !localInput.startsWith("Mikrofon")
        && !localInput.startsWith("Could not access")

    return (
        <div className="absolute inset-0 z-[120] overflow-hidden bg-white dark:bg-zinc-950">
            <div
                className="absolute inset-0 opacity-90"
                style={{
                    background: `radial-gradient(circle at top, ${accentColor}22 0%, transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 48%, rgba(241,245,249,1) 100%)`,
                }}
            />
            <div className="absolute inset-0 dark:block hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06)_0%,_transparent_40%),linear-gradient(180deg,_rgba(9,9,11,0.98)_0%,_rgba(9,9,11,1)_100%)]" />

            <div className="relative flex h-full flex-col px-5 pb-6 pt-5">
                <div className="flex justify-center">
                    <ConversationModeSwitch
                        value="voice"
                        onChange={onConversationModeChange}
                        textLabel={textLabel}
                        voiceLabel={voiceLabel}
                    />
                </div>

                <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-gray-400 dark:text-zinc-500">
                        {settings.companyName}
                    </div>

                    <div className="relative mb-8 flex h-56 w-56 items-center justify-center">
                        {(voiceStatus === "listening" || voiceStatus === "speaking") && !isMuted && (
                            <>
                                <div
                                    className="absolute inset-0 rounded-full opacity-25 blur-sm"
                                    style={{ backgroundColor: accentColor }}
                                />
                                <div
                                    className={`absolute inset-4 rounded-full border ${voiceStatus === "listening" ? "animate-ping" : "animate-pulse"}`}
                                    style={{ borderColor: `${accentColor}55` }}
                                />
                            </>
                        )}

                        <div
                            className="relative flex h-44 w-44 items-center justify-center rounded-full border shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
                            style={{
                                background: `radial-gradient(circle at 30% 30%, ${accentColor} 0%, ${accentColor}CC 42%, ${accentColor}88 100%)`,
                                borderColor: `${accentColor}44`,
                            }}
                        >
                            <div className="absolute inset-[18px] rounded-full border border-white/20" />
                            {isMuted ? (
                                <MicOff className="h-14 w-14 text-white" />
                            ) : voiceStatus === "processing" ? (
                                <Loader2 className="h-14 w-14 animate-spin text-white" />
                            ) : voiceStatus === "speaking" ? (
                                <Volume2 className="h-14 w-14 text-white" />
                            ) : (
                                <Mic className="h-14 w-14 text-white" />
                            )}
                        </div>
                    </div>

                    <h3 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-zinc-50">
                        {statusTitle}
                    </h3>
                    <p className="max-w-sm text-sm leading-6 text-gray-500 dark:text-zinc-400">
                        {statusDescription}
                    </p>

                    {shouldShowTranscript && (
                        <div className="mt-6 w-full max-w-md rounded-3xl border border-gray-200/80 bg-white/85 px-5 py-4 text-sm text-gray-600 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/85 dark:text-zinc-300">
                            &quot;{localInput}&quot;
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={onToggleMute}
                        className={`inline-flex h-12 items-center gap-2 rounded-full border px-5 text-sm font-medium transition-all ${
                            isMuted
                                ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/70 dark:bg-amber-950/50 dark:text-amber-300"
                                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        }`}
                    >
                        {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        <span>{muteLabel}</span>
                    </button>

                    <button
                        type="button"
                        onClick={onEndCall}
                        className="inline-flex h-12 items-center gap-2 rounded-full bg-red-500 px-5 text-sm font-medium text-white shadow-sm transition-all hover:bg-red-600"
                    >
                        <PhoneOff className="h-4 w-4" />
                        <span>{endCallLabel}</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
