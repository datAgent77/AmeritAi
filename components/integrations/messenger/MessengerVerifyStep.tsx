"use client"

import { TestMessageCard } from "@/components/integrations/shared/TestMessageCard"
import { useLanguage } from "@/context/LanguageContext"

export function MessengerVerifyStep(props: {
    recipientId: string
    onRecipientIdChange: (value: string) => void
    message: string
    onMessageChange: (value: string) => void
    onSend: () => void
    sending?: boolean
}) {
    const { t } = useLanguage()
    return (
        <TestMessageCard
            title={t('waTestTitle')}
            description={t('msgrTestDesc')}
            recipientLabel={t('msgrRecipientLabel')}
            recipientPlaceholder={t('msgrRecipientPlaceholder')}
            recipientValue={props.recipientId}
            onRecipientChange={props.onRecipientIdChange}
            messageValue={props.message}
            onMessageChange={props.onMessageChange}
            onSend={props.onSend}
            sending={props.sending}
        />
    )
}
