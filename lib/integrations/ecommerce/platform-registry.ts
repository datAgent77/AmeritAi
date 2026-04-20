import type { EcomCredentials, EcomPlatform } from "./types"
import type { BaseEcommercePlatform } from "./base-platform"

export interface PlatformMeta {
    id: EcomPlatform
    name: string
    logoUrl: string
    authType: "api_key" | "oauth" | "api_key_secret"
    fields: {
        key: string
        label: string
        placeholder?: string
        type?: "text" | "password" | "url"
        required: boolean
        hint?: string
    }[]
    webhookSupport: boolean
    couponSupport: boolean
    variantSupport: boolean
    docsUrl?: string
    popular?: boolean
}

export const PLATFORM_META: Record<EcomPlatform, PlatformMeta> = {
    shopify: {
        id: "shopify",
        name: "Shopify",
        logoUrl: "/logos/shopify.svg",
        authType: "api_key",
        fields: [
            { key: "shopDomain", label: "Mağaza Domain", placeholder: "magazaniz.myshopify.com", type: "url", required: true, hint: "myshopify.com uzantılı alan adınız" },
            { key: "accessToken", label: "Access Token", placeholder: "shpat_...", type: "password", required: true, hint: "Admin > Apps > Develop apps > Access tokens" },
        ],
        webhookSupport: true,
        couponSupport: true,
        variantSupport: true,
        docsUrl: "https://shopify.dev/docs/api/admin-rest",
        popular: true,
    },
    ikas: {
        id: "ikas",
        name: "İkas",
        logoUrl: "/logos/ikas.svg",
        authType: "api_key_secret",
        fields: [
            { key: "storeUrl", label: "Mağaza URL", placeholder: "https://magazaniz.myikas.com", type: "url", required: true },
            { key: "apiKey", label: "API Anahtarı", placeholder: "ik_...", type: "password", required: true, hint: "İkas Admin > Entegrasyonlar > API" },
            { key: "apiSecret", label: "API Secret", placeholder: "iks_...", type: "password", required: true },
        ],
        webhookSupport: true,
        couponSupport: true,
        variantSupport: true,
        docsUrl: "https://developer.ikas.com",
        popular: true,
    },
    ideasoft: {
        id: "ideasoft",
        name: "IdeaSoft",
        logoUrl: "/logos/ideasoft.svg",
        authType: "api_key",
        fields: [
            { key: "storeUrl", label: "Mağaza URL", placeholder: "https://magazaniz.com", type: "url", required: true },
            { key: "accessToken", label: "API Token", placeholder: "Bearer ...", type: "password", required: true, hint: "IdeaSoft Admin > Entegrasyonlar > API Erişim" },
        ],
        webhookSupport: true,
        couponSupport: true,
        variantSupport: true,
        docsUrl: "https://dev.ideasoft.biz",
        popular: true,
    },
    ticimax: {
        id: "ticimax",
        name: "Ticimax",
        logoUrl: "/logos/ticimax.svg",
        authType: "api_key",
        fields: [
            { key: "storeUrl", label: "Mağaza URL", placeholder: "https://magazaniz.com", type: "url", required: true },
            { key: "accessToken", label: "API Token", type: "password", required: true, hint: "Ticimax Admin > Entegrasyon > API" },
        ],
        webhookSupport: false,
        couponSupport: true,
        variantSupport: true,
        docsUrl: "https://www.ticimax.com/entegrasyon",
    },
    tsoft: {
        id: "tsoft",
        name: "T-Soft",
        logoUrl: "/logos/tsoft.svg",
        authType: "api_key",
        fields: [
            { key: "storeUrl", label: "Mağaza URL", placeholder: "https://magazaniz.com", type: "url", required: true },
            { key: "apiKey", label: "API Kullanıcı Adı", type: "text", required: true },
            { key: "apiSecret", label: "API Şifre", type: "password", required: true },
        ],
        webhookSupport: false,
        couponSupport: true,
        variantSupport: true,
    },
    woocommerce: {
        id: "woocommerce",
        name: "WooCommerce",
        logoUrl: "/logos/woocommerce.svg",
        authType: "api_key_secret",
        fields: [
            { key: "siteUrl", label: "Site URL", placeholder: "https://magazaniz.com", type: "url", required: true },
            { key: "consumerKey", label: "Consumer Key", placeholder: "ck_...", type: "password", required: true, hint: "WP Admin > WooCommerce > Ayarlar > Gelişmiş > REST API" },
            { key: "consumerSecret", label: "Consumer Secret", placeholder: "cs_...", type: "password", required: true },
        ],
        webhookSupport: true,
        couponSupport: true,
        variantSupport: true,
        docsUrl: "https://woocommerce.github.io/woocommerce-rest-api-docs",
        popular: true,
    },
}

export async function createPlatformAdapter(
    platform: EcomPlatform,
    credentials: EcomCredentials
): Promise<BaseEcommercePlatform> {
    switch (platform) {
        case "shopify": {
            const { ShopifyAdapter } = await import("./shopify/shopify-adapter")
            return new ShopifyAdapter(credentials)
        }
        case "ikas": {
            const { IkasAdapter } = await import("./ikas/ikas-adapter")
            return new IkasAdapter(credentials)
        }
        case "ideasoft": {
            const { IdeaSoftAdapter } = await import("./ideasoft/ideasoft-adapter")
            return new IdeaSoftAdapter(credentials)
        }
        case "ticimax": {
            const { TicimaxAdapter } = await import("./ticimax/ticimax-adapter")
            return new TicimaxAdapter(credentials)
        }
        case "tsoft": {
            const { TSoftAdapter } = await import("./tsoft/tsoft-adapter")
            return new TSoftAdapter(credentials)
        }
        case "woocommerce": {
            const { WooCommerceAdapter } = await import("./woocommerce/woocommerce-adapter")
            return new WooCommerceAdapter(credentials)
        }
        default:
            throw new Error(`Unknown platform: ${platform}`)
    }
}
