import type { UserRole } from "@/lib/user-roles"

export type ProductEntitlementKey = "chatbot" | "omniChannel" | "cookieConsent" | "copywriter" | "leadFinder"

export type ProductEntitlements = Record<ProductEntitlementKey, boolean>

export const DEFAULT_PRODUCT_ENTITLEMENTS: ProductEntitlements = {
    chatbot: false,
    omniChannel: false,
    cookieConsent: false,
    copywriter: false,
    leadFinder: false,
}

export function resolveChatbotEnabled(data: any) {
    const explicitEntitlements = data?.productEntitlements || {}
    return explicitEntitlements.chatbot ?? data?.enableChatbot !== false
}

export function resolveOmniWorkspaceEnabled(data: any, userRole?: UserRole | null) {
    if (userRole === "SUPER_ADMIN") return true

    const explicitEntitlements = data?.productEntitlements || {}
    return Boolean(explicitEntitlements.omniChannel === true || data?.enableOmniChannel === true)
}

export function resolveCookieConsentEnabled(data: any, userRole?: UserRole | null) {
    if (userRole === "SUPER_ADMIN") return true

    const explicitEntitlements = data?.productEntitlements || {}
    return Boolean(explicitEntitlements.cookieConsent === true || data?.enableCookieConsent === true)
}
