import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 });
        }

        const body = await req.json();
        const { text, voiceId, chatbotId } = body;

        if (!text || !chatbotId) {
            return NextResponse.json({ error: "Missing text or chatbotId" }, { status: 400 });
        }

        // Fetch user's ElevenLabs API key from the 'users' collection
        // In this project, chatbotId often matches the userId (tenantId)
        const userDoc = await adminDb.collection("users").doc(chatbotId).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "User configuration not found" }, { status: 404 });
        }

        const userData = userDoc.data();
        const apiKey = userData?.elevenLabsApiKey;

        if (!apiKey) {
            return NextResponse.json({ error: "ElevenLabs API Key not configured" }, { status: 400 });
        }

        const actualVoiceId = voiceId || userData?.elevenLabsVoiceId || "21m00Tcm4TlvDq8ikWAM";

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${actualVoiceId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "xi-api-key": apiKey
            },
            body: JSON.stringify({
                text: text,
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("ElevenLabs Error:", error);
            return NextResponse.json({ error: "ElevenLabs API Error" }, { status: response.status });
        }

        const audioBuffer = await response.arrayBuffer();

        return new NextResponse(audioBuffer, {
            headers: {
                "Content-Type": "audio/mpeg"
            }
        });

    } catch (error) {
        console.error("ElevenLabs Proxy Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
