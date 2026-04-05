import { Headset, MessageSquare } from "lucide-react"
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
        title: "AI Chatbot",
        description: "Automate customer support with a custom-trained AI assistant.",
        icon: MessageSquare,
        status: "active",
        href: "/console/chatbot",
        color: "text-blue-500",
        bgColor: "bg-blue-50",
        requiredEntitlement: "chatbot"
    },
    {
        id: "omni-channel",
        title: "Vion AI Omni-Channel",
        description: "Run web, WhatsApp, Instagram DM, and phone voice operations from one shared AI core.",
        icon: Headset,
        status: "active",
        href: "/omni",
        color: "text-emerald-600",
        bgColor: "bg-emerald-50",
        requiredEntitlement: "omniChannel"
    },
]

export function getVisibleProducts(entitlements: ProductEntitlements, options?: { includeAll?: boolean }) {
    if (options?.includeAll) {
        return products
    }

    return products.filter((product) => entitlements[product.requiredEntitlement])
}
