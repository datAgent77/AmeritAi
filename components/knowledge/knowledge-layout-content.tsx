"use client"

import { useState, useRef } from "react"
import { SubpageSidebar } from "@/components/subpage-sidebar"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { Type, Globe, FileText, MessageSquare, Upload, Download, Loader2 } from "lucide-react"
import { KnowledgeStats } from "./knowledge-stats"

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

    // Ensure basePath doesn't have a trailing slash
    const normalizedBasePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath

    const [isProcessing, setIsProcessing] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleExport = async () => {
        if (!user?.uid) return
        try {
            const response = await fetch(`/api/knowledge?chatbotId=${user.uid}`)
            const data = await response.json()
            const blob = new Blob([JSON.stringify(data.docs || [], null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `knowledge-export-${new Date().toISOString().split('T')[0]}.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch (error) {
            console.error("Export error:", error)
        }
    }

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !user?.uid) return

        setIsProcessing(true)
        const reader = new FileReader()
        reader.onload = async (event) => {
            try {
                const items = JSON.parse(event.target?.result as string)
                if (!Array.isArray(items)) throw new Error("Invalid format")

                // Prepare items for bulk import
                const importItems = items.map(item => ({
                    title: item.title,
                    content: item.fullContent || item.content,
                    type: item.type,
                    chatbotId: user.uid
                }))

                const response = await fetch('/api/knowledge', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'bulk_import',
                        items: importItems
                    })
                })

                if (response.ok) {
                    window.location.reload() // Refresh to show new items
                }
            } catch (error) {
                console.error("Import error:", error)
                alert("Import failed. Check console for details.")
            } finally {
                setIsProcessing(false)
                if (fileInputRef.current) fileInputRef.current.value = ""
            }
        }
        reader.readAsText(file)
    }

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
        <div className="flex h-full bg-white dark:bg-zinc-950">
            <SubpageSidebar
                title={t('training') || "Eğitim"}
                items={knowledgeMenuItems}
            />
            <div className="flex-1 p-8 bg-white dark:bg-zinc-950 overflow-auto">
                <div className="max-w-full mx-auto space-y-6">
                    {/* Header Controls */}
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold tracking-tight">{t('knowledgeOverview') || "Genel Bakış"}</h2>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleExport}>
                                <Download className="mr-2 h-4 w-4" />
                                {t('export') || "Dışa Aktar"}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
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

                    {/* Page Content */}
                    {children}
                </div>
            </div>
        </div>
    )
}

