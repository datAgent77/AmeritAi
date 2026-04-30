import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { authorizeTargetAccess } from "@/lib/api-auth"
import {
    DEFAULT_MOBILE_APP_CONFIG,
    buildMobileHostedSessionSamplePayload,
    buildMobileAppSamplePayload,
    generateMobileClientToken,
    hashMobileClientToken,
    normalizeMobileAppIntegrationConfig,
    previewMobileClientToken,
    type MobileAppEnvironment,
    type MobileAppIntegrationMode,
} from "@/lib/integrations/mobile-support"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function loadConfig(adminDb: any, chatbotId: string) {
    const snap = await adminDb.collection("chatbots").doc(chatbotId).get()
    const data = snap.exists ? snap.data() || {} : {}
    return normalizeMobileAppIntegrationConfig(data.integrations?.mobileApp)
}

export async function GET(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })

        const { searchParams } = new URL(req.url)
        const chatbotId = searchParams.get("chatbotId") || ""
        if (!chatbotId) return NextResponse.json({ error: "Missing chatbotId" }, { status: 400 })

        const authz = await authorizeTargetAccess(req, chatbotId)
        if (!authz.ok) return authz.response

        const config = await loadConfig(adminDb, chatbotId)
        return NextResponse.json({
            config,
            samplePayload: buildMobileAppSamplePayload(chatbotId),
            hostedSessionPayload: buildMobileHostedSessionSamplePayload(chatbotId),
            endpoint: "/api/mobile-assistant/chat",
            sessionEndpoint: "/api/mobile-assistant/session",
            hostedChatUrlTemplate: `/chatbot-view?id=${encodeURIComponent(chatbotId)}&source=mobile_app&mobileSession=<mobileSession>`,
        })
    } catch (error: any) {
        console.error("[mobile-app/settings GET]", error)
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })

        const body = await req.json()
        const chatbotId = String(body.chatbotId || "").trim()
        if (!chatbotId) return NextResponse.json({ error: "Missing chatbotId" }, { status: 400 })

        const authz = await authorizeTargetAccess(req, chatbotId)
        if (!authz.ok) return authz.response

        const existing = await loadConfig(adminDb, chatbotId)
        const now = new Date().toISOString()
        const shouldGenerateToken = body.generateToken === true
        const generatedToken = shouldGenerateToken ? generateMobileClientToken() : null
        const environment: MobileAppEnvironment = body.environment === "production" ? "production" : "sandbox"
        const integrationMode: MobileAppIntegrationMode = body.mode === "hosted_chat" ? "hosted_chat" : "api_first"
        const allowedAppIds = Array.isArray(body.allowedAppIds)
            ? body.allowedAppIds.map((item: unknown) => String(item || "").trim()).filter(Boolean).slice(0, 20)
            : DEFAULT_MOBILE_APP_CONFIG.allowedAppIds

        const nextConfig = {
            enabled: body.enabled === true,
            mode: integrationMode,
            environment,
            allowedAppIds,
            clientTokenHash: generatedToken ? hashMobileClientToken(generatedToken) : existing.clientTokenHash || null,
            clientTokenPreview: generatedToken ? previewMobileClientToken(generatedToken) : existing.clientTokenPreview || null,
            clientTokenCreatedAt: generatedToken ? now : existing.clientTokenCreatedAt || null,
            updatedAt: now,
        }

        await adminDb.collection("chatbots").doc(chatbotId).set({
            integrations: {
                mobileApp: nextConfig,
            },
        }, { merge: true })

        return NextResponse.json({
            success: true,
            config: nextConfig,
            clientToken: generatedToken,
            samplePayload: buildMobileAppSamplePayload(chatbotId),
            hostedSessionPayload: buildMobileHostedSessionSamplePayload(chatbotId),
            endpoint: "/api/mobile-assistant/chat",
            sessionEndpoint: "/api/mobile-assistant/session",
            hostedChatUrlTemplate: `/chatbot-view?id=${encodeURIComponent(chatbotId)}&source=mobile_app&mobileSession=<mobileSession>`,
        })
    } catch (error: any) {
        console.error("[mobile-app/settings POST]", error)
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
    }
}
