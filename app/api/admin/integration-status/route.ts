import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/**
 * Reports the REAL configuration status of external integrations, based on the
 * presence of their server-side credentials. Super-admin only. The resource
 * dashboard uses this instead of hardcoded "connected" badges.
 */
export async function GET(req: Request) {
    const authz = await requireSuperAdmin(req);
    if (!authz.ok) return authz.response;

    // "Configured" = non-empty AND not a placeholder value (e.g. the .env.example
    // defaults like "your-...-key", "xxxx", "changeme"). This prevents placeholders
    // from being reported as connected.
    const PLACEHOLDER_MARKERS = ["your-", "your_", "yourkey", "changeme", "placeholder", "xxxx", "example", "<", "...", "sk-proj-your"];
    const has = (v?: string) => {
        if (typeof v !== "string") return false;
        const trimmed = v.trim();
        if (trimmed.length === 0) return false;
        const lower = trimmed.toLowerCase();
        return !PLACEHOLDER_MARKERS.some((m) => lower.includes(m));
    };
    const emailConfigured = has(process.env.RESEND_API_KEY) || (has(process.env.SMTP_HOST) && has(process.env.SMTP_USER));

    return NextResponse.json({
        openai: has(process.env.OPENAI_API_KEY),
        anthropic: has(process.env.ANTHROPIC_API_KEY),
        gemini: has(process.env.GEMINI_API_KEY),
        pinecone: has(process.env.PINECONE_API_KEY),
        elevenlabs: has(process.env.ELEVENLABS_API_KEY),
        email: emailConfigured,
        stripe: has(process.env.STRIPE_SECRET_KEY),
        upstash: has(process.env.UPSTASH_REDIS_REST_URL) && has(process.env.UPSTASH_REDIS_REST_TOKEN),
        // Firebase: admin (server) and client config presence.
        firebase: has(process.env.FIREBASE_CLIENT_EMAIL) && has(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
        firebaseStorage: has(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
    });
}
