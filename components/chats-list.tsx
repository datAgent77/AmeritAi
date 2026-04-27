"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useLanguage } from "@/context/LanguageContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"
import { Bot, Loader2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { AssistantTrainingCorrectionDialog } from "@/components/knowledge/assistant-training-correction-dialog"

interface ChatSession {
    id: string
    createdAt: any
    messages: any[]
}

interface ChatsListProps {
    targetUserId?: string
    embedded?: boolean
}

export function ChatsList({ targetUserId, embedded = false }: ChatsListProps) {
    const { user } = useAuth()
    const { t } = useLanguage()
    const userId = targetUserId || user?.uid

    const [sessions, setSessions] = useState<ChatSession[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)
    const [trainingDraft, setTrainingDraft] = useState<{
        question: string
        wrongAnswer: string
        sourceSessionId?: string
        sourceMessageId?: string
    } | null>(null)

    const getPreviousUserQuestion = (messages: any[], index: number) => {
        for (let i = index - 1; i >= 0; i--) {
            if (messages[i]?.role === "user" && typeof messages[i]?.content === "string") {
                return messages[i].content
            }
        }
        return ""
    }

    useEffect(() => {
        const fetchSessions = async () => {
            if (!userId) return

            try {
                const q = query(
                    collection(db, "chat_sessions"),
                    where("chatbotId", "==", userId),
                    orderBy("createdAt", "desc")
                )
                const querySnapshot = await getDocs(q)
                const fetchedSessions: ChatSession[] = []
                querySnapshot.forEach((doc) => {
                    fetchedSessions.push({ id: doc.id, ...doc.data() } as ChatSession)
                })
                setSessions(fetchedSessions)
            } catch (error: any) {
                console.error("Error fetching chat sessions:", error)
                if (error.code === 'failed-precondition') {
                    alert("Sıralama için Index gerekli! Lütfen Console'u açın (F12) ve Firebase'in verdiği linke tıklayarak index oluşturun.")
                }
            } finally {
                setIsLoading(false)
            }
        }

        fetchSessions()
    }, [userId])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className={embedded ? "space-y-4" : "p-8 space-y-8"}>
            {!embedded && (
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t('chatHistory')}</h2>
                    <p className="text-muted-foreground">
                        {t('chatHistoryDescription')}
                    </p>
                </div>
            )}

            {embedded ? (
                <div className="border rounded-lg">
                    {sessions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {t('noChatHistory')}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('date')}</TableHead>
                                    <TableHead>{t('sessionId')}</TableHead>
                                    <TableHead>{t('messages')}</TableHead>
                                    <TableHead className="text-right">{t('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sessions.map((session) => (
                                    <TableRow key={session.id}>
                                        <TableCell>
                                            {session.createdAt?.seconds
                                                ? format(new Date(session.createdAt.seconds * 1000), "PPpp")
                                                : "N/A"}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {session.id}
                                        </TableCell>
                                        <TableCell>
                                            {session.messages?.length || 0}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedSession(session)}
                                            >
                                                <Eye className="h-4 w-4 mr-2" />
                                                {t('view')}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>{t('recentSessions')}</CardTitle>
                        <CardDescription>
                            {t('recentSessionsDescription')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {sessions.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                {t('noChatHistory')}
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('date')}</TableHead>
                                        <TableHead>{t('sessionId')}</TableHead>
                                        <TableHead>{t('messages')}</TableHead>
                                        <TableHead className="text-right">{t('actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sessions.map((session) => (
                                        <TableRow key={session.id}>
                                            <TableCell>
                                                {session.createdAt?.seconds
                                                    ? format(new Date(session.createdAt.seconds * 1000), "PPpp")
                                                    : "N/A"}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {session.id}
                                            </TableCell>
                                            <TableCell>
                                                {session.messages?.length || 0}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setSelectedSession(session)}
                                                >
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    {t('view')}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}

            <Dialog open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
                <DialogContent className="max-w-2xl p-0 overflow-hidden flex flex-col max-h-[80vh]">
                    <DialogHeader className="px-8 pt-8 pb-4 shrink-0 border-b">
                        <DialogTitle>{t('chatTranscript')}</DialogTitle>
                        <DialogDescription>
                            {t('sessionId')}: {selectedSession?.id}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
                        {selectedSession?.messages?.map((msg: any, index: number) => (
                            <div
                                key={index}
                                className={`flex gap-2 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                                    }`}
                            >
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${msg.role === "user" ? "bg-gray-200" : "bg-black text-white"
                                        }`}
                                >
                                    {msg.role === "user" ? "U" : "AI"}
                                </div>
                                <div
                                    className={`p-3 rounded-lg text-sm ${msg.role === "user"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted"
                                        }`}
                                >
                                    {msg.content}
                                    {msg.role === "assistant" ? (
                                        <div className="mt-2 flex justify-end">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-7 gap-1 bg-background/80 text-xs"
                                                onClick={() => setTrainingDraft({
                                                    question: getPreviousUserQuestion(selectedSession.messages || [], index),
                                                    wrongAnswer: msg.content || "",
                                                    sourceSessionId: selectedSession.id,
                                                    sourceMessageId: msg.id,
                                                })}
                                            >
                                                <Bot className="h-3.5 w-3.5" />
                                                {t("assistantTrainAnswer") || "Cevabı Eğit"}
                                            </Button>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
            {userId ? (
                <AssistantTrainingCorrectionDialog
                    open={!!trainingDraft}
                    onOpenChange={(open) => !open && setTrainingDraft(null)}
                    userId={userId}
                    question={trainingDraft?.question || ""}
                    wrongAnswer={trainingDraft?.wrongAnswer || ""}
                    sourceSessionId={trainingDraft?.sourceSessionId}
                    sourceMessageId={trainingDraft?.sourceMessageId}
                />
            ) : null}
        </div>
    )
}
