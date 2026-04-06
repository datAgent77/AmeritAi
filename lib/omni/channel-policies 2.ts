import type { ChannelPolicy, OmniChannel } from "@/lib/omni/types"

export const DEFAULT_CHANNEL_POLICIES: Record<OmniChannel, ChannelPolicy> = {
    web: {
        channel: "web",
        responseStyle: "Rich, structured, and conversion-aware web conversations.",
        maxVerbosity: "medium",
        safeFormatting: ["markdown", "lists", "links", "cta"],
        handoffMode: "inline",
        allowRichUi: true,
        transcriptSummary: true,
        identityRequiredForSensitiveData: true,
    },
    whatsapp: {
        channel: "whatsapp",
        responseStyle: "Short, mobile-native replies with clear next actions.",
        maxVerbosity: "medium",
        safeFormatting: ["plain_text", "line_breaks", "short_links"],
        handoffMode: "callback_ticket",
        followUpChannels: ["voice", "whatsapp"],
        allowRichUi: false,
        transcriptSummary: true,
        identityRequiredForSensitiveData: true,
    },
    instagram: {
        channel: "instagram",
        responseStyle: "Concise DM-friendly replies with low-friction lead capture.",
        maxVerbosity: "short",
        safeFormatting: ["plain_text", "emoji_light", "short_links"],
        handoffMode: "callback_ticket",
        followUpChannels: ["whatsapp", "voice"],
        allowRichUi: false,
        transcriptSummary: true,
        identityRequiredForSensitiveData: true,
    },
    voice: {
        channel: "voice",
        responseStyle: "Voice-safe, short, confirmation-driven phone conversations.",
        maxVerbosity: "short",
        safeFormatting: ["plain_text", "spoken_confirmation"],
        handoffMode: "callback_ticket",
        followUpChannels: ["whatsapp", "voice"],
        repeatCriticalFields: true,
        allowRichUi: false,
        transcriptSummary: true,
        identityRequiredForSensitiveData: true,
    },
}

export function getChannelPolicy(channel: OmniChannel) {
    return DEFAULT_CHANNEL_POLICIES[channel]
}
