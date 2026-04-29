"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, MessageSquare, Activity, Users, Download, UserX, Clock, UserPlus, CalendarCheck2, Target, Gauge, PhoneCall, PauseCircle, EyeOff, Heart } from "lucide-react"
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
import { endOfDay, format, startOfDay, subDays } from "date-fns"
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
            const normalizedStartDate = startOfDay(startDate)
            const normalizedEndDate = endOfDay(endDate)
            const queryParams = new URLSearchParams({
                chatbotId: effectiveUserId,
                startDate: normalizedStartDate.toISOString(),
                endDate: normalizedEndDate.toISOString()
            })

            const idToken = await user?.getIdToken()
            const res = await fetch(`/api/analytics?${queryParams}`, {
                headers: idToken
                    ? { Authorization: `Bearer ${idToken}` }
                    : undefined
            })
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
    }, [startDate, endDate, effectiveUserId, t, toast, user])

    const handleStartDateChange = (date: Date | undefined) => {
        setStartDate(date)
        if (date && endDate && date > endDate) {
            setEndDate(date)
        }
    }

    const handleEndDateChange = (date: Date | undefined) => {
        setEndDate(date)
        if (date && startDate && date < startDate) {
            setStartDate(date)
        }
    }

    useEffect(() => {
        if (effectiveUserId && startDate && endDate) {
            fetchAnalytics()
        }
    }, [effectiveUserId, startDate, endDate, fetchAnalytics])

    const handleExport = () => {
        if (!data || !data.dailyStats?.length) {
            toast({
                title: language === "tr" ? "Rapor oluşturulamadı" : "Report could not be created",
                description: language === "tr" ? "Dışa aktarılacak rapor verisi bulunamadı." : "There is no report data to export.",
                variant: "destructive"
            })
            return
        }

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
        URL.revokeObjectURL(url);
        toast({
            title: language === "tr" ? "Rapor oluşturuldu" : "Report created",
            description: language === "tr" ? "CSV raporu indirilmeye hazırlandı." : "The CSV report was prepared for download."
        })
    };

    const formatDuration = (seconds: number, emptyValue = "0 sn") => {
        if (!seconds) return emptyValue
        if (seconds < 60) return `${seconds} sn`
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = seconds % 60
        return remainingSeconds ? `${minutes} dk ${remainingSeconds} sn` : `${minutes} dk`
    }
    const formatPercent = (value: number | undefined) => `%${value || 0}`
    const responseTime = data?.responseTime
    const handoffQuality = data?.handoffQuality
    const sessionQuality = data?.sessionQuality
    const callbackQuality = data?.callbackQuality

    if (isLoading && !data) {
        return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('analytics')}</h1>
                    <p className="text-muted-foreground">{t('analyticsSubtitle')}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-background/80 p-2 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                        <DatePicker date={startDate} setDate={handleStartDateChange} placeholder={t('startDate')} />
                        <span className="text-muted-foreground">-</span>
                        <DatePicker date={endDate} setDate={handleEndDateChange} placeholder={t('endDate')} />
                    </div>
                    <Button type="button" variant="outline" onClick={fetchAnalytics} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {t('refresh')}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleExport} disabled={isLoading || !data}>
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

            {/* Outcome Metrics */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{language === "tr" ? "Toplanan Lead" : "Leads Captured"}</CardTitle>
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.leadsCount || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{language === "tr" ? "Oluşan Randevu" : "Appointments Created"}</CardTitle>
                        <CalendarCheck2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.appointmentsCount || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{language === "tr" ? "Dönüşüm Oranı" : "Conversion Rate"}</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">%{data?.conversionRate || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {language === "tr" ? "Sohbetten lead'e dönüşüm" : "Conversation to lead conversion"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Quality Summary */}
            <section className="space-y-4">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight">{language === "tr" ? "Kalite Özeti" : "Quality Summary"}</h2>
                    <p className="text-sm text-muted-foreground">
                        {language === "tr" ? "Yanıt hızı, insan devri, callback ve oturum kalitesi metrikleri" : "Response speed, handoff, callback and session quality metrics"}
                    </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{language === "tr" ? "İlk Yanıt" : "First Response"}</CardTitle>
                            <Gauge className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatDuration(responseTime?.averageSeconds || 0, "-")}</div>
                            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                                <div>
                                    <div className="font-medium text-foreground">{formatDuration(responseTime?.medianSeconds || 0, "-")}</div>
                                    <div>Medyan</div>
                                </div>
                                <div>
                                    <div className="font-medium text-foreground">{formatDuration(responseTime?.p95Seconds || 0, "-")}</div>
                                    <div>P95</div>
                                </div>
                                <div>
                                    <div className="font-medium text-foreground">{responseTime?.sampleSize || 0}</div>
                                    <div>{language === "tr" ? "Örnek" : "Samples"}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{language === "tr" ? "İnsan Devri" : "Human Handoff"}</CardTitle>
                            <UserX className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatPercent(handoffQuality?.handoffRate ?? data?.handoffRate)}</div>
                            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                                <span>{handoffQuality?.handoffCount ?? data?.handoffCount ?? 0} {language === "tr" ? "devir" : "handoffs"}</span>
                                <span>{formatPercent(handoffQuality?.pausedRate)} {language === "tr" ? "duraklama" : "paused"}</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{language === "tr" ? "Callback Kalitesi" : "Callback Quality"}</CardTitle>
                            <PhoneCall className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatPercent(callbackQuality?.resolutionRate)}</div>
                            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                                <span>{callbackQuality?.openCount || 0} {language === "tr" ? "açık" : "open"}</span>
                                <span>{callbackQuality?.resolvedCount || 0} {language === "tr" ? "çözülmüş" : "resolved"}</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{language === "tr" ? "Oturum İşaretleri" : "Session Signals"}</CardTitle>
                            <PauseCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                                <div>
                                    <PauseCircle className="mb-2 h-4 w-4 text-muted-foreground" />
                                    <div className="text-xl font-bold">{handoffQuality?.pausedCount || 0}</div>
                                    <div className="text-xs text-muted-foreground">{language === "tr" ? "Duraklatılan" : "Paused"}</div>
                                </div>
                                <div>
                                    <EyeOff className="mb-2 h-4 w-4 text-muted-foreground" />
                                    <div className="text-xl font-bold">{sessionQuality?.hiddenCount || 0}</div>
                                    <div className="text-xs text-muted-foreground">{language === "tr" ? "Gizlenen" : "Hidden"}</div>
                                </div>
                                <div>
                                    <Heart className="mb-2 h-4 w-4 text-muted-foreground" />
                                    <div className="text-xl font-bold">{sessionQuality?.favoriteCount || 0}</div>
                                    <div className="text-xs text-muted-foreground">{language === "tr" ? "Favori" : "Favorite"}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>{language === "tr" ? "Disposition Dağılımı" : "Disposition Breakdown"}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {sessionQuality?.dispositionBreakdown?.length ? (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {sessionQuality.dispositionBreakdown.map((item) => (
                                    <div key={item.disposition} className="rounded-lg border border-border/70 bg-background p-4">
                                        <div className="truncate text-sm font-medium">{item.disposition}</div>
                                        <div className="mt-2 text-2xl font-bold">{item.count}</div>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {language === "tr" ? "sohbet" : "conversations"}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground">-</div>
                        )}
                    </CardContent>
                </Card>
            </section>
            
            {/* Business Impact Stats */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                     <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('missedOpportunities') || "Missed Opportunities"}</CardTitle>
                        <UserX className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.missedOpportunities || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {language === "tr" ? "Tahmini: sohbet hacmine göre kaçan fırsat sinyali" : (t('potentialLeadsLost') || "Estimated potential customers who left without interacting")}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('aiTimeSaved') || "AI Time Saved"}</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                     <CardContent>
                        <div className="text-2xl font-bold">{data?.savedTimeHours || 0} {t('hours') || "hours"}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {language === "tr" ? "Tahmini: asistan mesajı başına 2 dk manuel iş" : (t('manualWorkSaved') || "Estimated manual work automatically handled by AI")}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {data?.channelBreakdown?.length ? (
                <Card>
                    <CardHeader>
                        <CardTitle>{language === "tr" ? "Kanal Dağılımı" : "Channel Breakdown"}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {data.channelBreakdown.map((item) => (
                                <div key={item.channel} className="rounded-lg border border-border/70 bg-background p-4">
                                    <div className="text-sm font-medium capitalize">{item.channel}</div>
                                    <div className="mt-2 text-2xl font-bold">{item.count}</div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {language === "tr" ? "sohbet" : "conversations"}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ) : null}

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
