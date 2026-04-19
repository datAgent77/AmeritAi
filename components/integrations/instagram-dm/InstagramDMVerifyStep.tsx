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
            description="İşletme hesabınızın ID’sini değil, daha önce bu hesaba DM göndermiş kullanıcının Instagram scoped sender ID değerini girerek test edin."
            recipientLabel="Alıcı Instagram scoped sender ID"
            recipientPlaceholder="Webhook sender.id değeri, örn. 17841400000000000"
            recipientValue={props.recipientId}
            onRecipientChange={props.onRecipientIdChange}
            messageValue={props.message}
            onMessageChange={props.onMessageChange}
            onSend={props.onSend}
            sending={props.sending}
        />
    )
}
