"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, CartesianGrid } from "recharts"
import { ThumbsUp } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"

interface SentimentChartProps {
    sentimentData: { name: string; pos: number; neu: number; neg: number }[]
    hasSentiment: boolean
}

export function SentimentChart({ sentimentData, hasSentiment }: SentimentChartProps) {
    const { t } = useLanguage()

    return (
        <Card className="border-border/50 shadow-sm">
            <CardHeader>
                <CardTitle className="text-base font-semibold">{t('sentimentAnalysis')}</CardTitle>
                <CardDescription>{t('last7Days')}</CardDescription>
            </CardHeader>
            <CardContent>
                {hasSentiment ? (
                    <div className="h-[200px] w-full overflow-hidden">
                        <ResponsiveContainer width="100%" height={200} minWidth={200}>
                            <BarChart data={sentimentData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip cursor={false} wrapperStyle={{ zIndex: 20 }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="pos" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} name={t('positive')} />
                                <Bar dataKey="neu" stackId="a" fill="#94a3b8" name={t('neutral')} />
                                <Bar dataKey="neg" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} name={t('negative')} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-[200px] flex items-center justify-center">
                        <div className="flex flex-col items-center justify-center w-full h-full text-center p-6 text-muted-foreground/50">
                            <ThumbsUp className="w-12 h-12 mb-3 opacity-20" />
                            <p className="text-sm font-medium">{t('noDataAvailable')}</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
