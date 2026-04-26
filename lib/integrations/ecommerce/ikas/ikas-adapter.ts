import { BaseEcommercePlatform } from "../base-platform"
import type { EcomProduct, EcomOrder, EcomOrderStatus, EcomVariant, EcomCoupon } from "../types"

interface IkasTokenResponse {
    access_token: string
    expires_in: number
}

export class IkasAdapter extends BaseEcommercePlatform {
    readonly platform = "ikas" as const
    private accessToken: string | null = null
    private tokenExpiresAt = 0

    private get storeOrigin(): string {
        const raw = (this.credentials.storeUrl || "").trim().replace(/\/$/, "")
        if (!raw) return ""
        if (/^https?:\/\//i.test(raw)) return raw
        return `https://${raw}`
    }

    private get apiBase(): string {
        return `${this.storeOrigin}/api/v1`
    }

    private get graphqlUrl(): string {
        return `${this.storeOrigin}/graphql`
    }

    private async getToken(): Promise<string> {
        if (this.accessToken && Date.now() < this.tokenExpiresAt - 30_000) {
            return this.accessToken
        }
        const res = await fetch(`${this.apiBase}/oauth/token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "client_credentials",
                client_id: this.credentials.apiKey || "",
                client_secret: this.credentials.apiSecret || "",
            }),
        })
        if (!res.ok) throw new Error(`İkas token error: ${res.status}`)
        const data: IkasTokenResponse = await res.json()
        this.accessToken = data.access_token
        this.tokenExpiresAt = Date.now() + data.expires_in * 1000
        return this.accessToken
    }

    private async gql<T>(query: string, variables?: Record<string, any>): Promise<T> {
        const token = await this.getToken()
        const res = await fetch(this.graphqlUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ query, variables }),
        })
        const json = await res.json()
        if (json.errors) throw new Error(json.errors[0].message)
        return json.data as T
    }

    async testConnection(): Promise<{ ok: boolean; storeName?: string; storeUrl?: string; error?: string }> {
        try {
            const data = await this.gql<{ store: { name: string; domain: string } }>(`
                query { store { name domain } }
            `)
            return { ok: true, storeName: data.store.name, storeUrl: `https://${data.store.domain}` }
        } catch (e: any) {
            return { ok: false, error: e.message }
        }
    }

    async getProducts(params?: { limit?: number; page?: number; updatedSince?: string }): Promise<EcomProduct[]> {
        const data = await this.gql<{ listProduct: { data: any[] } }>(`
            query ListProducts($first: Int) {
                listProduct(first: $first) {
                    data {
                        id name description status
                        price { buyingPrice sellingPrice currency }
                        categories { name }
                        tags
                        images { fileName }
                        variants {
                            id sku stock
                            prices { sellingPrice }
                            variantValues { variantTypeName variantValueName }
                        }
                    }
                }
            }
        `, { first: params?.limit ?? 250 })

        return (data.listProduct.data || []).map(p => {
            const variants: EcomVariant[] = (p.variants || []).map((v: any) => ({
                id: v.id,
                sku: v.sku,
                title: (v.variantValues || []).map((vv: any) => vv.variantValueName).join(" / "),
                attributes: Object.fromEntries(
                    (v.variantValues || []).map((vv: any) => [vv.variantTypeName, vv.variantValueName])
                ),
                price: v.prices?.[0]?.sellingPrice ?? p.price?.sellingPrice ?? 0,
                stock: v.stock ?? 0,
            }))
            const totalStock = variants.reduce((sum, v) => sum + v.stock, 0)

            return {
                platformId: p.id,
                name: p.name,
                description: p.description || "",
                price: p.price?.sellingPrice ?? 0,
                compareAtPrice: p.price?.buyingPrice ?? undefined,
                currency: p.price?.currency || "TRY",
                stock: totalStock || (p.variants?.[0]?.stock ?? 0),
                images: (p.images || []).map((img: any) => `${this.storeOrigin}/media/${img.fileName}`),
                category: p.categories?.[0]?.name || "",
                tags: p.tags || [],
                variants,
                isActive: p.status === "ACTIVE",
            }
        })
    }

    async getOrders(params?: { limit?: number; page?: number; customerEmail?: string }): Promise<EcomOrder[]> {
        const data = await this.gql<{ listOrder: { data: any[] } }>(`
            query ListOrders($first: Int) {
                listOrder(first: $first) {
                    data {
                        id orderNumber status
                        customer { firstName lastName email phone }
                        billingAddress { firstName lastName addressLine1 addressLine2 city district postalCode country phone }
                        shippingAddress { firstName lastName addressLine1 addressLine2 city district postalCode country phone }
                        orderItems {
                            product { id name }
                            variant { sku }
                            quantity price currency
                        }
                        subtotal shippingCost discount total currency
                        cargoTrackingNumber cargoCompany
                        note createdAt updatedAt
                    }
                }
            }
        `, { first: params?.limit ?? 250 })

        const statusMap: Record<string, EcomOrderStatus> = {
            WAITING: "pending",
            CONFIRMED: "confirmed",
            PREPARING: "processing",
            SHIPPED: "shipped",
            DELIVERED: "delivered",
            CANCELLED: "cancelled",
        }

        const mapped = (data.listOrder.data || []).map(o => ({
            platformId: o.id,
            orderNumber: o.orderNumber,
            status: statusMap[o.status] || "pending",
            items: (o.orderItems || []).map((oi: any) => ({
                productId: oi.product?.id,
                sku: oi.variant?.sku,
                name: oi.product?.name || "",
                quantity: oi.quantity,
                price: oi.price,
                currency: oi.currency,
            })),
            customer: {
                name: `${o.customer?.firstName || ""} ${o.customer?.lastName || ""}`.trim(),
                email: o.customer?.email,
                phone: o.customer?.phone,
            },
            shippingAddress: o.shippingAddress
                ? {
                    name: `${o.shippingAddress.firstName} ${o.shippingAddress.lastName}`.trim(),
                    line1: o.shippingAddress.addressLine1,
                    line2: o.shippingAddress.addressLine2,
                    city: o.shippingAddress.city,
                    province: o.shippingAddress.district,
                    postalCode: o.shippingAddress.postalCode,
                    country: o.shippingAddress.country,
                    phone: o.shippingAddress.phone,
                  }
                : undefined,
            subtotal: o.subtotal ?? 0,
            shippingCost: o.shippingCost ?? 0,
            discount: o.discount ?? 0,
            total: o.total ?? 0,
            currency: o.currency || "TRY",
            trackingNumber: o.cargoTrackingNumber,
            cargoCompany: o.cargoCompany,
            notes: o.note || "",
            createdAt: o.createdAt,
            updatedAt: o.updatedAt,
        }))

        if (!params?.customerEmail) return mapped
        const needle = params.customerEmail.trim().toLowerCase()
        return mapped.filter((order) => (order.customer.email || "").toLowerCase() === needle)
    }

    async createCoupon(coupon: EcomCoupon): Promise<{ code: string; platformCouponId?: string } | null> {
        try {
            const data = await this.gql<{ createCoupon: { id: string; code: string } }>(`
                mutation CreateCoupon($input: CreateCouponInput!) {
                    createCoupon(input: $input) { id code }
                }
            `, {
                input: {
                    code: coupon.code,
                    discountType: coupon.discountType === "percent" ? "PERCENTAGE" : "AMOUNT",
                    discountValue: coupon.discountValue,
                    minimumOrderAmount: coupon.minOrderAmount,
                    usageLimit: coupon.usageLimit,
                    expiresAt: coupon.expiresAt,
                },
            })
            return { code: data.createCoupon.code, platformCouponId: data.createCoupon.id }
        } catch {
            return null
        }
    }
}
