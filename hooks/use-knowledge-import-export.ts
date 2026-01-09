import { useState, useRef } from "react"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/context/LanguageContext"

export function useKnowledgeImportExport() {
    const { user } = useAuth()
    const { toast } = useToast()
    const { t } = useLanguage()
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
            toast({
                title: t('error') || "Error",
                description: t('exportFailed') || "Failed to export knowledge base",
                variant: "destructive",
            })
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
                    toast({
                        title: t('success') || "Success",
                        description: t('importSuccess') || "Knowledge base imported successfully",
                    })
                    window.location.reload() // Refresh to show new items
                } else {
                    throw new Error("Import failed")
                }
            } catch (error) {
                console.error("Import error:", error)
                toast({
                    title: t('error') || "Error",
                    description: t('importFailed') || "Import failed. Check console for details.",
                    variant: "destructive",
                })
            } finally {
                setIsProcessing(false)
                if (fileInputRef.current) fileInputRef.current.value = ""
            }
        }
        reader.readAsText(file)
    }

    const triggerImport = () => {
        fileInputRef.current?.click()
    }

    return {
        isProcessing,
        fileInputRef,
        handleExport,
        handleImport,
        triggerImport,
    }
}
