"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Eye, Trash2, Database, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useLanguage } from "@/context/LanguageContext"

interface KnowledgeDoc {
    id: string
    title: string
    content: string
    fullContent?: string
    createdAt: any
    type?: string
    source?: string
}

interface KnowledgeListProps {
    userId: string
    filterType?: string
}

export function KnowledgeList({ userId, filterType }: KnowledgeListProps) {
    const { t } = useLanguage()
    const { toast } = useToast()
    const [docs, setDocs] = useState<KnowledgeDoc[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchDocs = useCallback(async () => {
        if (!userId) return
        setIsLoading(true)
        try {
            const response = await fetch(`/api/knowledge?chatbotId=${userId}`)
            if (!response.ok) {
                throw new Error("Failed to fetch docs")
            }
            const data = await response.json()
            setDocs(data.docs || [])
        } catch (error) {
            console.error("Error fetching docs:", error)
        } finally {
            setIsLoading(false)
        }
    }, [userId])

    useEffect(() => {
        fetchDocs()
    }, [userId, filterType, fetchDocs])

    const handleDelete = async (docId: string) => {
        try {
            await fetch(`/api/knowledge?docId=${docId}&chatbotId=${userId}`, {
                method: "DELETE"
            })
            toast({
                title: t('deleted'),
                description: t('knowledgeDeleted'),
            })
            fetchDocs()
        } catch (error) {
            console.error("Error deleting doc:", error)
            toast({
                title: "Error",
                description: t('failedToDelete'),
                variant: "destructive",
            })
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium">{t('existingKnowledge')}</h3>
            <div className="border rounded-lg">
                {docs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                        <Database className="h-10 w-10 mb-2 opacity-20" />
                        {t('noKnowledge')}
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('knowledgeTitle')}</TableHead>
                                <TableHead className="text-right">{t('date')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {docs.map((doc) => (
                                <TableRow key={doc.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span>{doc.title}</span>
                                            {doc.source && <span className="text-xs text-muted-foreground">{doc.source}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground text-xs">
                                        {doc.createdAt?.seconds ? new Date(doc.createdAt.seconds * 1000).toLocaleDateString() : "Just now"}
                                    </TableCell>
                                    <TableCell className="text-right flex justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                            // Handle view/details if needed
                                            onClick={() => { }}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleDelete(doc.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    )
}
