import type { Firestore } from "firebase-admin/firestore"

type RuntimeAccessResult = {
    chatbotData: Record<string, any>
    gamification: Record<string, any> | null
    enabled: boolean
    reason?: "module_disabled" | "config_disabled"
}

function isAdminDenied(data?: Record<string, any> | null) {
    return data?.adminGrantedModules?.gamification === false
}

function isModuleEnabled(chatbotData?: Record<string, any> | null, userData?: Record<string, any> | null) {
    if (isAdminDenied(chatbotData) || isAdminDenied(userData)) return false
    return chatbotData?.enableGamification === true || userData?.enableGamification === true
}

export async function resolveGamificationRuntimeAccess(
    adminDb: Firestore,
    chatbotId: string,
    existingChatbotData?: Record<string, any> | null
): Promise<RuntimeAccessResult> {
    const chatbotData = existingChatbotData
        || (await adminDb.collection("chatbots").doc(chatbotId).get()).data()
        || {}
    const userSnap = await adminDb.collection("users").doc(chatbotId).get().catch(() => null)
    const userData = userSnap?.data() || null
    const gamification = chatbotData.gamification || null

    if (!isModuleEnabled(chatbotData, userData)) {
        return { chatbotData, gamification, enabled: false, reason: "module_disabled" }
    }

    if (gamification?.enabled !== true) {
        return { chatbotData, gamification, enabled: false, reason: "config_disabled" }
    }

    return { chatbotData, gamification, enabled: true }
}
