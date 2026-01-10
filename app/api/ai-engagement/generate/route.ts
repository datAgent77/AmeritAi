import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Intent types the AI can detect
type Intent = 'browsing' | 'high_interest' | 'comparison' | 'support_needed' | 'exit_intent' | 'unknown'

// Action types the AI can recommend
type ActionType = 'showBubble' | 'openWidget' | 'none'

interface PageContext {
    url: string
    title: string
    headings: string[]
    metaDescription?: string
    visibleText?: string
    behavior: {
        timeOnPage: number      // seconds
        scrollDepth: number     // percentage 0-100
        clickCount: number
        isExitIntent?: boolean
    }
}

interface GenerateRequest {
    chatbotId: string
    pageContext: PageContext
    tone?: 'friendly' | 'professional' | 'playful' | 'urgent'
    messageLength?: 'short' | 'medium' | 'detailed'
    language?: string
    sectorHint?: string          // Manual hint from console settings
    actionMode?: 'bubbleOnly' | 'aiDecides' | 'alwaysWidget'
}

interface GenerateResponse {
    action: ActionType
    message: string
    openWidgetMessage?: string   // Initial message if widget opens
    intent: Intent
    confidence: number
}

export async function POST(req: Request) {
    const adminDb = getAdminDb()

    if (!adminDb) {
        return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    try {
        const body: GenerateRequest = await req.json()
        const { chatbotId, pageContext, tone = 'friendly', messageLength = 'medium', language = 'tr', sectorHint, actionMode = 'aiDecides' } = body

        if (!chatbotId || !pageContext) {
            return NextResponse.json({ error: "Missing chatbotId or pageContext" }, { status: 400 })
        }

        // 1. Get chatbot data for sector info
        const chatbotDoc = await adminDb.collection("chatbots").doc(chatbotId).get()
        const chatbotData = chatbotDoc.data() || {}

        // Build sector context
        let sectorContext = ""
        if (sectorHint) {
            sectorContext = sectorHint
        } else if (chatbotData.industry || chatbotData.sectorId) {
            sectorContext = `Sektör: ${chatbotData.industry || chatbotData.sectorId}`
        }

        // 2. Detect Intent from behavior
        const detectedIntent = detectIntent(pageContext)

        // 3. Decide action based on intent and mode
        let recommendedAction: ActionType = 'showBubble'
        if (actionMode === 'bubbleOnly') {
            recommendedAction = 'showBubble'
        } else if (actionMode === 'alwaysWidget') {
            recommendedAction = 'openWidget'
        } else {
            // AI decides based on intent
            if (detectedIntent === 'support_needed' || detectedIntent === 'exit_intent') {
                recommendedAction = 'openWidget'
            } else if (detectedIntent === 'high_interest') {
                recommendedAction = 'showBubble' // Engage without being too aggressive
            }
        }

        // 4. Check for API key
        if (!process.env.GEMINI_API_KEY) {
            console.log("GEMINI_API_KEY not set, returning fallback")
            return NextResponse.json({
                action: recommendedAction,
                message: "Size nasıl yardımcı olabilirim?",
                intent: detectedIntent,
                confidence: 0.5
            } as GenerateResponse)
        }

        // 5. Construct AI Prompt
        const toneDescriptions: Record<string, string> = {
            friendly: "Samimi, sıcak ve yardımsever",
            professional: "Profesyonel, resmi ve kurumsal",
            playful: "Eğlenceli, esprili ve enerjik",
            urgent: "Acil, dikkat çekici, satış odaklı"
        }

        const intentDescriptions: Record<string, string> = {
            browsing: "Geziyor, bilgi topluyor",
            high_interest: "Yüksek ilgi gösteriyor (uzun süre kaldı, scroll yaptı)",
            comparison: "Karşılaştırma yapıyor",
            support_needed: "Destek/yardım arıyor",
            exit_intent: "Sayfadan ayrılmak üzere"
        }

        const lengthLimits = {
            short: 50,
            medium: 100,
            detailed: 150
        }
        const maxChars = lengthLimits[messageLength] || 100

        const prompt = `Sen bir web sitesi ziyaretçi asistanısın. Ziyaretçinin bulunduğu sayfaya ve davranışına göre ONUN DİKKATİNİ ÇEKECEK akıllı bir mesaj üret.

BAĞLAM:
${chatbotData.companyName ? `Şirket: ${chatbotData.companyName}` : ''}
${sectorContext}

SAYFA BİLGİSİ:
- URL: ${pageContext.url}
- Başlık: ${pageContext.title}
- Ana Başlıklar: ${pageContext.headings.join(', ') || 'Bulunamadı'}
${pageContext.metaDescription ? `- Açıklama: ${pageContext.metaDescription}` : ''}

ZİYARETÇİ DAVRANIŞI:
- Sayfada Geçen Süre: ${pageContext.behavior.timeOnPage} saniye
- Scroll Derinliği: %${pageContext.behavior.scrollDepth}
- Tıklama Sayısı: ${pageContext.behavior.clickCount}
- Algılanan Niyet: ${intentDescriptions[detectedIntent] || detectedIntent}

GÖREV:
1. Sayfa içeriğini ve ziyaretçi davranışını analiz et
2. ${recommendedAction === 'openWidget' ? 'Widget açılacak, ilk sohbet mesajı üret' : 'Dikkat çekici bir balon mesajı üret'}

KURALLAR:
1. Mesaj EN FAZLA ${maxChars} karakter olmalı
2. Ton: ${toneDescriptions[tone]}
3. Asla "Merhaba" veya "Hoşgeldiniz" ile başlama
4. Sayfa içeriğiyle DOĞRUDAN ilgili ol
5. Kişiselleştirilmiş ve bağlama uygun ol
6. Emoji kullanabilirsin ama abartma (max 1)
7. Sadece mesaj metnini döndür

${recommendedAction === 'openWidget' ? 'Bu mesaj widget içinde ilk mesaj olarak görünecek, sohbet başlatıcı olsun.' : 'Bu mesaj küçük bir baloncukta görünecek, dikkat çekici olsun.'}

SEKTÖREL ÖRNEKLER:
- Sağlık (Doktor sayfası): "Bu doktordan randevu almak ister misiniz? 📅"
- E-ticaret (Ürün sayfası): "Bu ürün hakkında sorularınızı yanıtlayabilirim!"
- Eğitim (Bölüm sayfası): "Kabul koşulları hakkında bilgi verebilirim 🎓"
- SaaS (Fiyat sayfası): "Hangi plan ihtiyaçlarınıza uygun, birlikte bakalım mı?"
- Emlak (İlan sayfası): "Bu mülkü görmek için randevu oluşturabilir miyim?"
`

        // 6. Call AI
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

        console.log("Calling Gemini API with page context:", pageContext.url, pageContext.title)
        const result = await model.generateContent(prompt)
        const response = await result.response
        const generatedText = response.text().trim().replace(/^["']|["']$/g, '')

        // 7. Build response
        const responseData: GenerateResponse = {
            action: recommendedAction,
            message: generatedText,
            intent: detectedIntent,
            confidence: calculateConfidence(pageContext, detectedIntent)
        }

        if (recommendedAction === 'openWidget') {
            responseData.openWidgetMessage = generatedText
        }

        return NextResponse.json(responseData)

    } catch (error) {
        console.error("Error in AI engagement generate:", error)
        return NextResponse.json({
            action: 'showBubble',
            message: "Size nasıl yardımcı olabilirim?",
            intent: 'unknown',
            confidence: 0.3
        } as GenerateResponse)
    }
}

// Intent detection based on behavior
function detectIntent(context: PageContext): Intent {
    const { behavior, url } = context
    const urlLower = url.toLowerCase()

    // Exit intent override
    if (behavior.isExitIntent) {
        return 'exit_intent'
    }

    // Support page detection
    if (urlLower.includes('/support') || urlLower.includes('/help') ||
        urlLower.includes('/faq') || urlLower.includes('/destek') ||
        urlLower.includes('/yardim') || urlLower.includes('/sss')) {
        return 'support_needed'
    }

    // Comparison behavior (pricing, comparison pages)
    if (urlLower.includes('/pricing') || urlLower.includes('/fiyat') ||
        urlLower.includes('/compare') || urlLower.includes('/plans') ||
        urlLower.includes('/karsilastir')) {
        return 'comparison'
    }

    // High interest detection (long time + deep scroll)
    if (behavior.timeOnPage > 30 && behavior.scrollDepth > 60) {
        return 'high_interest'
    }

    // High click count indicates engagement
    if (behavior.clickCount >= 5) {
        return 'high_interest'
    }

    return 'browsing'
}

// Calculate confidence score
function calculateConfidence(context: PageContext, intent: Intent): number {
    let confidence = 0.5

    // More behavior data = higher confidence
    if (context.behavior.timeOnPage > 20) confidence += 0.1
    if (context.behavior.scrollDepth > 50) confidence += 0.1
    if (context.behavior.clickCount > 3) confidence += 0.1

    // Clear intent = higher confidence
    if (intent === 'support_needed') confidence += 0.15
    if (intent === 'exit_intent') confidence += 0.1
    if (intent === 'high_interest') confidence += 0.1

    return Math.min(confidence, 0.95)
}
