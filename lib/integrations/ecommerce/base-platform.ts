import type {
    EcomCredentials,
    EcomProduct,
    EcomOrder,
    EcomCoupon,
    EcomSyncResult,
    EcomPlatform,
} from "./types"

export abstract class BaseEcommercePlatform {
    abstract readonly platform: EcomPlatform

    constructor(protected credentials: EcomCredentials) {}

    // ── Zorunlu metotlar ────────────────────────────────────────────────────

    abstract testConnection(): Promise<{ ok: boolean; storeName?: string; storeUrl?: string; error?: string }>

    abstract getProducts(params?: { limit?: number; page?: number; updatedSince?: string }): Promise<EcomProduct[]>

    abstract getOrders(params?: { limit?: number; page?: number; status?: string; customerEmail?: string }): Promise<EcomOrder[]>

    // ── Opsiyonel metotlar (platform destekliyorsa override edilir) ─────────

    async getOrder(platformOrderId: string): Promise<EcomOrder | null> {
        return null
    }

    async getOrdersByCustomer(emailOrPhone: string): Promise<EcomOrder[]> {
        return this.getOrders({ customerEmail: emailOrPhone })
    }

    async createCoupon(coupon: EcomCoupon): Promise<{ code: string; platformCouponId?: string } | null> {
        return null
    }

    async updateProductStock(platformProductId: string, stock: number, variantId?: string): Promise<boolean> {
        return false
    }

    async registerWebhook(eventType: string, callbackUrl: string): Promise<boolean> {
        return false
    }

    // ── Sync helper ─────────────────────────────────────────────────────────

    async syncAll(chatbotId: string, db: any): Promise<EcomSyncResult> {
        const start = Date.now()
        const errors: string[] = []
        let syncedProducts = 0
        let syncedOrders = 0

        try {
            // Ürünleri sync et
            const products = await this.getProducts({ limit: 250 })
            for (const product of products) {
                try {
                    await this.upsertProduct(chatbotId, product, db)
                    syncedProducts++
                } catch (e: any) {
                    errors.push(`Product ${product.platformId}: ${e.message}`)
                }
            }
        } catch (e: any) {
            errors.push(`Product sync failed: ${e.message}`)
        }

        try {
            // Siparişleri sync et (son 90 gün)
            const orders = await this.getOrders({ limit: 250 })
            for (const order of orders) {
                try {
                    await this.upsertOrder(chatbotId, order, db)
                    syncedOrders++
                } catch (e: any) {
                    errors.push(`Order ${order.platformId}: ${e.message}`)
                }
            }
        } catch (e: any) {
            errors.push(`Order sync failed: ${e.message}`)
        }

        return {
            platform: this.platform,
            success: errors.length === 0,
            syncedProducts,
            syncedOrders,
            errors: errors.length > 0 ? errors : undefined,
            durationMs: Date.now() - start,
        }
    }

    // ── Firestore yazma ─────────────────────────────────────────────────────

    protected async upsertProduct(chatbotId: string, product: EcomProduct, db: any): Promise<void> {
        const snap = await db
            .collection("products")
            .where("chatbotId", "==", chatbotId)
            .where("platformId", "==", product.platformId)
            .where("platformSource", "==", this.platform)
            .limit(1)
            .get()

        const data = {
            chatbotId,
            platformId: product.platformId,
            platformSource: this.platform,
            name: product.name,
            description: product.description || "",
            price: product.price,
            compareAtPrice: product.compareAtPrice ?? null,
            currency: product.currency,
            stockQuantity: product.stock,
            inStock: product.stock > 0,
            imageUrl: product.images[0] || "",
            images: product.images,
            category: product.category || "",
            tags: product.tags || [],
            variants: product.variants || [],
            url: product.url || "",
            sku: product.sku || "",
            isActive: product.isActive,
            source: this.platform,
            updatedAt: new Date().toISOString(),
        }

        if (snap.empty) {
            await db.collection("products").add({ ...data, createdAt: new Date().toISOString() })
        } else {
            await snap.docs[0].ref.update(data)
        }
    }

    protected async upsertOrder(chatbotId: string, order: EcomOrder, db: any): Promise<void> {
        const snap = await db
            .collection("ecommerce_orders")
            .where("chatbotId", "==", chatbotId)
            .where("platformId", "==", order.platformId)
            .where("platform", "==", this.platform)
            .limit(1)
            .get()

        const data = {
            chatbotId,
            platform: this.platform,
            platformId: order.platformId,
            orderNumber: order.orderNumber,
            status: order.status,
            items: order.items,
            customer: order.customer,
            shippingAddress: order.shippingAddress ?? null,
            subtotal: order.subtotal,
            shippingCost: order.shippingCost ?? 0,
            discount: order.discount ?? 0,
            total: order.total,
            currency: order.currency,
            trackingNumber: order.trackingNumber ?? null,
            trackingUrl: order.trackingUrl ?? null,
            cargoCompany: order.cargoCompany ?? null,
            notes: order.notes ?? "",
            createdAt: order.createdAt,
            updatedAt: new Date().toISOString(),
        }

        if (snap.empty) {
            await db.collection("ecommerce_orders").add(data)
        } else {
            await snap.docs[0].ref.update(data)
        }
    }
}
