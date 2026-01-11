"use client"

import IntegrationPage from "@/components/integration-page"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"

export default function IntegrationsPage() {
    const { user } = useAuth()
    const { t, language } = useLanguage()

    if (!user) return null

    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{t('integration') || (language === 'tr' ? 'Entegrasyon' : 'Integration')}</h1>
                <p className="text-muted-foreground">
                    {language === 'tr' 
                        ? 'Chatbot widget\'ını web sitenize basit bir kod parçası ile ekleyin.'
                        : 'Add the chatbot widget to your website with a simple code snippet.'}
                </p>
            </div>
            <IntegrationPage userId={user.uid} />
        </div>
    )
}
