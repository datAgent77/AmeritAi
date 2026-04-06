import { beforeEach, describe, expect, test, vi } from "vitest"
import { getAdminStorage } from "@/lib/firebase-admin"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import { renderVoicePrompt } from "@/lib/omni/voice-renderer"

vi.mock("@/lib/firebase-admin", () => ({
    getAdminStorage: vi.fn(),
}))

vi.mock("@/lib/omni/audit-log", () => ({
    logOmniAuditEvent: vi.fn(),
}))

describe("voice-renderer", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test("returns Twilio <Say> when provider is twilio", async () => {
        const result = await renderVoicePrompt({
            chatbotId: "tenant-1",
            text: "Merhaba",
            locale: "tr-TR",
            ttsProvider: "twilio",
            source: "test",
        })

        expect(result.provider).toBe("twilio")
        expect(result.fallbackUsed).toBe(false)
        expect(result.twimlFragment).toContain("<Say")
        expect(getAdminStorage).not.toHaveBeenCalled()
    })

    test("falls back to Twilio when ElevenLabs is not configured", async () => {
        vi.mocked(getAdminStorage).mockReturnValue(null as any)

        const result = await renderVoicePrompt({
            chatbotId: "tenant-1",
            text: "Merhaba",
            locale: "tr-TR",
            ttsProvider: "elevenlabs",
            elevenLabsVoiceId: "voice_123",
            source: "test",
        })

        expect(result.provider).toBe("twilio")
        expect(result.fallbackUsed).toBe(true)
        expect(result.twimlFragment).toContain("<Say")
        expect(logOmniAuditEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: "voice.tts.elevenlabs_fallback",
                result: "error",
            })
        )
    })
})
