// ─── Ortak E-Ticaret Veri Modeli ────────────────────────────────────────────

export type EcomPlatform =
    | "shopify"
    | "ikas"
    | "ideasoft"
    | "ticimax"
    | "tsoft"
    | "woocommerce"

export type EcomConnectionStatus = "active" | "error" | "disconnected" | "pending"

export interface EcomCredentials {
    // Shopify
    shopDomain?: string
    accessToken?: string
    // İkas
    apiKey?: string
    apiSecret?: string
    storeUrl?: string
    // OAuth (İkas, WooCommerce)
    oauthToken?: string
    refreshToken?: string
    tokenExpiresAt?: string
    // WooCommerce
    consumerKey?: string
    consumerSecret?: string
    siteUrl?: string
}

export interface EcomConnection {
    id: string
    chatbotId: string
    platform: EcomPlatform
    credentials: EcomCredentials
    status: EcomConnectionStatus
    storeName?: string
    storeUrl?: string
    syncedProductCount: number
    syncedOrderCount: number
    lastProductSyncAt?: string
    lastOrderSyncAt?: string
    webhookRegistered?: boolean
    createdAt: string
    updatedAt: string
}

export interface EcomVariant {
    id: string
    sku?: string
    title: string                     // "Kırmızı / 42"
    attributes: Record<string, string> // { color: "Kırmızı", size: "42" }
    price: number
    compareAtPrice?: number
    stock: number
    imageUrl?: string
}

export interface EcomProduct {
    platformId: string
    sku?: string
    name: string
    description?: string
    price: number
    compareAtPrice?: number
    currency: string
    stock: number
    images: string[]
    category?: string
    tags?: string[]
    variants?: EcomVariant[]
    url?: string
    isActive: boolean
    weight?: number
    updatedAt?: string
}

export interface EcomAddress {
    name?: string
    line1: string
    line2?: string
    city: string
    province?: string
    postalCode?: string
    country: string
    phone?: string
}

export interface EcomOrderItem {
    productId?: string
    sku?: string
    name: string
    quantity: number
    price: number
    currency: string
    variantTitle?: string
    imageUrl?: string
}

export type EcomOrderStatus =
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded"

export interface EcomOrder {
    platformId: string
    orderNumber: string
    status: EcomOrderStatus
    items: EcomOrderItem[]
    customer: {
        platformId?: string
        name: string
        email?: string
        phone?: string
    }
    shippingAddress?: EcomAddress
    billingAddress?: EcomAddress
    subtotal: number
    shippingCost?: number
    discount?: number
    total: number
    currency: string
    trackingNumber?: string
    trackingUrl?: string
    cargoCompany?: string
    notes?: string
    createdAt: string
    updatedAt?: string
}

export interface EcomCoupon {
    code: string
    discountType: "percent" | "fixed"
    discountValue: number
    minOrderAmount?: number
    usageLimit?: number
    expiresAt?: string
    description?: string
}

export interface EcomSyncResult {
    platform: EcomPlatform
    success: boolean
    syncedProducts?: number
    syncedOrders?: number
    errors?: string[]
    durationMs: number
}

// Webhook event tipleri
export type EcomWebhookEvent =
    | "product.created"
    | "product.updated"
    | "product.deleted"
    | "order.created"
    | "order.updated"
    | "order.shipped"
    | "order.delivered"
    | "order.cancelled"
    | "cart.abandoned"
    | "inventory.updated"

export interface EcomWebhookPayload {
    event: EcomWebhookEvent
    platform: EcomPlatform
    chatbotId: string
    data: Record<string, any>
    receivedAt: string
}
