import { NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function POST(req: Request) {
    const adminAuth = getAdminAuth()
    const adminDb = getAdminDb()

    if (!adminAuth || !adminDb) {
        return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    try {
        // Verify auth
        const authHeader = req.headers.get("Authorization")
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const idToken = authHeader.split("Bearer ")[1]
        const decodedToken = await adminAuth.verifyIdToken(idToken)
        const userId = decodedToken.uid

        // Get request body
        const { tone, topics, language = 'tr' } = await req.json()
        const isTurkish = language === 'tr'

        // Fetch knowledge base data
        const chatbotDoc = await adminDb.collection("chatbots").doc(userId).get()
        const chatbotData = chatbotDoc.data() || {}

        // Gather knowledge context
        let knowledgeContext = ""

        // 1. Company info
        if (chatbotData.companyName) {
            knowledgeContext += `${isTurkish ? 'Şirket' : 'Company'}: ${chatbotData.companyName}\n`
        }
        if (chatbotData.industry) {
            knowledgeContext += `${isTurkish ? 'Sektör' : 'Sector'}: ${chatbotData.industry}\n`
        }

        // 2. FAQ items
        const faqSnapshot = await adminDb.collection("chatbots").doc(userId).collection("faq").limit(10).get()
        if (!faqSnapshot.empty) {
            knowledgeContext += `\n${isTurkish ? 'SSS' : 'FAQ'}:\n`
            faqSnapshot.docs.forEach(doc => {
                const faq = doc.data()
                knowledgeContext += `- ${isTurkish ? 'Soru' : 'Q'}: ${faq.question}\n  ${isTurkish ? 'Cevap' : 'A'}: ${faq.answer?.substring(0, 100)}...\n`
            })
        }

        // 3. Text knowledge
        const textSnapshot = await adminDb.collection("chatbots").doc(userId).collection("knowledge_text").limit(5).get()
        if (!textSnapshot.empty) {
            knowledgeContext += `\n${isTurkish ? 'Bilgi Metinleri' : 'Knowledge Base'}:\n`
            textSnapshot.docs.forEach(doc => {
                const text = doc.data()
                if (text.content) {
                    knowledgeContext += `- ${text.title || (isTurkish ? 'Metin' : 'Text')}: ${text.content.substring(0, 150)}...\n`
                }
            })
        }

        // 4. Products if personal shopper enabled
        if (chatbotData.enablePersonalShopper) {
            const productsSnapshot = await adminDb.collection("chatbots").doc(userId).collection("products").limit(5).get()
            if (!productsSnapshot.empty) {
                knowledgeContext += `\n${isTurkish ? 'Öne Çıkan Ürünler' : 'Featured Products'}:\n`
                productsSnapshot.docs.forEach(doc => {
                    const product = doc.data()
                    knowledgeContext += `- ${product.name}: ${product.price || ''} ${product.description?.substring(0, 50) || ''}\n`
                })
            }
        }

        if (!knowledgeContext.trim()) {
            return NextResponse.json({
                bubbles: isTurkish
                    ? ["Merhaba! Size nasıl yardımcı olabilirim?", "Sorularınızı yanıtlamak için buradayım."]
                    : ["How can I help you today?", "I'm here to answer your questions."]
            })
        }

        // Map tone to prompt instruction (bilingual)
        const toneMap: Record<string, Record<string, string>> = {
            tr: {
                friendly: "Samimi, sıcak ve arkadaşça bir ton kullan. Emoji kullanabilirsin.",
                professional: "Profesyonel ve resmi bir ton kullan. Emoji kullanma.",
                playful: "Eğlenceli, enerjik ve oyuncu bir ton kullan. Emoji kullan!"
            },
            en: {
                friendly: "Use a friendly, warm and approachable tone. You may use emoji.",
                professional: "Use a professional and formal tone. Do not use emoji.",
                playful: "Use a fun, energetic and playful tone. Use emoji!"
            }
        }

        const langKey = isTurkish ? 'tr' : 'en'
        const toneInstruction = toneMap[langKey]?.[tone] || toneMap[langKey]?.friendly || ''

        // Map topics to focus areas
        const topicFocus = topics?.length > 0
            ? (isTurkish ? `Özellikle şu konulara odaklan: ${topics.join(", ")}` : `Focus especially on these topics: ${topics.join(", ")}`)
            : ""

        // Build prompt (bilingual)
        const prompt = isTurkish
            ? `Sen bir web sitesi ziyaretçi etkileşim asistanısın. Aşağıdaki bilgilere dayanarak, ziyaretçilerin dikkatini çekecek KISA balon mesajları oluştur.

Bu mesajlar chatbot açılmadan önce, launcher butonunun üzerinde küçük baloncuklar olarak görünecek. Amaç ziyaretçiyi chatbot'a yönlendirmek.

${toneInstruction}

${topicFocus}

Bilgi Tabanı:
${knowledgeContext}

Kurallar:
1. Her mesaj EN FAZLA 50 karakter olsun
2. 3 farklı mesaj üret
3. Her mesaj bir [] parantez içinde olsun
4. Mesajlar Türkçe olsun
5. Ziyaretçiyi rahatsız etmeyen, merak uyandıran mesajlar yaz

Örnek format:
[Merhaba! Yardıma mı ihtiyacınız var?]
[Bugün size nasıl yardımcı olabilirim?]
[Sorularınız için buradayım 👋]

Şimdi 3 mesaj üret:`
            : `You are a website visitor engagement assistant. Based on the information below, generate SHORT bubble messages that catch visitors' attention.

These messages will appear as small bubbles above the launcher button before the chatbot opens. The goal is to guide visitors to the chatbot.

${toneInstruction}

${topicFocus}

Knowledge Base:
${knowledgeContext}

Rules:
1. Each message must be at most 50 characters
2. Generate 3 different messages
3. Each message should be in [] brackets
4. Messages MUST be in English
5. Write curiosity-inducing messages that don't annoy visitors

Example format:
[Need help finding what you're looking for?]
[I can answer your questions!]
[Got a question? I'm here to help 👋]

Now generate 3 messages:`

        // Check for GEMINI_API_KEY
        if (!process.env.GEMINI_API_KEY) {
            console.log("GEMINI_API_KEY not set, returning default bubbles")
            return NextResponse.json({
                bubbles: isTurkish
                    ? ["Merhaba! Size nasıl yardımcı olabilirim?", "Sorularınızı yanıtlamak için buradayım.", "İhtiyacınız olan bilgiye ulaşmanıza yardımcı olabilirim."]
                    : ["How can I help you today?", "I'm here to answer your questions.", "I can help you find the information you need."]
            })
        }

        // Call Gemini API
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        // Parse bubbles from response
        const bubbleRegex = /\[([^\]]+)\]/g
        const matches = [...text.matchAll(bubbleRegex)]
        const bubbles = matches.map(m => m[1].trim()).filter(b => b.length > 0 && b.length <= 60)

        if (bubbles.length === 0) {
            // Fallback
            return NextResponse.json({
                bubbles: isTurkish
                    ? ["Merhaba! Size yardımcı olabilir miyim?", "Sorularınız için buradayım."]
                    : ["Can I help you with something?", "I'm here for your questions."]
            })
        }

        return NextResponse.json({ bubbles: bubbles.slice(0, 5) })

    } catch (error: any) {
        console.error("Error generating bubbles:", error?.message || error)
        // Return fallback bubbles instead of error
        return NextResponse.json({
            bubbles: [
                "How can I help you?",
                "I'm here to answer your questions."
            ]
        })
    }
}
