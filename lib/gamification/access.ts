export function isGamificationAdminDenied(data?: Record<string, any> | null) {
    return data?.adminGrantedModules?.gamification === false
}

export function isGamificationModuleEnabled(
    chatbotData?: Record<string, any> | null,
    userData?: Record<string, any> | null
) {
    if (isGamificationAdminDenied(chatbotData) || isGamificationAdminDenied(userData)) return false

    return chatbotData?.enableGamification === true || userData?.enableGamification === true
}
