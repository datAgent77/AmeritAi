import { Cookie, Headset, MessageSquare } from "lucide-react"
import type { ProductEntitlementKey, ProductEntitlements } from "@/lib/omni/types"

export interface ProductItem {
    id: string
    title: string
    description: string
    icon: any
    status: "active" | "coming_soon"
    href: string
    color: string
    bgColor: string
    requiredEntitlement: ProductEntitlementKey
}

export const products: ProductItem[] = [
    {
        id: "chatbot",
        title: "Vion",
        description: "Automate customer support with a custom-trained AI assistant.",
        icon: MessageSquare,
        status: "active",
        href: "/console/chatbot",
        color: "text-foreground",
        bgColor: "bg-muted",
        requiredEntitlement: "chatbot"
    },
    {
        id: "omni-channel",
        title: "Omni",
        description: "Run web, WhatsApp, Instagram DM, and phone voice operations from one shared AI core.",
        icon: Headset,
        status: "active",
        href: "/omni",
        color: "text-foreground",
        bgColor: "bg-muted",
        requiredEntitlement: "omniChannel"
    },
    {
        id: "cookie-consent",
        title: "Cookie",
        description: "Manage cookie consent, policy versions, and Google Consent Mode from one workspace.",
        icon: Cookie,
        status: "active",
        href: "/cookie",
        color: "text-foreground",
        bgColor: "bg-muted",
        requiredEntitlement: "cookieConsent"
    },
]

export function getVisibleProducts(entitlements: ProductEntitlements, options?: { includeAll?: boolean }) {
    if (options?.includeAll) {
        return products
    }

    return products.filter((product) => entitlements[product.requiredEntitlement])
}
