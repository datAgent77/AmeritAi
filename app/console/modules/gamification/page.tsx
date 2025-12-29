"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Gamepad2, Gift, MousePointerClick, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"

export default function GamificationPage() {
    const { t } = useLanguage()
    const router = useRouter()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [active, setActive] = useState(false)

    const handleSave = () => {
        setIsLoading(true)
        setTimeout(() => {
            setIsLoading(false)
            toast({
                title: "Settings Saved",
                description: "Gamification settings updated."
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
                            <Gamepad2 className="h-8 w-8 text-pink-500" />
                            {t('modules.gamification') || "Gamification & Wheel"}
                        </h2>
                        <p className="text-muted-foreground">
                            {t('modules.gamificationDesc') || "Engage visitors with games and rewards"}
                        </p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-2 border-pink-100 dark:border-pink-900/20">
                    <CardHeader>
                        <CardTitle>Wheel of Fortune</CardTitle>
                        <CardDescription>Configure the spin-the-wheel popup</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <Label>Enable Game</Label>
                            <Switch checked={active} onCheckedChange={setActive} />
                        </div>

                        <div className="space-y-4">
                            <Label>Prizes (Probability)</Label>
                            <div className="flex gap-2">
                                <Input placeholder="10% Discount" defaultValue="10% OFF" />
                                <Input className="w-20" placeholder="%" defaultValue="50" />
                            </div>
                            <div className="flex gap-2">
                                <Input placeholder="Free Drink" defaultValue="Free Coffee" />
                                <Input className="w-20" placeholder="%" defaultValue="30" />
                            </div>
                            <div className="flex gap-2">
                                <Input placeholder="No Luck" defaultValue="Try Again" />
                                <Input className="w-20" placeholder="%" defaultValue="20" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Triggers</CardTitle>
                        <CardDescription>When should the game appear?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <MousePointerClick className="h-5 w-5 text-blue-500" />
                                <div>
                                    <div className="font-medium">Exit Intent</div>
                                    <div className="text-xs text-muted-foreground">Show when cursor leaves window</div>
                                </div>
                            </div>
                            <Switch checked={true} />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <Gift className="h-5 w-5 text-purple-500" />
                                <div>
                                    <div className="font-medium">On Entry</div>
                                    <div className="text-xs text-muted-foreground">Show immediately (delay 5s)</div>
                                </div>
                            </div>
                            <Switch checked={false} />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
