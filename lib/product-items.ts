import { MessageSquare } from "lucide-react"
import type { ProductEntitlementKey, ProductEntitlements } from "@/lib/product-entitlements"

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
        title: "AmeritAI",
        description: "Automate customer support with a custom-trained AI assistant.",
        icon: MessageSquare,
        status: "active",
        href: "/console/chatbot",
        color: "text-foreground",
        bgColor: "bg-muted",
        requiredEntitlement: "chatbot"
    },
]

export function getVisibleProducts(entitlements: ProductEntitlements, options?: { includeAll?: boolean }) {
    if (options?.includeAll) {
        return products
    }

    return products.filter((product) => entitlements[product.requiredEntitlement])
}
