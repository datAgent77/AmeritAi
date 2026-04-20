import { BaseEcommercePlatform } from "../base-platform"
import type { EcomCredentials, EcomProduct, EcomOrder, EcomOrderStatus, EcomCoupon } from "../types"

export class IdeaSoftAdapter extends BaseEcommercePlatform {
    readonly platform = "ideasoft" as const

    private get baseUrl(): string {
        return (this.credentials.storeUrl || "").replace(/\/$/, "")
    }

    private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
        const token = (this.credentials.accessToken || "").replace(/^Bearer\s+/i, "")
        const res = await fetch(`${this.baseUrl}/api${path}`, {
            ...options,
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                ...(options.headers || {}),
            },
        })
        if (!res.ok) {
            const text = await res.text()
            throw new Error(`IdeaSoft ${res.status}: ${text}`)
        }
        return res.json() as Promise<T>
    }

    async testConnection(): Promise<{ ok: boolean; storeName?: string; storeUrl?: string; error?: string }> {
        try {
            const data = await this.request<{ name?: string; domain?: string }>("/store")
            return { ok: true, storeName: data.name, storeUrl: this.baseUrl }
        } catch (e: any) {
            return { ok: false, error: e.message }
        }
    }

    async getProducts(params?: { limit?: number; page?: number; updatedSince?: string }): Promise<EcomProduct[]> {
        const qs = new URLSearchParams()
        qs.set("limit", String(params?.limit ?? 100))
        qs.set("page", String(params?.page ?? 1))
        if (params?.updatedSince) qs.set("updatedAt[gte]", params.updatedSince)

        const data = await this.request<any[]>(`/products?${qs}`)
        return (data || []).map(p => ({
            platformId: String(p.id),
            sku: p.code,
            name: p.name,
            description: p.shortDescription || p.description || "",
            price: parseFloat(p.price1 || p.price || "0"),
            compareAtPrice: p.price2 ? parseFloat(p.price2) : undefined,
            currency: "TRY",
            stock: parseInt(p.stockAmount || p.stock || "0"),
            images: (p.images || []).map((img: any) => img.url || img),
            category: p.categories?.[0]?.name || "",
            tags: (p.tags || "").split(",").map((t: string) => t.trim()).filter(Boolean),
            variants: (p.combinations || []).map((c: any) => ({
                id: String(c.id),
                sku: c.code,
                title: Object.values(c.attributes || {}).join(" / "),
                attributes: c.attributes || {},
                price: parseFloat(c.price1 || p.price1 || "0"),
                stock: parseInt(c.stockAmount || "0"),
            })),
            url: `${this.baseUrl}/urun/${p.seoUrl || p.id}`,
            isActive: p.status === 1 || p.status === "active",
            updatedAt: p.updatedAt,
        }))
    }

    async getOrders(params?: { limit?: number; page?: number; status?: string; customerEmail?: string }): Promise<EcomOrder[]> {
        const qs = new URLSearchParams()
        qs.set("limit", String(params?.limit ?? 100))
        qs.set("page", String(params?.page ?? 1))
        if (params?.customerEmail) qs.set("email", params.customerEmail)

        const data = await this.request<any[]>(`/orders?${qs}`)
        const statusMap: Record<number, EcomOrderStatus> = {
            1: "pending", 2: "confirmed", 3: "processing", 4: "shipped", 5: "delivered",
            6: "cancelled", 7: "refunded",
        }

        return (data || []).map(o => ({
            platformId: String(o.id),
            orderNumber: o.orderNumber || String(o.id),
            status: statusMap[o.orderStatus] || "pending",
            items: (o.orderProducts || o.items || []).map((li: any) => ({
                productId: String(li.productId),
                sku: li.code,
                name: li.name,
                quantity: li.quantity,
                price: parseFloat(li.unitPrice || li.price || "0"),
                currency: "TRY",
            })),
            customer: {
                name: `${o.firstName || ""} ${o.lastName || ""}`.trim() || o.invoiceAddress?.name || "",
                email: o.email,
                phone: o.phoneNumber || o.phone,
            },
            shippingAddress: o.shippingAddress
                ? {
                    name: o.shippingAddress.name,
                    line1: o.shippingAddress.address,
                    city: o.shippingAddress.city,
                    province: o.shippingAddress.district,
                    postalCode: o.shippingAddress.postCode,
                    country: o.shippingAddress.country || "TR",
                    phone: o.shippingAddress.phone,
                  }
                : undefined,
            subtotal: parseFloat(o.subTotal || o.subtotal || "0"),
            shippingCost: parseFloat(o.shippingPrice || "0"),
            discount: parseFloat(o.discount || o.discountAmount || "0"),
            total: parseFloat(o.generalTotal || o.total || "0"),
            currency: "TRY",
            trackingNumber: o.cargoTrackingNumber,
            cargoCompany: o.cargoCompany?.name,
            notes: o.note || "",
            createdAt: o.createdAt || o.date,
            updatedAt: o.updatedAt,
        }))
    }

    async createCoupon(coupon: EcomCoupon): Promise<{ code: string; platformCouponId?: string } | null> {
        try {
            const data = await this.request<{ id: string; code: string }>("/coupons", {
                method: "POST",
                body: JSON.stringify({
                    code: coupon.code,
                    type: coupon.discountType === "percent" ? 1 : 2,
                    value: coupon.discountValue,
                    minimumAmount: coupon.minOrderAmount,
                    usageLimit: coupon.usageLimit,
                    expireDate: coupon.expiresAt,
                }),
            })
            return { code: data.code, platformCouponId: String(data.id) }
        } catch {
            return null
        }
    }
}
