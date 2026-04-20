import { test, expect } from "vitest"
import { computeContractVersionHash, type PublishedContractVersion } from "@/lib/contracts"
import { isKvkkConsentSatisfied, resolveKvkkConsentPayload } from "@/lib/kvkk-consent"

const publishedContract: PublishedContractVersion = {
    type: "kvkkDefault",
    title: "KVKK Bilgilendirme Metni",
    text: "Varsayilan KVKK metni",
    versionId: "v1",
    versionHash: computeContractVersionHash("kvkkDefault:v1"),
    createdAt: null,
    createdBy: null,
    publishedAt: null,
    updatedAt: null,
}

test("prefers nested KVKK settings for widget payload", () => {
    const payload = resolveKvkkConsentPayload({
        mergedData: {
            enableKvkkConsent: true,
            kvkkConsentSettings: {
                customText: "  Tenant metni  ",
                rejectionContactText: "  info@firma.com  ",
            },
        },
        publishedKvkkContract: publishedContract,
    })

    expect(payload.enabled).toBe(true)
    expect(payload.text).toBe("Tenant metni")
    expect(payload.rejectionContactText).toBe("info@firma.com")
    expect(payload.versionHash).toBe(
        computeContractVersionHash("kvkk:v1:Tenant metni")
    )
})

test("falls back to legacy KVKK fields when nested settings are missing", () => {
    const payload = resolveKvkkConsentPayload({
        mergedData: {
            enableKvkkConsent: true,
            kvkkCustomText: "  Eski tenant metni  ",
            kvkkRejectionContactText: "  legacy@firma.com  ",
        },
        publishedKvkkContract: publishedContract,
    })

    expect(payload.enabled).toBe(true)
    expect(payload.text).toBe("Eski tenant metni")
    expect(payload.rejectionContactText).toBe("legacy@firma.com")
    expect(isKvkkConsentSatisfied(payload.versionHash, payload.versionHash)).toBe(true)
    expect(isKvkkConsentSatisfied(payload.versionHash, "wrong-version")).toBe(false)
})
