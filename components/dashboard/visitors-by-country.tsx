"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"

interface VisitorsByCountryProps {
    visitorsByCountry: { flag: string; country: string; count: number }[]
    hasVisitors: boolean
}

export function VisitorsByCountry({ visitorsByCountry, hasVisitors }: VisitorsByCountryProps) {
    const { t } = useLanguage()

    return (
        <Card className="border-border/50 shadow-sm">
            <CardHeader>
                <CardTitle className="text-base font-semibold">{t('visitorsByCountry')}</CardTitle>
                <CardDescription>Canlı ziyaretçi konumları</CardDescription>
            </CardHeader>
            <CardContent>
                {hasVisitors ? (
                    <div className="space-y-4">
                        {visitorsByCountry.map((item, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">{item.flag}</span>
                                    <span className="text-sm font-medium">{item.country}</span>
                                </div>
                                <div className="flex items-center gap-2 min-w-[30%]">
                                    <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(item.count / 850) * 100}%` }} />
                                    </div>
                                    <span className="text-xs text-muted-foreground w-8 text-right">{item.count}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-[200px] flex items-center justify-center">
                        <div className="flex flex-col items-center justify-center w-full h-full text-center p-6 text-muted-foreground/50">
                            <Globe className="w-12 h-12 mb-3 opacity-20" />
                            <p className="text-sm font-medium">{t('noDataAvailable')}</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
