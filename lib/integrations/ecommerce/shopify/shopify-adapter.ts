import { BaseEcommercePlatform } from "../base-platform"
import type { EcomCredentials, EcomProduct, EcomOrder, EcomOrderStatus, EcomVariant } from "../types"

const API_VERSION = "2024-10"

function mapStatus(shopifyStatus: string, fulfillmentStatus: string | null): EcomOrderStatus {
    if (shopifyStatus === "cancelled") return "cancelled"
    if (shopifyStatus === "refunded" || shopifyStatus === "voided") return "refunded"
    if (fulfillmentStatus === "fulfilled") return "delivered"
    if (fulfillmentStatus === "partial") return "shipped"
    if (shopifyStatus === "open") return "confirmed"
    return "pending"
}

export class ShopifyAdapter extends BaseEcommercePlatform {
    readonly platform = "shopify" as const

    private get baseUrl(): string {
        const domain = (this.credentials.shopDomain || "")
            .replace(/^https?:\/\//, "")
            .replace(/\/$/, "")
        return `https://${domain}/admin/api/${API_VERSION}`
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const res = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: {
                "X-Shopify-Access-Token": this.credentials.accessToken || "",
                "Content-Type": "application/json",
                ...(options.headers || {}),
            },
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.errors || `Shopify ${res.status}: ${res.statusText}`)
        return data as T
    }

    async testConnection(): Promise<{ ok: boolean; storeName?: string; storeUrl?: string; error?: string }> {
        try {
            const data = await this.request<{ shop: any }>("/shop.json")
            return {
                ok: true,
                storeName: data.shop.name,
                storeUrl: `https://${data.shop.domain}`,
            }
        } catch (e: any) {
            return { ok: false, error: e.message }
        }
    }

    async getProducts(params?: { limit?: number; page?: number; updatedSince?: string }): Promise<EcomProduct[]> {
        const qs = new URLSearchParams()
        qs.set("limit", String(params?.limit ?? 250))
        qs.set("status", "active")
        if (params?.updatedSince) qs.set("updated_at_min", params.updatedSince)

        const data = await this.request<{ products: any[] }>(`/products.json?${qs}`)
        return (data.products || []).map(p => {
            const variants: EcomVariant[] = (p.variants || []).map((v: any) => ({
                id: String(v.id),
                sku: v.sku,
                title: v.title,
                attributes: v.title !== "Default Title"
                    ? Object.fromEntries(
                        (p.options || []).map((o: any, i: number) => [o.name, v[`option${i + 1}`]])
                      )
                    : {},
                price: parseFloat(v.price || "0"),
                compareAtPrice: v.compare_at_price ? parseFloat(v.compare_at_price) : undefined,
                stock: v.inventory_quantity ?? 0,
                imageUrl: v.image_id
                    ? (p.images || []).find((img: any) => img.id === v.image_id)?.src
                    : undefined,
            }))

            const totalStock = variants.reduce((sum, v) => sum + v.stock, 0)

            return {
                platformId: String(p.id),
                sku: p.variants?.[0]?.sku,
                name: p.title,
                description: p.body_html?.replace(/<[^>]+>/g, "") || "",
                price: parseFloat(p.variants?.[0]?.price || "0"),
                compareAtPrice: p.variants?.[0]?.compare_at_price
                    ? parseFloat(p.variants[0].compare_at_price)
                    : undefined,
                currency: "TRY",
                stock: totalStock,
                images: (p.images || []).map((img: any) => img.src),
                category: p.product_type || "",
                tags: p.tags ? p.tags.split(",").map((t: string) => t.trim()) : [],
                variants,
                url: `https://${this.credentials.shopDomain}/products/${p.handle}`,
                isActive: p.status === "active",
                weight: p.variants?.[0]?.weight,
                updatedAt: p.updated_at,
            }
        })
    }

    async getOrders(params?: { limit?: number; page?: number; status?: string; customerEmail?: string }): Promise<EcomOrder[]> {
        const qs = new URLSearchParams()
        qs.set("limit", String(params?.limit ?? 250))
        qs.set("status", "any")
        if (params?.customerEmail) qs.set("email", params.customerEmail)

        const data = await this.request<{ orders: any[] }>(`/orders.json?${qs}`)
        return (data.orders || []).map(o => ({
            platformId: String(o.id),
            orderNumber: o.name,
            status: mapStatus(o.financial_status, o.fulfillment_status),
            items: (o.line_items || []).map((li: any) => ({
                productId: String(li.product_id),
                sku: li.sku,
                name: li.name,
                quantity: li.quantity,
                price: parseFloat(li.price || "0"),
                currency: o.currency,
                variantTitle: li.variant_title,
            })),
            customer: {
                platformId: o.customer ? String(o.customer.id) : undefined,
                name: o.billing_address
                    ? `${o.billing_address.first_name || ""} ${o.billing_address.last_name || ""}`.trim()
                    : o.customer
                    ? `${o.customer.first_name || ""} ${o.customer.last_name || ""}`.trim()
                    : "Bilinmiyor",
                email: o.email,
                phone: o.phone || o.billing_address?.phone,
            },
            shippingAddress: o.shipping_address
                ? {
                    name: `${o.shipping_address.first_name} ${o.shipping_address.last_name}`.trim(),
                    line1: o.shipping_address.address1,
                    line2: o.shipping_address.address2,
                    city: o.shipping_address.city,
                    province: o.shipping_address.province,
                    postalCode: o.shipping_address.zip,
                    country: o.shipping_address.country,
                    phone: o.shipping_address.phone,
                  }
                : undefined,
            subtotal: parseFloat(o.subtotal_price || "0"),
            shippingCost: parseFloat(o.shipping_lines?.[0]?.price || "0"),
            discount: parseFloat(o.total_discounts || "0"),
            total: parseFloat(o.total_price || "0"),
            currency: o.currency,
            trackingNumber: o.fulfillments?.[0]?.tracking_number,
            trackingUrl: o.fulfillments?.[0]?.tracking_url,
            cargoCompany: o.fulfillments?.[0]?.tracking_company,
            notes: o.note || "",
            createdAt: o.created_at,
            updatedAt: o.updated_at,
        }))
    }

    async getOrder(platformOrderId: string): Promise<EcomOrder | null> {
        try {
            const data = await this.request<{ order: any }>(`/orders/${platformOrderId}.json`)
            const o = data.order
            if (!o) return null
            return {
                platformId: String(o.id),
                orderNumber: o.name,
                status: mapStatus(o.financial_status, o.fulfillment_status),
                items: (o.line_items || []).map((li: any) => ({
                    productId: String(li.product_id),
                    sku: li.sku,
                    name: li.name,
                    quantity: li.quantity,
                    price: parseFloat(li.price || "0"),
                    currency: o.currency,
                    variantTitle: li.variant_title,
                })),
                customer: {
                    platformId: o.customer ? String(o.customer.id) : undefined,
                    name: o.billing_address
                        ? `${o.billing_address.first_name || ""} ${o.billing_address.last_name || ""}`.trim()
                        : o.customer
                        ? `${o.customer.first_name || ""} ${o.customer.last_name || ""}`.trim()
                        : "Bilinmiyor",
                    email: o.email,
                    phone: o.phone || o.billing_address?.phone,
                },
                shippingAddress: o.shipping_address
                    ? {
                        name: `${o.shipping_address.first_name} ${o.shipping_address.last_name}`.trim(),
                        line1: o.shipping_address.address1,
                        line2: o.shipping_address.address2,
                        city: o.shipping_address.city,
                        province: o.shipping_address.province,
                        postalCode: o.shipping_address.zip,
                        country: o.shipping_address.country,
                        phone: o.shipping_address.phone,
                      }
                    : undefined,
                subtotal: parseFloat(o.subtotal_price || "0"),
                shippingCost: parseFloat(o.shipping_lines?.[0]?.price || "0"),
                discount: parseFloat(o.total_discounts || "0"),
                total: parseFloat(o.total_price || "0"),
                currency: o.currency,
                trackingNumber: o.fulfillments?.[0]?.tracking_number,
                trackingUrl: o.fulfillments?.[0]?.tracking_url,
                cargoCompany: o.fulfillments?.[0]?.tracking_company,
                notes: o.note || "",
                createdAt: o.created_at,
                updatedAt: o.updated_at,
            }
        } catch {
            return null
        }
    }

    async updateProductStock(platformProductId: string, stock: number, variantId?: string): Promise<boolean> {
        try {
            if (!variantId) {
                const data = await this.request<{ product: any }>(`/products/${platformProductId}.json`)
                variantId = String(data.product.variants?.[0]?.id)
            }
            const inventoryData = await this.request<{ variant: any }>(`/variants/${variantId}.json`)
            const inventoryItemId = inventoryData.variant.inventory_item_id

            const locData = await this.request<{ inventory_levels: any[] }>(
                `/inventory_levels.json?inventory_item_ids=${inventoryItemId}`
            )
            const locationId = locData.inventory_levels?.[0]?.location_id
            if (!locationId) return false

            await this.request("/inventory_levels/set.json", {
                method: "POST",
                body: JSON.stringify({ location_id: locationId, inventory_item_id: inventoryItemId, available: stock }),
            })
            return true
        } catch {
            return false
        }
    }

    async registerWebhook(eventType: string, callbackUrl: string): Promise<boolean> {
        const topicMap: Record<string, string> = {
            "product.created": "products/create",
            "product.updated": "products/update",
            "product.deleted": "products/delete",
            "order.created": "orders/create",
            "order.updated": "orders/updated",
            "order.shipped": "orders/fulfilled",
            "order.cancelled": "orders/cancelled",
        }
        const topic = topicMap[eventType]
        if (!topic) return false

        try {
            await this.request("/webhooks.json", {
                method: "POST",
                body: JSON.stringify({ webhook: { topic, address: callbackUrl, format: "json" } }),
            })
            return true
        } catch {
            return false
        }
    }
}
