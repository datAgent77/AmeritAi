"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Mail, Plus, Send, FileText, Loader2, BarChart2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function EmailMarketingPage() {
    const { t } = useLanguage()
    const router = useRouter()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    const [campaigns, setCampaigns] = useState([
        { id: 1, name: "Welcome Series", status: "Active", opens: "45%", clicks: "12%" },
        { id: 2, name: "Monthly Newsletter", status: "Draft", opens: "-", clicks: "-" },
        { id: 3, name: "Abandoned Cart", status: "Active", opens: "32%", clicks: "8%" },
    ])

    const handleCreateCampaign = () => {
        setIsLoading(true)
        setTimeout(() => {
            const newCampaign = { id: campaigns.length + 1, name: "New Campaign", status: "Draft", opens: "-", clicks: "-" }
            setCampaigns([...campaigns, newCampaign])
            setIsLoading(false)
            toast({
                title: "Campaign Created",
                description: "New draft campaign added."
            })
        }, 800)
    }

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/console/modules")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <Mail className="h-8 w-8 text-orange-500" />
                            {t('modules.emailMarketing') || "Email Marketing"}
                        </h2>
                        <p className="text-muted-foreground">
                            {t('modules.emailMarketingDesc') || "Create and manage AI-powered email campaigns"}
                        </p>
                    </div>
                </div>
                <Button onClick={handleCreateCampaign} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    {t('createCampaign') || "New Campaign"}
                </Button>
            </div>

            <Tabs defaultValue="campaigns" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
                    <TabsTrigger value="templates">Templates</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="campaigns" className="space-y-4">
                    <div className="grid gap-4">
                        {campaigns.map((camp) => (
                            <Card key={camp.id} className="flex flex-row items-center justify-between p-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                                        <Send className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">{camp.name}</h3>
                                        <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                                            <span className="flex items-center gap-1">
                                                <BarChart2 className="h-3 w-3" /> Opens: {camp.opens}
                                            </span>
                                            <span>Clicks: {camp.clicks}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Badge variant={camp.status === 'Active' ? 'default' : 'secondary'}>
                                        {camp.status}
                                    </Badge>
                                    <Button variant="outline" size="sm">Edit</Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="templates" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {['Newsletter', 'Promotion', 'Event Invite', 'Product Update', 'Welcome Email'].map((template, i) => (
                            <Card key={i} className="cursor-pointer hover:border-primary transition-colors group">
                                <div className="aspect-[4/5] bg-muted/20 relative border-b flex items-center justify-center">
                                    <FileText className="h-16 w-16 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                                </div>
                                <CardContent className="p-4">
                                    <h3 className="font-semibold">{template}</h3>
                                    <p className="text-sm text-muted-foreground">Standard AI layout</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4 max-w-2xl">
                    <Card>
                        <CardHeader>
                            <CardTitle>Sender Settings</CardTitle>
                            <CardDescription>Configure "From" name and email</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label>Sender Name</Label>
                                <Input placeholder="Vion Bistro" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Sender Email</Label>
                                <Input placeholder="hello@vionbistro.com" />
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <Switch />
                                <Label>Enable Analytics Tracking</Label>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

function Badge({ children, variant }: any) {
    const styles = variant === 'default'
        ? "bg-green-100 text-green-700 hover:bg-green-100/80 dark:bg-green-900/30 dark:text-green-400"
        : "bg-gray-100 text-gray-700 hover:bg-gray-100/80 dark:bg-gray-800 dark:text-gray-400"

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${styles}`}>
            {children}
        </span>
    )
}
