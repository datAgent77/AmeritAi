"use client"

import { SubpageSidebar } from "@/components/subpage-sidebar"
import { useLanguage } from "@/context/LanguageContext"
import { Type, Globe, FileText, MessageSquare } from "lucide-react"

export default function KnowledgeLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { t } = useLanguage()

    const knowledgeMenuItems = [
        {
            id: "text",
            label: t('knowledgeText') || "Metin",
            href: "/console/knowledge/text",
            icon: <Type className="w-4 h-4" />
        },
        {
            id: "url",
            label: t('knowledgeUrl') || "Web Sitesi",
            href: "/console/knowledge/url",
            icon: <Globe className="w-4 h-4" />
        },
        {
            id: "file",
            label: t('knowledgeFile') || "Dosyalar",
            href: "/console/knowledge/file",
            icon: <FileText className="w-4 h-4" />
        },
        {
            id: "qa",
            label: t('knowledgeQa') || "Soru-Cevap",
            href: "/console/knowledge/qa",
            icon: <MessageSquare className="w-4 h-4" />
        },
    ]

    return (
        <div className="flex h-full bg-white">
            <SubpageSidebar
                title={t('knowledgeBase') || "Bilgi Bankası"}
                items={knowledgeMenuItems}
            />
            <div className="flex-1 p-8 bg-white overflow-auto">
                <div className="max-w-full mx-auto space-y-8">
                    {children}
                </div>
            </div>
        </div>
    )
}
