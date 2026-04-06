"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Code2, Copy, ExternalLink, MessageSquare, Mic, Wand2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useLanguage } from "@/context/LanguageContext"
import { useOmniAccount } from "@/context/OmniAccountContext"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import WidgetSettings from "@/components/widget-settings/widget-settings"
import { VoiceSettingsForm } from "@/components/modules/voice/voice-settings-form"
import { OmniSectionCard, OmniStateShell } from "@/components/omni/omni-ui"

function SnippetCard({
    title,
    description,
    value,
    onCopy,
}: {
    title: string
    description: string
    value: string
    onCopy: (value: string) => void
}) {
    return (
        <Card className="rounded-lg border-border/60 bg-white/90 shadow-none">
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <Textarea value={value} readOnly className="min-h-[120px] rounded-lg bg-muted/20 font-mono text-xs" />
                <div className="flex justify-end">
                    <Button variant="outline" className="rounded-lg bg-white/80" onClick={() => onCopy(value)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

export function OmniWebWidgetPanel() {
    const { user } = useAuth()
    const { activeAccountId: chatbotId } = useOmniAccount()
    const { language } = useLanguage()
    const { toast } = useToast()
    const [origin, setOrigin] = useState("")
    const [activeTab, setActiveTab] = useState("design")
    const [webEnabled, setWebEnabled] = useState(true)
    const [isLoadingChannel, setIsLoadingChannel] = useState(true)
    const [isSavingChannel, setIsSavingChannel] = useState(false)

    useEffect(() => {
        if (typeof window !== "undefined") {
            setOrigin(window.location.origin)
        }
    }, [])

    useEffect(() => {
        const loadChannel = async () => {
            if (!user || !chatbotId) {
                setIsLoadingChannel(false)
                return
            }

            setIsLoadingChannel(true)
            try {
                const token = await user.getIdToken()
                const response = await fetch(`/api/omni/channels/web-widget?chatbotId=${chatbotId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })

                if (!response.ok) {
                    throw new Error("Failed to load web channel state")
                }

                const data = await response.json()
                setWebEnabled(data?.config?.enabled !== false)
            } catch (error) {
                console.error("Failed to load web channel state", error)
                setWebEnabled(true)
            } finally {
                setIsLoadingChannel(false)
            }
        }

        loadChannel()
    }, [user, chatbotId])

    const copy = async (value: string) => {
        await navigator.clipboard.writeText(value)
        toast({
            title: language === "tr" ? "Kopyalandı" : "Copied",
            description: language === "tr" ? "Kod panoya kopyalandı." : "Snippet copied to clipboard.",
        })
    }

    const saveWebEnabled = async (checked: boolean) => {
        if (!user || !chatbotId) return

        setIsSavingChannel(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/omni/channels/web-widget", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    chatbotId,
                    enabled: checked,
                }),
            })

            if (!response.ok) {
                throw new Error("Failed to save web channel state")
            }

            setWebEnabled(checked)
            toast({
                title: language === "tr" ? "Kanal kaydedildi" : "Channel saved",
                description: checked
                    ? language === "tr"
                        ? "Web widget tekrar herkese açıldı."
                        : "The web widget is publicly available again."
                    : language === "tr"
                      ? "Web widget embed ve public runtime için kapatıldı."
                      : "The web widget has been disabled for embeds and the public runtime.",
            })
        } catch (error) {
            console.error("Failed to save web channel state", error)
            toast({
                title: language === "tr" ? "Kanal kaydedilemedi" : "Failed to save channel",
                description: language === "tr" ? "Web widget durumu güncellenemedi." : "The web widget state could not be updated.",
                variant: "destructive",
            })
        } finally {
            setIsSavingChannel(false)
        }
    }

    const installAssets = useMemo(() => {
        const base = origin || "https://your-domain.com"
        const directUrl = `${base}/chatbot-view?id=${encodeURIComponent(chatbotId || "")}`
        const script = `<script src="${base}/widget.js?v=2.0" data-chatbot-id="${chatbotId || ""}"></script>`
        const iframe = `<iframe src="${directUrl}" width="420" height="720" style="border:0;border-radius:16px;overflow:hidden" allow="microphone"></iframe>`

        return { directUrl, script, iframe }
    }, [chatbotId, origin])

    if (!chatbotId) {
        return (
            <OmniStateShell
                title={language === "tr" ? "Aktif account gerekli" : "Active account required"}
                description={language === "tr" ? "Web Widget yönetimi için önce bir account seçin." : "Select an account before managing the web widget."}
                tone="warning"
            />
        )
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>{language === "tr" ? "Web widget kanalı" : "Web widget channel"}</CardTitle>
                    <CardDescription>
                        {isLoadingChannel
                            ? language === "tr"
                                ? "Kanal durumu yükleniyor."
                                : "Loading channel state."
                            : webEnabled
                              ? language === "tr"
                                  ? "Widget açık. Embed ve public runtime aktif."
                                  : "Widget is enabled. Embeds and public runtime are active."
                              : language === "tr"
                                ? "Widget kapalı. Ayarlar korunur ama public runtime durur."
                                : "Widget is disabled. Configuration stays saved while the public runtime is off."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-4">
                    <div className="text-sm text-muted-foreground">{installAssets.directUrl}</div>
                    <Switch checked={webEnabled} disabled={isLoadingChannel || isSavingChannel} onCheckedChange={saveWebEnabled} />
                </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 rounded-[12px] bg-zinc-200/80 p-1 md:w-auto md:grid-cols-3">
                    <TabsTrigger value="design" className="rounded-[8px]">{language === "tr" ? "Tasarım" : "Design"}</TabsTrigger>
                    <TabsTrigger value="install" className="rounded-[8px]">{language === "tr" ? "Kurulum" : "Install"}</TabsTrigger>
                    <TabsTrigger value="voice" className="rounded-[8px]">Widget Voice</TabsTrigger>
                </TabsList>

                <TabsContent value="design" className="space-y-4">
                    <OmniSectionCard
                        title={language === "tr" ? "Widget tasarım stüdyosu" : "Widget design studio"}
                        description={language === "tr" ? "Launcher, görünüm, onboarding ve preview akışını burada toparlayın." : "Keep launcher, appearance, onboarding, and preview in one studio."}
                        action={<Wand2 className="h-4 w-4 text-muted-foreground" />}
                    >
                        <div className="rounded-[14px] border border-border/60 bg-white">
                            <WidgetSettings userId={chatbotId} />
                        </div>
                    </OmniSectionCard>
                </TabsContent>

                <TabsContent value="install" className="space-y-4">
                    {!webEnabled ? (
                        <div className="rounded-[14px] border border-amber-200 bg-amber-50/70 px-5 py-4 text-sm text-amber-900">
                            {language === "tr"
                                ? "Widget snippet'leri görünür kalır ama public runtime kapalı olduğu için siteye eklendiklerinde çalışmaz."
                                : "Install snippets remain visible, but the public runtime is disabled so they will not work when embedded."}
                        </div>
                    ) : null}
                    <div className="grid gap-4 lg:grid-cols-3">
                        <OmniSectionCard
                            title={language === "tr" ? "Direkt link" : "Direct link"}
                            description={language === "tr" ? "Chatbot deneyimini tek link ile paylaşın." : "Share the chatbot experience with a single URL."}
                            action={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
                        >
                            <div className="space-y-3 text-sm text-muted-foreground">
                                <div className="rounded-lg border bg-muted/30 px-3 py-2 font-mono text-xs break-all">{installAssets.directUrl}</div>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="rounded-lg bg-white/80" onClick={() => copy(installAssets.directUrl)}>
                                        <Copy className="mr-2 h-4 w-4" />
                                        Copy
                                    </Button>
                                    <Button asChild className="rounded-lg">
                                        <Link href={installAssets.directUrl} target="_blank">
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            {language === "tr" ? "Aç" : "Open"}
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </OmniSectionCard>
                        <OmniSectionCard
                            title={language === "tr" ? "Hızlı kurulum" : "Quick install"}
                            description={language === "tr" ? "Script etiketini sitenizin `</body>` etiketinden hemen önce ekleyin." : "Add the script tag right before your site's closing `</body>` tag."}
                            action={<Code2 className="h-4 w-4 text-muted-foreground" />}
                        >
                            <SnippetCard
                                title="Script Snippet"
                                description={language === "tr" ? "Web widget için önerilen kurulum yöntemi." : "Recommended install method for the web widget."}
                                value={installAssets.script}
                                onCopy={copy}
                            />
                        </OmniSectionCard>
                        <OmniSectionCard
                            title="iFrame"
                            description={language === "tr" ? "Landing page, help center veya portal içinde gömülü kullanım için." : "For embedded usage inside a landing page, help center, or portal."}
                            action={<Code2 className="h-4 w-4 text-muted-foreground" />}
                        >
                            <SnippetCard
                                title="iFrame"
                                description={language === "tr" ? "Gömülü görünüm için hazır HTML." : "Ready-made HTML for embedded usage."}
                                value={installAssets.iframe}
                                onCopy={copy}
                            />
                        </OmniSectionCard>
                    </div>

                    <OmniSectionCard
                        title={language === "tr" ? "Kurulum notları" : "Install notes"}
                        description={language === "tr" ? "Console’daki web widget ve integration deneyimi Omni içinde tek yerde toplandı." : "The old console web widget and installation experience is now consolidated inside Omni."}
                    >
                        <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                            <div className="rounded-lg border bg-muted/30 px-4 py-3">{language === "tr" ? "WordPress için script snippet’i site header/footer alanına veya custom HTML blok içine ekleyin." : "For WordPress, add the script snippet to the site header/footer or a custom HTML block."}</div>
                            <div className="rounded-lg border bg-muted/30 px-4 py-3">{language === "tr" ? "Widget testi için tasarım sekmesindeki canlı önizlemeyi veya `/widget-test?id=...` akışını kullanın." : "For widget QA, use the live preview in the design tab or the `/widget-test?id=...` flow."}</div>
                        </div>
                    </OmniSectionCard>
                </TabsContent>

                <TabsContent value="voice" className="space-y-4">
                    <OmniSectionCard
                        title="Widget Voice"
                        description={language === "tr" ? "Tarayıcı içi sesli widget deneyimini Omni içinde yönetin. Phone Voice ile aynı şey değildir." : "Manage the browser-based voice widget experience inside Omni. This is separate from Phone Voice."}
                        action={<Mic className="h-4 w-4 text-muted-foreground" />}
                    >
                        <div className="rounded-[14px] border border-border/60 bg-white">
                            <VoiceSettingsForm targetUserId={chatbotId} />
                        </div>
                    </OmniSectionCard>
                </TabsContent>
            </Tabs>
        </div>
    )
}
