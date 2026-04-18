"use client"

import { TestMessageCard } from "@/components/integrations/shared/TestMessageCard"

export function WhatsAppBizVerifyStep(props: {
    phone: string
    onPhoneChange: (value: string) => void
    message: string
    onMessageChange: (value: string) => void
    onSend: () => void
    sending?: boolean
}) {
    return (
        <TestMessageCard
            title="4. Test mesajı gönderin"
            description="Kendi numaranıza test mesajı göndererek kurulumun çalıştığını doğrulayın."
            recipientLabel="Alıcı telefon numarası"
            recipientPlaceholder="Örn. +905551234567"
            recipientValue={props.phone}
            onRecipientChange={props.onPhoneChange}
            messageValue={props.message}
            onMessageChange={props.onMessageChange}
            onSend={props.onSend}
            sending={props.sending}
        />
    )
}
