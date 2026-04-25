"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Save } from "lucide-react"

interface AssistantTrainingCorrectionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    userId: string
    question: string
    wrongAnswer: string
    sourceSessionId?: string
    sourceMessageId?: string
    onSaved?: () => void
}

export function AssistantTrainingCorrectionDialog({
    open,
    onOpenChange,
    userId,
    question,
    wrongAnswer,
    sourceSessionId,
    sourceMessageId,
    onSaved,
}: AssistantTrainingCorrectionDialogProps) {
    const { user } = useAuth()
    const { language } = useLanguage()
    const { toast } = useToast()
    const [draftQuestion, setDraftQuestion] = useState(question)
    const [draftWrongAnswer, setDraftWrongAnswer] = useState(wrongAnswer)
    const [answer, setAnswer] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const isTr = language === "tr"

    useEffect(() => {
        if (open) {
            setDraftQuestion(question)
            setDraftWrongAnswer(wrongAnswer)
            setAnswer("")
        }
    }, [open, question, wrongAnswer])

    const handleSave = async () => {
        if (!user || !answer.trim()) return
        setIsSaving(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/assistant-training", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    chatbotId: userId,
                    type: "correction",
                    status: "active",
                    question: draftQuestion,
                    wrongAnswer: draftWrongAnswer,
                    answer,
                    language: "auto",
                    priority: 5,
                    sourceSessionId,
                    sourceMessageId,
                }),
            })

            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data.error || "Failed to save")
            }

            toast({
                title: isTr ? "Cevap eğitimi kaydedildi" : "Response training saved",
            })
            onSaved?.()
            onOpenChange(false)
        } catch (error) {
            console.error("Failed to save correction training:", error)
            toast({
                title: isTr ? "Eğitim kaydedilemedi" : "Training could not be saved",
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{isTr ? "Cevabı Eğit" : "Train This Answer"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>{isTr ? "Kullanıcı Sorusu" : "User Question"}</Label>
                        <Textarea
                            value={draftQuestion}
                            onChange={(event) => setDraftQuestion(event.target.value)}
                            className="min-h-[84px]"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{isTr ? "Yanlış Cevap" : "Wrong Answer"}</Label>
                        <Textarea
                            value={draftWrongAnswer}
                            onChange={(event) => setDraftWrongAnswer(event.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{isTr ? "Doğru Cevap" : "Correct Answer"}</Label>
                        <Textarea
                            value={answer}
                            onChange={(event) => setAnswer(event.target.value)}
                            className="min-h-[140px]"
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            {isTr ? "İptal" : "Cancel"}
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving || !answer.trim() || !draftQuestion.trim()}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {isTr ? "Kaydet" : "Save"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
