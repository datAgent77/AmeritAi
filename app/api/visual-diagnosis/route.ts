import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    try {
        const { image, mimeType, language } = await req.json();

        if (!image || !mimeType) {
            return NextResponse.json({ error: "Image and mimeType are required" }, { status: 400 });
        }

        // Clean base64 string if it contains data URL prefix
        let cleanImage = image;
        if (typeof image === 'string' && image.includes(',')) {
            // Remove data:image/...;base64, prefix if present
            cleanImage = image.split(',')[1] || image;
        }

        // 1. Resolve API Key
        let apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            // Fallback to Firestore
            const adminDb = getAdminDb();
            if (adminDb) {
                const doc = await adminDb.collection("system_settings").doc("ai_config").get();
                if (doc.exists) {
                    const data = doc.data();
                    
                    // 1. Check for explicit Google/Gemini key field first (if added in future)
                    if (data?.googleApiKey) {
                        apiKey = data.googleApiKey;
                    } 
                    // 2. Check if provider is Google and generic apiKey is present
                    else if (data?.provider === 'google' && data?.apiKey) {
                        apiKey = data.apiKey;
                    }
                    // 3. Fallback: Check if generic apiKey LOOKS like a Google key
                    // Google AI keys typically start with "AIza"
                    else if (data?.apiKey && data.apiKey.startsWith('AIza')) {
                         apiKey = data.apiKey;
                    }
                }
            }
        }

        if (!apiKey) {
            console.error("Visual Diagnosis: No Google API Key found (Env or Firestore)");
            return NextResponse.json(
                { error: "Configuration Error: No Google API Key available." },
                { status: 500 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        // Use gemini-2.0-flash for speed and vision capabilities
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Determine response language
        const isTurkish = language === 'tr' || (typeof language === 'string' && language.toLowerCase().includes('tr'));
        const responseLang = isTurkish ? 'Turkish' : 'English';
        
        const prompt = isTurkish ? `
        Bu görseli dikkatli bir şekilde analiz et. Bu bir bitki hastalığı, cilt rahatsızlığı, ürün kusuru veya genel bir nesne olabilir.
        Sorunu, hastalığı veya ana görsel özelliği belirle.
        
        Sonucu STRICT JSON formatında (markdown formatı olmadan) şu anahtarlarla döndür:
        - diagnosis: Durumun veya nesnenin kısa, net başlığı (Türkçe).
        - confidence: Tahmini güven yüzdesi (örn: "95%").
        - treatment: Önerilen eylemler, çözümler veya sonraki adımlar (Türkçe).

        Görsel belirsiz veya ilgisizse, diagnosis'ı "Bilinmiyor" olarak ayarla ve treatment'ı "Lütfen daha net bir görsel sağlayın." olarak ayarla.
        
        ÖNEMLİ: Sadece geçerli JSON döndür, ek metin veya açıklama ekleme.
        ` : `
        Analyze this image carefully. It may be a plant with a disease, a skin condition, a product defect, or general object.
        Identify the issue, disease, or main visual feature.
        
        Return the result as a STRICT JSON object (no markdown formatting) with these keys:
        - diagnosis: A short, clear title of the condition or object.
        - confidence: An estimated confidence percentage (e.g., "95%").
        - treatment: Recommended actions, remedies, or next steps.

        If the image is unclear or irrelevant, set diagnosis to "Unknown" and treatment to "Please provide a clearer image.".
        
        IMPORTANT: Return ONLY valid JSON, no additional text or explanation.
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: cleanImage,
                    mimeType: mimeType
                }
            }
        ]);

        const responseText = result.response.text();

        // Clean markdown if present and extract JSON
        let jsonStr = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        
        // Try to extract JSON if wrapped in text
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        }
        
        let data;
        try {
            data = JSON.parse(jsonStr);
        } catch (parseError) {
            console.error("Failed to parse JSON response:", jsonStr);
            // Fallback: create a valid response structure
            data = {
                diagnosis: "Analysis completed",
                confidence: "Unable to determine",
                treatment: responseText.substring(0, 200) || "Please provide more details about what you'd like analyzed."
            };
        }

        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Visual Diagnosis Error:", error);
        
        // Provide more detailed error information
        let errorMessage = "Failed to analyze image";
        let statusCode = 500;
        
        if (error.message) {
            errorMessage = error.message;
            
            // Check for specific error types
            if (error.message.includes("API key") || error.message.includes("authentication")) {
                statusCode = 401;
                errorMessage = "API authentication failed. Please check API key configuration.";
            } else if (error.message.includes("model") || error.message.includes("not found")) {
                statusCode = 400;
                errorMessage = "Model configuration error. Please check model availability.";
            } else if (error.message.includes("quota") || error.message.includes("rate limit")) {
                statusCode = 429;
                errorMessage = "API quota exceeded. Please try again later.";
            }
        }
        
        return NextResponse.json(
            { 
                error: errorMessage,
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            { status: statusCode }
        );
    }
}
