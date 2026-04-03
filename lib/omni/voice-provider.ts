import { createTwilioVoiceCall, verifyTwilioWebhookSignature } from "@/lib/omni/server-utils"

export type OmniVoiceProvider = "twilio"

interface VerifyVoiceWebhookSignatureParams {
    provider?: OmniVoiceProvider
    requestUrl: string
    formEntries: Array<[string, string]>
    signatureHeader: string | null
    authToken: string
}

interface CreateVoiceOutboundCallParams {
    provider?: OmniVoiceProvider
    accountSid: string
    authToken: string
    to: string
    from: string
    url: string
    statusCallback?: string | null
    byocTrunkSid?: string | null
}

interface VoiceProviderAdapter {
    verifyWebhookSignature(params: VerifyVoiceWebhookSignatureParams): boolean
    createOutboundCall(params: CreateVoiceOutboundCallParams): Promise<any>
}

const twilioVoiceProvider: VoiceProviderAdapter = {
    verifyWebhookSignature(params) {
        return verifyTwilioWebhookSignature({
            requestUrl: params.requestUrl,
            formEntries: params.formEntries,
            signatureHeader: params.signatureHeader,
            authToken: params.authToken,
        })
    },
    createOutboundCall(params) {
        return createTwilioVoiceCall({
            accountSid: params.accountSid,
            authToken: params.authToken,
            to: params.to,
            from: params.from,
            url: params.url,
            statusCallback: params.statusCallback,
            byocTrunkSid: params.byocTrunkSid,
        })
    },
}

function resolveVoiceProvider(provider?: OmniVoiceProvider): VoiceProviderAdapter {
    if (!provider || provider === "twilio") {
        return twilioVoiceProvider
    }

    return twilioVoiceProvider
}

export function verifyVoiceWebhookSignature(params: VerifyVoiceWebhookSignatureParams) {
    return resolveVoiceProvider(params.provider).verifyWebhookSignature(params)
}

export function createVoiceOutboundCall(params: CreateVoiceOutboundCallParams) {
    return resolveVoiceProvider(params.provider).createOutboundCall(params)
}
