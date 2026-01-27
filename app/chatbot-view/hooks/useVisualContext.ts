import { useState, useRef, useEffect } from "react"

export function useVisualContext(chatbotId: string, language: string) {
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const [selectedImageName, setSelectedImageName] = useState<string>("")
    const [selectedImageMimeType, setSelectedImageMimeType] = useState<string>("")
    const [isAnalyzingImage, setIsAnalyzingImage] = useState(false)
    const [imgError, setImgError] = useState(false)
    
    // Key: message ID (or content hash as fallback)
    const [imageMap, setImageMap] = useState<Record<string, { image: string; mimeType: string; content?: string; timestamp?: number }>>({})
    
    const imageInputRef = useRef<HTMLInputElement>(null)
    
    // Key: message ID, Value: { image: base64, mimeType: string }
    const imageCache = useRef<Map<string, { image: string; mimeType: string }>>(new Map())

    // Load local cache on mount
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

    const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            alert(language === 'tr' ? 'Lütfen bir görsel dosyası seçin.' : 'Please select an image file.')
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            alert(language === 'tr' ? 'Dosya boyutu 5MB\'dan küçük olmalıdır.' : 'File size must be less than 5MB.')
            return
        }

        const reader = new FileReader()
        reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1]
            setSelectedImage(base64)
            setSelectedImageName(file.name)
            setSelectedImageMimeType(file.type)
        }
        reader.readAsDataURL(file)
        event.target.value = ''
    }

    const clearSelectedImage = () => {
        setSelectedImage(null)
        setSelectedImageName("")
        setSelectedImageMimeType("")
    }

    const sendImageForAnalysis = async (
        userMessage: string,
        imageData?: string,
        mimeType?: string
    ): Promise<{ success: boolean; context?: string; error?: string; analysis?: { diagnosis: string; confidence: string; treatment: string } }> => {
        // Use provided image data or fall back to state
        const imageToAnalyze = imageData || selectedImage
        const mimeTypeToUse = mimeType || selectedImageMimeType
        
        console.log('[VISUAL DEBUG] sendImageForAnalysis called, image:', imageToAnalyze ? 'EXISTS (' + imageToAnalyze.substring(0, 50) + '...)' : 'NULL')
        
        if (!imageToAnalyze) {
            console.log('[VISUAL DEBUG] No image to analyze, returning error')
            return { 
                success: false, 
                error: language === 'tr' 
                    ? "Görsel seçilmedi. Lütfen önce bir görsel yükleyin." 
                    : "No image selected. Please upload an image first." 
            }
        }

        setIsAnalyzingImage(true)
        console.log('[VISUAL DEBUG] Starting API call to /api/visual-diagnosis')
        try {
            const response = await fetch('/api/visual-diagnosis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: imageToAnalyze,
                    mimeType: mimeTypeToUse
                })
            })

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const status = response.status;
                const errMsg = errData.error || response.statusText || 'Unknown Error';
                throw new Error(`[Status: ${status}] ${errMsg}`);
            }

            const result = await response.json()
            console.log('[VISUAL DEBUG] API response:', result)

            // Check if result contains error field
            if (result.error) {
                console.log('[VISUAL DEBUG] API returned error:', result.error)
                throw new Error(result.error);
            }

            const diagnosis = result?.diagnosis || "Unknown"
            const confidence = result?.confidence || "Unknown"
            const treatment = result?.treatment || "No recommendation"

            const analysisContext = language === 'tr'
                ? `[GÖRSEL ANALİZ SONUCU]\nTeşhis: ${diagnosis}\nGüven: ${confidence}\nÖnerilen Tedavi: ${treatment}\n\nKullanıcı mesajı: "${userMessage}"\n\nLütfen bu analiz sonucunu kullanıcıya uygun ve anlaşılır şekilde açıkla.`
                : `[IMAGE ANALYSIS RESULT]\nDiagnosis: ${diagnosis}\nConfidence: ${confidence}\nRecommended Treatment: ${treatment}\n\nUser message: "${userMessage}"\n\nPlease explain this analysis to the user in a clear and helpful way.`

            return { success: true, context: analysisContext, analysis: { diagnosis, confidence, treatment } }

        } catch (error: any) {
            console.error('[VISUAL DEBUG] Visual diagnosis error:', error)
            console.log('[VISUAL DEBUG] Error message:', error.message)
            
            // Extract error message from response if available
            let errorMessage = "Unknown error";
            let userFriendlyMessage = "";
            
            try {
                if (error.message) {
                    errorMessage = error.message;
                    
                    // Parse error message to extract meaningful information
                    if (errorMessage.includes("API key") || errorMessage.includes("authentication") || errorMessage.includes("Configuration Error")) {
                        userFriendlyMessage = language === 'tr' 
                            ? "API anahtarı yapılandırma hatası. Lütfen sistem yöneticisine bildirin."
                            : "API key configuration error. Please contact system administrator.";
                    } else if (errorMessage.includes("quota") || errorMessage.includes("rate limit")) {
                        userFriendlyMessage = language === 'tr'
                            ? "API kotası aşıldı. Lütfen daha sonra tekrar deneyin."
                            : "API quota exceeded. Please try again later.";
                    } else if (errorMessage.includes("model") || errorMessage.includes("Model configuration")) {
                        userFriendlyMessage = language === 'tr'
                            ? "Model yapılandırma hatası. Lütfen sistem yöneticisine bildirin."
                            : "Model configuration error. Please contact system administrator.";
                    } else {
                        userFriendlyMessage = language === 'tr'
                            ? "Görsel analiz sırasında bir hata oluştu. Lütfen tekrar deneyin."
                            : "An error occurred during image analysis. Please try again.";
                    }
                }
            } catch (parseError) {
                userFriendlyMessage = language === 'tr'
                    ? "Görsel analiz sırasında bir hata oluştu. Lütfen tekrar deneyin."
                    : "An error occurred during image analysis. Please try again.";
            }
            
            return { success: false, error: userFriendlyMessage }
        } finally {
            setIsAnalyzingImage(false)
            clearSelectedImage()
        }
    }

    return {
        selectedImage,
        selectedImageName,
        selectedImageMimeType,
        isAnalyzingImage,
        imgError,
        setImgError,
        imageInputRef,
        imageMap,
        setImageMap, 
        handleImageSelect,
        clearSelectedImage,
        sendImageForAnalysis,
        saveImageToCache,
        getImageFromCache,
        findImageByContent
    }
}
