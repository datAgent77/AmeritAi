import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { createNotification } from "@/lib/notification-service"
import { sendUpgradeRequestToAdmin } from "@/lib/email-service"
import { authorizeOmniRequest, authorizedForOmniPermission, jsonError } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const body = await req.json().catch(() => null)
    const chatbotId = typeof body?.chatbotId === "string" ? body.chatbotId : ""
    const targetPlan = typeof body?.targetPlan === "string" ? body.targetPlan : ""

    if (!chatbotId) {
        return jsonError("chatbotId is required", 400)
    }

    if (!targetPlan) {
        return jsonError("targetPlan is required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "accountCenter.manage")) {
        return jsonError("Forbidden", 403)
    }

    const userDoc = await authz.adminDb.collection("users").doc(chatbotId).get()
    if (!userDoc.exists) {
        return jsonError("User not found", 404)
    }

    const userData = userDoc.data() || {}
    const currentPlan = userData.planId || "starter"

    const emailSent = await sendUpgradeRequestToAdmin({
        customerEmail: userData.email,
        customerName: userData.companyName || userData.displayName || "İsimsiz Müşteri",
        currentUserParams: {
            userId: chatbotId,
            currentPlan,
        },
        targetPlan,
    })

    if (!emailSent) {
        return jsonError("Failed to send email", 500)
    }

    const upgradeRequestRef = await authz.adminDb.collection("upgrade_requests").add({
        userId: chatbotId,
        email: userData.email || "",
        name: userData.companyName || userData.displayName || "",
        requestedPlan: targetPlan,
        currentPlan,
        status: "pending",
        source: "omni",
        requestedBy: authz.callerUid,
        createdAt: FieldValue.serverTimestamp(),
    })

    await authz.adminDb.collection("users").doc(chatbotId).set(
        {
            lastUpgradeRequest: {
                targetPlan,
                status: "pending",
                source: "omni",
                requestedBy: authz.callerUid,
                requestedAt: FieldValue.serverTimestamp(),
            },
        },
        { merge: true }
    )

    try {
        const superAdminSnapshot = await authz.adminDb.collection("users").where("role", "==", "SUPER_ADMIN").get()
        if (!superAdminSnapshot.empty) {
            const customerEmail = userData.email || "unknown@tenant.local"
            const targetPlanLabel = String(targetPlan).toUpperCase()
            const currentPlanLabel = String(currentPlan).toUpperCase()

            await Promise.all(
                superAdminSnapshot.docs.map((superAdminDoc: any) =>
                    createNotification({
                        userId: superAdminDoc.id,
                        type: "upgrade_request",
                        title: "Yeni Yükseltme Talebi",
                        message: `${customerEmail} hesabı ${targetPlanLabel} planına yükseltme talebi gönderdi.`,
                        metadata: {
                            customerId: chatbotId,
                            customerEmail,
                            currentPlan: currentPlanLabel,
                            targetPlan: targetPlanLabel,
                            requestId: upgradeRequestRef.id,
                            source: "omni_upgrade_request_api",
                            eventType: "upgrade_request",
                        },
                    })
                )
            )
        }
    } catch (error) {
        console.error("Failed to create Omni upgrade notifications:", error)
    }

    return NextResponse.json({
        success: true,
        lastUpgradeRequest: {
            targetPlan,
            status: "pending",
            source: "omni",
            requestedBy: authz.callerUid,
        },
    })
}
