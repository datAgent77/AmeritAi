import { generateMetaVerifyToken } from "@/lib/meta-setup"

export interface StoredMetaPlatformAppConfig {
    appId: string
    appSecret: string
    verifyToken: string
    updatedAt: string | null
    updatedBy: string | null
}

export async function getStoredMetaPlatformAppConfig(adminDb: any): Promise<StoredMetaPlatformAppConfig | null> {
    const snapshot = await adminDb.collection("system_settings").doc("meta_platform_app").get()
    if (!snapshot.exists) return null

    const data = snapshot.data() || {}
    const appId = typeof data.appId === "string" ? data.appId.trim() : ""
    const appSecret = typeof data.appSecret === "string" ? data.appSecret.trim() : ""
    const verifyToken = typeof data.verifyToken === "string" ? data.verifyToken.trim() : ""

    if (!appId || !appSecret || !verifyToken) {
        return null
    }

    return {
        appId,
        appSecret,
        verifyToken,
        updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null,
        updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : null,
    }
}

export function buildMaskedMetaPlatformAppState(config: StoredMetaPlatformAppConfig | null) {
    return {
        appId: config?.appId || "",
        appSecret: config?.appSecret ? "********" : "",
        verifyToken: config?.verifyToken ? "********" : "",
        isConfigured: Boolean(config?.appId && config?.appSecret && config?.verifyToken),
        updatedAt: config?.updatedAt || null,
        updatedBy: config?.updatedBy || null,
    }
}

export function resolveMetaPlatformAppUpdate(input: {
    current: StoredMetaPlatformAppConfig | null
    appId?: string
    appSecret?: string
    verifyToken?: string
    updatedBy: string
}) {
    const nextAppId = (input.appId || input.current?.appId || "").trim()
    const nextAppSecret = (input.appSecret || input.current?.appSecret || "").trim()
    const nextVerifyToken = (input.verifyToken || input.current?.verifyToken || generateMetaVerifyToken()).trim()

    return {
        appId: nextAppId,
        appSecret: nextAppSecret,
        verifyToken: nextVerifyToken,
        updatedAt: new Date().toISOString(),
        updatedBy: input.updatedBy,
    }
}
