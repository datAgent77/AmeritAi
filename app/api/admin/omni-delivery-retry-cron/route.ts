import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import { sendOmniInstagramText, sendOmniWhatsAppText } from "@/lib/omni/channel-dispatch"
import { getOmniDeliveryAttempt, updateOmniDeliveryAttemptRetryState } from "@/lib/omni/delivery-attempts"
import { getOmniChannelConfig, toMillis } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

function getCronSecret(request: Request) {
    return request.headers.get("x-cron-secret") || new URL(request.url).searchParams.get("secret")
}

export async function GET(request: Request) {
    const cronSecret = getCronSecret(request)
    if (cronSecret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminDb = getAdminDb()
    if (!adminDb) {
        return NextResponse.json({ error: "Database not initialized" }, { status: 500 })
    }

    const snapshot = await adminDb.collection("omni_delivery_attempts").where("retryEligible", "==", true).limit(150).get()
    const now = Date.now()
    const dueAttempts = snapshot.docs
        .map((doc: any) => ({ id: doc.id, ...(doc.data() || {}) }))
        .filter((attempt: any) => attempt.status === "failed")
        .filter((attempt: any) => attempt.retryMode === "auto" && attempt.retryState === "pending")
        .filter((attempt: any) => toMillis(attempt.nextRetryAt) > 0 && toMillis(attempt.nextRetryAt) <= now)
        .sort((left: any, right: any) => toMillis(left.nextRetryAt) - toMillis(right.nextRetryAt))
        .slice(0, 25)

    const summary = {
        scanned: snapshot.docs.length,
        due: dueAttempts.length,
        processed: 0,
        success: 0,
        failed: 0,
        skipped: 0,
    }

    for (const attempt of dueAttempts) {
        if (!attempt.id || !attempt.chatbotId || !attempt.destination || !attempt.payloadText) {
            summary.skipped += 1
            continue
        }

        await updateOmniDeliveryAttemptRetryState(adminDb, attempt.id, {
            retryState: "processing",
            lastRetryAt: new Date(),
            metadata: {
                autoRetrySource: "api/admin/omni-delivery-retry-cron",
            },
        })

        try {
            if (attempt.channel === "whatsapp") {
                const omniConfig = await getOmniChannelConfig(adminDb, attempt.chatbotId)
                const omniWhatsapp = omniConfig.whatsapp || {}
                if (omniWhatsapp.enabled === false) {
                    await updateOmniDeliveryAttemptRetryState(adminDb, attempt.id, {
                        retryState: "retried",
                        nextRetryAt: null,
                        lastRetryAt: new Date(),
                        metadata: {
                            autoRetrySkippedReason: "channel-disabled",
                        },
                    })
                    await logOmniAuditEvent({
                        chatbotId: attempt.chatbotId,
                        channel: "whatsapp",
                        eventType: "whatsapp.delivery_auto_retry",
                        result: "blocked",
                        source: "api/admin/omni-delivery-retry-cron",
                        message: "Automatic WhatsApp retry skipped because channel is disabled",
                        metadata: {
                            originalAttemptId: attempt.id,
                        },
                    })
                    summary.skipped += 1
                    continue
                }
                const chatbotSnapshot = await adminDb.collection("chatbots").doc(attempt.chatbotId).get()
                const chatbotData = chatbotSnapshot.exists ? chatbotSnapshot.data() || {} : {}
                const legacyWhatsapp = chatbotData.integrations?.whatsapp || {}

                const delivery = await sendOmniWhatsAppText({
                    adminDb,
                    chatbotId: attempt.chatbotId,
                    to: attempt.destination,
                    text: attempt.payloadText,
                    phoneNumberId: attempt.providerTargetId || omniWhatsapp.phoneNumberId || legacyWhatsapp.phoneNumberId || null,
                    accessToken: omniWhatsapp.accessTokenRef || legacyWhatsapp.accessToken || null,
                    source: "api/admin/omni-delivery-retry-cron",
                    sessionId: attempt.sessionId || null,
                    retryOfAttemptId: attempt.id,
                    attemptNumber: Number(attempt.attemptNumber || 1) + 1,
                    metadata: {
                        originalSource: attempt.source || null,
                        retryRequestedFrom: "auto-cron",
                    },
                })

                await updateOmniDeliveryAttemptRetryState(adminDb, attempt.id, {
                    retryState: "retried",
                    nextRetryAt: null,
                    lastRetryAt: new Date(),
                    metadata: {
                        autoRetriedDeliveryAttemptId: delivery.deliveryAttemptId || null,
                    },
                })

                await logOmniAuditEvent({
                    chatbotId: attempt.chatbotId,
                    channel: "whatsapp",
                    eventType: "whatsapp.delivery_auto_retry",
                    result: "success",
                    source: "api/admin/omni-delivery-retry-cron",
                    message: "WhatsApp delivery retried automatically",
                    metadata: {
                        originalAttemptId: attempt.id,
                        deliveryAttemptId: delivery.deliveryAttemptId || null,
                        messageId: delivery.messageId || null,
                    },
                })

                summary.processed += 1
                summary.success += 1
                continue
            }

            if (attempt.channel === "instagram") {
                const omniConfig = await getOmniChannelConfig(adminDb, attempt.chatbotId)
                const instagram = omniConfig.instagram || {}
                if (instagram.enabled === false) {
                    await updateOmniDeliveryAttemptRetryState(adminDb, attempt.id, {
                        retryState: "retried",
                        nextRetryAt: null,
                        lastRetryAt: new Date(),
                        metadata: {
                            autoRetrySkippedReason: "channel-disabled",
                        },
                    })
                    await logOmniAuditEvent({
                        chatbotId: attempt.chatbotId,
                        channel: "instagram",
                        eventType: "instagram.delivery_auto_retry",
                        result: "blocked",
                        source: "api/admin/omni-delivery-retry-cron",
                        message: "Automatic Instagram retry skipped because channel is disabled",
                        metadata: {
                            originalAttemptId: attempt.id,
                        },
                    })
                    summary.skipped += 1
                    continue
                }

                const delivery = await sendOmniInstagramText({
                    adminDb,
                    chatbotId: attempt.chatbotId,
                    recipientId: attempt.destination,
                    text: attempt.payloadText,
                    endpointTarget: attempt.providerTargetId || instagram.accountId || instagram.pageId || null,
                    accessToken: instagram.accessTokenRef || null,
                    source: "api/admin/omni-delivery-retry-cron",
                    sessionId: attempt.sessionId || null,
                    retryOfAttemptId: attempt.id,
                    attemptNumber: Number(attempt.attemptNumber || 1) + 1,
                    metadata: {
                        originalSource: attempt.source || null,
                        retryRequestedFrom: "auto-cron",
                    },
                })

                await updateOmniDeliveryAttemptRetryState(adminDb, attempt.id, {
                    retryState: "retried",
                    nextRetryAt: null,
                    lastRetryAt: new Date(),
                    metadata: {
                        autoRetriedDeliveryAttemptId: delivery.deliveryAttemptId || null,
                    },
                })

                await logOmniAuditEvent({
                    chatbotId: attempt.chatbotId,
                    channel: "instagram",
                    eventType: "instagram.delivery_auto_retry",
                    result: "success",
                    source: "api/admin/omni-delivery-retry-cron",
                    message: "Instagram delivery retried automatically",
                    metadata: {
                        originalAttemptId: attempt.id,
                        deliveryAttemptId: delivery.deliveryAttemptId || null,
                        messageId: delivery.messageId || null,
                    },
                })

                summary.processed += 1
                summary.success += 1
                continue
            }

            await updateOmniDeliveryAttemptRetryState(adminDb, attempt.id, {
                retryState: "exhausted",
                nextRetryAt: null,
                lastRetryAt: new Date(),
                metadata: {
                    autoRetrySkippedReason: `unsupported-channel:${attempt.channel || "unknown"}`,
                },
            })
            await logOmniAuditEvent({
                chatbotId: attempt.chatbotId,
                channel: attempt.channel || "web",
                eventType: `${attempt.channel || "unknown"}.delivery_retry_exhausted`,
                result: "error",
                source: "api/admin/omni-delivery-retry-cron",
                message: `Automatic retry exhausted for unsupported channel ${attempt.channel || "unknown"}`,
                metadata: {
                    originalAttemptId: attempt.id,
                    reason: "unsupported-channel",
                },
            })
            summary.skipped += 1
        } catch (error) {
            const failedRetryAttemptId =
                error instanceof Error ? (error as Error & { deliveryAttemptId?: string | null }).deliveryAttemptId || null : null
            const failedRetryAttempt = failedRetryAttemptId ? await getOmniDeliveryAttempt(adminDb, failedRetryAttemptId) : null
            const nextRetryState = failedRetryAttempt?.retryState === "exhausted" ? "exhausted" : "retried"

            await updateOmniDeliveryAttemptRetryState(adminDb, attempt.id, {
                retryState: nextRetryState,
                nextRetryAt: null,
                lastRetryAt: new Date(),
                metadata: {
                    autoRetryFailedDeliveryAttemptId: failedRetryAttemptId,
                    autoRetryExhaustedByAttemptId: failedRetryAttempt?.retryState === "exhausted" ? failedRetryAttemptId : null,
                },
            })

            await logOmniAuditEvent({
                chatbotId: attempt.chatbotId,
                channel: attempt.channel || "web",
                eventType: `${attempt.channel || "unknown"}.delivery_auto_retry`,
                result: "error",
                source: "api/admin/omni-delivery-retry-cron",
                message: error instanceof Error ? error.message : "Automatic delivery retry failed",
                metadata: {
                    originalAttemptId: attempt.id,
                    deliveryAttemptId: failedRetryAttemptId,
                },
            })

            if (failedRetryAttempt?.retryState === "exhausted") {
                await logOmniAuditEvent({
                    chatbotId: attempt.chatbotId,
                    channel: attempt.channel || "web",
                    eventType: `${attempt.channel || "unknown"}.delivery_retry_exhausted`,
                    result: "error",
                    source: "api/admin/omni-delivery-retry-cron",
                    message: error instanceof Error ? error.message : "Automatic delivery retry exhausted",
                    metadata: {
                        originalAttemptId: attempt.id,
                        failedRetryAttemptId,
                    },
                })
            }

            summary.processed += 1
            summary.failed += 1
        }
    }

    return NextResponse.json({
        ok: true,
        summary,
        processedAt: new Date().toISOString(),
    })
}
