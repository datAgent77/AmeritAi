import { BaseEcommercePlatform } from "../base-platform"
import type { EcomProduct, EcomOrder, EcomOrderStatus, EcomCoupon, EcomVariant } from "../types"

export class WooCommerceAdapter extends BaseEcommercePlatform {
    readonly platform = "woocommerce" as const

    private get baseUrl(): string {
        return (this.credentials.siteUrl || "").replace(/\/$/, "")
    }

    private get authHeaders(): HeadersInit {
        const credentials = `${this.credentials.consumerKey}:${this.credentials.consumerSecret}`
        const encoded = Buffer.from(credentials).toString("base64")
        return {
            Authorization: `Basic ${encoded}`,
            "Content-Type": "application/json",
        }
    }

    private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
        const res = await fetch(`${this.baseUrl}/wp-json/wc/v3${path}`, {
            ...options,
            headers: { ...this.authHeaders, ...(options.headers || {}) },
        })
        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }))
            throw new Error(`WooCommerce ${res.status}: ${err.message}`)
        }
        return res.json() as Promise<T>
    }

    async testConnection(): Promise<{ ok: boolean; storeName?: string; storeUrl?: string; error?: string }> {
        try {
            const data = await this.request<{ name?: string; url?: string }>("/system_status")
            return { ok: true, storeName: undefined, storeUrl: this.baseUrl }
        } catch {
            try {
                await this.request("/products?per_page=1")
                return { ok: true, storeUrl: this.baseUrl }
            } catch (e: any) {
                return { ok: false, error: e.message }
            }
        }
    }

    async getProducts(params?: { limit?: number; page?: number; updatedSince?: string }): Promise<EcomProduct[]> {
        const qs = new URLSearchParams()
        qs.set("per_page", String(Math.min(params?.limit ?? 100, 100)))
        qs.set("page", String(params?.page ?? 1))
        if (params?.updatedSince) qs.set("modified_after", params.updatedSince)

        const products = await this.request<any[]>(`/products?${qs}`)
        return (products || []).map(p => {
            const variants: EcomVariant[] = (p.variations || []).map((v: any) => ({
                id: String(v.id || v),
                sku: v.sku,
                title: (v.attributes || []).map((a: any) => a.option).join(" / "),
                attributes: Object.fromEntries((v.attributes || []).map((a: any) => [a.name, a.option])),
                price: parseFloat(v.price || p.price || "0"),
                stock: v.stock_quantity ?? (v.in_stock ? 999 : 0),
                imageUrl: v.image?.src,
            }))

            return {
                platformId: String(p.id),
                sku: p.sku,
                name: p.name,
                description: p.short_description?.replace(/<[^>]+>/g, "") || p.description?.replace(/<[^>]+>/g, "") || "",
                price: parseFloat(p.price || p.regular_price || "0"),
                compareAtPrice: p.regular_price && p.sale_price
                    ? parseFloat(p.regular_price)
                    : undefined,
                currency: "TRY",
                stock: p.stock_quantity ?? (p.in_stock ? 999 : 0),
                images: [p.images?.[0]?.src, ...(p.images?.slice(1).map((img: any) => img.src) || [])].filter(Boolean),
                category: p.categories?.[0]?.name || "",
                tags: (p.tags || []).map((t: any) => t.name),
                variants,
                url: p.permalink,
                isActive: p.status === "publish",
                weight: p.weight ? parseFloat(p.weight) : undefined,
                updatedAt: p.date_modified,
            }
        })
    }

    async getOrders(params?: { limit?: number; page?: number; status?: string; customerEmail?: string }): Promise<EcomOrder[]> {
        const qs = new URLSearchParams()
        qs.set("per_page", String(Math.min(params?.limit ?? 100, 100)))
        qs.set("page", String(params?.page ?? 1))
        if (params?.customerEmail) qs.set("search", params.customerEmail)

        const orders = await this.request<any[]>(`/orders?${qs}`)
        const statusMap: Record<string, EcomOrderStatus> = {
            pending: "pending", processing: "confirmed",
            "on-hold": "processing", completed: "delivered",
            cancelled: "cancelled", refunded: "refunded",
            failed: "cancelled",
        }

        return (orders || []).map(o => ({
            platformId: String(o.id),
            orderNumber: String(o.number),
            status: statusMap[o.status] || "pending",
            items: (o.line_items || []).map((li: any) => ({
                productId: String(li.product_id),
                sku: li.sku,
                name: li.name,
                quantity: li.quantity,
                price: parseFloat(li.price || "0"),
                currency: o.currency,
                variantTitle: li.variation_id ? `#${li.variation_id}` : undefined,
            })),
            customer: {
                name: `${o.billing?.first_name || ""} ${o.billing?.last_name || ""}`.trim(),
                email: o.billing?.email,
                phone: o.billing?.phone,
            },
            shippingAddress: o.shipping?.address_1
                ? {
                    name: `${o.shipping.first_name} ${o.shipping.last_name}`.trim(),
                    line1: o.shipping.address_1,
                    line2: o.shipping.address_2,
                    city: o.shipping.city,
                    province: o.shipping.state,
                    postalCode: o.shipping.postcode,
                    country: o.shipping.country,
                    phone: o.billing?.phone,
                  }
                : undefined,
            subtotal: parseFloat(o.subtotal || "0"),
            shippingCost: parseFloat(o.shipping_total || "0"),
            discount: parseFloat(o.discount_total || "0"),
            total: parseFloat(o.total || "0"),
            currency: o.currency,
            notes: o.customer_note || "",
            createdAt: o.date_created,
            updatedAt: o.date_modified,
        }))
    }

    async createCoupon(coupon: EcomCoupon): Promise<{ code: string; platformCouponId?: string } | null> {
        try {
            const data = await this.request<{ id: number; code: string }>("/coupons", {
                method: "POST",
                body: JSON.stringify({
                    code: coupon.code,
                    discount_type: coupon.discountType === "percent" ? "percent" : "fixed_cart",
                    amount: String(coupon.discountValue),
                    minimum_amount: coupon.minOrderAmount ? String(coupon.minOrderAmount) : undefined,
                    usage_limit: coupon.usageLimit,
                    date_expires: coupon.expiresAt?.split("T")[0],
                    description: coupon.description,
                }),
            })
            return { code: data.code, platformCouponId: String(data.id) }
        } catch {
            return null
        }
    }

    async registerWebhook(eventType: string, callbackUrl: string): Promise<boolean> {
        const topicMap: Record<string, string> = {
            "order.created": "order.created",
            "order.updated": "order.updated",
            "product.created": "product.created",
            "product.updated": "product.updated",
            "product.deleted": "product.deleted",
        }
        const topic = topicMap[eventType]
        if (!topic) return false

        try {
            await this.request("/webhooks", {
                method: "POST",
                body: JSON.stringify({
                    name: `Vion AI - ${eventType}`,
                    status: "active",
                    topic,
                    delivery_url: callbackUrl,
                }),
            })
            return true
        } catch {
            return false
        }
    }
}
