import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function POST(req: Request) {
    try {
        const { image, mimeType } = await req.json();

        if (!image || !mimeType) {
            return NextResponse.json({ error: "Image and mimeType are required" }, { status: 400 });
        }

        // Use gemini-2.5-flash for speed and vision capabilities
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        Analyze this image carefully. It may be a plant with a disease, a skin condition, a product defect, or general object.
        Identify the issue, disease, or main visual feature.
        
        Return the result as a STRICT JSON object (no markdown formatting) with these keys:
        - diagnosis: A short, clear title of the condition or object.
        - confidence: An estimated confidence percentage (e.g., "95%").
        - treatment: Recommended actions, remedies, or next steps.

        If the image is unclear or irrelevant, set diagnosis to "Unknown" and treatment to "Please provide a clearer image.".
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: image,
                    mimeType: mimeType
                }
            }
        ]);

        const responseText = result.response.text();

        // Clean markdown if present
        const jsonStr = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const data = JSON.parse(jsonStr);

        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Visual Diagnosis Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to analyze image" },
            { status: 500 }
        );
    }
}
