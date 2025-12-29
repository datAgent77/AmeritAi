
"use client"

import { useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { db } from "@/lib/firebase"
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Plus, UploadCloud, FileText, Link as LinkIcon, HelpCircle, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLanguage } from "@/context/LanguageContext"
import { useDropzone } from "react-dropzone"
import { Card, CardContent } from "@/components/ui/card"

interface KnowledgeFormProps {
    targetUserId?: string
    onSuccess?: () => void
}

export function KnowledgeForm({ targetUserId, onSuccess }: KnowledgeFormProps) {
    const { user } = useAuth()
    const { t } = useLanguage()
    const { toast } = useToast()

    // If targetUserId is provided (admin override), use it. Otherwise use current user.
    const effectiveUserId = targetUserId || user?.uid;

    const [activeTab, setActiveTab] = useState("text")
    const [isAdding, setIsAdding] = useState(false)

    // Form States
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [url, setUrl] = useState("")
    const [file, setFile] = useState<File | null>(null)
    const [question, setQuestion] = useState("")
    const [answer, setAnswer] = useState("")

    // URL Preview State
    const [scrapedPreview, setScrapedPreview] = useState<{ title: string, content: string } | null>(null)

    // File Dropzone
    const onDrop = (acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0])
        }
    }
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'text/plain': ['.txt'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
        },
        maxFiles: 1
    })

    const handleSubmit = async () => {
        if (!effectiveUserId) return

        setIsAdding(true)
        try {
            const docRef = doc(collection(db, "knowledge_docs"));
            const docId = docRef.id;
            let payload: any = {}

            // 1. Prepare Payload based on Tab
            if (activeTab === "text") {
                await setDoc(docRef, {
                    chatbotId: effectiveUserId,
                    title,
                    type: "text",
                    content: content.substring(0, 200) + "...",
                    fullContent: content,
                    createdAt: serverTimestamp()
                })
                payload = { chatbotId: effectiveUserId, docId, type: "text", text: content }
            }
            else if (activeTab === "url") {
                // Determine source content: Edited preview or just URL
                const finalContent = scrapedPreview ? scrapedPreview.content : "";
                const finalTitle = title || (scrapedPreview ? scrapedPreview.title : url);

                await setDoc(docRef, {
                    chatbotId: effectiveUserId,
                    title: finalTitle,
                    type: "url",
                    source: url,
                    content: finalContent ? finalContent.substring(0, 200) + "..." : "URL Source",
                    fullContent: finalContent,
                    createdAt: serverTimestamp()
                })

                // If we have content, send as text to avoid re-scraping
                if (finalContent) {
                    payload = { chatbotId: effectiveUserId, docId, type: "text", text: finalContent, url, fileName: url }
                } else {
                    payload = { chatbotId: effectiveUserId, docId, type: "url", url }
                }
            }
            else if (activeTab === "file" && file) {
                if (file.size > 10 * 1024 * 1024) throw new Error(t('fileTooLarge'));

                const reader = new FileReader();
                const fileBase64 = await new Promise<string>((resolve, reject) => {
                    reader.onload = () => {
                        const res = reader.result as string;
                        resolve(res.split(',')[1]);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });

                payload = {
                    chatbotId: effectiveUserId,
                    docId,
                    type: "file",
                    fileBase64,
                    fileName: file.name
                }
            }
            else if (activeTab === "qa") {
                const qaText = `Q: ${question}\nA: ${answer}`;
                await setDoc(docRef, {
                    chatbotId: effectiveUserId,
                    title: question,
                    type: "qa",
                    content: qaText.substring(0, 200) + "...",
                    fullContent: qaText,
                    createdAt: serverTimestamp()
                })
                payload = { chatbotId: effectiveUserId, docId, type: "qa", text: qaText, title: question }
            }

            // 2. Send to API (Pinecone)
            const res = await fetch("/api/knowledge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error("Failed to process data");

            // 3. Post-Process (File needs Firestore update after text extraction)
            if (activeTab === "file") {
                const data = await res.json();
                await setDoc(docRef, {
                    chatbotId: effectiveUserId,
                    title: data.title || file?.name,
                    type: "file",
                    source: file?.name,
                    content: data.preview || "Parsed Content",
                    createdAt: serverTimestamp()
                })
            }

            toast({ title: t('knowledgeAdded'), description: "Your AI has been trained with this data." })
            resetForm()
            onSuccess?.()

        } catch (error: any) {
            console.error(error)
            toast({ title: "Error", description: error.message || t('failedToAdd'), variant: "destructive" })
        } finally {
            setIsAdding(false)
        }
    }

    const handleFetchUrl = async () => {
        if (!url) return;
        setIsAdding(true);
        try {
            const res = await fetch('/api/crawl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            if (!res.ok) throw new Error('Failed to crawl');
            const data = await res.json();
            setScrapedPreview({ title: data.title, content: data.content });
            setTitle(data.title); // Pre-fill title
            toast({ title: "Success", description: "Content fetched. Review below before adding." });
        } catch (e: any) {
            toast({ title: "Error", description: "Could not fetch URL.", variant: "destructive" });
        } finally {
            setIsAdding(false);
        }
    }

    const resetForm = () => {
        setTitle("")
        setContent("")
        setUrl("")
        setFile(null)
        setQuestion("")
        setAnswer("")
        setScrapedPreview(null)
    }

    const isValid = () => {
        if (activeTab === "text") return title && content
        if (activeTab === "url") return url && (scrapedPreview ? true : !!url) // Can add without preview too
        if (activeTab === "file") return !!file
        if (activeTab === "qa") return question && answer
        return false
    }

    return (
        <Card className="border-zinc-200 shadow-sm">
            <CardContent className="p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 mb-6">
                        <TabsTrigger value="text" className="gap-2"><FileText className="w-4 h-4" /> {t('knowledgeText')}</TabsTrigger>
                        <TabsTrigger value="url" className="gap-2"><LinkIcon className="w-4 h-4" /> {t('knowledgeUrl')}</TabsTrigger>
                        <TabsTrigger value="file" className="gap-2"><UploadCloud className="w-4 h-4" /> {t('knowledgeFile')}</TabsTrigger>
                        <TabsTrigger value="qa" className="gap-2"><HelpCircle className="w-4 h-4" /> {t('knowledgeQa')}</TabsTrigger>
                    </TabsList>

                    {/* TEXT TAB */}
                    <TabsContent value="text" className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('knowledgeTitle')}</Label>
                            <Input placeholder="e.g. Opening Hours" value={title} onChange={e => setTitle(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('knowledgeContent')}</Label>
                            <Textarea
                                placeholder="Paste your text here..."
                                className="min-h-[150px]"
                                value={content}
                                onChange={e => setContent(e.target.value)}
                            />
                        </div>
                    </TabsContent>

                    {/* URL TAB */}
                    <TabsContent value="url" className="space-y-4">
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Input placeholder="https://restaurant.com/menu" value={url} onChange={e => setUrl(e.target.value)} />
                            </div>
                            <Button variant="outline" onClick={handleFetchUrl} disabled={isAdding || !url}>
                                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Fetch Content"}
                            </Button>
                        </div>
                        {scrapedPreview && (
                            <div className="border rounded-md p-4 bg-muted/30 space-y-3 animate-in fade-in slide-in-from-top-2">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-medium text-sm text-green-600 flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        Content Fetched Successfully
                                    </h4>
                                    <Button variant="ghost" size="sm" onClick={() => setScrapedPreview(null)}><X className="w-4 h-4" /></Button>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Title</Label>
                                    <Input value={title} onChange={e => setTitle(e.target.value)} className="h-8 text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Preview Content (Editable)</Label>
                                    <Textarea
                                        value={scrapedPreview.content}
                                        onChange={e => setScrapedPreview({ ...scrapedPreview, content: e.target.value })}
                                        className="text-xs font-mono h-32"
                                    />
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    {/* FILE TAB */}
                    <TabsContent value="file" className="space-y-4">
                        <div
                            {...getRootProps()}
                            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${isDragActive
                                    ? "border-primary bg-primary/5"
                                    : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                                }`}
                        >
                            <input {...getInputProps()} />
                            <div className="flex flex-col items-center gap-3">
                                <div className="p-3 bg-muted rounded-full">
                                    <UploadCloud className="w-6 h-6 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="font-medium">
                                        {isDragActive ? "Drop the file here" : "Drag & drop your file here"}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        PDF, DOCX, TXT (Max 10MB)
                                    </p>
                                </div>
                            </div>
                        </div>

                        {file && (
                            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded border">
                                        <FileText className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <div className="text-sm">
                                        <p className="font-medium truncate max-w-[200px]">{file.name}</p>
                                        <p className="text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </TabsContent>

                    {/* QA TAB */}
                    <TabsContent value="qa" className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('question')}</Label>
                            <Input placeholder="e.g. WiFi Password?" value={question} onChange={e => setQuestion(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('answer')}</Label>
                            <Textarea placeholder="The password is..." value={answer} onChange={e => setAnswer(e.target.value)} />
                        </div>
                    </TabsContent>

                    <Button
                        className="w-full mt-6 h-11"
                        onClick={handleSubmit}
                        disabled={isAdding || !isValid()}
                    >
                        {isAdding ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Training AI...
                            </>
                        ) : (
                            <>
                                <Plus className="mr-2 h-4 w-4" />
                                {t('addToKnowledgeBase')}
                            </>
                        )}
                    </Button>
                </Tabs>
            </CardContent>
        </Card>
    )
}
