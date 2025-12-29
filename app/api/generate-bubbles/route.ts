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
        const { tone, topics } = await req.json()

        // Fetch knowledge base data
        const chatbotDoc = await adminDb.collection("chatbots").doc(userId).get()
        const chatbotData = chatbotDoc.data() || {}

        // Gather knowledge context
        let knowledgeContext = ""

        // 1. Company info
        if (chatbotData.companyName) {
            knowledgeContext += `Şirket: ${chatbotData.companyName}\n`
        }
        if (chatbotData.industry) {
            knowledgeContext += `Sektör: ${chatbotData.industry}\n`
        }

        // 2. FAQ items
        const faqSnapshot = await adminDb.collection("chatbots").doc(userId).collection("faq").limit(10).get()
        if (!faqSnapshot.empty) {
            knowledgeContext += "\nSSS:\n"
            faqSnapshot.docs.forEach(doc => {
                const faq = doc.data()
                knowledgeContext += `- Soru: ${faq.question}\n  Cevap: ${faq.answer?.substring(0, 100)}...\n`
            })
        }

        // 3. Text knowledge
        const textSnapshot = await adminDb.collection("chatbots").doc(userId).collection("knowledge_text").limit(5).get()
        if (!textSnapshot.empty) {
            knowledgeContext += "\nBilgi Metinleri:\n"
            textSnapshot.docs.forEach(doc => {
                const text = doc.data()
                if (text.content) {
                    knowledgeContext += `- ${text.title || 'Metin'}: ${text.content.substring(0, 150)}...\n`
                }
            })
        }

        // 4. Products if personal shopper enabled
        if (chatbotData.enablePersonalShopper) {
            const productsSnapshot = await adminDb.collection("chatbots").doc(userId).collection("products").limit(5).get()
            if (!productsSnapshot.empty) {
                knowledgeContext += "\nÖne Çıkan Ürünler:\n"
                productsSnapshot.docs.forEach(doc => {
                    const product = doc.data()
                    knowledgeContext += `- ${product.name}: ${product.price || ''} ${product.description?.substring(0, 50) || ''}\n`
                })
            }
        }

        if (!knowledgeContext.trim()) {
            return NextResponse.json({
                bubbles: [
                    "Merhaba! Size nasıl yardımcı olabilirim?",
                    "Sorularınızı yanıtlamak için buradayım."
                ]
            })
        }

        // Map tone to Turkish prompt instruction
        const toneMap: Record<string, string> = {
            friendly: "Samimi, sıcak ve arkadaşça bir ton kullan. Emoji kullanabilirsin.",
            professional: "Profesyonel ve resmi bir ton kullan. Emoji kullanma.",
            playful: "Eğlenceli, enerjik ve oyuncu bir ton kullan. Emoji kullan!"
        }

        const toneInstruction = toneMap[tone] || toneMap.friendly

        // Map topics to focus areas
        const topicFocus = topics?.length > 0
            ? `Özellikle şu konulara odaklan: ${topics.join(", ")}`
            : ""

        // Build prompt
        const prompt = `Sen bir web sitesi ziyaretçi etkileşim asistanısın. Aşağıdaki bilgilere dayanarak, ziyaretçilerin dikkatini çekecek KISA balon mesajları oluştur.

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

        // Call Gemini API
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")
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
                bubbles: [
                    "Merhaba! Size yardımcı olabilir miyim?",
                    "Sorularınız için buradayım."
                ]
            })
        }

        return NextResponse.json({ bubbles: bubbles.slice(0, 5) })

    } catch (error) {
        console.error("Error generating bubbles:", error)
        return NextResponse.json({ error: "Failed to generate bubbles" }, { status: 500 })
    }
}
