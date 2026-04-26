import { BaseEcommercePlatform } from "../base-platform"
import type { EcomProduct, EcomOrder, EcomOrderStatus } from "../types"

export class TSoftAdapter extends BaseEcommercePlatform {
    readonly platform = "tsoft" as const
    private sessionToken: string | null = null

    private get baseUrl(): string {
        return (this.credentials.storeUrl || "").replace(/\/$/, "")
    }

    private async getSessionToken(): Promise<string> {
        if (this.sessionToken) return this.sessionToken

        const res = await fetch(`${this.baseUrl}/api/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userName: this.credentials.apiKey,
                password: this.credentials.apiSecret,
            }),
        })
        if (!res.ok) throw new Error(`T-Soft auth error: ${res.status}`)
        const data = await res.json()
        this.sessionToken = data.sessionToken || data.token
        if (!this.sessionToken) throw new Error("T-Soft: no session token returned")
        return this.sessionToken
    }

    private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
        const token = await this.getSessionToken()
        const res = await fetch(`${this.baseUrl}/api${path}`, {
            ...options,
            headers: {
                "session-token": token,
                "Content-Type": "application/json",
                ...(options.headers || {}),
            },
        })
        if (res.status === 401) {
            this.sessionToken = null
            throw new Error("T-Soft: session expired, retry")
        }
        if (!res.ok) throw new Error(`T-Soft ${res.status}: ${res.statusText}`)
        return res.json() as Promise<T>
    }

    async testConnection(): Promise<{ ok: boolean; storeName?: string; storeUrl?: string; error?: string }> {
        try {
            await this.getSessionToken()
            const data = await this.request<{ Name?: string }>("/store/info")
            return { ok: true, storeName: data.Name, storeUrl: this.baseUrl }
        } catch (e: any) {
            return { ok: false, error: e.message }
        }
    }

    async getProducts(params?: { limit?: number; page?: number }): Promise<EcomProduct[]> {
        const qs = new URLSearchParams()
        qs.set("pageSize", String(params?.limit ?? 100))
        qs.set("pageIndex", String((params?.page ?? 1) - 1))

        const data = await this.request<{ products?: any[]; Products?: any[] }>(`/product/list?${qs}`)
        const items = data.products || data.Products || []

        return items.map(p => ({
            platformId: String(p.id || p.Id),
            sku: p.stockCode || p.StockCode,
            name: p.name || p.Name,
            description: p.shortDescription || p.ShortDescription || "",
            price: parseFloat(p.salePrice || p.SalePrice || p.price || p.Price || "0"),
            compareAtPrice: p.listPrice || p.ListPrice
                ? parseFloat(p.listPrice || p.ListPrice)
                : undefined,
            currency: "TRY",
            stock: parseInt(p.stockAmount || p.StockAmount || "0"),
            images: (p.images || p.Images || []).map((img: any) => img.url || img.Url || img),
            category: p.categoryName || p.CategoryName || "",
            tags: [],
            variants: (p.combinations || p.Combinations || []).map((c: any) => ({
                id: String(c.id || c.Id),
                sku: c.stockCode || c.StockCode,
                title: c.attributeName || c.AttributeName || "",
                attributes: {},
                price: parseFloat(c.salePrice || c.SalePrice || p.salePrice || "0"),
                stock: parseInt(c.stockAmount || c.StockAmount || "0"),
            })),
            isActive: (p.isActive ?? p.IsActive) !== false,
        }))
    }

    async getOrders(params?: { limit?: number; page?: number; status?: string; customerEmail?: string }): Promise<EcomOrder[]> {
        const qs = new URLSearchParams()
        qs.set("pageSize", String(params?.limit ?? 100))
        qs.set("pageIndex", String((params?.page ?? 1) - 1))

        const data = await this.request<{ orders?: any[]; Orders?: any[] }>(`/order/list?${qs}`)
        const items = data.orders || data.Orders || []

        const statusMap: Record<number, EcomOrderStatus> = {
            1: "pending", 2: "confirmed", 3: "processing", 4: "shipped", 5: "delivered",
            6: "cancelled", 7: "refunded",
        }

        const mapped = items.map(o => ({
            platformId: String(o.id || o.Id),
            orderNumber: o.orderNumber || o.OrderNumber || String(o.id || o.Id),
            status: statusMap[o.statusId || o.StatusId] || "pending",
            items: (o.orderProducts || o.OrderProducts || o.products || []).map((li: any) => ({
                productId: String(li.productId || li.ProductId),
                sku: li.stockCode || li.StockCode,
                name: li.name || li.Name,
                quantity: li.quantity || li.Quantity || 1,
                price: parseFloat(li.price || li.Price || "0"),
                currency: "TRY",
            })),
            customer: {
                name: o.customerName || o.CustomerName ||
                    `${o.firstName || o.FirstName || ""} ${o.lastName || o.LastName || ""}`.trim(),
                email: o.email || o.Email,
                phone: o.phoneNumber || o.PhoneNumber,
            },
            shippingAddress: {
                name: o.shippingName || o.ShippingName || o.customerName || o.CustomerName || "",
                line1: o.shippingAddress || o.ShippingAddress || "",
                city: o.shippingCity || o.ShippingCity || "",
                province: o.shippingDistrict || o.ShippingDistrict,
                postalCode: o.shippingZipCode || o.ShippingZipCode,
                country: "TR",
            },
            subtotal: parseFloat(o.subTotal || o.SubTotal || "0"),
            shippingCost: parseFloat(o.shippingPrice || o.ShippingPrice || "0"),
            discount: parseFloat(o.discount || o.Discount || "0"),
            total: parseFloat(o.totalPrice || o.TotalPrice || o.total || "0"),
            currency: "TRY",
            trackingNumber: o.trackingNumber || o.TrackingNumber,
            cargoCompany: o.cargoCompany || o.CargoCompany,
            notes: o.note || o.Note || "",
            createdAt: o.createDate || o.CreateDate || o.createdAt || new Date().toISOString(),
            updatedAt: o.updateDate || o.UpdateDate,
        }))

        if (!params?.customerEmail) return mapped
        const needle = params.customerEmail.trim().toLowerCase()
        return mapped.filter((order) => (order.customer.email || "").toLowerCase() === needle)
    }
}
