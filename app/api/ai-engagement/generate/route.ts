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

    let requestLanguage = 'tr'
    try {
        const body: GenerateRequest = await req.json()
        requestLanguage = body.language || 'tr'
        const { chatbotId, pageContext, tone = 'friendly', messageLength = 'medium', language = 'tr', sectorHint, actionMode = 'aiDecides' } = body

        if (!chatbotId || !pageContext) {
            return NextResponse.json({ error: "Missing chatbotId or pageContext" }, { status: 400 })
        }

        // 1. Get chatbot data for sector info
        const chatbotDoc = await adminDb.collection("chatbots").doc(chatbotId).get()
        const chatbotData = chatbotDoc.data() || {}

        // Language label mapping
        const langLabels: Record<string, { sector: string, company: string, langName: string, fallback: string }> = {
            tr: { sector: 'Sektör', company: 'Şirket', langName: 'Türkçe', fallback: 'Size nasıl yardımcı olabilirim?' },
            en: { sector: 'Sector', company: 'Company', langName: 'English', fallback: 'How can I help you?' },
            es: { sector: 'Sector', company: 'Empresa', langName: 'Español', fallback: '¿Cómo puedo ayudarte?' },
            de: { sector: 'Branche', company: 'Unternehmen', langName: 'Deutsch', fallback: 'Wie kann ich Ihnen helfen?' },
            fr: { sector: 'Secteur', company: 'Entreprise', langName: 'Français', fallback: 'Comment puis-je vous aider ?' }
        }
        const labels = langLabels[language] || langLabels['en']
        const isTurkish = language === 'tr'

        // Build sector context
        let sectorContext = ""
        if (sectorHint) {
            sectorContext = sectorHint
        } else if (chatbotData.industry || chatbotData.sectorId) {
            sectorContext = `${labels.sector}: ${chatbotData.industry || chatbotData.sectorId}`
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
                message: labels.fallback,
                intent: detectedIntent,
                confidence: 0.5
            } as GenerateResponse)
        }

        // 5. Construct AI Prompt (multi-language)
        const toneDescriptions: Record<string, string> = {
            friendly: "Friendly, warm and helpful",
            professional: "Professional, formal and corporate",
            playful: "Fun, witty and energetic",
            urgent: "Urgent, attention-grabbing, sales-focused"
        }

        const intentDescriptions: Record<string, string> = {
            browsing: "Browsing, collecting information",
            high_interest: "Showing high interest (stayed long, scrolled deep)",
            comparison: "Comparing options",
            support_needed: "Looking for support/help",
            exit_intent: "About to leave the page"
        }

        const lengthLimits = {
            short: 50,
            medium: 100,
            detailed: 150
        }
        const maxChars = lengthLimits[messageLength] || 100

        const toneDesc = toneDescriptions[tone] || toneDescriptions.friendly
        const intentDesc = intentDescriptions[detectedIntent] || detectedIntent

        // Language instruction for the AI
        const languageInstruction = `CRITICAL: The message MUST be written in ${labels.langName}. Do NOT use any other language.`

        const prompt = `You are a website visitor engagement assistant. Generate a smart, attention-grabbing message based on the visitor's current page and behavior.

CONTEXT:
${chatbotData.companyName ? `${labels.company}: ${chatbotData.companyName}` : ''}
${sectorContext}

PAGE INFO:
- URL: ${pageContext.url}
- Title: ${pageContext.title}
- Main Headings: ${pageContext.headings.join(', ') || 'Not found'}
${pageContext.metaDescription ? `- Description: ${pageContext.metaDescription}` : ''}

VISITOR BEHAVIOR:
- Time on Page: ${pageContext.behavior.timeOnPage} seconds
- Scroll Depth: ${pageContext.behavior.scrollDepth}%
- Click Count: ${pageContext.behavior.clickCount}
- Detected Intent: ${intentDesc}

TASK:
1. Analyze the page content and visitor behavior
2. ${recommendedAction === 'openWidget' ? 'The widget will open, generate an initial chat message' : 'Generate an attention-grabbing bubble message'}

RULES:
1. Message must be at most ${maxChars} characters
2. Tone: ${toneDesc}
3. Never start with a generic greeting like "Hello" or "Welcome"
4. Be DIRECTLY relevant to the page content
5. Be personalized and context-aware
6. You may use emoji but don't overdo it (max 1)
7. ${languageInstruction}
8. Return ONLY the message text, nothing else

${recommendedAction === 'openWidget' ? 'This message will appear as the first message inside the widget, make it a conversation starter.' : 'This message will appear in a small bubble, make it eye-catching.'}
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
        const fallbackMessages: Record<string, string> = {
            tr: "Size nasıl yardımcı olabilirim?",
            en: "How can I help you?",
            es: "¿Cómo puedo ayudarte?",
            de: "Wie kann ich Ihnen helfen?",
            fr: "Comment puis-je vous aider ?"
        }
        return NextResponse.json({
            action: 'showBubble',
            message: fallbackMessages[requestLanguage] || fallbackMessages['en'],
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
