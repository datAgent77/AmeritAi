"use client"

import { useState } from "react"
import { useLanguage } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { KnowledgeList } from "@/components/knowledge/knowledge-list"
import { useAuth } from "@/context/AuthContext"

interface KnowledgeTextContentProps {
    userId: string
}

export function KnowledgeTextContent({ userId }: KnowledgeTextContentProps) {
    const { t } = useLanguage()
    const { toast } = useToast()
    const { user } = useAuth()

    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [isAdding, setIsAdding] = useState(false)
    // We need a refresh trigger for the list
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    const handleAdd = async () => {
        if (!title || !content) return

        setIsAdding(true)
        try {
            if (!user) {
                throw new Error(t('unauthorized') || "Unauthorized")
            }
            const token = await user.getIdToken()

            // Generate a random ID client-side (or let server do it, but we need it for API payload structure)
            const docId = crypto.randomUUID();

            const payload = { chatbotId: userId, docId, type: "text", text: content, title: title }

            const response = await fetch("/api/knowledge", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || response.statusText)
            }

            toast({
                title: "Success",
                description: t('knowledgeAdded'),
            })

            setTitle("")
            setContent("")
            setRefreshTrigger(prev => prev + 1)
        } catch (error) {
            console.error("Error adding text:", error)
            toast({
                title: "Error",
                description: t('failedToAdd'),
                variant: "destructive",
            })
        } finally {
            setIsAdding(false)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="space-y-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{t('knowledgeText')}</h2>
                    <p className="text-muted-foreground">
                        {t('trainChatbotDescription')}
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('addNewData')}</CardTitle>
                        <CardDescription>{t('knowledgeTextDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">{t('knowledgeTitle')}</Label>
                            <Input
                                id="title"
                                placeholder={t('knowledgeTitlePlaceholder')}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="content">{t('knowledgeContent')}</Label>
                            <Textarea
                                id="content"
                                placeholder={t('knowledgeContentPlaceholder')}
                                className="h-40"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />
                        </div>
                        <Button
                            className="w-full"
                            onClick={handleAdd}
                            disabled={isAdding || !title || !content}
                        >
                            {isAdding ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('processing')}
                                </>
                            ) : (
                                <>
                                    <Plus className="mr-2 h-4 w-4" />
                                    {t('addToKnowledgeBase')}
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div>
                <KnowledgeList userId={userId} filterType="text" refreshTrigger={refreshTrigger} />
            </div>
        </div>
    )
}
