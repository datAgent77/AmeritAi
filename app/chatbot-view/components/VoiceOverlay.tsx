import { Mic, Loader2, Volume2, X } from "lucide-react"

type VoiceStatus = 'idle' | 'listening' | 'processing' | 'speaking'

interface VoiceOverlayProps {
    isVoiceMode: boolean
    voiceStatus: VoiceStatus
    localInput: string
    cancelVoiceMode: () => void
    t: (key: string) => string
}

export function VoiceOverlay({
    isVoiceMode,
    voiceStatus,
    localInput,
    cancelVoiceMode,
    t
}: VoiceOverlayProps) {
    if (!isVoiceMode) return null

    return (
        <div 
            className="absolute inset-x-0 bottom-0 top-[64px] bg-white dark:bg-zinc-900 z-[100] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200"
            style={{ pointerEvents: 'auto' }}
        >
            {/* Close/Cancel Button */}
            <button
                onClick={cancelVoiceMode}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
            >
                <X className="w-5 h-5" />
            </button>

            {/* Status Icon */}
            <div className={`w-28 h-28 rounded-full border-4 flex items-center justify-center mb-6 relative transition-all duration-500 ${
                voiceStatus === 'listening' 
                    ? 'border-red-200 dark:border-red-900/30' 
                    : voiceStatus === 'processing'
                        ? 'border-yellow-200 dark:border-yellow-900/30'
                        : voiceStatus === 'speaking'
                            ? 'border-blue-200 dark:border-blue-900/30'
                            : 'border-gray-200 dark:border-gray-700'
            }`}>
                {/* Animated rings */}
                {voiceStatus === 'listening' && (
                    <>
                        <div className="absolute inset-0 rounded-full bg-red-400 opacity-15 animate-ping pointer-events-none"></div>
                        <div className="absolute -inset-3 rounded-full border-2 border-red-200 opacity-30 animate-pulse pointer-events-none"></div>
                    </>
                )}
                {voiceStatus === 'speaking' && (
                    <div className="absolute inset-0 rounded-full bg-blue-400 opacity-15 animate-pulse pointer-events-none"></div>
                )}
                {voiceStatus === 'processing' && (
                    <div className="absolute inset-0 rounded-full bg-yellow-400 opacity-10 animate-pulse pointer-events-none"></div>
                )}

                {/* Icon */}
                <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                    voiceStatus === 'listening' 
                        ? 'bg-red-500 text-white' 
                        : voiceStatus === 'processing'
                            ? 'bg-yellow-500 text-white'
                            : voiceStatus === 'speaking'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-500'
                }`}>
                    {voiceStatus === 'listening' && <Mic className="w-8 h-8" />}
                    {voiceStatus === 'processing' && <Loader2 className="w-8 h-8 animate-spin" />}
                    {voiceStatus === 'speaking' && <Volume2 className="w-8 h-8" />}
                    {voiceStatus === 'idle' && <Mic className="w-8 h-8" />}
                </div>
            </div>

            {/* Status Text */}
            <h3 className="text-lg font-semibold text-gray-800 dark:text-zinc-100 mb-1">
                {voiceStatus === 'listening' && t('listening')}
                {voiceStatus === 'processing' && t('processing')}
                {voiceStatus === 'speaking' && t('answering')}
                {voiceStatus === 'idle' && t('voiceReady')}
            </h3>
            <p className="text-gray-400 dark:text-zinc-500 text-sm">
                {voiceStatus === 'listening' && t('askQuestion')}
                {voiceStatus === 'processing' && t('processingDesc')}
                {voiceStatus === 'speaking' && t('speakingAnswer')}
                {voiceStatus === 'idle' && t('clickToSpeak')}
            </p>

            {/* Transcribed text display */}
            {localInput && localInput !== "Ses işleniyor..." && !localInput.startsWith("Mikrofon") && !localInput.startsWith("Microphone") && (
                <div className="mt-6 p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 max-w-xs mx-auto text-gray-600 dark:text-zinc-300 text-sm animate-in fade-in slide-in-from-bottom-2">
                    &quot;{localInput}&quot;
                </div>
            )}

            {/* Cancel link at bottom */}
            <button
                onClick={cancelVoiceMode}
                className="mt-auto pt-4 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 text-sm transition-colors"
            >
                {t('returnToText')}
            </button>
        </div>
    )
}
