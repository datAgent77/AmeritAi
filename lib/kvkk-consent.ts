import { computeContractVersionHash, getDefaultContractTemplate, type PublishedContractVersion } from "@/lib/contracts"

export interface KvkkConsentSettings {
    customText?: string
    rejectionContactText?: string
}

export interface KvkkConsentPayload {
    enabled: boolean
    text: string
    versionHash: string
    rejectionContactText: string
}

export function resolveKvkkConsentPayload(input: {
    mergedData?: Record<string, any> | null
    publishedKvkkContract?: PublishedContractVersion | null
}): KvkkConsentPayload {
    const mergedData = input.mergedData || {}
    
    console.log("[KVKK Consent] resolving payload from mergedData:", JSON.stringify({
        kvkkConsentSettings: mergedData.kvkkConsentSettings,
        kvkkRejectionContactText: mergedData.kvkkRejectionContactText,
        rejectionContactText: mergedData.rejectionContactText,
        kvkkCustomText: mergedData.kvkkCustomText
    }))

    // Check both paths: new nested structure and old flat structure
    const customText = typeof mergedData.kvkkConsentSettings?.customText === "string"
        ? mergedData.kvkkConsentSettings.customText.trim()
        : (typeof mergedData.kvkkCustomText === "string" ? mergedData.kvkkCustomText.trim() : "")
        
    const defaultText = input.publishedKvkkContract?.text || getDefaultContractTemplate("kvkkDefault").text
    const text = customText || defaultText
    const sourceVersion = input.publishedKvkkContract?.versionId || "default"
    
    const rejectionContactText = typeof mergedData.kvkkConsentSettings?.rejectionContactText === "string" && mergedData.kvkkConsentSettings.rejectionContactText.trim() !== ""
        ? mergedData.kvkkConsentSettings.rejectionContactText.trim()
        : (typeof mergedData.kvkkRejectionContactText === "string" && mergedData.kvkkRejectionContactText.trim() !== "" 
            ? mergedData.kvkkRejectionContactText.trim() 
            : (typeof mergedData.rejectionContactText === "string" && mergedData.rejectionContactText.trim() !== "" 
                ? mergedData.rejectionContactText.trim() 
                : "Hizmeti kullanabilmek için KVKK metnini onaylamanız gerekmektedir. Alternatif olarak bizimle iletişime geçebilirsiniz."))

    return {
        enabled: mergedData.enableKvkkConsent === true,
        text,
        versionHash: computeContractVersionHash(`kvkk:${sourceVersion}:${text}`),
        rejectionContactText,
    }
}

export function isKvkkConsentSatisfied(expectedVersionHash?: string | null, providedVersionHash?: string | null) {
    const expected = String(expectedVersionHash || "").trim()
    const provided = String(providedVersionHash || "").trim()
    if (!expected) return true
    return expected === provided
}
