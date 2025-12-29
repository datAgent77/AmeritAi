"use client"

import { SubpageSidebar } from "@/components/subpage-sidebar"
import { useLanguage } from "@/context/LanguageContext"
import { Type, Globe, FileText, MessageSquare } from "lucide-react"

interface KnowledgeLayoutContentProps {
    children: React.ReactNode
    basePath: string
}

export function KnowledgeLayoutContent({
    children,
    basePath,
}: KnowledgeLayoutContentProps) {
    const { t } = useLanguage()

    // Ensure basePath doesn't have a trailing slash
    const normalizedBasePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath

    const knowledgeMenuItems = [
        {
            id: "text",
            label: t('knowledgeText') || "Metin",
            href: `${normalizedBasePath}/text`,
            icon: <Type className="w-4 h-4" />
        },
        {
            id: "url",
            label: t('knowledgeUrl') || "Web Sitesi",
            href: `${normalizedBasePath}/url`,
            icon: <Globe className="w-4 h-4" />
        },
        {
            id: "file",
            label: t('knowledgeFile') || "Dosyalar",
            href: `${normalizedBasePath}/file`,
            icon: <FileText className="w-4 h-4" />
        },
        {
            id: "qa",
            label: t('knowledgeQa') || "Soru-Cevap",
            href: `${normalizedBasePath}/qa`,
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
