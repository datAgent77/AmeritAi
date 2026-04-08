import { describe, expect, test } from "vitest";
import { resolveElevenLabsSpeechPreset } from "@/lib/voice-runtime";

describe("resolveElevenLabsSpeechPreset", () => {
    test("uses a Turkish realtime preset for Turkish speech", () => {
        expect(resolveElevenLabsSpeechPreset("tr-TR")).toEqual({
            modelId: "eleven_flash_v2_5",
            languageCode: "tr",
            voiceSettings: {
                stability: 0.62,
                similarityBoost: 0.78,
                style: 0.08,
                useSpeakerBoost: true,
            },
        });
    });

    test("keeps the long-form multilingual preset for non-Turkish speech", () => {
        expect(resolveElevenLabsSpeechPreset("en-US")).toEqual({
            modelId: "eleven_multilingual_v2",
            voiceSettings: {
                stability: 0.45,
                similarityBoost: 0.82,
                style: 0.2,
                useSpeakerBoost: true,
            },
        });
    });
});
