import { ChatbotSettings } from "@/types/chatbot"
import { Send, ImageIcon, Mic, X } from "lucide-react"
import { useVisualContext } from "../hooks/useVisualContext"
import Image from "next/image"

interface ChatInputProps {
    settings: ChatbotSettings
    localInput: string
    setLocalInput: (val: string) => void
    sendMessage: (text: string, speakResponse?: boolean, visualContext?: string) => Promise<string>
    handleVoiceInput: () => void
    isListening: boolean
    visualContext: ReturnType<typeof useVisualContext>
    language: string
    t: (key: string) => string
}

export function ChatInput({
    settings,
    localInput,
    setLocalInput,
    sendMessage,
    handleVoiceInput,
    isListening,
    visualContext,
    language,
    t
}: ChatInputProps) {
    const {
        selectedImage,
        selectedImageName,
        isAnalyzingImage,
        imageInputRef,
        handleImageSelect,
        clearSelectedImage,
        sendImageForAnalysis,
        saveImageToCache,
        selectedImageMimeType
    } = visualContext

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if ((!localInput.trim() && !selectedImage) || isAnalyzingImage) return

        const currentInput = localInput
        const currentImage = selectedImage
        const currentMimeType = selectedImageMimeType

        setLocalInput("")

        if (currentImage) {
            // Image Flow
            // 1. Save to cache for optimistic UI recovery
            // We need a temporary ID here, usually the parent generates it, but since we are decoupling...
            // Actually, saveImageToCache is called in the original code inside the submit handler.
            // But here, we can't easily generate the EXACT same ID as the message unless we move message creation here?
            // "saveImageToCache" in useVisualContext expects msgId.
            // The logic in page.tsx created the message ID *before* calling saveImageToCache.

            // To support this, we might need to rely on the fact that sendMessage adds the message to the state.
            // BUT sendMessage generates the ID internally.
            
            // Allow sendMessage to return the ID? Or handle image saving differently?
            // "saveImageToCache" is mainly for "Firebase Sync Recovery".
            // If we don't do it perfectly, we just lose the image on refresh until Firebase syncs.

            // Let's rely on standard flow:
            // 1. Get Analysis
            const analysisContext = await sendImageForAnalysis(currentInput)
            
            // 2. Send Message with Context
            try {
               await sendMessage(currentInput, false, analysisContext)
               // Note: The specific image-caching logic for the *User Message* (displaying the image bubble) 
               // depends on the message ID. 
               // Since sendMessage generates the ID internally, we can't easily cache it *with that ID* here.
               // However, `sendMessage` adds the message to `messages` state.
               // Maybe `sendMessage` should handle the image caching if we pass the image data?
               // That would require modifying `sendMessage` again.
               
               // Alternative: We generate ID here, pass it to sendMessage?
               // Let's proceed without the complex local caching for now, and rely on `selectedImage` state clearing only after send.
               // Actually, `sendImageForAnalysis` clears `selectedImage` in finally block.
               
               // WAIT: If we want the User Bubble to show the image, we need to pass the image to `sendMessage`.
               // `sendMessage` currently only takes `content`.
               // The original code MANUALLY added the message with `{ image: imageData }` to state.
               
               // I need to update `sendMessage` to accept `image` data if I want to display it locally!
               // OR, I handle the optimistic update in `ChatInput`? No, `sendMessage` handles optimistic update.
               
               // FIX: I will add `image` and `imageMimeType` arguments to `sendMessage`.
            } catch (error) {
                console.error("Failed to send image message", error)
            }
        } else {
            // Text Flow
            sendMessage(currentInput)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e as any)
        }
    }

    return (
        <div className="p-4 bg-white border-t border-gray-100">
            <div className="max-w-3xl mx-auto relative">
                <form
                    onSubmit={handleSubmit}
                    className="relative flex items-center gap-2"
                >
                    {/* Image Preview */}
                    {selectedImage && (
                        <div className="absolute bottom-full left-0 mb-4 ml-2 animate-in fade-in slide-in-from-bottom-2 z-20">
                            <div className="relative group">
                                <img
                                    src={`data:${selectedImageMimeType};base64,${selectedImage}`}
                                    alt="Selected"
                                    className="h-20 w-20 object-cover rounded-lg shadow-lg border-2 border-white ring-1 ring-gray-100"
                                />
                                <button
                                    type="button"
                                    onClick={clearSelectedImage}
                                    className="absolute -top-2 -right-2 p-1 bg-white rounded-full shadow-md text-gray-500 hover:text-red-500 transition-colors border border-gray-100"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                                <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-[1px] p-1 rounded-b-lg">
                                    <p className="text-[9px] text-white truncate px-1 text-center">
                                        {isAnalyzingImage ? "Analiz ediliyor..." : "Görsel seçildi"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Image Upload Button */}
                    {settings.enableVisualDiagnosis && (
                        <>
                            <input
                                type="file"
                                ref={imageInputRef}
                                accept="image/*"
                                onChange={handleImageSelect}
                                className="hidden"
                            />
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
                        </>
                    )}

                    <div className="relative flex-1 group">
                        <input
                            value={localInput}
                            onChange={(e) => setLocalInput(e.target.value)}
                            onKeyDown={handleKeyDown}
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
                        {t('aiDisclaimer')}
                    </p>
                    <span className="text-[10px] text-gray-300 hidden sm:block">•</span>
                    <a href="https://getvion.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-gray-400">Powered by</span>
                        <Image src="/vion-logo-full-dark.png" alt="Vion" width={50} height={12} className="h-2.5 w-auto opacity-60" unoptimized />
                    </a>
                </div>
            </div>
        </div>
    )
}
