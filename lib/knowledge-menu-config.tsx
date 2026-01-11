import React from "react"
import { Type, Globe, FileText, MessageSquare, Settings2, LayoutDashboard } from "lucide-react"

export interface KnowledgeMenuItem {
    id: string
    label: string
    href: string
    icon: React.ReactNode
}

export function getKnowledgeMenuItems(
    basePath: string,
    t: (key: string) => string
): KnowledgeMenuItem[] {
    // Ensure basePath doesn't have a trailing slash
    const normalizedBasePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath

    return [
        {
            id: "overview",
            label: t('knowledgeOverview') || "Genel Bakış",
            href: normalizedBasePath,
            icon: <LayoutDashboard className="w-4 h-4" />
        },
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
        {
            id: "behavior",
            label: t('behaviorTitle') || "Sohbet Davranışı",
            href: `${normalizedBasePath}/behavior`,
            icon: <Settings2 className="w-4 h-4" />
        },
    ]
}
