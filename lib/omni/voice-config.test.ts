import { describe, expect, test } from "vitest"
import {
    buildVoiceReadiness,
    normalizeVoiceIntegrationConfig,
    normalizeVoiceNumberRecord,
    resolveByocTrunkSid,
    resolveVoiceChannelEnabled,
    resolveVoiceTtsProvider,
} from "@/lib/omni/voice-config"

describe("voice-config", () => {
    test("normalizes legacy twilio-only voice records", () => {
        const record = normalizeVoiceNumberRecord({
            chatbotId: "tenant-1",
            phoneNumber: "+90 555 111 22 33",
            twilioNumberSid: "PN123",
            ttsVoice: "alice",
            routingStatus: "active",
        })

        expect(record.phoneNumber).toBe("+905551112233")
        expect(record.providerNumberId).toBe("PN123")
        expect(record.twilioNumberSid).toBe("PN123")
        expect(record.routingMode).toBe("twilio_direct")
        expect(record.ttsProvider).toBe("twilio")
        expect(record.twilioFallbackVoice).toBe("alice")
    })

    test("resolves byoc trunk and readiness for elevenlabs turkey pilot", () => {
        const integration = normalizeVoiceIntegrationConfig({
            accountSid: "AC123",
            authToken: "secret",
            defaultByocTrunkSid: "BY123",
            elevenLabsApiKeyRef: "env:ELEVENLABS_API_KEY",
            ttsProviderDefault: "elevenlabs",
        })
        const record = normalizeVoiceNumberRecord({
            chatbotId: "tenant-1",
            phoneNumber: "+905551112233",
            carrierProvider: "verimor",
            routingMode: "twilio_byoc",
            ttsProvider: "elevenlabs",
            elevenLabsVoiceId: "voice_123",
            routingStatus: "active",
        })

        expect(resolveByocTrunkSid(record, integration)).toBe("BY123")
        expect(resolveVoiceTtsProvider(record, integration)).toBe("elevenlabs")

        const readiness = buildVoiceReadiness({
            publicOrigin: true,
            integration,
            voiceNumbers: [record],
        })

        expect(readiness.ready).toBe(true)
        expect(readiness.carrierConfigured).toBe(true)
        expect(readiness.callControlConfigured).toBe(true)
        expect(readiness.renderingConfigured).toBe(true)
        expect(readiness.defaultRoutingMode).toBe("twilio_byoc")
    })

    test("treats voice as enabled for legacy tenants with saved numbers", () => {
        const integration = normalizeVoiceIntegrationConfig({})
        const record = normalizeVoiceNumberRecord({
            chatbotId: "tenant-1",
            phoneNumber: "+905551112233",
            routingStatus: "draft",
        })

        expect(resolveVoiceChannelEnabled({ integration, voiceNumbers: [record] })).toBe(true)
    })

    test("returns disabled readiness when the voice channel is explicitly off", () => {
        const integration = normalizeVoiceIntegrationConfig({
            enabled: false,
            accountSid: "AC123",
            authToken: "secret",
        })
        const record = normalizeVoiceNumberRecord({
            chatbotId: "tenant-1",
            phoneNumber: "+905551112233",
            carrierProvider: "verimor",
            routingStatus: "active",
        })

        const readiness = buildVoiceReadiness({
            publicOrigin: true,
            integration,
            voiceNumbers: [record],
        })

        expect(readiness.enabled).toBe(false)
        expect(readiness.ready).toBe(false)
        expect(readiness.blockers).toEqual(["Voice channel disabled."])
    })
})
