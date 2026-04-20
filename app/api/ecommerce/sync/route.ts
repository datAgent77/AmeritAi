import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { authorizeTargetAccess } from "@/lib/api-auth"
import { createPlatformAdapter } from "@/lib/integrations/ecommerce/platform-registry"
import type { EcomPlatform } from "@/lib/integrations/ecommerce/types"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })

        const body = await req.json()
        const { chatbotId, platform, type = "all" } = body as {
            chatbotId: string
            platform: EcomPlatform
            type?: "all" | "products" | "orders"
        }

        if (!chatbotId || !platform) {
            return NextResponse.json({ error: "chatbotId ve platform zorunlu" }, { status: 400 })
        }

        const authz = await authorizeTargetAccess(req, chatbotId)
        if (!authz.ok) return authz.response

        // Bağlantıyı al
        const snap = await adminDb
            .collection("ecommerce_connections")
            .where("chatbotId", "==", chatbotId)
            .where("platform", "==", platform)
            .limit(1)
            .get()

        if (snap.empty) {
            return NextResponse.json({ error: "Platform bağlantısı bulunamadı" }, { status: 404 })
        }

        const connectionDoc = snap.docs[0]
        const connection = connectionDoc.data()

        const adapter = await createPlatformAdapter(platform, connection.credentials)
        const start = Date.now()
        let syncedProducts = 0
        let syncedOrders = 0
        const errors: string[] = []

        if (type === "all" || type === "products") {
            try {
                const products = await adapter.getProducts({ limit: 250 })
                for (const product of products) {
                    try {
                        await adapter.upsertProduct(chatbotId, product, adminDb)
                        syncedProducts++
                    } catch (e: any) {
                        errors.push(`Product ${product.platformId}: ${e.message}`)
                    }
                }
                await connectionDoc.ref.update({
                    syncedProductCount: syncedProducts,
                    lastProductSyncAt: new Date().toISOString(),
                })
            } catch (e: any) {
                errors.push(`Product sync: ${e.message}`)
            }
        }

        if (type === "all" || type === "orders") {
            try {
                const orders = await adapter.getOrders({ limit: 250 })
                for (const order of orders) {
                    try {
                        await adapter.upsertOrder(chatbotId, order, adminDb)
                        syncedOrders++
                    } catch (e: any) {
                        errors.push(`Order ${order.platformId}: ${e.message}`)
                    }
                }
                await connectionDoc.ref.update({
                    syncedOrderCount: syncedOrders,
                    lastOrderSyncAt: new Date().toISOString(),
                    status: "active",
                    updatedAt: new Date().toISOString(),
                })
            } catch (e: any) {
                errors.push(`Order sync: ${e.message}`)
            }
        }

        // Webhook audit log
        await adminDb.collection("ecommerce_webhooks_log").add({
            chatbotId,
            platform,
            event: "manual_sync",
            result: { syncedProducts, syncedOrders, errors },
            processedAt: new Date().toISOString(),
        })

        return NextResponse.json({
            success: errors.length === 0,
            syncedProducts,
            syncedOrders,
            durationMs: Date.now() - start,
            errors: errors.length > 0 ? errors : undefined,
        })
    } catch (error: any) {
        console.error("ecommerce/sync POST:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
