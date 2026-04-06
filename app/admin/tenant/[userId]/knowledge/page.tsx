"use client"

import { KnowledgeStats } from "@/components/knowledge/knowledge-stats"
import { Info } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"

export default function TenantKnowledgePage({ params }: { params: { userId: string } }) {
    const { t, language } = useLanguage()

    return (
        <div className="space-y-6 pt-2">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{t('knowledgeOverview') || 'Genel Bakış'}</h1>
                <p className="text-muted-foreground text-sm">
                    {language === 'tr' 
                        ? 'Chatbotunuzun eğitim durumu ve eklenen kaynak sayıları hakkında genel bilgiler.'
                        : 'Overview of your chatbot\'s training status and added resource counts.'}
                </p>
            </div>
            
            <div className="bg-blue-50/50 dark:bg-zinc-900/50 text-blue-800 dark:text-zinc-300 p-4 rounded-lg flex items-start gap-3 border border-blue-100 dark:border-zinc-800">
                <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                <div className="text-sm leading-relaxed">
                    {language === 'tr'
                        ? 'Bu ekranda sisteme yüklediğiniz eğitim kaynaklarının genel dağılımını görebilirsiniz. Yeni veri eklemek için, sol menüden projenize uygun içerik türünü (Metin, URL, Dosya) seçerek ilerleyin.'
                        : 'You can view the general distribution of training resources on this screen. To add new data, select a content type (Text, URL, File) from the left menu.'}
                </div>
            </div>

            <div className="pt-4">
                <KnowledgeStats userId={params.userId} />
            </div>
        </div>
    )
}
