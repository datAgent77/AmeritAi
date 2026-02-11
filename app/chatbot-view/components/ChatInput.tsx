import React from "react"
import { ChatbotSettings } from "@/types/chatbot"
import { Send, ImageIcon, Mic, X } from "lucide-react"
import { useVisualContext } from "../hooks/useVisualContext"
import Image from "next/image"
import { event as trackEvent } from "@/lib/gtag"

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
    setMessages: React.Dispatch<React.SetStateAction<any[]>>
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
    t,
    setMessages
}: ChatInputProps) {
    const {
        selectedImage,
        selectedImageName,
        isAnalyzingImage,
        handleImageSelect,
        clearSelectedImage,
        sendImageForAnalysis,
        saveImageToCache,
        selectedImageMimeType
    } = visualContext
    
    // Ensure clearSelectedImage is available
    const clearImage = clearSelectedImage || (() => {})

    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if ((!localInput.trim() && !selectedImage) || isAnalyzingImage) return

        const currentInput = localInput
        const currentImage = selectedImage
        const currentMimeType = selectedImageMimeType

        setLocalInput("")

        if (currentImage) {
            // Image Flow
            // 1. Get Analysis - pass image data directly to avoid closure issues
            const analysisResult = await sendImageForAnalysis(currentInput, currentImage, currentMimeType)
            
            // 2. Handle result
            if (analysisResult.success && analysisResult.context) {
                // Success: Send message with analysis context
                try {
                    const textToSend = currentInput.trim() || (language === 'tr' ? "Görseli analiz et" : "Analyze this image");

                    // If user didn't ask a question, show analysis directly
                    if (!currentInput.trim() && analysisResult.analysis) {
                        const userMsg = {
                            id: 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
                            role: 'user',
                            content: textToSend,
                            image: currentImage,
                            imageMimeType: currentMimeType,
                            createdAt: new Date()
                        };

                        const assistantText = language === 'tr'
                            ? `Görsel analiz sonucu:\nTeşhis: ${analysisResult.analysis.diagnosis}\nGüven: ${analysisResult.analysis.confidence}\nÖnerilen: ${analysisResult.analysis.treatment}`
                            : `Image analysis result:\nDiagnosis: ${analysisResult.analysis.diagnosis}\nConfidence: ${analysisResult.analysis.confidence}\nRecommended: ${analysisResult.analysis.treatment}`;

                        const assistantMsg = {
                            id: 'assistant-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
                            role: 'assistant',
                            content: assistantText,
                            createdAt: new Date()
                        };

                        // Persist image for UI recovery
                        if (currentImage && currentMimeType) {
                            saveImageToCache(userMsg.id, currentImage, currentMimeType, textToSend);
                        }

                        setMessages((prev: any[]) => [...prev, userMsg, assistantMsg]);
                        clearImage();
                        return;
                    }

                    await sendMessage(textToSend, false, analysisResult.context)
                } catch (error) {
                    console.error("Failed to send image message", error)
                }
            } else if (analysisResult.error) {
                // Error: Add error message directly as assistant message (don't send to AI)
                // This prevents the error from being sent to AI and causing confusion
                const errorMessage = analysisResult.error;
                const errorText = language === 'tr' 
                    ? `Maalesef görsel analiz gerçekleştirilemedi. ${errorMessage} Başka bir konuda size yardımcı olabilir miyim?`
                    : `Unfortunately, I could not perform the image analysis. ${errorMessage} Can I help you with anything else?`;
                
                // Add user message (for the image upload attempt)
                const userMsg = {
                    id: 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
                    role: 'user',
                    content: currentInput.trim() || (language === 'tr' ? "Görseli analiz et" : "Analyze this image"),
                    createdAt: new Date()
                };
                
                // Add assistant error message directly (without calling AI)
                const assistantMsg = {
                    id: 'assistant-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
                    role: 'assistant',
                    content: errorText,
                    createdAt: new Date()
                };
                
                // Add both messages directly to state (bypassing AI)
                setMessages((prev: any[]) => [...prev, userMsg, assistantMsg]);
                
                // Clear the image since analysis failed
                clearImage();
            }
        } else {
            // Text Flow
            trackEvent({
                action: 'chat_message_sent',
                category: 'Chat',
                label: 'User Message'
            })
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
        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white border-t border-gray-100">
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

                    {/* Voice Input Button (Left side) */}
                    {settings.enableVoiceAssistant && (
                        <button
                            type="button"
                            onClick={handleVoiceInput}
                            className={`p-3 rounded-full transition-all shadow-sm border ${isListening 
                                ? 'text-white bg-red-500 border-red-400 animate-pulse shadow-md shadow-red-200' 
                                : 'text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-600 border-gray-200'}`}
                            title={t('voiceReady')}
                        >
                            <Mic className="w-4 h-4" />
                        </button>
                    )}

                    {/* Image Upload Button */}
                    {settings.enableVisualDiagnosis && (
                        <>
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept="image/png, image/jpeg, image/webp"
                                onChange={handleImageSelect}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
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
                            className="w-full text-base bg-gray-50 border border-gray-200 rounded-full pl-4 pr-10 py-3.5 focus:outline-none focus:ring-2 focus:ring-opacity-20 focus:bg-white transition-all shadow-sm group-hover:bg-white group-hover:shadow-md group-hover:border-gray-300"
                            style={{ '--tw-ring-color': settings.headerBackgroundColor || settings.brandColor } as any}
                        />

                        {/* Voice Input inline button removed - prominent mic button is on the left side */}
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

                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2 px-2">
                    <p className="text-[10px] text-gray-400 text-center text-balance">
                        {t('aiDisclaimer')}
                    </p>
                    <a href="https://getvion.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity whitespace-nowrap">
                        <span className="text-[10px] text-gray-400">Powered by</span>
                        <Image src="/vion-logo-full-dark.png" alt="Vion" width={50} height={12} className="h-2.5 w-auto opacity-60" unoptimized />
                    </a>
                </div>
            </div>
        </div>
    )
}
