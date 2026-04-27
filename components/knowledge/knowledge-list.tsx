"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Eye, Trash2, Database, Loader2, Search,
    Type, Globe, FileText, MessageSquare, Pencil
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/AuthContext"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useLanguage } from "@/context/LanguageContext"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

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
    refreshTrigger?: number
}

// Type icon mapping
const getTypeIcon = (type: string | undefined) => {
    switch (type) {
        case 'text':
        case 'manual':
            return <Type className="h-4 w-4 text-blue-500" />
        case 'url':
            return <Globe className="h-4 w-4 text-green-500" />
        case 'file':
            return <FileText className="h-4 w-4 text-orange-500" />
        case 'qa':
            return <MessageSquare className="h-4 w-4 text-purple-500" />
        default:
            return <Database className="h-4 w-4 text-gray-400" />
    }
}

const getTypeLabel = (type: string | undefined) => {
    switch (type) {
        case 'text':
        case 'manual':
            return 'Metin'
        case 'url':
            return 'URL'
        case 'file':
            return 'Dosya'
        case 'qa':
            return 'Q&A'
        default:
            return type || 'Bilinmiyor'
    }
}

export function KnowledgeList({ userId, filterType, refreshTrigger }: KnowledgeListProps) {
    const { t } = useLanguage()
    const { toast } = useToast()
    const { user } = useAuth()
    const [docs, setDocs] = useState<KnowledgeDoc[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [previewDoc, setPreviewDoc] = useState<KnowledgeDoc | null>(null)
    const [editDoc, setEditDoc] = useState<KnowledgeDoc | null>(null)
    const [editTitle, setEditTitle] = useState("")
    const [editContent, setEditContent] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isDeleting, setIsDeleting] = useState(false)

    const fetchDocs = useCallback(async () => {
        if (!userId || !user) return
        setIsLoading(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/knowledge?chatbotId=${userId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
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
    }, [userId, user])

    useEffect(() => {
        fetchDocs()
    }, [userId, filterType, refreshTrigger, fetchDocs])

    // Filter docs based on search and filterType
    const filteredDocs = useMemo(() => {
        return docs.filter(doc => {
            // Filter by type if provided
            if (filterType) {
                const docType = doc.type === 'manual' ? 'text' : doc.type
                if (docType !== filterType) return false
            }
            // Filter by search query
            if (searchQuery) {
                const query = searchQuery.toLowerCase()
                return (
                    doc.title?.toLowerCase().includes(query) ||
                    doc.source?.toLowerCase().includes(query)
                )
            }
            return true
        })
    }, [docs, filterType, searchQuery])

    const handleDelete = async (docId: string) => {
        if (!user) return
        try {
            const token = await user.getIdToken()
            await fetch(`/api/knowledge?docId=${docId}&chatbotId=${userId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
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

    const handleBatchDelete = async () => {
        if (selectedIds.length === 0 || !user) return
        setIsDeleting(true)
        try {
            const token = await user.getIdToken()
            for (const docId of selectedIds) {
                await fetch(`/api/knowledge?docId=${docId}&chatbotId=${userId}`, {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })
            }
            toast({
                title: t('deleted'),
                description: `${selectedIds.length} ${t('documents') || 'döküman'} ${t('deleted') || 'silindi'}.`,
            })
            setSelectedIds([])
            fetchDocs()
        } catch (error) {
            console.error("Error batch deleting:", error)
            toast({
                title: "Error",
                description: t('failedToDelete'),
                variant: "destructive",
            })
        } finally {
            setIsDeleting(false)
        }
    }

    const handleEdit = (doc: KnowledgeDoc) => {
        setEditDoc(doc)
        setEditTitle(doc.title || "")
        setEditContent(doc.fullContent || doc.content || "")
    }

    const handleSaveEdit = async () => {
        if (!editDoc || !user) return
        setIsSaving(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch('/api/knowledge', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    docId: editDoc.id,
                    chatbotId: userId,
                    title: editTitle,
                    content: editContent
                })
            })
            if (!response.ok) throw new Error('Failed to update')
            toast({
                title: t('saved') || "Kaydedildi",
                description: t('changesSaved') || "Değişiklikler kaydedildi."
            })
            setEditDoc(null)
            fetchDocs()
        } catch (error) {
            console.error('Edit error:', error)
            toast({
                title: "Error",
                description: t('failedToSave') || "Kaydetme başarısız.",
                variant: "destructive"
            })
        } finally {
            setIsSaving(false)
        }
    }

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredDocs.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(filteredDocs.map(d => d.id))
        }
    }

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        )
    }

    const formatDate = (createdAt: any) => {
        if (!createdAt) return "Just now"
        const date = createdAt.seconds
            ? new Date(createdAt.seconds * 1000)
            : new Date(createdAt)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMins / 60)
        const diffDays = Math.floor(diffHours / 24)

        if (diffMins < 1) return "Just now"
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays < 7) return `${diffDays}d ago`
        return date.toLocaleDateString()
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
            {/* Header with Search and Batch Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h3 className="text-lg font-medium">{t('existingKnowledge')}</h3>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t('search') || "Ara..."}
                            className="pl-9 h-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {selectedIds.length > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBatchDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                                <Trash2 className="h-4 w-4 mr-1" />
                            )}
                            {selectedIds.length} Sil
                        </Button>
                    )}
                </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
                {filteredDocs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
                        <Database className="h-12 w-12 mb-3 opacity-20" />
                        <p className="font-medium">{searchQuery ? t('noResults') || "Sonuç bulunamadı" : t('noKnowledge')}</p>
                        {searchQuery && (
                            <Button
                                variant="link"
                                onClick={() => setSearchQuery("")}
                                className="mt-2"
                            >
                                {t('clearSearch') || "Aramayı temizle"}
                            </Button>
                        )}
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={selectedIds.length === filteredDocs.length && filteredDocs.length > 0}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </TableHead>
                                <TableHead className="w-12"></TableHead>
                                <TableHead>{t('knowledgeTitle')}</TableHead>
                                <TableHead className="text-right w-24">{t('date')}</TableHead>
                                <TableHead className="text-right w-24"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDocs.map((doc) => (
                                <TableRow
                                    key={doc.id}
                                    className="hover:bg-muted/30 transition-colors"
                                >
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedIds.includes(doc.id)}
                                            onCheckedChange={() => toggleSelect(doc.id)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center p-1.5 rounded-md bg-muted/50">
                                            {getTypeIcon(doc.type)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{doc.title || "Untitled"}</span>
                                            {doc.source && (
                                                <span className="text-xs text-muted-foreground truncate max-w-xs">
                                                    {doc.source}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground text-xs">
                                        {formatDate(doc.createdAt)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                                onClick={() => setPreviewDoc(doc)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                                                onClick={() => handleEdit(doc)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => handleDelete(doc.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Preview Modal */}
            <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] p-0 overflow-hidden flex flex-col">
                    <DialogHeader className="px-8 pt-8 pb-4 shrink-0 border-b">
                        <div className="flex items-center gap-3">
                            {getTypeIcon(previewDoc?.type)}
                            <DialogTitle className="pr-8">{previewDoc?.title || t('preview')}</DialogTitle>
                        </div>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto px-8 py-6">
                        {previewDoc?.source && (
                            <p className="text-xs text-muted-foreground mb-3">
                                {t('source')}: <a href={previewDoc.source} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{previewDoc.source}</a>
                            </p>
                        )}
                        <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap">
                            {previewDoc?.fullContent || previewDoc?.content || t('noContent')}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={!!editDoc} onOpenChange={() => setEditDoc(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] p-0 overflow-hidden flex flex-col">
                    <DialogHeader className="px-8 pt-8 pb-4 shrink-0 border-b">
                        <div className="flex items-center gap-3">
                            <Pencil className="h-5 w-5 text-amber-500" />
                            <DialogTitle>{t('edit') || "Düzenle"}</DialogTitle>
                        </div>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-title">{t('title') || "Başlık"}</Label>
                            <Input
                                id="edit-title"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                placeholder={t('enterTitle') || "Başlık girin"}
                            />
                        </div>
                        {(editDoc?.type === 'text' || editDoc?.type === 'manual') && (
                            <div className="space-y-2">
                                <Label htmlFor="edit-content">{t('content') || "İçerik"}</Label>
                                <Textarea
                                    id="edit-content"
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="min-h-[200px] font-mono text-sm"
                                    placeholder={t('enterContent') || "İçerik girin"}
                                />
                            </div>
                        )}
                        {editDoc?.type === 'url' && (
                            <p className="text-sm text-muted-foreground">
                                {t('urlContentNote') || "URL içerikleri yeniden çekilmesi gerekir. Sadece başlık düzenlenebilir."}
                            </p>
                        )}
                    </div>
                    <div className="px-8 py-6 shrink-0 border-t bg-muted/20 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setEditDoc(null)}>
                            {t('cancel') || "İptal"}
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={isSaving}>
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {t('save') || "Kaydet"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
