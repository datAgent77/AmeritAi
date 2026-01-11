"use client"

import { usePathname } from "next/navigation"
import { SubpageSidebar } from "@/components/subpage-sidebar"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { Upload, Download, Loader2 } from "lucide-react"
import { KnowledgeStats } from "./knowledge-stats"
import { getKnowledgeMenuItems } from "@/lib/knowledge-menu-config"
import { useKnowledgeImportExport } from "@/hooks/use-knowledge-import-export"

interface KnowledgeLayoutContentProps {
    children: React.ReactNode
    basePath: string
}

export function KnowledgeLayoutContent({
    children,
    basePath,
}: KnowledgeLayoutContentProps) {
    const { t } = useLanguage()
    const { user } = useAuth()
    const pathname = usePathname()
    const { isProcessing, fileInputRef, handleExport, handleImport, triggerImport } = useKnowledgeImportExport()

    const knowledgeMenuItems = getKnowledgeMenuItems(basePath, t)

    const isBehaviorPage = pathname?.endsWith('/behavior')

    return (
        <div className="flex h-full bg-white dark:bg-zinc-950">
            <SubpageSidebar
                title={t('training') || "Eğitim"}
                items={knowledgeMenuItems}
            />
            <div className="flex-1 p-8 bg-white dark:bg-zinc-950 overflow-auto">
                <div className="max-w-full mx-auto space-y-6">
                    {/* Page Content */}
                    {children}
                </div>
            </div>
        </div>
    )
}

