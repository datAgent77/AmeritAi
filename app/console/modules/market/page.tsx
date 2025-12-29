"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, ArrowLeft, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"

export default function MarketWatchPage() {
    const { t } = useLanguage()
    const router = useRouter()

    const prices = [
        { name: "Wheat (Durum)", price: "9.50 ₺", change: "+0.5%", up: true },
        { name: "Corn", price: "7.20 ₺", change: "-0.2%", up: false },
        { name: "Cotton", price: "22.00 ₺", change: "+1.2%", up: true },
        { name: "Tomatoes (Antalya Hall)", price: "25.00 ₺", change: "+5.0%", up: true },
    ]

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push("/console/modules")}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <TrendingUp className="h-8 w-8 text-blue-600" />
                        {t('modules.marketWatch') || "Market Watch"}
                    </h2>
                    <p className="text-muted-foreground">Real-time commodity prices</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Live Exchange Rates</CardTitle>
                    <CardDescription>Major agricultural commodities</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {prices.map((item, i) => (
                            <div key={i} className="p-4 border rounded-lg bg-card">
                                <div className="text-sm text-muted-foreground mb-1">{item.name}</div>
                                <div className="text-2xl font-bold">{item.price}</div>
                                <div className={`flex items-center text-sm font-medium ${item.up ? 'text-green-600' : 'text-red-600'}`}>
                                    {item.up ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
                                    {item.change}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
