import { Mic, Square } from "lucide-react"

interface VoiceOverlayProps {
    isVoiceMode: boolean
    isListening: boolean
    isSpeaking: string | null // string ID or null
    localInput: string
    handleVoiceInput: () => void
    exitVoiceMode: () => void
    t: (key: string) => string
}

export function VoiceOverlay({
    isVoiceMode,
    isListening,
    isSpeaking,
    localInput,
    handleVoiceInput,
    exitVoiceMode,
    t
}: VoiceOverlayProps) {
    if (!isVoiceMode) return null

    return (
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
                {isListening ? (t('listening') || "Sizi Dinliyorum...") : isSpeaking ? (t('answering') || "Vion Cevap Veriyor...") : (t('voiceReady') || "Sesli Asistan Hazır")}
            </h3>
            <p className="text-gray-500 dark:text-zinc-400 text-sm max-w-xs mx-auto">
                {isListening ? (t('askQuestion') || "Lütfen sorunuzu sorun.") : isSpeaking ? (t('speakingAnswer') || "Yanıt seslendiriliyor.") : (t('clickToSpeak') || "Konuşmak için butona tıklayın.")}
            </p>

            {localInput && localInput !== "Ses işleniyor..." && (localInput !== "Sesli asistan aktif...") && (
                <div className="mt-8 p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 max-w-xs mx-auto italic text-gray-600 dark:text-zinc-300 text-sm animate-in slide-in-from-bottom-2">
                    &quot;{localInput}&quot;
                </div>
            )}

            <button
                onClick={exitVoiceMode}
                className="mt-auto px-6 py-2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 text-sm font-medium transition-colors border border-transparent hover:border-gray-100 dark:hover:border-zinc-800 rounded-full"
            >
                {t('returnToText') || "Yazılı Sohbete Dön"}
            </button>
        </div>
    )
}
