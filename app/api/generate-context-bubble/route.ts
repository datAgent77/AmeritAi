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
        // 1. Get Request Data
        const body = await req.json()
        const { chatbotId, pageUrl, pageTitle, h1, tone } = body

        if (!chatbotId) {
            return NextResponse.json({ error: "Missing chatbotId" }, { status: 400 })
        }

        // 2. Check Premium Status (via chatbotId)
        const userDoc = await adminDb.collection("users").doc(chatbotId).get()
        const userData = userDoc.data()

        // Check both plan and subscription status
        const isPremium = userData?.plan === 'premium' || userData?.subscription?.status === 'active'

        if (!isPremium) {
            return NextResponse.json({ error: "Premium subscription required" }, { status: 403 })
        }

        // 3. Optional: Verify Origin (Basic security)
        // const origin = req.headers.get("origin")
        // const allowedDomains = userData.allowedDomains || []
        // if (allowedDomains.length > 0 && !allowedDomains.includes(origin)) ...

        const userId = chatbotId // for context gathering

        // 4. Check API Key
        if (!process.env.GEMINI_API_KEY) {
            console.log("GEMINI_API_KEY not set")
            return NextResponse.json({
                bubble: "Merhaba! Size nasıl yardımcı olabilirim?"
            })
        }

        // 5. Gather Knowledge Context (Optional but helpful)
        const chatbotDoc = await adminDb.collection("chatbots").doc(userId).get()
        const chatbotData = chatbotDoc.data() || {}

        let businessContext = ""
        if (chatbotData.companyName) businessContext += `Şirket: ${chatbotData.companyName}\n`
        if (chatbotData.industry) businessContext += `Sektör: ${chatbotData.industry}\n`

        // 6. Construct Prompt
        const toneMap: Record<string, string> = {
            friendly: "Samimi, sıcak ve yardımsever",
            professional: "Profesyonel, resmi ve kurumsal",
            playful: "Eğlenceli, esprili ve enerjik"
        }
        const selectedTone = toneMap[tone] || toneMap.friendly

        // Module Specific Instructions
        let moduleInstruction = ""
        const isRestaurant = chatbotData.industry === 'restaurant' || chatbotData.sectorId === 'restaurant'; // Robust check

        if (chatbotData.enableDigitalWaiter && isRestaurant) {
            moduleInstruction = "DİJİTAL GARSON MODU: Kullanıcı QR menüde. Bir yemek/içecek sayfasındaysa, tamamlayıcı lezzet öner (örn: 'Bunun yanına X şarabı yakışır')."
        } else if (chatbotData.enablePersonalShopper) {
            moduleInstruction = "ALIŞVERİŞ ASİSTANI MODU: Ziyaretçi bir ürüne bakıyorsa, satın alma kararını kolaylaştıracak veya tamamlayıcı bir ürün önerecek bir şey söyle."
        } else if (chatbotData.enableGamification) {
            moduleInstruction = "OYUNLAŞTIRMA MODU: Eğer uygunsa, indirim kazanmak için şansını denemesini öner."
        }

        const prompt = `
Sen bir web sitesi ziyaretçi asistanısın. Ziyaretçinin şu an bulunduğu sayfaya göre ONUN DİKKATİNİ ÇEKECEK, kısa ve alakalı bir balon mesajı oluşturman gerekiyor.

BAĞLAM:
${businessContext}
Ziyaretçinin Bulunduğu Sayfa:
- URL: ${pageUrl}
- Başlık: ${pageTitle}
- Ana Başlık (H1): ${h1 || 'Bulunamadı'}

GÖREV:
Bu sayfa içeriğiyle ilgili, ziyaretçiyi sohbet başlatmaya veya soru sormaya teşvik edecek TEK BİR cümlelik mesaj yaz.

KURALLAR:
1. Mesaj EN FAZLA 60 karakter olmalı (Çok önemli, kısa olmalı!)
2. Ton: ${selectedTone}
3. Asla "Merhaba" veya "Hoşgeldiniz" ile başlama (Çok klişe). Direkt konuya gir.
4. Soru sormak genellikle iyidir.
5. Sadece mesaj metnini döndür, tırnak işareti veya başka bir şey ekleme.
6. Emoji kullanabilirsin.
7. ${moduleInstruction}

ÖRNEKLER:
(Sayfa: Fiyatlar) -> Fiyatlarımız hakkında aklınıza takılan var mı? 💸
(Sayfa: Ürün X) -> X modeli hakkında detaylı bilgi verebilirim! 🚀
(Sayfa: İletişim) -> Bize buradan hemen yazabilirsiniz 👋
`

        // 7. Call AI
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text().trim()

        // Clean up text if needed (remove quotes if AI added them)
        const cleanText = text.replace(/^["']|["']$/g, '')

        return NextResponse.json({ bubble: cleanText })

    } catch (error) {
        console.error("Error generating context bubble:", error)
        // Fallback
        return NextResponse.json({
            bubble: "Size nasıl yardımcı olabilirim?"
        })
    }
}
