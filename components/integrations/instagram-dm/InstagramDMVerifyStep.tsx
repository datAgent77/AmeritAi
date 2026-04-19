"use client"

import { TestMessageCard } from "@/components/integrations/shared/TestMessageCard"

export function InstagramDMVerifyStep(props: {
    recipientId: string
    onRecipientIdChange: (value: string) => void
    message: string
    onMessageChange: (value: string) => void
    onSend: () => void
    sending?: boolean
}) {
    return (
        <TestMessageCard
            title="Test mesajı gönderin"
            description="Instagram kullanıcı ID’si ile test mesajı göndererek kurulumun çalıştığını doğrulayın."
            recipientLabel="Alıcı Instagram kullanıcı ID"
            recipientPlaceholder="Örn. 17841400000000000"
            recipientValue={props.recipientId}
            onRecipientChange={props.onRecipientIdChange}
            messageValue={props.message}
            onMessageChange={props.onMessageChange}
            onSend={props.onSend}
            sending={props.sending}
        />
    )
}
