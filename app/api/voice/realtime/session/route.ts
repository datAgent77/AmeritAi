import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const ELEVENLABS_TOKEN_URL = "https://api.elevenlabs.io/v1/convai/conversation/token";
const SERVER_LOCATIONS = new Set(["global", "eu-residency", "us", "in-residency"]);

function normalizeServerLocation(value: unknown) {
    const normalized = typeof value === "string" ? value.trim() : "";
    return SERVER_LOCATIONS.has(normalized) ? normalized : "global";
}

function normalizeConvaiEnvironment(value: unknown) {
    const normalized = typeof value === "string" ? value.trim() : "";
    return normalized || "production";
}

async function readTenantVoiceSettings(chatbotId: string) {
    const adminDb = getAdminDb();
    if (!adminDb) return {};

    const [userSnap, chatbotSnap] = await Promise.all([
        adminDb.collection("users").doc(chatbotId).get().catch(() => null),
        adminDb.collection("chatbots").doc(chatbotId).get().catch(() => null),
    ]);

    return {
        ...(userSnap?.exists ? userSnap.data() : {}),
        ...(chatbotSnap?.exists ? chatbotSnap.data() : {}),
    } as Record<string, unknown>;
}

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const chatbotId = typeof body?.chatbotId === "string" ? body.chatbotId.trim() : "";

        if (!chatbotId) {
            return NextResponse.json({ error: "Missing chatbotId" }, { status: 400 });
        }

        const tenantSettings = await readTenantVoiceSettings(chatbotId);
        const apiKey = String(tenantSettings.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY || "").trim();
        const agentId = String(tenantSettings.elevenLabsAgentId || process.env.ELEVENLABS_AGENT_ID || "").trim();
        const serverLocation = normalizeServerLocation(tenantSettings.elevenLabsServerLocation);
        const environment = normalizeConvaiEnvironment(process.env.ELEVENLABS_CONVAI_ENVIRONMENT);

        if (!apiKey) {
            return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 503 });
        }

        if (!agentId) {
            return NextResponse.json({ error: "ElevenLabs agent ID not configured" }, { status: 503 });
        }

        const tokenUrl = new URL(ELEVENLABS_TOKEN_URL);
        tokenUrl.searchParams.set("agent_id", agentId);
        tokenUrl.searchParams.set("environment", environment);

        const response = await fetch(tokenUrl, {
            method: "GET",
            headers: {
                "xi-api-key": apiKey,
            },
            cache: "no-store",
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok || typeof payload?.token !== "string" || !payload.token.trim()) {
            return NextResponse.json({
                error: "ElevenLabs realtime session failed",
                details: payload?.detail || payload?.message || `ElevenLabs token request failed with status ${response.status}`,
            }, { status: response.ok ? 502 : response.status });
        }

        return NextResponse.json({
            provider: "elevenlabs",
            token: payload.token,
            agentId,
            serverLocation,
        });
    } catch (error) {
        console.error("[Voice] Realtime session failed:", error);
        return NextResponse.json({
            error: "Realtime voice session failed",
            details: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}
