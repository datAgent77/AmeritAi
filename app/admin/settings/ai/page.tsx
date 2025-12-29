
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
// RadioGroup not installed, using custom UI
// import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Save, Bot, CheckCircle2 } from "lucide-react"

export default function AISettingsPage() {
    const { user } = useAuth()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    const [provider, setProvider] = useState("openai")
    const [model, setModel] = useState("")
    const [apiKey, setApiKey] = useState("")

    useEffect(() => {
        if (!user) return

        const fetchSettings = async () => {
            try {
                const token = await user.getIdToken()
                const res = await fetch("/api/admin/system-settings", {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (res.ok) {
                    const data = await res.json()
                    setProvider(data.provider || "openai")
                    setModel(data.model || "gpt-3.5-turbo")
                    setApiKey(data.apiKey || "")
                }
            } catch (error) {
                console.error("Failed to load settings", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchSettings()
    }, [user])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            const token = await user?.getIdToken()
            const res = await fetch("/api/admin/system-settings", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    provider,
                    model,
                    apiKey
                })
            })

            if (res.ok) {
                toast({ title: "Saved", description: "AI configuration updated successfully." })
            } else {
                throw new Error("Failed to save")
            }
        } catch (error) {
            toast({ title: "Error", description: "Could not save settings.", variant: "destructive" })
        } finally {
            setIsSaving(false)
        }
    }

    const getModels = (p: string) => {
        if (p === 'openai') {
            return [
                { id: 'gpt-4o', name: 'GPT-4o (Most Capable)' },
                { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
                { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (Fastest)' }
            ]
        }
        if (p === 'google') {
            return [
                { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Complex Tasks)' },
                { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (High Volume/Speed)' }
            ]
        }
        return []
    }

    if (isLoading) return <div className="p-8"><Loader2 className="animate-spin" /></div>

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-xl">
                    <Bot className="w-8 h-8 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">AI Model Configuration</h1>
                    <p className="text-muted-foreground">Manage the global AI brain powering the platform.</p>
                </div>
            </div>

            <form onSubmit={handleSave}>
                <Card>
                    <CardHeader>
                        <CardTitle>Provider & Model</CardTitle>
                        <CardDescription>Select the underlying AI technology provider.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <Label className="text-base">AI Provider</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div
                                    onClick={() => setProvider("openai")}
                                    className={`cursor-pointer flex flex-col items-center justify-between rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground ${provider === 'openai' ? 'border-primary bg-accent' : 'border-muted bg-popover'}`}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-4 h-4 rounded-full border border-primary ${provider === 'openai' ? 'bg-primary' : ''}`} />
                                        <span className="text-lg font-semibold">OpenAI</span>
                                    </div>
                                    <span className="text-sm text-center text-muted-foreground">
                                        Industry standard. Powers GPT-4 and GPT-3.5 models.
                                    </span>
                                </div>
                                <div
                                    onClick={() => setProvider("google")}
                                    className={`cursor-pointer flex flex-col items-center justify-between rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground ${provider === 'google' ? 'border-primary bg-accent' : 'border-muted bg-popover'}`}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-4 h-4 rounded-full border border-primary ${provider === 'google' ? 'bg-primary' : ''}`} />
                                        <span className="text-lg font-semibold">Google Gemini</span>
                                    </div>
                                    <span className="text-sm text-center text-muted-foreground">
                                        Google&apos;s multimodal models. Large context window.
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Model Selection</Label>
                            <Select value={model} onValueChange={setModel}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a model" />
                                </SelectTrigger>
                                <SelectContent>
                                    {getModels(provider).map(m => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>API Key</Label>
                            <Input
                                type="password"
                                value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                                placeholder={apiKey.startsWith("*") ? "Current key set (hidden)" : "sk-..."}
                            />
                            <p className="text-xs text-muted-foreground">
                                Leave blank to keep existing key. Keys are stored securely.
                            </p>
                        </div>
                    </CardContent>
                    <div className="p-6 pt-0 flex justify-end">
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Save className="mr-2 h-4 w-4" />
                            Save Configuration
                        </Button>
                    </div>
                </Card>
            </form>
        </div>
    )
}
