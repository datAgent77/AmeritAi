"use client"

import { useAuth } from "@/context/AuthContext"
import { KnowledgeStats } from "@/components/knowledge/knowledge-stats"
import { KnowledgeList } from "@/components/knowledge/knowledge-list"
import { useLanguage } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button"
import { Upload, Download, Loader2 } from "lucide-react"
import { useKnowledgeImportExport } from "@/hooks/use-knowledge-import-export"

export default function KnowledgePage() {
    const { user } = useAuth()
    const { t } = useLanguage()
    const { isProcessing, fileInputRef, handleExport, handleImport, triggerImport } = useKnowledgeImportExport()

    if (!user) return null

    return (
        <div className="space-y-6">
            {/* Header with Export/Import */}
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

            {/* Stats Cards */}
            <KnowledgeStats userId={user.uid} />
            
            {/* All Knowledge List */}
            <KnowledgeList userId={user.uid} />
        </div>
    )
}
