import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { authorizeTargetAccess } from "@/lib/api-auth"
import { createPlatformAdapter, PLATFORM_META } from "@/lib/integrations/ecommerce/platform-registry"
import { encryptEcomCredentials } from "@/lib/integrations/ecommerce/credentials-cipher"
import type { EcomPlatform, EcomCredentials } from "@/lib/integrations/ecommerce/types"

export const runtime = "nodejs"

const WEBHOOK_EVENTS = [
    "product.created",
    "product.updated",
    "product.deleted",
    "order.created",
    "order.updated",
    "order.shipped",
    "order.cancelled",
]

function resolvePublicBaseUrl(req: Request): string {
    const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
    if (configured) return configured.replace(/\/$/, "")

    const url = new URL(req.url)
    return `${url.protocol}//${url.host}`.replace(/\/$/, "")
}

// POST: Yeni platform bağlantısı kur veya güncelle
export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })

        const body = await req.json()
        const { chatbotId, platform, credentials } = body as {
            chatbotId: string
            platform: EcomPlatform
            credentials: EcomCredentials
        }

        if (!chatbotId || !platform || !credentials) {
            return NextResponse.json({ error: "chatbotId, platform ve credentials zorunlu" }, { status: 400 })
        }

        if (!PLATFORM_META[platform]) {
            return NextResponse.json({ error: "Geçersiz platform" }, { status: 400 })
        }

        const authz = await authorizeTargetAccess(req, chatbotId)
        if (!authz.ok) return authz.response

        // Bağlantıyı test et
        const adapter = await createPlatformAdapter(platform, credentials)
        const test = await adapter.testConnection()

        if (!test.ok) {
            return NextResponse.json({ error: test.error || "Bağlantı başarısız" }, { status: 422 })
        }

        // Mevcut bağlantıyı kontrol et
        const existing = await adminDb
            .collection("ecommerce_connections")
            .where("chatbotId", "==", chatbotId)
            .where("platform", "==", platform)
            .limit(1)
            .get()

        const now = new Date().toISOString()
        const encryptedCredentials = encryptEcomCredentials(credentials)
        const callbackUrl = `${resolvePublicBaseUrl(req)}/api/ecommerce/webhook/${platform}?chatbotId=${encodeURIComponent(chatbotId)}`
        let webhookRegistered = false

        if (PLATFORM_META[platform]?.webhookSupport) {
            const results = await Promise.allSettled(
                WEBHOOK_EVENTS.map((eventType) => adapter.registerWebhook(eventType, callbackUrl))
            )
            webhookRegistered = results.some(
                (result) => result.status === "fulfilled" && result.value === true
            )
        }

        const connectionData = {
            chatbotId,
            platform,
            credentials: encryptedCredentials,
            status: "active",
            storeName: test.storeName || null,
            storeUrl: test.storeUrl || null,
            syncedProductCount: 0,
            syncedOrderCount: 0,
            webhookRegistered,
            updatedAt: now,
        }

        let connectionId: string
        if (existing.empty) {
            const ref = await adminDb.collection("ecommerce_connections").add({
                ...connectionData,
                createdAt: now,
            })
            connectionId = ref.id
        } else {
            connectionId = existing.docs[0].id
            await existing.docs[0].ref.update(connectionData)
        }

        return NextResponse.json({
            success: true,
            connectionId,
            storeName: test.storeName,
            storeUrl: test.storeUrl,
        })
    } catch (error: any) {
        console.error("ecommerce/connect POST:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// DELETE: Platform bağlantısını kaldır
export async function DELETE(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })

        const { searchParams } = new URL(req.url)
        const chatbotId = searchParams.get("chatbotId")
        const platform = searchParams.get("platform") as EcomPlatform

        if (!chatbotId || !platform) {
            return NextResponse.json({ error: "chatbotId ve platform zorunlu" }, { status: 400 })
        }

        const authz = await authorizeTargetAccess(req, chatbotId)
        if (!authz.ok) return authz.response

        const snap = await adminDb
            .collection("ecommerce_connections")
            .where("chatbotId", "==", chatbotId)
            .where("platform", "==", platform)
            .limit(1)
            .get()

        if (!snap.empty) {
            await snap.docs[0].ref.delete()
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
