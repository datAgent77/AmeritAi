import crypto from "crypto"
import { NextResponse } from "next/server"
import { authorizeOmniRequest, authorizedForOmniPermission, getRequestOrigin, jsonError } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

function generateAccessToken() {
    return `omni_${crypto.randomBytes(16).toString("hex")}`
}

function generateWebhookSecret() {
    return `whsec_${crypto.randomBytes(16).toString("hex")}`
}

function normalizeDeveloper(data: any, origin: string) {
    const config = data?.omniDeveloper || {}
    return {
        accessToken: config.accessToken || null,
        webhookUrl: config.webhookUrl || "",
        webhookSecret: config.webhookSecret || null,
        docsUrl: `${origin}/omni/settings`,
        webhookEvents: [
            "conversation.created",
            "callback.created",
            "lead.created",
            "appointment.created",
            "delivery.failed",
        ],
        updatedAt: config.updatedAt || null,
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const chatbotId = searchParams.get("chatbotId")

    if (!chatbotId) {
        return jsonError("chatbotId is required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "accountCenter.view")) {
        return jsonError("Forbidden", 403)
    }

    const userSnap = await authz.adminDb.collection("users").doc(chatbotId).get()
    const userData = userSnap.exists ? userSnap.data() || {} : {}

    return NextResponse.json({
        developer: normalizeDeveloper(userData, getRequestOrigin(req)),
    })
}

export async function POST(req: Request) {
    const body = await req.json().catch(() => null)
    const chatbotId = typeof body?.chatbotId === "string" ? body.chatbotId : ""
    const action = typeof body?.action === "string" ? body.action : "save"

    if (!chatbotId) {
        return jsonError("chatbotId is required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "accountCenter.manage")) {
        return jsonError("Forbidden", 403)
    }

    const userRef = authz.adminDb.collection("users").doc(chatbotId)
    const userSnap = await userRef.get()
    const userData = userSnap.exists ? userSnap.data() || {} : {}
    const current = userData?.omniDeveloper || {}

    const nextConfig: Record<string, unknown> = {
        accessToken: current.accessToken || null,
        webhookUrl: current.webhookUrl || "",
        webhookSecret: current.webhookSecret || null,
        updatedAt: new Date().toISOString(),
    }

    if (action === "regenerate_token") {
        nextConfig.accessToken = generateAccessToken()
    }

    if (action === "regenerate_secret") {
        nextConfig.webhookSecret = generateWebhookSecret()
    }

    if (action === "bootstrap") {
        nextConfig.accessToken = nextConfig.accessToken || generateAccessToken()
        nextConfig.webhookSecret = nextConfig.webhookSecret || generateWebhookSecret()
    }

    if (action === "save") {
        const webhookUrl = typeof body?.webhookUrl === "string" ? body.webhookUrl.trim() : ""
        if (webhookUrl && !/^https?:\/\//i.test(webhookUrl)) {
            return jsonError("webhookUrl must start with http:// or https://", 400)
        }
        nextConfig.webhookUrl = webhookUrl
    }

    await userRef.set({ omniDeveloper: nextConfig }, { merge: true })

    return NextResponse.json({
        success: true,
        developer: {
            ...normalizeDeveloper({ omniDeveloper: nextConfig }, getRequestOrigin(req)),
            accessToken: nextConfig.accessToken || null,
            webhookSecret: nextConfig.webhookSecret || null,
        },
    })
}
