"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, MessageSquare, Activity, Users, Download } from "lucide-react"
import { AnalyticsSummary } from "@/lib/analytics"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/context/LanguageContext"
import { DatePicker } from "@/components/ui/date-picker"
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from "recharts"
import { format, subDays } from "date-fns"
import { tr, enUS } from "date-fns/locale"

interface AnalyticsContentProps {
    targetUserId?: string
}

export function AnalyticsContent({ targetUserId }: AnalyticsContentProps) {
    const { user } = useAuth()
    const { toast } = useToast()
    const { t, language } = useLanguage()
    const [isLoading, setIsLoading] = useState(true)
    const [data, setData] = useState<AnalyticsSummary | null>(null)

    // Use targetUserId if provided, otherwise use current user's uid
    const effectiveUserId = targetUserId || user?.uid

    // Split state into two
    const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30))
    const [endDate, setEndDate] = useState<Date | undefined>(new Date())

    const locale = language === 'tr' ? tr : enUS

    const fetchAnalytics = useCallback(async () => {
        if (!startDate || !endDate || !effectiveUserId) return

        setIsLoading(true)
        try {
            const queryParams = new URLSearchParams({
                chatbotId: effectiveUserId,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            })

            const res = await fetch(`/api/analytics?${queryParams}`)
            if (!res.ok) throw new Error("Failed to fetch analytics")

            const jsonData = await res.json()
            setData(jsonData)
        } catch (error) {
            console.error("Error fetching analytics:", error)
            toast({
                title: t('error'),
                description: "Failed to load analytics data.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }, [startDate, endDate, effectiveUserId, t, toast])

    useEffect(() => {
        if (effectiveUserId && startDate && endDate) {
            fetchAnalytics()
        }
    }, [effectiveUserId, startDate, endDate, fetchAnalytics])

    const handleExport = () => {
        if (!data || !data.dailyStats) return;

        // Create CSV content
        const headers = ["Date", "Conversations", "Messages"];
        const rows = data.dailyStats.map(stat => [
            stat.date,
            stat.conversations.toString(),
            stat.messages.toString()
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.join(","))
        ].join("\n");

        // Create download link
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `report_${format(new Date(), "yyyy-MM-dd")}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const COLORS = ['#4ade80', '#94a3b8', '#f87171']; // Green, Gray, Red

    if (isLoading && !data) {
        return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('analytics')}</h1>
                    <p className="text-muted-foreground">{t('analyticsSubtitle')}</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                        <DatePicker date={startDate} setDate={setStartDate} placeholder={t('startDate')} />
                        <span className="text-muted-foreground">-</span>
                        <DatePicker date={endDate} setDate={setEndDate} placeholder={t('endDate')} />
                    </div>
                    <Button variant="outline" onClick={fetchAnalytics}>
                        {t('refresh')}
                    </Button>
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        {language === 'tr' ? 'Rapor Oluştur' : 'Export Report'}
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('totalConversations')}</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.totalConversations || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('totalMessages')}</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.totalMessages || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('avgMessagesPerChat')}</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.averageMessagesPerConversation || 0}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                {/* Activity Chart - Full Width */}
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>{t('activityOverview')}</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data?.dailyStats || []}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(str) => format(new Date(str), "d MMM", { locale })}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'white', borderRadius: '8px' }}
                                        labelFormatter={(str) => format(new Date(str), "d MMMM yyyy", { locale })}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="conversations" stroke="#2563eb" strokeWidth={2} name={t('totalConversations')} />
                                    <Line type="monotone" dataKey="messages" stroke="#16a34a" strokeWidth={2} name={t('totalMessages')} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Weekly Activity Chart (Moved from Dashboard) */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>{t('weeklyActivity')}</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data?.dailyStats ? data.dailyStats.map(stat => ({
                                    name: format(new Date(stat.date), "EEE", { locale }),
                                    chats: stat.conversations,
                                    fullDate: format(new Date(stat.date), "d MMM", { locale })
                                })) : []}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}`}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="flex flex-col">
                                                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                                    {payload[0].payload.fullDate}
                                                                </span>
                                                                <span className="font-bold text-muted-foreground">
                                                                    {payload[0].value} chats
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            }
                                            return null
                                        }}
                                    />
                                    <Bar
                                        dataKey="chats"
                                        fill="currentColor"
                                        radius={[4, 4, 0, 0]}
                                        className="fill-primary"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Sentiment Chart */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>{t('sentimentAnalysis')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: t('positive'), value: data?.sentiment.positive || 0 },
                                            { name: t('neutral'), value: data?.sentiment.neutral || 0 },
                                            { name: t('negative'), value: data?.sentiment.negative || 0 },
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        <Cell key="cell-0" fill="#4ade80" /> {/* Positive - Green */}
                                        <Cell key="cell-1" fill="#94a3b8" /> {/* Neutral - Gray */}
                                        <Cell key="cell-2" fill="#f87171" /> {/* Negative - Red */}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
