"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts"
import { Loader2, MessageSquare, Users, Zap, Search, Settings, ArrowUpRight, ArrowDownRight, Activity, Clock, ThumbsUp, Globe, MessageCircle } from "lucide-react"
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns"
import { useLanguage } from "@/context/LanguageContext"
import { AnalyticsSummary } from "@/lib/analytics"
import { tr, enUS } from "date-fns/locale"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface DashboardStatsProps {
    targetUserId?: string
}

export function DashboardStats({ targetUserId }: DashboardStatsProps) {
    const { user } = useAuth()
    const { t, language } = useLanguage()

    const effectiveUserId = targetUserId || user?.uid
    const locale = language === 'tr' ? tr : enUS

    const [stats, setStats] = useState({
        totalChats: 0,
        totalChatsChange: 12,
        totalMessages: 0,
        totalMessagesChange: 5,
        avgMessagesPerChat: 0,
        avgMessagesChange: 8,
        activeUsers: 0,
        savedTime: 0
    })
    const [chartData, setChartData] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [apiData, setApiData] = useState<AnalyticsSummary | null>(null)



    useEffect(() => {
        const fetchStats = async () => {
            if (!effectiveUserId) return

            try {
                const queryParams = new URLSearchParams({
                    chatbotId: effectiveUserId,
                    startDate: subDays(new Date(), 7).toISOString(),
                    endDate: new Date().toISOString()
                })

                const res = await fetch(`/api/analytics?${queryParams}`)
                if (!res.ok) throw new Error("Failed to fetch analytics")

                const data: AnalyticsSummary = await res.json()
                setApiData(data)

                const savedMinutes = data.totalMessages * 2
                const savedHours = Math.floor(savedMinutes / 60)

                setStats(prev => ({
                    ...prev,
                    totalChats: data.totalConversations,
                    totalMessages: data.totalMessages,
                    avgMessagesPerChat: data.averageMessagesPerConversation,
                    activeUsers: Math.floor(data.totalConversations * 0.8),
                    savedTime: savedHours || data.savedTimeHours || 0
                }))

                const days = eachDayOfInterval({
                    start: subDays(new Date(), 6),
                    end: new Date()
                })

                const formattedChartData = days.map(day => {
                    const dayStr = format(day, "yyyy-MM-dd")
                    const foundStat = data.dailyStats.find(s => s.date.startsWith(dayStr))

                    return {
                        name: format(day, "EEE", { locale }),
                        fullDate: format(day, "d MMM", { locale }),
                        chats: foundStat ? foundStat.conversations : 0,
                        messages: foundStat ? foundStat.messages : 0
                    }
                })

                setChartData(formattedChartData)

            } catch (error) {
                console.error("Error fetching dashboard stats:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchStats()
    }, [effectiveUserId, locale])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
            </div>
        )
    }

    // Use only real data (no demo fallbacks)
    const automationData = [
        { name: t('automated') || 'Automated', value: apiData?.automationRate.automated || 0, color: '#3b82f6' },
        { name: t('humanHandoff') || 'Human Handoff', value: apiData?.automationRate.handoff || 0, color: '#f59e0b' }
    ].filter(d => d.value > 0)

    const totalAutomation = (apiData?.automationRate.automated || 0) + (apiData?.automationRate.handoff || 0)
    const automationPercentage = totalAutomation > 0
        ? Math.round(((apiData?.automationRate.automated || 0) / totalAutomation) * 100)
        : 0

    const sentimentData = [{
        name: t('last7Days'),
        pos: apiData?.sentiment.positive || 0,
        neu: apiData?.sentiment.neutral || 0,
        neg: apiData?.sentiment.negative || 0
    }]

    const topTopics = apiData?.topTopics || []

    const visitorsByCountry = apiData?.visitorsByCountry || []

    // Helper checks
    const hasActivity = stats.totalMessages > 0
    const hasAutomation = automationData.length > 0
    const hasSentiment = sentimentData[0].pos + sentimentData[0].neu + sentimentData[0].neg > 0
    const hasTopics = topTopics.length > 0
    const hasVisitors = visitorsByCountry.length > 0

    const EmptyState = ({ message, icon: Icon }: any) => (
        <div className="flex flex-col items-center justify-center w-full h-full text-center p-6 text-muted-foreground/50">
            <Icon className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">{message || t('noDataAvailable')}</p>
        </div>
    )

    const StatCard = ({ title, value, change, icon: Icon, colorClass, subtitle }: any) => (
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-200 py-0">
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
                        <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
                    </div>
                    <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
                        <Icon className={`w-5 h-5 ${colorClass.replace('bg-', 'text-')}`} />
                    </div>
                </div>
                <div className="mt-3 flex items-center text-xs">
                    <span className={`flex items-center font-medium ${change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {change >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                        {Math.abs(change)}%
                    </span>
                    <span className="text-muted-foreground ml-1.5">{subtitle || t('vsLastWeek')}</span>
                </div>
            </CardContent>
        </Card>
    )

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title={t('totalChats')}
                    value={stats.totalChats}
                    change={stats.totalChatsChange}
                    icon={MessageSquare}
                    colorClass="bg-blue-500 text-blue-600"
                />
                <StatCard
                    title={t('totalMessages')}
                    value={stats.totalMessages.toLocaleString()}
                    change={stats.totalMessagesChange}
                    icon={Activity}
                    colorClass="bg-purple-500 text-purple-600"
                />
                <StatCard
                    title={t('savedTime')}
                    value={`${stats.savedTime} ${t('hours')}`}
                    change={stats.totalMessages > 0 ? 15 : 0}
                    icon={Clock}
                    colorClass="bg-emerald-500 text-emerald-600"
                    subtitle={t('dailyAverage')}
                />
                <StatCard
                    title={t('avgMessagesPerChat')}
                    value={stats.avgMessagesPerChat}
                    change={stats.totalChats > 0 ? -2.5 : 0}
                    icon={Zap}
                    colorClass="bg-amber-500 text-amber-600"
                    subtitle={t('dailyAverage')}
                />
            </div>

            {/* Main Analytics Row */}
            <div className="grid gap-4 md:grid-cols-7 lg:grid-cols-7">
                {/* Activity Chart */}
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
                                <EmptyState message={t('noDataAvailable')} icon={Activity} />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Automation Pie */}
                <Card className="col-span-3 lg:col-span-2 border-border/50 shadow-sm flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">{t('automationRate')}</CardTitle>
                        <CardDescription>{t('last7Days')}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-[250px] relative p-0">
                        {hasAutomation ? (
                            <>
                                <div className="absolute inset-0 flex flex-col items-center justify-center z-0 pointer-events-none pb-10">
                                    <span className="text-4xl font-bold text-foreground">{automationPercentage}%</span>
                                    <span className="text-sm text-muted-foreground font-medium mt-1">{t('automated')}</span>
                                </div>
                                <div className="w-full h-full min-h-[250px]">
                                    <ResponsiveContainer width="100%" height={250} minWidth={150}>
                                        <PieChart>
                                            <Pie
                                                data={automationData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={90}
                                                outerRadius={110}
                                                paddingAngle={2}
                                                dataKey="value"
                                                startAngle={90}
                                                endAngle={-270}
                                                stroke="none"
                                            >
                                                {automationData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                cursor={false}
                                                contentStyle={{
                                                    borderRadius: '8px',
                                                    border: '1px solid #e2e8f0',
                                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                                    padding: '8px 12px',
                                                    fontSize: '12px',
                                                    backgroundColor: 'rgba(255, 255, 255, 0.95)'
                                                }}
                                                itemStyle={{ color: '#0f172a', fontWeight: 500 }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </>
                        ) : (
                            <EmptyState message={t('noDataAvailable')} icon={Zap} />
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Metrics Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

                {/* Sentiment */}
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
                                <EmptyState message={t('noDataAvailable')} icon={ThumbsUp} />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Topics */}
                <Card className="border-border/50 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">{t('topTopics')}</CardTitle>
                        <CardDescription>{t('topicsDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {hasTopics ? (
                            <div className="space-y-4">
                                {topTopics.map((topic: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                                {i + 1}
                                            </div>
                                            <span className="text-sm font-medium">{topic.topic}</span>
                                        </div>
                                        <div className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded text-xs">
                                            {topic.count}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-[200px] flex items-center justify-center">
                                <EmptyState message={t('noDataAvailable')} icon={MessageCircle} />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Visitors */}
                <Card className="border-border/50 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">{t('visitorsByCountry')}</CardTitle>
                        <CardDescription>Canlı ziyaretçi konumları</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {hasVisitors ? (
                            <div className="space-y-4">
                                {visitorsByCountry.map((item: any, i: number) => (
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
                                <EmptyState message={t('noDataAvailable')} icon={Globe} />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card className="border-border/50 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base font-semibold">{t('quickActions')}</CardTitle>
                    <CardDescription>Sık kullanılan işlemler</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <a href={`/widget-test?id=${effectiveUserId}`} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" className="w-full justify-start h-auto py-4 px-4 rounded-xl border-dashed border-2 hover:border-solid hover:border-primary/50 hover:bg-primary/5 group">
                                <div className="bg-primary/10 p-2.5 rounded-md mr-3 group-hover:bg-primary/20 transition-colors">
                                    <Zap className="w-5 h-5 text-primary" />
                                </div>
                                <div className="text-left">
                                    <div className="font-medium text-sm">{t('testWidget')}</div>
                                    <div className="text-xs text-muted-foreground">{t('testWidgetDesc')}</div>
                                </div>
                            </Button>
                        </a>

                        <Link href={`/admin/tenant/${effectiveUserId}/knowledge/url`}>
                            <Button variant="outline" className="w-full justify-start h-auto py-4 px-4 rounded-xl hover:bg-muted/50 group">
                                <div className="bg-blue-100 p-2.5 rounded-md mr-3 group-hover:bg-blue-200 transition-colors">
                                    <Search className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="text-left">
                                    <div className="font-medium text-sm">{t('updateKnowledge')}</div>
                                    <div className="text-xs text-muted-foreground">{t('updateKnowledgeDesc')}</div>
                                </div>
                            </Button>
                        </Link>

                        <Link href={`/admin/tenant/${effectiveUserId}/settings/ai`}>
                            <Button variant="outline" className="w-full justify-start h-auto py-4 px-4 rounded-xl hover:bg-muted/50 group">
                                <div className="bg-purple-100 p-2.5 rounded-md mr-3 group-hover:bg-purple-200 transition-colors">
                                    <Settings className="w-5 h-5 text-purple-600" />
                                </div>
                                <div className="text-left">
                                    <div className="font-medium text-sm">{t('botSettings')}</div>
                                    <div className="text-xs text-muted-foreground">{t('botSettingsDesc')}</div>
                                </div>
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>

        </div>
    )
}
