"use client"

import { TestMessageCard } from "@/components/integrations/shared/TestMessageCard"
import { useLanguage } from "@/context/LanguageContext"

export function WhatsAppBizVerifyStep(props: {
    phone: string
    onPhoneChange: (value: string) => void
    message: string
    onMessageChange: (value: string) => void
    onSend: () => void
    sending?: boolean
}) {
    const { t } = useLanguage()
    return (
        <TestMessageCard
            title={t('waTestTitle')}
            description={t('waTestDesc')}
            recipientLabel={t('recipientPhone')}
            recipientPlaceholder={t('recipientPhonePlaceholder')}
            recipientValue={props.phone}
            onRecipientChange={props.onPhoneChange}
            messageValue={props.message}
            onMessageChange={props.onMessageChange}
            onSend={props.onSend}
            sending={props.sending}
        />
    )
}
