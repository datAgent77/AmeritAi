"use client"

import { useLanguage } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, Eye, EyeOff, RefreshCw, Key } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

export default function DevelopersPage() {
    const { t } = useLanguage()
    const { toast } = useToast()
    const [showKey, setShowKey] = useState(false)
    const [apiKey, setApiKey] = useState("sk_live_51M0...") // Example mocked key

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
        toast({
            title: t('copied'),
            description: "API Key copied to clipboard",
        })
    }

    const handleRegenerate = () => {
        // Logic to regenerate key would go here
        toast({
            title: "Regenerated",
            description: "New API Key generated",
        })
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">{t('developers')}</h1>
                <p className="text-muted-foreground">{t('developerSettingsDescription')}</p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Key className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Developer Access Token</CardTitle>
                            <CardDescription className="mt-1">
                                This token allows you to make requests to our API.
                                <span className="font-semibold text-destructive"> Keep this token private.</span>
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Input
                                value={apiKey}
                                type={showKey ? "text" : "password"}
                                readOnly
                                className="pr-10 font-mono bg-muted"
                            />
                            <button
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <Button variant="outline" onClick={() => handleCopy(apiKey)}>
                            <Copy className="w-4 h-4 mr-2" />
                            {t('copy')}
                        </Button>
                        <Button variant="destructive" onClick={handleRegenerate}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            {t('regenerate')}
                        </Button>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground border">
                        💡 Need help? Check out our <a href="#" className="text-primary hover:underline font-medium">API Documentation</a> to learn how to authenticate and use our endpoints.
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Webhook Configuration</CardTitle>
                    <CardDescription>
                        Receive real-time updates for chat events, new leads, and more.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="webhook-url">{t('webhookUrl')}</Label>
                        <Input id="webhook-url" placeholder="https://your-domain.com/api/webhook" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="webhook-secret">{t('webhookSecret')}</Label>
                        <div className="flex gap-2">
                            <Input id="webhook-secret" value="whsec_..." readOnly className="font-mono bg-muted" />
                            <Button variant="outline" size="icon">
                                <Copy className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="flex justify-end mt-4">
                        <Button>Save Configuration</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
