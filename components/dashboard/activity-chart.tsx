"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts"
import { Activity } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"

interface ActivityChartProps {
    chartData: { name: string; fullDate: string; chats: number; messages: number }[]
    hasActivity: boolean
}

export function ActivityChart({ chartData, hasActivity }: ActivityChartProps) {
    const { t } = useLanguage()

    return (
        <Card className="col-span-4 lg:col-span-5 border-border/50 shadow-sm">
            <CardHeader>
                <CardTitle className="text-base font-semibold">{t('activityOverview')}</CardTitle>
                <CardDescription>{t('last7Days')}</CardDescription>
            </CardHeader>
            <CardContent className="pl-0">
                {hasActivity ? (
                    <div className="h-[300px] w-full overflow-hidden">
                        <ResponsiveContainer width="100%" height={300} minWidth={200}>
                            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorChats" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                                <Tooltip cursor={false} wrapperStyle={{ visibility: 'visible', zIndex: 10 }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Area type="monotone" dataKey="chats" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorChats)" activeDot={{ r: 6, strokeWidth: 0 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-[300px] flex items-center justify-center">
                        <div className="flex flex-col items-center justify-center w-full h-full text-center p-6 text-muted-foreground/50">
                            <Activity className="w-12 h-12 mb-3 opacity-20" />
                            <p className="text-sm font-medium">{t('noDataAvailable')}</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
