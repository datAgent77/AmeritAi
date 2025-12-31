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

interface KnowledgeQaContentProps {
    userId: string
}

export function KnowledgeQaContent({ userId }: KnowledgeQaContentProps) {
    const { t } = useLanguage()
    const { toast } = useToast()

    const [question, setQuestion] = useState("")
    const [answer, setAnswer] = useState("")
    const [isAdding, setIsAdding] = useState(false)
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    const handleAdd = async () => {
        if (!question || !answer) return

        setIsAdding(true)
        try {
            const docId = crypto.randomUUID();

            const qaContent = `Q: ${question}\nA: ${answer}`;

            // Pass title (question) so API saves it to Firestore metadata
            const payload = { chatbotId: userId, docId, type: "qa", text: qaContent, title: question }

            const response = await fetch("/api/knowledge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || response.statusText)
            }

            toast({ title: "Success", description: t('knowledgeAdded') })
            setQuestion("")
            setAnswer("")
            setRefreshTrigger(prev => prev + 1)
        } catch (error) {
            console.error("Error adding Q&A:", error)
            toast({ title: "Error", description: t('failedToAdd'), variant: "destructive" })
        } finally {
            setIsAdding(false)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="space-y-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{t('knowledgeQa')}</h2>
                    <p className="text-muted-foreground">{t('trainChatbotDescription')}</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('addNewData')}</CardTitle>
                        <CardDescription>{t('knowledgeQaDescription') || "Add specific question and answer pairs."}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="question">{t('question')}</Label>
                            <Input
                                id="question"
                                placeholder="e.g. What is your return policy?"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="answer">{t('answer')}</Label>
                            <Textarea
                                id="answer"
                                placeholder="e.g. You can return items within 30 days..."
                                className="h-32"
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                            />
                        </div>
                        <Button
                            className="w-full"
                            onClick={handleAdd}
                            disabled={isAdding || !question || !answer}
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
                <KnowledgeList userId={userId} filterType="qa" refreshTrigger={refreshTrigger} />
            </div>
        </div>
    )
}
