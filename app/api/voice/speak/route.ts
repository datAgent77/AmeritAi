import { NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/voice-speech";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            text,
            chatbotId,
            voiceId,
            preferredVoice,
            provider,
            language,
        } = body || {};

        if (!text || typeof text !== "string") {
            return NextResponse.json({ error: "Missing text" }, { status: 400 });
        }

        const audioBuffer = await synthesizeSpeech({
            text,
            chatbotId: typeof chatbotId === "string" ? chatbotId : null,
            voiceId: typeof voiceId === "string" ? voiceId : null,
            preferredVoice: typeof preferredVoice === "string" ? preferredVoice : null,
            provider: typeof provider === "string" ? provider : null,
            language: typeof language === "string" ? language : null,
        });

        return new NextResponse(audioBuffer, {
            headers: {
                "Content-Type": "audio/mpeg",
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("[Voice] Speak route failed:", error);
        return NextResponse.json({
            error: "Speech synthesis failed",
            details: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}
