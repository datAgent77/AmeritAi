"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Copy, ExternalLink, Check, MessageCircle, Send, Loader2, ArrowLeft, Search, Plus, BookOpen, MessageSquare, Hash, Link2, Globe, Code2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

import { useLanguage } from "@/context/LanguageContext"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface IntegrationPageProps {
    userId: string
}

interface Integration {
    id: string
    name: string
    description: string
    icon: React.ReactNode
    iconBg: string
    features?: string[]
    connected?: boolean
    connectedInfo?: string
}

export default function IntegrationPage({ userId }: IntegrationPageProps) {
    const { toast } = useToast()
    const { t } = useLanguage()
    const [origin, setOrigin] = useState("")
    const [brandColor, setBrandColor] = useState("#000000")
    const [copied, setCopied] = useState<string | null>(null)
    const [settings, setSettings] = useState<any>(null)
    const [selectedCategory, setSelectedCategory] = useState<string>("all")
    const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")

    // Telegram State
    const [telegramToken, setTelegramToken] = useState("")
    const [isConnectingTelegram, setIsConnectingTelegram] = useState(false)
    const [telegramConnected, setTelegramConnected] = useState(false)
    const [telegramBotName, setTelegramBotName] = useState("")
    const [isTelegramDialogOpen, setIsTelegramDialogOpen] = useState(false)

    // WhatsApp State
    const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false)
    const [waPhoneNumberId, setWaPhoneNumberId] = useState("")
    const [waAccessToken, setWaAccessToken] = useState("")
    const [waVerifyToken, setWaVerifyToken] = useState("")
    const [isConnectingWhatsApp, setIsConnectingWhatsApp] = useState(false)

    // Slack State
    const [isSlackOpen, setIsSlackOpen] = useState(false)
    const [slackBotToken, setSlackBotToken] = useState("")
    const [slackSigningSecret, setSlackSigningSecret] = useState("")
    const [isConnectingSlack, setIsConnectingSlack] = useState(false)
    const [slackConnected, setSlackConnected] = useState(false)
    const [slackTeamName, setSlackTeamName] = useState("")

    const whatsAppConnected = settings?.integrations?.whatsapp?.connected

    // Only integrations we actually support
    const categories = [
        { id: "all", name: t('allIntegrations'), count: 7 },
        { id: "website", name: t('websiteWidget'), count: 0 },
        { id: "iframe", name: "iFrame", count: 0 },
        { id: "direct-link", name: t('directLink'), count: 0 },
        { id: "wordpress", name: "WordPress", count: 0 },
        { id: "telegram", name: "Telegram", count: telegramConnected ? 1 : 0 },
        { id: "whatsapp", name: "WhatsApp", count: whatsAppConnected ? 1 : 0 },
        { id: "slack", name: "Slack", count: slackConnected ? 1 : 0 },
    ]

    // Only our actual integrations
    const integrations: Integration[] = [
        {
            id: "website",
            name: t('websiteWidget'),
            description: t('widgetScriptDescription'),
            icon: <MessageSquare className="h-6 w-6 text-blue-500" />,
            iconBg: "bg-blue-100",
            features: [
                t('widgetAppear'),
                t('copyCode'),
                t('pasteCode')
            ]
        },
        {
            id: "iframe",
            name: t('iframeEmbed'),
            description: t('iframeEmbedDescription'),
            icon: <Code2 className="h-6 w-6 text-purple-500" />,
            iconBg: "bg-purple-100",
            features: [
                t('copyIframeCode'),
                t('pasteIframeCode'),
                t('adjustAttributes')
            ]
        },
        {
            id: "direct-link",
            name: t('directLink'),
            description: t('directLinkDescription'),
            icon: <Link2 className="h-6 w-6 text-green-500" />,
            iconBg: "bg-green-100",
            features: [
                t('shareLink')
            ]
        },
        {
            id: "wordpress",
            name: t('wordpress'),
            description: t('wordpressDescription'),
            icon: <Globe className="h-6 w-6 text-blue-700" />,
            iconBg: "bg-blue-100",
            features: [
                t('wordpressInstructions')?.split('\n')[0] || "Install plugin",
            ]
        },
        {
            id: "telegram",
            name: "Telegram",
            description: t('telegramDescription'),
            icon: <Send className="h-6 w-6 text-sky-500" />,
            iconBg: "bg-sky-100",
            connected: telegramConnected,
            connectedInfo: telegramBotName,
            features: [
                t('botTokenHelp')
            ]
        },
        {
            id: "whatsapp",
            name: "WhatsApp Business",
            description: t('whatsappDescription'),
            icon: <MessageCircle className="h-6 w-6 text-green-600" />,
            iconBg: "bg-green-100",
            connected: whatsAppConnected,
            features: [
                t('whatsappInstructions')
            ]
        },
        {
            id: "slack",
            name: "Slack",
            description: t('slackDescription'),
            icon: <Hash className="h-6 w-6 text-purple-600" />,
            iconBg: "bg-purple-100",
            connected: slackConnected,
            connectedInfo: slackTeamName,
        },
    ]

    // Connection handlers
    const handleConnectWhatsApp = async () => {
        if (!waPhoneNumberId || !waAccessToken || !waVerifyToken) {
            toast({ title: t('error'), description: t('fillAllFields'), variant: "destructive" })
            return
        }
        setIsConnectingWhatsApp(true)
        try {
            const response = await fetch("/api/integrations/whatsapp/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chatbotId: userId, phoneNumberId: waPhoneNumberId, accessToken: waAccessToken, verifyToken: waVerifyToken })
            })
            if (!response.ok) throw new Error("Failed to connect")
            toast({ title: t('success'), description: t('whatsappConnected') })
            setIsWhatsAppOpen(false)
            const res = await fetch(`/api/console/settings?chatbotId=${userId}`)
            if (res.ok) {
                const data = await res.json()
                setSettings(data)
            }
        } catch (error) {
            toast({ title: t('error'), description: t('connectionFailed'), variant: "destructive" })
        } finally {
            setIsConnectingWhatsApp(false)
        }
    }

    const handleConnectSlack = async () => {
        if (!slackBotToken || !slackSigningSecret) {
            toast({ title: t('error'), description: t('fillAllFields'), variant: "destructive" })
            return
        }
        setIsConnectingSlack(true)
        try {
            const response = await fetch("/api/integrations/slack/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, botToken: slackBotToken, signingSecret: slackSigningSecret })
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || "Failed to connect Slack")
            setSlackConnected(true)
            setSlackTeamName(data.team)
            toast({ title: t('success'), description: t('connected') })
            setIsSlackOpen(false)
            setSlackBotToken("")
            setSlackSigningSecret("")
            const res = await fetch(`/api/console/settings?chatbotId=${userId}`)
            if (res.ok) {
                const data = await res.json()
                setSettings(data)
            }
        } catch (error: any) {
            toast({ title: t('error'), description: error.message, variant: "destructive" })
        } finally {
            setIsConnectingSlack(false)
        }
    }

    const handleConnectTelegram = async () => {
        if (!telegramToken) return
        setIsConnectingTelegram(true)
        try {
            const response = await fetch("/api/integrations/telegram/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, botToken: telegramToken })
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || "Failed to connect Telegram")
            setTelegramConnected(true)
            setTelegramBotName(data.botName)
            toast({ title: t('success'), description: t('connected') })
            setTelegramToken("")
            setIsTelegramDialogOpen(false)
        } catch (error: any) {
            toast({ title: t('error'), description: error.message, variant: "destructive" })
        } finally {
            setIsConnectingTelegram(false)
        }
    }

    useEffect(() => {
        setOrigin(window.location.origin)
        const fetchSettings = async () => {
            try {
                const res = await fetch(`/api/console/settings?chatbotId=${userId}`)
                if (res.ok) {
                    const data = await res.json()
                    setSettings(data)
                    setBrandColor(data.brandColor || "#000000")
                    if (data.integrations?.telegram?.connected) {
                        setTelegramConnected(true)
                        setTelegramBotName(data.integrations.telegram.botName || "")
                    }
                    if (data.integrations?.slack?.connected) {
                        setSlackConnected(true)
                        setSlackTeamName(data.integrations.slack.teamName || "")
                    }
                }
            } catch (error) {
                console.error("Error fetching settings:", error)
            }
        }
        fetchSettings()
    }, [userId])

    const copyToClipboard = (text: string, key: string) => {
        navigator.clipboard.writeText(text)
        setCopied(key)
        toast({ title: t('copied'), description: t('codeCopied') })
        setTimeout(() => setCopied(null), 2000)
    }

    const scriptCode = `<script src="${origin}/widget.js" data-chatbot-id="${userId}" data-color="${brandColor}"></script>`
    const iframeCode = `<iframe src="${origin}/chatbot-view?id=${userId}" width="100%" height="600" frameborder="0"></iframe>`
    const directLink = `${origin}/chatbot-view?id=${userId}`

    // Filter integrations
    const filteredIntegrations = integrations.filter(integration => {
        const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            integration.description.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = selectedCategory === "all" || integration.id === selectedCategory
        return matchesSearch && matchesCategory
    })

    const currentIntegration = selectedIntegration ? integrations.find(i => i.id === selectedIntegration) : null

    // Render Detail View
    const renderDetailView = () => {
        if (!currentIntegration) return null

        return (
            <div className="flex-1 p-8">
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => setSelectedIntegration(null)}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t('backToIntegrations')}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Integration Info */}
                    <Card className="border-0 shadow-none bg-muted/30">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className={cn("p-3 rounded-xl", currentIntegration.iconBg)}>
                                    {currentIntegration.icon}
                                </div>
                                {currentIntegration.connected && (
                                    <div className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                        <Check className="h-3 w-3" />
                                        {t('connected')}
                                    </div>
                                )}
                            </div>
                            <h2 className="text-xl font-semibold mb-2">{currentIntegration.name}</h2>
                            <p className="text-muted-foreground text-sm mb-6">{currentIntegration.description}</p>

                            {currentIntegration.features && currentIntegration.features.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="font-medium mb-3">{t('features')}:</h3>
                                    <ul className="space-y-2">
                                        {currentIntegration.features.map((feature, index) => (
                                            <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground flex-shrink-0" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Installation Code for Website Widget */}
                            {currentIntegration.id === "website" && (
                                <div className="space-y-4">
                                    <h3 className="font-medium">{t('installationCode')}</h3>
                                    <div className="bg-muted p-4 rounded-md relative group border">
                                        <pre className="text-xs font-mono whitespace-pre-wrap break-all pr-10 text-foreground">
                                            {scriptCode}
                                        </pre>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="absolute top-2 right-2 h-8 w-8 hover:bg-background"
                                            onClick={() => copyToClipboard(scriptCode, "script")}
                                        >
                                            {copied === "script" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* iFrame Code */}
                            {currentIntegration.id === "iframe" && (
                                <div className="space-y-4">
                                    <h3 className="font-medium">{t('iframeEmbed')}</h3>
                                    <div className="bg-muted p-4 rounded-md relative group border">
                                        <pre className="text-xs font-mono whitespace-pre-wrap break-all pr-10 text-foreground">
                                            {iframeCode}
                                        </pre>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="absolute top-2 right-2 h-8 w-8 hover:bg-background"
                                            onClick={() => copyToClipboard(iframeCode, "iframe")}
                                        >
                                            {copied === "iframe" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Direct Link */}
                            {currentIntegration.id === "direct-link" && (
                                <div className="space-y-4">
                                    <h3 className="font-medium">{t('directLink')}</h3>
                                    <div className="flex gap-2">
                                        <Input value={directLink} readOnly className="font-mono text-sm" />
                                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(directLink, "link")}>
                                            {copied === "link" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                        <Button variant="outline" size="icon" onClick={() => window.open(directLink, "_blank")}>
                                            <ExternalLink className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* WordPress Code */}
                            {currentIntegration.id === "wordpress" && (
                                <div className="space-y-4">
                                    <h3 className="font-medium">{t('wordpress')}</h3>
                                    <div className="bg-muted p-4 rounded-md relative group border">
                                        <pre className="text-xs font-mono whitespace-pre-wrap break-all pr-10 text-foreground">
                                            {scriptCode}
                                        </pre>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="absolute top-2 right-2 h-8 w-8 hover:bg-background"
                                            onClick={() => copyToClipboard(scriptCode, "wordpress")}
                                        >
                                            {copied === "wordpress" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-medium">{t('instructions')}:</h4>
                                        <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 ml-2">
                                            {(t('wordpressInstructions') || "").split('\n').map((instruction, index) => (
                                                <li key={index}>{instruction.replace(/^\d+\.\s*/, '')}</li>
                                            ))}
                                        </ol>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Right: Connection Dialog for messaging platforms */}
                    <div>
                        {/* Telegram Dialog */}
                        {currentIntegration.id === "telegram" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('telegramConnection')}</CardTitle>
                                    <CardDescription>
                                        {telegramConnected
                                            ? `${t('connected')}: @${telegramBotName}`
                                            : t('connectTelegram')
                                        }
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {!telegramConnected && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>{t('botToken')}</Label>
                                                <Input
                                                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                                                    value={telegramToken}
                                                    onChange={(e) => setTelegramToken(e.target.value)}
                                                />
                                                <p className="text-xs text-muted-foreground">{t('botTokenHelp')}</p>
                                            </div>
                                            <div className="bg-muted p-3 rounded-md text-xs text-muted-foreground">
                                                <p className="font-medium mb-1">Webhook URL:</p>
                                                <code className="break-all">{origin}/api/integrations/telegram/webhook?chatbotId={userId}</code>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    <Button
                                        onClick={handleConnectTelegram}
                                        disabled={isConnectingTelegram || (!telegramToken && !telegramConnected)}
                                        className="w-full"
                                        variant={telegramConnected ? "outline" : "default"}
                                    >
                                        {isConnectingTelegram && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {telegramConnected ? t('manageSettings') : t('connect')}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}

                        {/* WhatsApp Dialog */}
                        {currentIntegration.id === "whatsapp" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('whatsappBusinessApi')}</CardTitle>
                                    <CardDescription>
                                        {whatsAppConnected
                                            ? t('connected')
                                            : t('connectWhatsApp')
                                        }
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {!whatsAppConnected && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>{t('phoneNumberId')}</Label>
                                                <Input
                                                    placeholder="e.g. 100609346333333"
                                                    value={waPhoneNumberId}
                                                    onChange={(e) => setWaPhoneNumberId(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('accessToken')}</Label>
                                                <Input
                                                    type="password"
                                                    placeholder="e.g. EAAG..."
                                                    value={waAccessToken}
                                                    onChange={(e) => setWaAccessToken(e.target.value)}
                                                />
                                                <p className="text-xs text-muted-foreground">{t('accessTokenHelp')}</p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('verifyToken')}</Label>
                                                <Input
                                                    placeholder="e.g. my_secure_token"
                                                    value={waVerifyToken}
                                                    onChange={(e) => setWaVerifyToken(e.target.value)}
                                                />
                                                <p className="text-xs text-muted-foreground">{t('verifyTokenHelp')}</p>
                                            </div>
                                            <div className="bg-muted p-3 rounded-md text-xs text-muted-foreground">
                                                <p className="font-medium mb-1">Webhook URL:</p>
                                                <code className="break-all">{origin}/api/integrations/whatsapp/webhook?chatbotId={userId}</code>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    <Button
                                        onClick={handleConnectWhatsApp}
                                        disabled={isConnectingWhatsApp || (!waPhoneNumberId || !waAccessToken || !waVerifyToken) && !whatsAppConnected}
                                        className="w-full"
                                        variant={whatsAppConnected ? "outline" : "default"}
                                    >
                                        {isConnectingWhatsApp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {whatsAppConnected ? t('manageSettings') : t('connect')}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}

                        {/* Slack Dialog */}
                        {currentIntegration.id === "slack" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('slackConnection')}</CardTitle>
                                    <CardDescription>
                                        {slackConnected
                                            ? `${t('connected')}: ${slackTeamName}`
                                            : t('slackDescription')
                                        }
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {!slackConnected && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>Bot User OAuth Token</Label>
                                                <Input
                                                    type="password"
                                                    placeholder="xoxb-..."
                                                    value={slackBotToken}
                                                    onChange={(e) => setSlackBotToken(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Signing Secret</Label>
                                                <Input
                                                    type="password"
                                                    placeholder="e.g. 8f7d..."
                                                    value={slackSigningSecret}
                                                    onChange={(e) => setSlackSigningSecret(e.target.value)}
                                                />
                                            </div>
                                            <div className="bg-muted p-3 rounded-md text-xs text-muted-foreground">
                                                <p className="font-medium mb-1">Request URL:</p>
                                                <code className="break-all">{origin}/api/integrations/slack/webhook?chatbotId={userId}</code>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    <Button
                                        onClick={handleConnectSlack}
                                        disabled={isConnectingSlack || (!slackBotToken || !slackSigningSecret) && !slackConnected}
                                        className="w-full"
                                        variant={slackConnected ? "outline" : "default"}
                                    >
                                        {isConnectingSlack && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {slackConnected ? t('manageSettings') : t('connect')}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // Render Grid View
    const renderGridView = () => (
        <div className="flex-1 p-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-semibold">
                    {t('allIntegrations')} ({filteredIntegrations.length})
                </h1>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('search')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-64"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredIntegrations.map((integration) => (
                    <Card
                        key={integration.id}
                        className="cursor-pointer hover:shadow-md transition-shadow border py-0"
                        onClick={() => setSelectedIntegration(integration.id)}
                    >
                        <CardContent className="p-5">
                            <div className={cn("p-3 rounded-xl w-fit mb-4", integration.iconBg)}>
                                {integration.icon}
                            </div>
                            <h3 className="font-semibold mb-1">{integration.name}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                                {integration.description}
                            </p>
                            {integration.connected && (
                                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-green-600">
                                    <Check className="h-3 w-3" />
                                    {t('connected')}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )

    return (
        <div className="flex h-full bg-white rounded-xl overflow-hidden">
            {/* Sidebar */}
            <div className="w-56 border-r bg-muted/30 flex-shrink-0">
                <div className="p-4">
                    <h2 className="font-semibold mb-3 px-2">{t('integrations')}</h2>
                    <nav className="space-y-0.5">
                        {categories.map((category) => (
                            <button
                                key={category.id}
                                onClick={() => {
                                    setSelectedCategory(category.id)
                                    setSelectedIntegration(category.id === "all" ? null : category.id)
                                }}
                                className={cn(
                                    "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors",
                                    (selectedCategory === category.id || selectedIntegration === category.id)
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <span>{category.name}</span>
                                <span className={cn(
                                    "text-xs",
                                    (selectedCategory === category.id || selectedIntegration === category.id)
                                        ? "text-primary-foreground/70"
                                        : "text-muted-foreground"
                                )}>
                                    {category.count}
                                </span>
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Main Content */}
            {selectedIntegration ? renderDetailView() : renderGridView()}
        </div>
    )
}
