import { NextResponse } from "next/server";
import OpenAI from "openai";
import { normalizeConversationLanguage } from "@/lib/conversation-language";

export const runtime = 'nodejs';

export async function POST(req: Request) {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
        }

        const formData = await req.formData();
        const audioFile = formData.get('audio') as File | null;
        const requestedLanguage = normalizeConversationLanguage(formData.get('language') as string | null);

        if (!audioFile) {
            return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
        }

        const openai = new OpenAI({ apiKey });

        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: "gpt-4o-mini-transcribe",
            ...(requestedLanguage ? { language: requestedLanguage } : {}),
            chunking_strategy: "auto",
            response_format: "json",
        });

        return NextResponse.json({
            text: transcription.text,
            success: true
        });

    } catch (error) {
        console.error("Transcription Error:", error);
        return NextResponse.json({
            error: "Transcription failed",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
