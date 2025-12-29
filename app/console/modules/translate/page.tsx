"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Languages, Globe, BookOpen, MessageSquare, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"

export default function AutoTranslatePage() {
    const { t } = useLanguage()
    const router = useRouter()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [config, setConfig] = useState({
        autoDetect: true,
        translateMenu: true,
        translateChat: true,
        defaultLanguage: "English"
    })

    const handleSave = () => {
        setIsLoading(true)
        setTimeout(() => {
            setIsLoading(false)
            toast({
                title: "Settings Saved",
                description: "Translation preferences updated."
            })
        }, 800)
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/console/modules")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <Languages className="h-8 w-8 text-blue-500" />
                            {t('modules.autoTranslate') || "Tourist & Translation"}
                        </h2>
                        <p className="text-muted-foreground">
                            {t('modules.autoTranslateDesc') || "Break language barriers with AI translation"}
                        </p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5" />
                            Browser Detection
                        </CardTitle>
                        <CardDescription>Automatically detect visitor&apos;s browser language</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Enable Auto-Detection</Label>
                                <p className="text-sm text-muted-foreground">Redirects to translated version automatically</p>
                            </div>
                            <Switch checked={config.autoDetect} onCheckedChange={(c) => setConfig({ ...config, autoDetect: c })} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            Live Chat Translation
                        </CardTitle>
                        <CardDescription>Translate chat messages in real-time using Google Gemini</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Enable Chat Translation</Label>
                                <p className="text-sm text-muted-foreground">Allows guests to chat in their native language</p>
                            </div>
                            <Switch checked={config.translateChat} onCheckedChange={(c) => setConfig({ ...config, translateChat: c })} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5" />
                            Menu Translation
                        </CardTitle>
                        <CardDescription>AI-generated menu translations</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Enable Menu Translation</Label>
                                <p className="text-sm text-muted-foreground">Show menu items in visitor&apos;s language</p>
                            </div>
                            <Switch checked={config.translateMenu} onCheckedChange={(c) => setConfig({ ...config, translateMenu: c })} />
                        </div>
                        <div className="mt-4 p-4 bg-muted/50 rounded-lg text-sm">
                            <p className="font-semibold mb-1">Preview (Turkish -&gt; English)</p>
                            <div className="flex justify-between">
                                <span>Adana Kebap</span>
                                <span className="text-muted-foreground">Spicy Minced Meat Kebab</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
