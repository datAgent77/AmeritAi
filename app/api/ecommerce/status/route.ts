import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { authorizeTargetAccess } from "@/lib/api-auth"
import { PLATFORM_META } from "@/lib/integrations/ecommerce/platform-registry"

export const runtime = "nodejs"

export async function GET(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })

        const { searchParams } = new URL(req.url)
        const chatbotId = searchParams.get("chatbotId")

        if (!chatbotId) return NextResponse.json({ error: "chatbotId zorunlu" }, { status: 400 })

        const authz = await authorizeTargetAccess(req, chatbotId)
        if (!authz.ok) return authz.response

        const snap = await adminDb
            .collection("ecommerce_connections")
            .where("chatbotId", "==", chatbotId)
            .get()

        const connections = snap.docs.map(doc => {
            const data = doc.data()
            const meta = PLATFORM_META[data.platform as keyof typeof PLATFORM_META]
            return {
                id: doc.id,
                platform: data.platform,
                platformName: meta?.name || data.platform,
                status: data.status,
                storeName: data.storeName || null,
                storeUrl: data.storeUrl || null,
                syncedProductCount: data.syncedProductCount || 0,
                syncedOrderCount: data.syncedOrderCount || 0,
                lastProductSyncAt: data.lastProductSyncAt || null,
                lastOrderSyncAt: data.lastOrderSyncAt || null,
                webhookRegistered: data.webhookRegistered || false,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
            }
        })

        return NextResponse.json({ connections })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
