"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Share2, Facebook, Instagram, Linkedin, Loader2, Calendar, FileImage } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SocialMediaPage() {
    const { t } = useLanguage()
    const router = useRouter()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // Mock State
    const [connectedAccounts, setConnectedAccounts] = useState({
        facebook: false,
        instagram: true,
        linkedin: false,
        twitter: false
    })

    const [autoPostConfig, setAutoPostConfig] = useState({
        enabled: false,
        frequency: 'weekly',
        contentTypes: ['product_highlight', 'customer_review']
    })

    const handleConnect = (platform: string) => {
        setIsLoading(true)
        // Simulate OAuth flow
        setTimeout(() => {
            setConnectedAccounts(prev => ({ ...prev, [platform]: !prev[platform as keyof typeof connectedAccounts] }))
            setIsLoading(false)
            toast({
                title: connectedAccounts[platform as keyof typeof connectedAccounts] ? "Disconnected" : "Connected",
                description: `${platform.charAt(0).toUpperCase() + platform.slice(1)} account status updated.`
            })
        }, 1000)
    }

    const handleSave = () => {
        setIsSaving(true)
        setTimeout(() => {
            setIsSaving(false)
            toast({
                title: "Saved",
                description: "Social media settings saved successfully."
            })
        }, 1000)
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
                            <Share2 className="h-8 w-8 text-blue-500" />
                            {t('modules.socialMedia') || "Social Media Manager"}
                        </h2>
                        <p className="text-muted-foreground">
                            {t('modules.socialMediaDesc') || "Manage accounts and schedule AI-generated posts"}
                        </p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('save') || "Save Changes"}
                </Button>
            </div>

            <Tabs defaultValue="accounts" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="accounts">Connected Accounts</TabsTrigger>
                    <TabsTrigger value="automation">Auto-Posting</TabsTrigger>
                    <TabsTrigger value="planner">Content Planner</TabsTrigger>
                </TabsList>

                {/* Accounts Tab */}
                <TabsContent value="accounts" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {/* Instagram */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Instagram</CardTitle>
                                <Instagram className="h-4 w-4 text-pink-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{connectedAccounts.instagram ? "Connected" : "Not Connected"}</div>
                                <p className="text-xs text-muted-foreground mb-4">
                                    {connectedAccounts.instagram ? "@vion_restaurant" : "Connect to share photos"}
                                </p>
                                <Button
                                    variant={connectedAccounts.instagram ? "outline" : "default"}
                                    className="w-full"
                                    onClick={() => handleConnect('instagram')}
                                    disabled={isLoading}
                                >
                                    {connectedAccounts.instagram ? "Disconnect" : "Connect Instagram"}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Facebook */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Facebook</CardTitle>
                                <Facebook className="h-4 w-4 text-blue-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{connectedAccounts.facebook ? "Connected" : "Not Connected"}</div>
                                <p className="text-xs text-muted-foreground mb-4">page/vion_bistro</p>
                                <Button
                                    variant={connectedAccounts.facebook ? "outline" : "default"}
                                    className="w-full"
                                    onClick={() => handleConnect('facebook')}
                                    disabled={isLoading}
                                >
                                    {connectedAccounts.facebook ? "Disconnect" : "Connect Page"}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* LinkedIn */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">LinkedIn</CardTitle>
                                <Linkedin className="h-4 w-4 text-blue-700" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{connectedAccounts.linkedin ? "Connected" : "Not Connected"}</div>
                                <p className="text-xs text-muted-foreground mb-4">Company Page</p>
                                <Button
                                    variant={connectedAccounts.linkedin ? "outline" : "default"}
                                    className="w-full"
                                    onClick={() => handleConnect('linkedin')}
                                    disabled={isLoading}
                                >
                                    {connectedAccounts.linkedin ? "Disconnect" : "Connect LinkedIn"}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Automation Tab */}
                <TabsContent value="automation" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <CardTitle>AI Auto-Posting</CardTitle>
                                    <CardDescription>
                                        Let AI generate and post content automatically based on your products and reviews.
                                    </CardDescription>
                                </div>
                                <Switch
                                    checked={autoPostConfig.enabled}
                                    onCheckedChange={(checked) => setAutoPostConfig(prev => ({ ...prev, enabled: checked }))}
                                />
                            </div>
                        </CardHeader>
                        {autoPostConfig.enabled && (
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label>Posting Frequency</Label>
                                    <div className="flex gap-2">
                                        {['daily', 'weekly', 'bi-weekly', 'monthly'].map((freq) => (
                                            <Button
                                                key={freq}
                                                variant={autoPostConfig.frequency === freq ? "default" : "outline"}
                                                onClick={() => setAutoPostConfig(prev => ({ ...prev, frequency: freq }))}
                                                size="sm"
                                            >
                                                {freq.charAt(0).toUpperCase() + freq.slice(1)}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Content Types</Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center space-x-2 border p-3 rounded-lg">
                                            <Switch checked={true} />
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">Product Highlights</span>
                                                <span className="text-xs text-muted-foreground">Showcase items from catalog</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2 border p-3 rounded-lg">
                                            <Switch checked={true} />
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">Customer Reviews</span>
                                                <span className="text-xs text-muted-foreground">Share positive feedback</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                </TabsContent>

                {/* Planner Tab (Mock) */}
                <TabsContent value="planner">
                    <Card>
                        <CardHeader>
                            <CardTitle>Content Calendar</CardTitle>
                            <CardDescription>Scheduled posts for next 7 days</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-start gap-4 p-4 border rounded-lg bg-muted/20">
                                        <div className="h-16 w-16 bg-muted rounded-md flex items-center justify-center">
                                            <FileImage className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <div className="font-semibold flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                                    Day {i} - 10:00 AM
                                                </div>
                                                <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">Scheduled</Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                Discover our new summer menu! 🥗 Fresh ingredients and vibrant flavors waiting for you. #SummerVibes #Foodie
                                            </p>
                                            <div className="flex gap-2 mt-2">
                                                <Instagram className="h-3 w-3 text-pink-500" />
                                                <Facebook className="h-3 w-3 text-blue-600" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

function Badge({ children, variant, className }: any) {
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${className}`}>
            {children}
        </span>
    )
}
