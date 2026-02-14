"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { Loader2, MessageSquare, Activity, Clock, Zap, UserPlus, CalendarCheck2, Target } from "lucide-react"
import { format, subDays, eachDayOfInterval } from "date-fns"
import { useLanguage } from "@/context/LanguageContext"
import { AnalyticsSummary } from "@/lib/analytics"
import { tr, enUS } from "date-fns/locale"

// Sub-components
import { StatCard } from "@/components/dashboard/stat-card"
import { ActivityChart } from "@/components/dashboard/activity-chart"
import { AutomationRateChart } from "@/components/dashboard/automation-rate-chart"
import { SentimentChart } from "@/components/dashboard/sentiment-chart"
import { TopTopics } from "@/components/dashboard/top-topics"
import { VisitorsByCountry } from "@/components/dashboard/visitors-by-country"
import { QuickActions } from "@/components/dashboard/quick-actions"

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

                const idToken = await user?.getIdToken()
                const res = await fetch(`/api/analytics?${queryParams}`, {
                    headers: idToken
                        ? { Authorization: `Bearer ${idToken}` }
                        : undefined
                })
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
    }, [effectiveUserId, locale, user])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
            </div>
        )
    }

    // Prepare data for sub-components
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

    // Checks
    const hasActivity = stats.totalMessages > 0
    const hasAutomation = automationData.length > 0
    const hasSentiment = sentimentData[0].pos + sentimentData[0].neu + sentimentData[0].neg > 0
    const hasTopics = topTopics.length > 0
    const hasVisitors = visitorsByCountry.length > 0

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

            {/* Outcome Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                    title={language === 'tr' ? 'Toplanan Lead' : 'Leads Captured'}
                    value={apiData?.leadsCount || 0}
                    change={0}
                    icon={UserPlus}
                    colorClass="bg-cyan-500 text-cyan-600"
                    subtitle={language === 'tr' ? 'Bu periyot' : 'This period'}
                />
                <StatCard
                    title={language === 'tr' ? 'Oluşan Randevu' : 'Appointments Created'}
                    value={apiData?.appointmentsCount || 0}
                    change={0}
                    icon={CalendarCheck2}
                    colorClass="bg-indigo-500 text-indigo-600"
                    subtitle={language === 'tr' ? 'Bu periyot' : 'This period'}
                />
                <StatCard
                    title={language === 'tr' ? 'Dönüşüm Oranı' : 'Conversion Rate'}
                    value={`${apiData?.conversionRate || 0}%`}
                    change={0}
                    icon={Target}
                    colorClass="bg-rose-500 text-rose-600"
                    subtitle={language === 'tr' ? 'Sohbet -> Lead' : 'Conversation -> Lead'}
                />
            </div>

            {/* Main Analytics Row */}
            <div className="grid gap-4 md:grid-cols-7 lg:grid-cols-7">
                <ActivityChart chartData={chartData} hasActivity={hasActivity} />
                <AutomationRateChart automationData={automationData} automationPercentage={automationPercentage} hasAutomation={hasAutomation} />
            </div>

            {/* Detailed Metrics Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <SentimentChart sentimentData={sentimentData} hasSentiment={hasSentiment} />
                <TopTopics topTopics={topTopics} hasTopics={hasTopics} />
                <VisitorsByCountry visitorsByCountry={visitorsByCountry} hasVisitors={hasVisitors} />
            </div>

            {/* Quick Actions */}
            <QuickActions effectiveUserId={effectiveUserId || ''} />

        </div>
    )
}
