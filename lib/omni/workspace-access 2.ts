import type { UserRole } from "@/lib/user-roles"

export function resolveChatbotEnabled(data: any) {
    const explicitEntitlements = data?.productEntitlements || {}
    return explicitEntitlements.chatbot ?? data?.enableChatbot !== false
}

export function resolveOmniWorkspaceEnabled(data: any, userRole?: UserRole | null) {
    if (userRole === "SUPER_ADMIN") return true

    const explicitEntitlements = data?.productEntitlements || {}
    const legacyOmniEnabled = explicitEntitlements.omniChannel ?? data?.enableOmniChannel === true

    return Boolean(legacyOmniEnabled || resolveChatbotEnabled(data))
}
