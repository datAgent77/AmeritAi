import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { createPlatformAdapter } from "@/lib/integrations/ecommerce/platform-registry"
import type { EcomPlatform } from "@/lib/integrations/ecommerce/types"
import crypto from "crypto"

export const runtime = "nodejs"

function verifyShopifyHmac(rawBody: string, hmacHeader: string, secret: string): boolean {
    const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("base64")
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader))
}

export async function POST(req: Request, { params }: { params: { platform: string } }) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })

        const platform = params.platform as EcomPlatform
        const rawBody = await req.text()
        let payload: Record<string, any>

        try {
            payload = JSON.parse(rawBody)
        } catch {
            return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
        }

        // chatbotId query param ile eşleşen bağlantıyı bul
        const { searchParams } = new URL(req.url)
        const chatbotId = searchParams.get("chatbotId")

        if (!chatbotId) {
            return NextResponse.json({ error: "chatbotId required" }, { status: 400 })
        }

        const connSnap = await adminDb
            .collection("ecommerce_connections")
            .where("chatbotId", "==", chatbotId)
            .where("platform", "==", platform)
            .limit(1)
            .get()

        if (connSnap.empty) {
            return NextResponse.json({ error: "Connection not found" }, { status: 404 })
        }

        const connection = connSnap.docs[0].data()

        // Platform bazlı imza doğrulama
        if (platform === "shopify") {
            const hmacHeader = req.headers.get("x-shopify-hmac-sha256") || ""
            const secret = connection.credentials?.webhookSecret || ""
            if (secret && !verifyShopifyHmac(rawBody, hmacHeader, secret)) {
                return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
            }
        }

        if (platform === "woocommerce") {
            const signature = req.headers.get("x-wc-webhook-signature") || ""
            const secret = connection.credentials?.webhookSecret || ""
            if (secret) {
                const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("base64")
                if (!crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))) {
                    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
                }
            }
        }

        // Shopify header'ından event tipini al
        const shopifyTopic = req.headers.get("x-shopify-topic") || ""
        const wooTopic = req.headers.get("x-wc-webhook-topic") || ""
        const rawEvent = shopifyTopic || wooTopic || payload.event || "unknown"

        // Normalize event ismi
        const eventMap: Record<string, string> = {
            "products/create": "product.created",
            "products/update": "product.updated",
            "products/delete": "product.deleted",
            "orders/create": "order.created",
            "orders/updated": "order.updated",
            "orders/fulfilled": "order.shipped",
            "orders/cancelled": "order.cancelled",
            "product.created": "product.created",
            "product.updated": "product.updated",
            "order.created": "order.created",
            "order.updated": "order.updated",
            "order.deleted": "order.cancelled",
        }
        const normalizedEvent = eventMap[rawEvent] || rawEvent

        const logRef = await adminDb.collection("ecommerce_webhooks_log").add({
            chatbotId,
            platform,
            event: normalizedEvent,
            rawEvent,
            payload,
            processedAt: new Date().toISOString(),
            status: "processing",
        })

        // Adapter ile gerçek işlemi yap
        try {
            const adapter = await createPlatformAdapter(platform, connection.credentials)

            if (normalizedEvent.startsWith("product.")) {
                const platformProductId = payload.id?.toString() || payload.product?.id?.toString()
                if (platformProductId) {
                    // Tek ürünü yeniden sync et
                    const products = await adapter.getProducts({ limit: 1 })
                    const product = products.find(p => p.platformId === platformProductId)
                    if (product) {
                        await (adapter as any).upsertProduct(chatbotId, product, adminDb)
                    }
                }
            } else if (normalizedEvent.startsWith("order.")) {
                const platformOrderId = payload.id?.toString() || payload.order?.id?.toString()
                if (platformOrderId) {
                    const order = await adapter.getOrder(platformOrderId)
                    if (order) {
                        await (adapter as any).upsertOrder(chatbotId, order, adminDb)
                    }
                }
            }

            await logRef.update({ status: "done" })
        } catch (e: any) {
            await logRef.update({ status: "error", error: e.message })
        }

        return NextResponse.json({ received: true })
    } catch (error: any) {
        console.error("ecommerce/webhook POST:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
