"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Zap, CloudLightning, Clock, Check, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"

export default function CampaignManagerPage() {
    const { t } = useLanguage()
    const router = useRouter()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [activeCampaign, setActiveCampaign] = useState<string | null>(null)

    const handleActivate = (campaignType: string) => {
        setIsLoading(true)
        setTimeout(() => {
            setActiveCampaign(campaignType === activeCampaign ? null : campaignType)
            setIsLoading(false)
            toast({
                title: campaignType === activeCampaign ? "Campaign Stopped" : "Campaign Active",
                description: `${campaignType} has been ${campaignType === activeCampaign ? 'deactivated' : 'launched'}.`
            })
        }, 1200)
    }

    return (
        <div className="flex-1 space-y-8 p-8 pt-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">

                    <div>
                        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            {t('modules.campaignManager') || "Campaign Wizard"}
                        </h2>
                        <p className="text-muted-foreground">
                            {t('modules.campaignManagerDesc') || "Create instant deals and happy hours driven by AI"}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Rainy Day Special */}
                <Card className={`border-2 transition-all ${activeCampaign === 'Rainy Day' ? 'border-blue-500 bg-blue-50/50' : 'hover:border-blue-200'}`}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CloudLightning className="h-5 w-5 text-blue-500" />
                            Rainy Day Special
                        </CardTitle>
                        <CardDescription>
                            Automatically offers &quot;Hot Coffee + Cookie&quot; deal when local weather is rainy.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-background p-3 rounded-lg border">
                                <span className="font-medium text-sm">Discount</span>
                                <span className="font-bold text-green-600">20% OFF</span>
                            </div>
                            <Button
                                className="w-full"
                                variant={activeCampaign === 'Rainy Day' ? "secondary" : "default"}
                                onClick={() => handleActivate('Rainy Day')}
                                disabled={isLoading}
                            >
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {activeCampaign === 'Rainy Day' ? "Deactivate" : "Launch Now"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Happy Hour */}
                <Card className={`border-2 transition-all ${activeCampaign === 'Happy Hour' ? 'border-purple-500 bg-purple-50/50' : 'hover:border-purple-200'}`}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-purple-500" />
                            Happy Hour
                        </CardTitle>
                        <CardDescription>
                            Offers &quot;2 for 1&quot; on beverages during set hours (e.g., 16:00 - 19:00).
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-background p-3 rounded-lg border">
                                <span className="font-medium text-sm">Target</span>
                                <span className="text-sm">All Beverages</span>
                            </div>
                            <Button
                                className="w-full"
                                variant={activeCampaign === 'Happy Hour' ? "secondary" : "default"}
                                onClick={() => handleActivate('Happy Hour')}
                                disabled={isLoading}
                            >
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {activeCampaign === 'Happy Hour' ? "Deactivate" : "Launch Now"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Flash Sale */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-orange-500" />
                            Custom Flash Sale
                        </CardTitle>
                        <CardDescription>
                            Create a custom prompt injection for specific items.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <Label>Campaign Prompt</Label>
                            <Input placeholder='e.g. "Suggest Tiramisu for dessert"' />
                            <div className="flex items-center gap-2 pt-2">
                                <Switch disabled />
                                <Label className="text-muted-foreground">Coming Soon</Label>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>AI Injection Preview</CardTitle>
                    <CardDescription>How the AI sees active campaigns</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="bg-slate-950 text-slate-50 p-4 rounded-lg font-mono text-sm max-w-2xl">
                        {`{
  "activeCampaigns": [
    ${activeCampaign ? `"${activeCampaign}"` : ""}
  ],
  "instructions": "${activeCampaign === 'Rainy Day' ? "User location weather is RAINY. Suggest warm drinks and offer 20% discount on coffee combos." : activeCampaign === 'Happy Hour' ? "Current time is within Happy Hour. Offer 2-for-1 on all beverages." : "No active campaigns. Stick to standard menu."}"
}`}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
