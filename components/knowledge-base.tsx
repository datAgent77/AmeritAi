
"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Trash2, Database, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { KnowledgeForm } from "@/components/knowledge-form"
import { useLanguage } from "@/context/LanguageContext"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus } from "lucide-react"

interface KnowledgeDoc {
    id: string
    title: string
    content: string
    fullContent?: string
    createdAt: any
}

interface KnowledgeBaseProps {
    targetUserId?: string
    embedded?: boolean
}

export function KnowledgeBase({ targetUserId, embedded = false }: KnowledgeBaseProps) {
    const { user } = useAuth()
    const { t } = useLanguage()
    const { toast } = useToast()
    const userId = targetUserId || user?.uid

    const [docs, setDocs] = useState<KnowledgeDoc[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedDoc, setSelectedDoc] = useState<KnowledgeDoc | null>(null)
    const [isFormModalOpen, setIsFormModalOpen] = useState(false)

    const fetchDocs = useCallback(async () => {
        if (!userId) return
        setIsLoading(true)
        try {
            const q = query(
                collection(db, "knowledge_docs"),
                where("chatbotId", "==", userId),
                orderBy("createdAt", "desc")
            )
            const querySnapshot = await getDocs(q)
            const fetchedDocs: KnowledgeDoc[] = []
            querySnapshot.forEach((doc) => {
                fetchedDocs.push({ id: doc.id, ...doc.data() } as KnowledgeDoc)
            })
            setDocs(fetchedDocs)
        } catch (error) {
            console.error("Error fetching docs:", error)
        } finally {
            setIsLoading(false)
        }
    }, [userId])

    useEffect(() => {
        fetchDocs()
    }, [userId, fetchDocs])

    const handleDelete = async (docId: string) => {
        if (!user) return
        try {
            // 1. Delete from Firestore
            await deleteDoc(doc(db, "knowledge_docs", docId))

            // 2. Call API to delete from Pinecone (Best effort)
            const token = await user.getIdToken()
            await fetch(`/api/knowledge?docId=${docId}&chatbotId=${userId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            toast({ title: t('deleted'), description: t('knowledgeDeleted') })
            fetchDocs()
        } catch (error) {
            console.error("Error deleting doc:", error)
            toast({ title: "Error", description: t('failedToDelete'), variant: "destructive" })
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className={embedded ? "space-y-8" : "p-8 space-y-8"}>
            {!embedded && (
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t('knowledgeBase')}</h2>
                    <p className="text-muted-foreground">{t('trainChatbotDescription')}</p>
                </div>
            )}

            <div className="grid gap-8 md:grid-cols-2">
                {/* Left: Add New Data Button */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">{t('addNewData')}</h3>
                    <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
                        <DialogTrigger asChild>
                            <Button className="w-full" size="lg">
                                <Plus className="mr-2 h-5 w-5" />
                                {t('addNewData') || "Yeni Eğitim Ekle"}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
                            <DialogHeader className="px-8 pt-8 pb-4 shrink-0 border-b">
                                <DialogTitle>{t('addNewData') || "Yeni Eğitim Ekle"}</DialogTitle>
                            </DialogHeader>
                            <div className="flex-1 overflow-y-auto px-8 py-6">
                                <KnowledgeForm 
                                    targetUserId={userId} 
                                    onSuccess={() => {
                                        fetchDocs()
                                        setIsFormModalOpen(false)
                                    }} 
                                />
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Right: List Data */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">{t('existingKnowledge')}</h3>
                    <div className="border rounded-lg bg-white overflow-hidden">
                        {docs.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
                                <Database className="h-10 w-10 mb-2 opacity-20" />
                                {t('noKnowledge')}
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[60%]">{t('knowledgeTitle')}</TableHead>
                                        <TableHead className="text-right">{t('date')}</TableHead>
                                        <TableHead className="text-right"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {docs.map((doc) => (
                                        <TableRow key={doc.id}>
                                            <TableCell className="font-medium align-middle">
                                                <div className="line-clamp-2" title={doc.title}>{doc.title}</div>
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground text-xs align-middle">
                                                {doc.createdAt?.seconds ? new Date(doc.createdAt.seconds * 1000).toLocaleDateString() : "Just now"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-blue-500"
                                                        onClick={() => setSelectedDoc(doc)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-red-500"
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
                </div>
            </div>

            {/* View Modal */}
            {selectedDoc && (
                <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
                    <DialogContent className="max-w-2xl p-0 overflow-hidden flex flex-col max-h-[80vh]">
                        <DialogHeader className="px-8 pt-8 pb-4 shrink-0 border-b flex flex-row items-center justify-between">
                            <DialogTitle className="font-bold text-lg">{selectedDoc.title}</DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto px-8 py-6 whitespace-pre-wrap font-mono text-sm bg-muted/30">
                            {selectedDoc.fullContent || selectedDoc.content}
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}
