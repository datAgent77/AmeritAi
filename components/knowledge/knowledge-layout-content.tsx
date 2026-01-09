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

    // Hide header controls and stats on behavior page
    const isBehaviorPage = pathname?.endsWith('/behavior')
    const showHeaderControls = !isBehaviorPage

    return (
        <div className="flex h-full bg-white dark:bg-zinc-950">
            <SubpageSidebar
                title={t('training') || "Eğitim"}
                items={knowledgeMenuItems}
            />
            <div className="flex-1 p-8 bg-white dark:bg-zinc-950 overflow-auto">
                <div className="max-w-full mx-auto space-y-6">
                    {/* Header Controls - Hidden on behavior page */}
                    {showHeaderControls && (
                        <>
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold tracking-tight">{t('knowledgeOverview') || "Genel Bakış"}</h2>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={handleExport}>
                                        <Download className="mr-2 h-4 w-4" />
                                        {t('export') || "Dışa Aktar"}
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={triggerImport} disabled={isProcessing}>
                                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                        {t('import') || "İçe Aktar"}
                                    </Button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept=".json"
                                        onChange={handleImport}
                                    />
                                </div>
                            </div>

                            {/* Stats Header */}
                            {user?.uid && (
                                <KnowledgeStats userId={user.uid} />
                            )}
                        </>
                    )}

                    {/* Page Content */}
                    {children}
                </div>
            </div>
        </div>
    )
}

