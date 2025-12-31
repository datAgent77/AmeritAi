"use client"

import { useState } from "react"
import { useLanguage } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Plus, Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { KnowledgeList } from "@/components/knowledge/knowledge-list"

interface KnowledgeFileContentProps {
    userId: string
}

export function KnowledgeFileContent({ userId }: KnowledgeFileContentProps) {
    const { t } = useLanguage()
    const { toast } = useToast()

    const [file, setFile] = useState<File | null>(null)
    const [isAdding, setIsAdding] = useState(false)
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    const handleAdd = async () => {
        if (!file) return

        if (file.size > 10 * 1024 * 1024) {
            toast({
                title: t('fileTooLarge'),
                description: t('fileTooLargeDescription'),
                variant: "destructive",
            })
            return
        }

        setIsAdding(true)
        try {
            const docId = crypto.randomUUID();

            const reader = new FileReader();
            const fileBase64 = await new Promise((resolve, reject) => {
                reader.onload = () => {
                    const result = reader.result as string;
                    const base64 = result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const payload = {
                chatbotId: userId,
                docId,
                type: "file",
                fileBase64,
                fileName: file.name
            }

            const response = await fetch("/api/knowledge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error("Failed: " + (errorData.error || response.statusText))
            }

            toast({ title: "Success", description: t('knowledgeAdded') })
            setFile(null)
            setRefreshTrigger(prev => prev + 1)
            // Reset file input value manually if needed, or just let React handle state
        } catch (error) {
            console.error("Error adding file:", error)
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
                    <h2 className="text-2xl font-bold tracking-tight">{t('knowledgeFile')}</h2>
                    <p className="text-muted-foreground">{t('trainChatbotDescription')}</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('uploadDocument')}</CardTitle>
                        <CardDescription>{t('supportedFormats')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="file">{t('knowledgeFile')}</Label>
                            <div className="flex flex-col gap-4 items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer hover:bg-muted/50 transition-colors bg-muted/10 relative">
                                <Input
                                    id="file"
                                    type="file"
                                    accept=".pdf,.txt,.xlsx,.xls,.docx"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="p-4 bg-primary/10 rounded-full">
                                    <Upload className="h-6 w-6 text-primary" />
                                </div>
                                <div className="text-center">
                                    <div className="font-medium">{file ? file.name : "Click to upload or drag and drop"}</div>
                                    <div className="text-xs text-muted-foreground mt-1">PDF, TXT, DOCX, XLSX (Max 10MB)</div>
                                </div>
                            </div>
                        </div>
                        <Button
                            className="w-full"
                            onClick={handleAdd}
                            disabled={isAdding || !file}
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
                <KnowledgeList userId={userId} filterType="file" refreshTrigger={refreshTrigger} />
            </div>
        </div>
    )
}
