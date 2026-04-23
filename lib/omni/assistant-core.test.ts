import { describe, expect, test } from "vitest"
import { sanitizeTextResponse, sanitizeVoiceResponse } from "@/lib/omni/assistant-core"

describe("sanitizeTextResponse", () => {
    test("converts booking form markers into a plain-text Messenger fallback", () => {
        const result = sanitizeTextResponse(
            "Tabii ki! Lutfen asagidaki randevu formunu doldurun.\n[SHOW_BOOKING_FORM]",
            "messenger",
            "tr"
        )

        expect(result).toBe(
            "Randevu olusturabilmem icin tercih ettiginiz tarih ve saat ile ad soyad ve telefon ya da e-posta bilginizi buradan tek mesajda yazin."
        )
    })

    test("converts lead form markers into a plain-text WhatsApp fallback", () => {
        const result = sanitizeTextResponse(
            "Sure, please fill out this form. [SHOW_LEAD_FORM]",
            "whatsapp",
            "en"
        )

        expect(result).toBe("To help our team follow up, send your name and phone or email in one message here.")
    })

    test("keeps regular assistant replies intact", () => {
        const result = sanitizeTextResponse("Merhaba! Size nasil yardimci olabilirim?", "instagram", "tr")

        expect(result).toBe("Merhaba! Size nasil yardimci olabilirim?")
    })
})

describe("sanitizeVoiceResponse", () => {
    test("strips booking form markers from voice-safe output", () => {
        expect(sanitizeVoiceResponse("Elbette. [SHOW_BOOKING_FORM]")).toBe("Elbette.")
    })
})
