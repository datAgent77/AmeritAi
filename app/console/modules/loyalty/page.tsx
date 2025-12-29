"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Award, QrCode, Ticket, Loader2, Plus, Gift } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"

export default function LoyaltyProgramPage() {
    const { t } = useLanguage()
    const router = useRouter()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [config, setConfig] = useState({
        enabled: true,
        programName: "Vion Club",
        pointsPerVisit: 1,
        rewardThreshold: 5,
        rewardName: "Free Dessert"
    })

    const handleSave = () => {
        setIsLoading(true)
        setTimeout(() => {
            setIsLoading(false)
            toast({
                title: "Saved",
                description: "Loyalty program settings updated."
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
                            <Award className="h-8 w-8 text-purple-600" />
                            {t('modules.loyaltyProgram') || "Loyalty Program"}
                        </h2>
                        <p className="text-muted-foreground">
                            {t('modules.loyaltyProgramDesc') || "Manage digital punch cards and customer rewards"}
                        </p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('save') || "Save Changes"}
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Visual Card Preview */}
                <Card className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-none shadow-xl">
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center text-white">
                            <span>{config.programName || "Loyalty Card"}</span>
                            <QrCode className="h-8 w-8 opacity-80" />
                        </CardTitle>
                        <CardDescription className="text-purple-100">
                            Scan to collect stamps
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-center mt-4">
                            <div className="flex gap-2">
                                {[...Array(config.rewardThreshold)].map((_, i) => (
                                    <div key={i} className="h-10 w-10 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center">
                                        {i < 2 ? <Award className="h-6 w-6 text-white" /> : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="mt-6 flex items-center gap-2">
                            <Gift className="h-5 w-5" />
                            <span className="font-semibold text-lg">{config.rewardName}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>Program Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Program Active</Label>
                            <Switch checked={config.enabled} onCheckedChange={(c) => setConfig({ ...config, enabled: c })} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Program Name</Label>
                            <Input
                                value={config.programName}
                                onChange={(e) => setConfig({ ...config, programName: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Stamps to Reward</Label>
                                <Input
                                    type="number"
                                    value={config.rewardThreshold}
                                    onChange={(e) => setConfig({ ...config, rewardThreshold: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Reward Name</Label>
                                <Input
                                    value={config.rewardName}
                                    onChange={(e) => setConfig({ ...config, rewardName: e.target.value })}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
