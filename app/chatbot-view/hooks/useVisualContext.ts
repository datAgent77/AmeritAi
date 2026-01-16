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

    const sendImageForAnalysis = async (userMessage: string): Promise<string> => {
        if (!selectedImage) return ""

        setIsAnalyzingImage(true)
        try {
            const response = await fetch('/api/visual-diagnosis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: selectedImage,
                    mimeType: selectedImageMimeType
                })
            })

            if (!response.ok) {
                throw new Error('Visual diagnosis failed')
            }

            const result = await response.json()

            const analysisContext = language === 'tr'
                ? `[GÖRSEL ANALİZ SONUCU]\nTeşhis: ${result.diagnosis}\nGüven: ${result.confidence}\nÖnerilen Tedavi: ${result.treatment}\n\nKullanıcı mesajı: "${userMessage}"\n\nLütfen bu analiz sonucunu kullanıcıya uygun ve anlaşılır şekilde açıkla.`
                : `[IMAGE ANALYSIS RESULT]\nDiagnosis: ${result.diagnosis}\nConfidence: ${result.confidence}\nRecommended Treatment: ${result.treatment}\n\nUser message: "${userMessage}"\n\nPlease explain this analysis to the user in a clear and helpful way.`

            return analysisContext

        } catch (error) {
            console.error('Visual diagnosis error:', error)
            return language === 'tr'
                ? '[GÖRSEL ANALİZ HATASI: Görsel analiz yapılamadı. Lütfen kullanıcıya teknik bir sorun olduğunu bildirin.]'
                : '[IMAGE ANALYSIS ERROR: Could not analyze the image. Please inform the user about the technical issue.]'
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
