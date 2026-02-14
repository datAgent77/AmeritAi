"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { Plus, Trash2 } from "lucide-react"

import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"

type DynamicSelector = {
    id: string
    key: string
    selector: string
}

const DEFAULT_SELECTORS: DynamicSelector[] = [{ id: "1", key: "balance", selector: "#user-balance" }]

export default function DynamicContextSettings() {
    const { t, language } = useLanguage()
    const { user } = useAuth()
    const { toast } = useToast()
    const searchParams = useSearchParams()

    const userIdParam = searchParams.get("userId")
    const targetUserId = userIdParam || user?.uid

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isEnabled, setIsEnabled] = useState(false)
    const [selectors, setSelectors] = useState<DynamicSelector[]>(DEFAULT_SELECTORS)

    useEffect(() => {
        const loadSettings = async () => {
            if (!targetUserId) return

            try {
                const docRef = doc(db, "chatbots", targetUserId)
                const docSnap = await getDoc(docRef)

                if (docSnap.exists()) {
                    const data = docSnap.data()
                    setIsEnabled(Boolean(data.enableDynamicContext))

                    if (Array.isArray(data.dynamicContextSelectors) && data.dynamicContextSelectors.length > 0) {
                        setSelectors(data.dynamicContextSelectors)
                    }
                }
            } catch (error) {
                console.error("Error loading dynamic context settings:", error)
            } finally {
                setIsLoading(false)
            }
        }

        loadSettings()
    }, [targetUserId])

    const handleSave = async () => {
        if (!targetUserId) return
        setIsSaving(true)

        try {
            await setDoc(
                doc(db, "chatbots", targetUserId),
                {
                    enableDynamicContext: isEnabled,
                    dynamicContextSelectors: selectors,
                    dynamicContextMode: "nocode",
                },
                { merge: true }
            )

            toast({
                title: t("settingsSaved") || "Settings Saved",
                description: t("settingsSavedDesc") || "Your changes have been saved successfully.",
            })
        } catch (error) {
            console.error("Error saving dynamic context settings:", error)
            toast({
                title: t("error") || "Error",
                description: t("saveFailed") || "Failed to save settings.",
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    const addSelector = () => {
        setSelectors((prev) => [...prev, { id: Date.now().toString(), key: "", selector: "" }])
    }

    const removeSelector = (id: string) => {
        setSelectors((prev) => prev.filter((item) => item.id !== id))
    }

    const updateSelector = (id: string, field: "key" | "selector", value: string) => {
        setSelectors((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
    }

    if (isLoading) {
        return <div className="p-8 text-center">Loading settings...</div>
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">{language === "tr" ? "Dinamik Veri Bağlamı" : "Dynamic Data Context"}</h1>
                    <p className="text-muted-foreground">
                        {language === "tr"
                            ? "Sadece Seçici Modu ile sayfadaki canlı verileri AI'a aktarın."
                            : "Inject live page data into AI using Selector Mode only."}
                    </p>
                </div>

                <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-900 px-4 py-2 rounded-full border border-zinc-200 dark:border-zinc-800">
                    <span className={`text-sm font-medium ${isEnabled ? "text-green-600 dark:text-green-400" : "text-zinc-500"}`}>
                        {isEnabled
                            ? language === "tr"
                                ? "Modül Aktif"
                                : "Module Active"
                            : language === "tr"
                              ? "Modül Pasif"
                              : "Module Inactive"}
                    </span>
                    <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{language === "tr" ? "Nasıl Çalışır?" : "How it works?"}</CardTitle>
                    <CardDescription>
                        {language === "tr"
                            ? "Element seçicileri tanımlayın, widget bu alanları otomatik izleyip bağlama eklesin."
                            : "Define element selectors and widget will automatically track them for AI context."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    <ul className="list-disc pl-4 space-y-1">
                        <li>{language === "tr" ? "Her satır için bir değişken adı (key) yazın." : "Define a key for each row."}</li>
                        <li>{language === "tr" ? "İlgili CSS seçiciyi girin (ör. #user-balance)." : "Enter the CSS selector (e.g. #user-balance)."}</li>
                        <li>{language === "tr" ? "Ayarları kaydedin; değerler otomatik güncellenir." : "Save settings; values update automatically."}</li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{language === "tr" ? "CSS Seçiciler" : "CSS Selectors"}</CardTitle>
                    <CardDescription>
                        {language === "tr"
                            ? "Metin alanları ve form input değişimleri canlı izlenir."
                            : "Text content and input value changes are tracked in real time."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{language === "tr" ? "Değişken Adı (Key)" : "Variable Key"}</TableHead>
                                    <TableHead>{language === "tr" ? "CSS Seçici" : "CSS Selector"}</TableHead>
                                    <TableHead className="w-[50px]" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectors.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <Input
                                                value={item.key}
                                                onChange={(e) => updateSelector(item.id, "key", e.target.value)}
                                                placeholder="e.g. balance"
                                                className="h-8"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                value={item.selector}
                                                onChange={(e) => updateSelector(item.id, "selector", e.target.value)}
                                                placeholder="e.g. #user-balance"
                                                className="h-8 font-mono text-xs"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                                onClick={() => removeSelector(item.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {selectors.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground text-sm">
                                            {language === "tr" ? "Henüz seçici eklenmedi." : "No selectors added yet."}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <Button variant="outline" size="sm" className="w-full border-dashed" onClick={addSelector}>
                        <Plus className="w-4 h-4 mr-2" />
                        {language === "tr" ? "Yeni Seçici Ekle" : "Add New Selector"}
                    </Button>
                </CardContent>
            </Card>

            <div className="flex justify-end pt-6 border-t">
                <Button size="lg" className="font-semibold shadow-lg shadow-indigo-500/20 w-full sm:w-auto" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (language === "tr" ? "Kaydediliyor..." : "Saving...") : language === "tr" ? "Ayarları Kaydet" : "Save Settings"}
                </Button>
            </div>
        </div>
    )
}
