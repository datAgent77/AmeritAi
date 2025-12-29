"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays, ArrowLeft, CloudRain, Sun, Droplets } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"

export default function AgriCalendarPage() {
    const { t } = useLanguage()
    const router = useRouter()

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push("/console/modules")}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <CalendarDays className="h-8 w-8 text-green-600" />
                        {t('modules.agriCalendar') || "Smart Agri-Calendar"}
                    </h2>
                    <p className="text-muted-foreground">Weather alerts and planting schedules</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Upcoming Tasks</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center p-4 border rounded-lg hover:bg-muted/50">
                            <div className="mr-4 bg-blue-100 p-2 rounded-full h-10 w-10 flex items-center justify-center text-blue-600 font-bold">15</div>
                            <div>
                                <h4 className="font-semibold">Wheat Fertilization</h4>
                                <p className="text-sm text-muted-foreground">Optimal window starts tomorrow</p>
                            </div>
                        </div>
                        <div className="flex items-center p-4 border rounded-lg hover:bg-muted/50">
                            <div className="mr-4 bg-orange-100 p-2 rounded-full h-10 w-10 flex items-center justify-center text-orange-600 font-bold">22</div>
                            <div>
                                <h4 className="font-semibold">Corn Harvesting</h4>
                                <p className="text-sm text-muted-foreground">Estimated based on heat units</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Weather Alert</CardTitle>
                        <CardDescription>Localized forecast for your fields</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center gap-4">
                            <CloudRain className="h-12 w-12 text-blue-500" />
                            <div>
                                <h4 className="font-bold text-xl">Heavy Rain Expected</h4>
                                <p className="text-muted-foreground">Starting Tuesday afternoon. Delay spraying.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-2 border rounded bg-yellow-50">
                                <Sun className="mx-auto h-5 w-5 text-yellow-500 mb-1" />
                                <div className="text-xs text-muted-foreground">Today</div>
                                <div className="font-bold">24°C</div>
                            </div>
                            <div className="p-2 border rounded bg-blue-50">
                                <CloudRain className="mx-auto h-5 w-5 text-blue-500 mb-1" />
                                <div className="text-xs text-muted-foreground">Tue</div>
                                <div className="font-bold">18°C</div>
                            </div>
                            <div className="p-2 border rounded bg-slate-50">
                                <Droplets className="mx-auto h-5 w-5 text-slate-500 mb-1" />
                                <div className="text-xs text-muted-foreground">Wed</div>
                                <div className="font-bold">19°C</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
