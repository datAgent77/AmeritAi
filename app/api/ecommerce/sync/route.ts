import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { authorizeTargetAccess } from "@/lib/api-auth"
import { createPlatformAdapter } from "@/lib/integrations/ecommerce/platform-registry"
import { decryptEcomCredentials } from "@/lib/integrations/ecommerce/credentials-cipher"
import type { EcomPlatform } from "@/lib/integrations/ecommerce/types"

export const runtime = "nodejs"
export const maxDuration = 60

const PAGE_SIZE = 100
const MAX_PAGES = 20
const PAGED_SYNC_PLATFORMS = new Set<EcomPlatform>(["ideasoft", "ticimax", "tsoft", "woocommerce"])
const UPDATED_SINCE_PLATFORMS = new Set<EcomPlatform>(["shopify", "ideasoft", "woocommerce"])

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
        const credentials = decryptEcomCredentials(connection.credentials || {})
        const adapter = await createPlatformAdapter(platform, credentials)
        const start = Date.now()
        let syncedProducts = 0
        let syncedOrders = 0
        const errors: string[] = []
        const warnings: string[] = []
        const nowIso = new Date().toISOString()
        const supportsPagedSync = PAGED_SYNC_PLATFORMS.has(platform)

        if (type === "all" || type === "products") {
            try {
                const updatedSince = UPDATED_SINCE_PLATFORMS.has(platform)
                    ? connection.lastProductSyncAt || undefined
                    : undefined

                for (let page = 1; page <= MAX_PAGES; page++) {
                    const products = await adapter.getProducts({
                        limit: PAGE_SIZE,
                        page: supportsPagedSync ? page : undefined,
                        updatedSince,
                    })

                    for (const product of products) {
                        try {
                            await adapter.upsertProduct(chatbotId, product, adminDb)
                            syncedProducts++
                        } catch (e: any) {
                            errors.push(`Product ${product.platformId}: ${e.message}`)
                        }
                    }

                    if (!supportsPagedSync || products.length < PAGE_SIZE) {
                        break
                    }

                    if (page === MAX_PAGES) {
                        warnings.push("Product sync page limiti doldu; kalan kayıtlar sonraki sync'e kaldı.")
                    }
                }

                await connectionDoc.ref.update({
                    syncedProductCount: syncedProducts,
                    lastProductSyncAt: nowIso,
                })
            } catch (e: any) {
                errors.push(`Product sync: ${e.message}`)
            }
        }

        if (type === "all" || type === "orders") {
            try {
                for (let page = 1; page <= MAX_PAGES; page++) {
                    const orders = await adapter.getOrders({
                        limit: PAGE_SIZE,
                        page: supportsPagedSync ? page : undefined,
                    })

                    for (const order of orders) {
                        try {
                            await adapter.upsertOrder(chatbotId, order, adminDb)
                            syncedOrders++
                        } catch (e: any) {
                            errors.push(`Order ${order.platformId}: ${e.message}`)
                        }
                    }

                    if (!supportsPagedSync || orders.length < PAGE_SIZE) {
                        break
                    }

                    if (page === MAX_PAGES) {
                        warnings.push("Order sync page limiti doldu; kalan kayıtlar sonraki sync'e kaldı.")
                    }
                }

                await connectionDoc.ref.update({
                    syncedOrderCount: syncedOrders,
                    lastOrderSyncAt: nowIso,
                    status: "active",
                    updatedAt: nowIso,
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
            result: { syncedProducts, syncedOrders, errors, warnings },
            processedAt: new Date().toISOString(),
        })

        return NextResponse.json({
            success: errors.length === 0,
            syncedProducts,
            syncedOrders,
            durationMs: Date.now() - start,
            errors: errors.length > 0 ? errors : undefined,
            warnings: warnings.length > 0 ? warnings : undefined,
        })
    } catch (error: any) {
        console.error("ecommerce/sync POST:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
