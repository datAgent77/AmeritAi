import { NextResponse } from "next/server"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import { sendOmniInstagramText, sendOmniMessengerText, sendOmniWhatsAppText } from "@/lib/omni/channel-dispatch"
import { getOmniDeliveryAttempt, updateOmniDeliveryAttemptRetryState } from "@/lib/omni/delivery-attempts"
import { authorizeOmniRequest, authorizedForOmniPermission, getOmniChannelConfig, jsonError } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const body = await req.json()
    const chatbotId = body.chatbotId
    const id = body.id

    if (!chatbotId || !id) {
        return jsonError("chatbotId and id are required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "operations.manage")) {
        return jsonError("Forbidden", 403)
    }

    const attemptSnapshot = await authz.adminDb.collection("omni_delivery_attempts").doc(id).get()
    if (!attemptSnapshot.exists) {
        return jsonError("delivery attempt not found", 404)
    }

    const attempt = attemptSnapshot.data() || {}
    if (attempt.chatbotId !== chatbotId) {
        return jsonError("delivery attempt not found", 404)
    }

    if (!attempt.retryEligible) {
        return jsonError("this delivery attempt is not retryable", 400)
    }

    if (!attempt.destination || !attempt.payloadText) {
        return jsonError("delivery attempt is missing destination or payload", 400)
    }

    try {
        if (attempt.channel === "whatsapp") {
            const omniConfig = await getOmniChannelConfig(authz.adminDb, chatbotId)
            const omniWhatsapp = omniConfig.whatsapp || {}
            if (omniWhatsapp.enabled === false) {
                await logOmniAuditEvent({
                    chatbotId,
                    channel: "whatsapp",
                    eventType: "whatsapp.delivery_retry",
                    result: "blocked",
                    source: "api/omni/delivery-attempts/retry",
                    message: "WhatsApp channel is disabled",
                    metadata: {
                        originalAttemptId: id,
                    },
                })
                return jsonError("WhatsApp channel is disabled", 400)
            }
            const chatbotSnapshot = await authz.adminDb.collection("chatbots").doc(chatbotId).get()
            const chatbotData = chatbotSnapshot.exists ? chatbotSnapshot.data() || {} : {}
            const legacyWhatsapp = chatbotData.integrations?.whatsapp || {}

            const delivery = await sendOmniWhatsAppText({
                adminDb: authz.adminDb,
                chatbotId,
                to: attempt.destination,
                text: attempt.payloadText,
                phoneNumberId: attempt.providerTargetId || omniWhatsapp.phoneNumberId || legacyWhatsapp.phoneNumberId || null,
                accessToken: omniWhatsapp.accessTokenRef || legacyWhatsapp.accessToken || null,
                source: "api/omni/delivery-attempts/retry",
                sessionId: attempt.sessionId || null,
                retryOfAttemptId: id,
                attemptNumber: Number(attempt.attemptNumber || 1) + 1,
                metadata: {
                    originalSource: attempt.source || null,
                    retryRequestedFrom: "delivery-monitor",
                },
            })

            await logOmniAuditEvent({
                chatbotId,
                channel: "whatsapp",
                eventType: "whatsapp.delivery_retry",
                result: "success",
                source: "api/omni/delivery-attempts/retry",
                message: "WhatsApp delivery retried successfully",
                metadata: {
                    originalAttemptId: id,
                    deliveryAttemptId: delivery.deliveryAttemptId || null,
                    messageId: delivery.messageId || null,
                },
            })

            await updateOmniDeliveryAttemptRetryState(authz.adminDb, id, {
                retryState: "retried",
                nextRetryAt: null,
                lastRetryAt: new Date(),
                metadata: {
                    retriedFrom: "delivery-monitor",
                    retriedDeliveryAttemptId: delivery.deliveryAttemptId || null,
                },
            })

            return NextResponse.json({ ok: true, delivery })
        }

        if (attempt.channel === "instagram") {
            const omniConfig = await getOmniChannelConfig(authz.adminDb, chatbotId)
            const instagram = omniConfig.instagram || {}
            if (instagram.enabled === false) {
                await logOmniAuditEvent({
                    chatbotId,
                    channel: "instagram",
                    eventType: "instagram.delivery_retry",
                    result: "blocked",
                    source: "api/omni/delivery-attempts/retry",
                    message: "Instagram channel is disabled",
                    metadata: {
                        originalAttemptId: id,
                    },
                })
                return jsonError("Instagram channel is disabled", 400)
            }

            const delivery = await sendOmniInstagramText({
                adminDb: authz.adminDb,
                chatbotId,
                recipientId: attempt.destination,
                text: attempt.payloadText,
                endpointTarget: attempt.providerTargetId || instagram.accountId || instagram.pageId || null,
                accessToken: instagram.accessTokenRef || null,
                source: "api/omni/delivery-attempts/retry",
                sessionId: attempt.sessionId || null,
                retryOfAttemptId: id,
                attemptNumber: Number(attempt.attemptNumber || 1) + 1,
                metadata: {
                    originalSource: attempt.source || null,
                    retryRequestedFrom: "delivery-monitor",
                },
            })

            await logOmniAuditEvent({
                chatbotId,
                channel: "instagram",
                eventType: "instagram.delivery_retry",
                result: "success",
                source: "api/omni/delivery-attempts/retry",
                message: "Instagram delivery retried successfully",
                metadata: {
                    originalAttemptId: id,
                    deliveryAttemptId: delivery.deliveryAttemptId || null,
                    messageId: delivery.messageId || null,
                },
            })

            await updateOmniDeliveryAttemptRetryState(authz.adminDb, id, {
                retryState: "retried",
                nextRetryAt: null,
                lastRetryAt: new Date(),
                metadata: {
                    retriedFrom: "delivery-monitor",
                    retriedDeliveryAttemptId: delivery.deliveryAttemptId || null,
                },
            })

            return NextResponse.json({ ok: true, delivery })
        }

        if (attempt.channel === "messenger") {
            const omniConfig = await getOmniChannelConfig(authz.adminDb, chatbotId)
            const messenger = omniConfig.messenger || {}
            if (messenger.enabled === false) {
                await logOmniAuditEvent({
                    chatbotId,
                    channel: "messenger",
                    eventType: "messenger.delivery_retry",
                    result: "blocked",
                    source: "api/omni/delivery-attempts/retry",
                    message: "Messenger channel is disabled",
                    metadata: {
                        originalAttemptId: id,
                    },
                })
                return jsonError("Messenger channel is disabled", 400)
            }

            const delivery = await sendOmniMessengerText({
                adminDb: authz.adminDb,
                chatbotId,
                recipientId: attempt.destination,
                text: attempt.payloadText,
                pageId: attempt.providerTargetId || messenger.pageId || null,
                accessToken: messenger.accessTokenRef || null,
                source: "api/omni/delivery-attempts/retry",
                sessionId: attempt.sessionId || null,
                retryOfAttemptId: id,
                attemptNumber: Number(attempt.attemptNumber || 1) + 1,
                metadata: {
                    originalSource: attempt.source || null,
                    retryRequestedFrom: "delivery-monitor",
                },
            })

            await logOmniAuditEvent({
                chatbotId,
                channel: "messenger",
                eventType: "messenger.delivery_retry",
                result: "success",
                source: "api/omni/delivery-attempts/retry",
                message: "Messenger delivery retried successfully",
                metadata: {
                    originalAttemptId: id,
                    deliveryAttemptId: delivery.deliveryAttemptId || null,
                    messageId: delivery.messageId || null,
                },
            })

            await updateOmniDeliveryAttemptRetryState(authz.adminDb, id, {
                retryState: "retried",
                nextRetryAt: null,
                lastRetryAt: new Date(),
                metadata: {
                    retriedFrom: "delivery-monitor",
                    retriedDeliveryAttemptId: delivery.deliveryAttemptId || null,
                },
            })

            return NextResponse.json({ ok: true, delivery })
        }

        return jsonError("retry this voice attempt from the Voice Calls or Callback Queue screens", 400)
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to retry delivery"
        const failedRetryAttemptId = error instanceof Error ? (error as Error & { deliveryAttemptId?: string | null }).deliveryAttemptId || null : null
        const failedRetryAttempt = failedRetryAttemptId ? await getOmniDeliveryAttempt(authz.adminDb, failedRetryAttemptId) : null
        const nextRetryState = failedRetryAttempt?.retryState === "exhausted" ? "exhausted" : "retried"
        await updateOmniDeliveryAttemptRetryState(authz.adminDb, id, {
            retryState: nextRetryState,
            nextRetryAt: null,
            lastRetryAt: new Date(),
            metadata: {
                retriedFrom: "delivery-monitor",
                retryFailedDeliveryAttemptId: failedRetryAttemptId,
                retryExhaustedByAttemptId: failedRetryAttempt?.retryState === "exhausted" ? failedRetryAttemptId : null,
            },
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: attempt.channel || "web",
            eventType: `${attempt.channel || "unknown"}.delivery_retry`,
            result: "error",
            source: "api/omni/delivery-attempts/retry",
            message,
            metadata: {
                originalAttemptId: id,
                deliveryAttemptId: failedRetryAttemptId,
            },
        })

        if (failedRetryAttempt?.retryState === "exhausted") {
            await logOmniAuditEvent({
                chatbotId,
                channel: attempt.channel || "web",
                eventType: `${attempt.channel || "unknown"}.delivery_retry_exhausted`,
                result: "error",
                source: "api/omni/delivery-attempts/retry",
                message,
                metadata: {
                    originalAttemptId: id,
                    failedRetryAttemptId,
                },
            })
        }
        return NextResponse.json(
            {
                error: message,
                deliveryAttemptId: failedRetryAttemptId,
            },
            { status: 400 }
        )
    }
}
