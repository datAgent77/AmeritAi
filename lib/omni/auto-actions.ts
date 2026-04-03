import { extractAppointmentData, isAppointmentConfirmation } from "@/lib/appointment-extractor"
import { extractLeadData, isLeadConfirmation } from "@/lib/lead-extractor"
import { executeOmniAction } from "@/lib/omni/action-execution"
import type { OmniChannel } from "@/lib/omni/types"

interface AutoActionInput {
    adminDb: any
    chatbotId: string
    channel: Extract<OmniChannel, "web" | "whatsapp" | "instagram">
    sessionId: string
    contactKey?: string | null
    displayName?: string | null
    visitorEmail?: string | null
    existingMessages: Array<{ role?: string; content?: string }>
    userMessage: { role?: string; content: string }
    assistantRawResponse: string
}

interface AutoActionResult {
    disposition: "appointment_created" | "lead_created" | null
    createdAppointmentId?: string | null
    createdLeadId?: string | null
}

function normalizeMessages(messages: Array<{ role?: string; content?: string }>) {
    return messages
        .map((message) => ({
            role: message.role === "assistant" || message.role === "system" ? message.role : "user",
            content: typeof message.content === "string" ? message.content : "",
        }))
        .filter((message) => message.content.trim().length > 0)
}

async function hasAppointmentForSession(adminDb: any, chatbotId: string, sessionId: string, date?: string, time?: string) {
    const snapshot = await adminDb.collection("appointments")
        .where("chatbotId", "==", chatbotId)
        .where("sourceSessionId", "==", sessionId)
        .limit(10)
        .get()

    return snapshot.docs.some((doc: any) => {
        const data = doc.data() || {}
        if (!date || !time) return true
        return String(data.date || "") === date && String(data.time || "") === time
    })
}

async function hasLeadForSession(adminDb: any, chatbotId: string, sessionId: string) {
    const snapshot = await adminDb.collection("leads")
        .where("chatbotId", "==", chatbotId)
        .where("sourceSessionId", "==", sessionId)
        .limit(1)
        .get()

    return !snapshot.empty
}

export async function maybeExecuteOmniAutoActions(input: AutoActionInput): Promise<AutoActionResult> {
    const normalizedMessages = normalizeMessages([...input.existingMessages, input.userMessage])

    if (isAppointmentConfirmation(input.assistantRawResponse)) {
        const extracted = extractAppointmentData(normalizedMessages as any, input.assistantRawResponse)
        const customerEmail = extracted.customerEmail || input.visitorEmail || ""
        const customerPhone = extracted.customerPhone || input.contactKey || ""

        if ((customerEmail || customerPhone) && extracted.date && extracted.time) {
            const alreadyExists = await hasAppointmentForSession(
                input.adminDb,
                input.chatbotId,
                input.sessionId,
                extracted.date,
                extracted.time
            )

            if (!alreadyExists) {
                const result = await executeOmniAction(input.adminDb, {
                    chatbotId: input.chatbotId,
                    actionId: "create_appointment",
                    sourceChannel: input.channel,
                    sourceSessionId: input.sessionId,
                    contactKey: input.contactKey || customerPhone || customerEmail || null,
                    payload: {
                        customerName: extracted.customerName || input.displayName || "",
                        customerEmail,
                        customerPhone,
                        date: extracted.date,
                        time: extracted.time,
                        type: "Consultation",
                        source: "omni",
                        notes: `Auto-created from ${input.channel} conversation`,
                    },
                })

                return {
                    disposition: "appointment_created",
                    createdAppointmentId: (result.record as any)?.id || null,
                }
            }
        }
    }

    if (isLeadConfirmation(input.assistantRawResponse)) {
        const extracted = extractLeadData(normalizedMessages as any)
        const email = extracted.email || input.visitorEmail || ""
        const phone = extracted.phone || input.contactKey || ""

        if (extracted.name || email || phone) {
            const alreadyExists = await hasLeadForSession(input.adminDb, input.chatbotId, input.sessionId)
            if (!alreadyExists) {
                const result = await executeOmniAction(input.adminDb, {
                    chatbotId: input.chatbotId,
                    actionId: "create_lead",
                    sourceChannel: input.channel,
                    sourceSessionId: input.sessionId,
                    contactKey: input.contactKey || phone || email || null,
                    payload: {
                        name: extracted.name || input.displayName || "Anonymous",
                        email,
                        phone,
                        source: `Omni ${input.channel} auto-reply`,
                        customFields: extracted.company ? { company: extracted.company } : {},
                    },
                })

                return {
                    disposition: "lead_created",
                    createdLeadId: (result.record as any)?.id || null,
                }
            }
        }
    }

    return {
        disposition: null,
    }
}
