import { NextResponse } from "next/server"
import { authorizeTargetAccess } from "@/lib/api-auth"
import { getAdminDb } from "@/lib/firebase-admin"
import { buildMetaSetupStatus } from "@/lib/meta-setup"
import { getOmniChannelConfig } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
    const adminDb = getAdminDb()
    if (!adminDb) {
        return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const chatbotId = searchParams.get("chatbotId")

    if (!chatbotId) {
        return NextResponse.json({ error: "chatbotId is required" }, { status: 400 })
    }

    const authz = await authorizeTargetAccess(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }

    const [chatbotSnapshot, omniConfig] = await Promise.all([
        adminDb.collection("chatbots").doc(chatbotId).get(),
        getOmniChannelConfig(adminDb, chatbotId),
    ])

    return NextResponse.json(
        buildMetaSetupStatus({
            origin: new URL(req.url).origin,
            omniConfig,
            legacyIntegrations: chatbotSnapshot.data()?.integrations || {},
        })
    )
}
