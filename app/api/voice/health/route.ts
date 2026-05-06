import { NextResponse } from "next/server";
import { authorizeTargetAccess } from "@/lib/api-auth";

export const runtime = "nodejs";

type HealthStatus = "ready" | "warning" | "blocked";

function result(status: HealthStatus, message: string, details?: Record<string, unknown>) {
    return { status, message, details: details || {} };
}

function resolveElevenLabsHealthFailure(status: number) {
    if (status === 401) {
        return "ElevenLabs API key geçersiz veya yetkisiz. API anahtarını kontrol edip tekrar kaydedin.";
    }
    if (status === 402) {
        return "ElevenLabs hesabı bu ses için ücretli plan gerektiriyor. Planı yükseltin veya OpenAI ses motorunu kullanın.";
    }
    if (status === 404) {
        return "ElevenLabs Voice ID bulunamadı. Voice ID değerini kontrol edin.";
    }
    if (status === 429) {
        return "ElevenLabs rate limit sınırına ulaştı. Bir süre sonra tekrar deneyin.";
    }
    return `ElevenLabs check failed with ${status}.`;
}

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const chatbotId = typeof body?.chatbotId === "string" ? body.chatbotId : "";
        if (!chatbotId) {
            return NextResponse.json({ error: "Missing chatbotId" }, { status: 400 });
        }

        const authz = await authorizeTargetAccess(req, chatbotId);
        if (!authz.ok) {
            return authz.response;
        }

        const provider = body?.enableElevenLabs === true || body?.voiceProvider === "elevenlabs"
            ? "elevenlabs"
            : "openai";
        const openAi = process.env.OPENAI_API_KEY
            ? result("ready", "OpenAI speech provider is configured.")
            : result("blocked", "OPENAI_API_KEY is not configured.");

        let elevenLabs = result("warning", "ElevenLabs is disabled for this tenant.");

        if (provider === "elevenlabs") {
            const apiKey = typeof body?.elevenLabsApiKey === "string" ? body.elevenLabsApiKey.trim() : "";
            const voiceId = typeof body?.elevenLabsVoiceId === "string" ? body.elevenLabsVoiceId.trim() : "";

            if (!apiKey || !voiceId) {
                elevenLabs = result("blocked", "ElevenLabs API key and Voice ID are required.");
            } else {
                const startedAt = Date.now();
                const response = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
                    method: "GET",
                    headers: { "xi-api-key": apiKey },
                    cache: "no-store",
                });
                const latencyMs = Date.now() - startedAt;

                if (response.ok) {
                    elevenLabs = result("ready", "ElevenLabs voice can be reached.", { latencyMs });
                } else {
                    const details = await response.text().catch(() => "");
                    elevenLabs = result("blocked", resolveElevenLabsHealthFailure(response.status), {
                        status: response.status,
                        latencyMs,
                        details: details.slice(0, 500),
                    });
                }
            }
        }

        const selected = provider === "elevenlabs" ? elevenLabs : openAi;
        return NextResponse.json({
            provider,
            openAi,
            elevenLabs,
            selected,
            checkedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error("[Voice] Health check failed:", error);
        return NextResponse.json({
            error: "Voice health check failed",
            details: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}
