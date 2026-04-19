"use client"

import { TestMessageCard } from "@/components/integrations/shared/TestMessageCard"

export function MessengerVerifyStep(props: {
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
            description="Bu sayfaya daha önce Messenger üzerinden mesaj göndermiş kullanıcının PSID değerini girerek test edin."
            recipientLabel="Alıcı Messenger PSID"
            recipientPlaceholder="Webhook sender.id değeri, örn. 1234567890123456"
            recipientValue={props.recipientId}
            onRecipientChange={props.onRecipientIdChange}
            messageValue={props.message}
            onMessageChange={props.onMessageChange}
            onSend={props.onSend}
            sending={props.sending}
        />
    )
}
