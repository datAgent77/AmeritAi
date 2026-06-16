"use client"

import { TestMessageCard } from "@/components/integrations/shared/TestMessageCard"
import { useLanguage } from "@/context/LanguageContext"

export function InstagramDMVerifyStep(props: {
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
            description={t('igTestDesc')}
            recipientLabel={t('igRecipientLabel')}
            recipientPlaceholder={t('igRecipientPlaceholder')}
            recipientValue={props.recipientId}
            onRecipientChange={props.onRecipientIdChange}
            messageValue={props.message}
            onMessageChange={props.onMessageChange}
            onSend={props.onSend}
            sending={props.sending}
        />
    )
}
