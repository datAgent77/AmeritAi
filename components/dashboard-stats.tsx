"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import { Loader2, MessageSquare, Users, Activity } from "lucide-react"
import { format, subDays, startOfDay } from "date-fns"
import { useLanguage } from "@/context/LanguageContext"
import { AnalyticsSummary } from "@/lib/analytics"
import { tr, enUS } from "date-fns/locale"

interface DashboardStatsProps {
    targetUserId?: string
}

export function DashboardStats({ targetUserId }: DashboardStatsProps) {
    const { user } = useAuth()
    const { t, language } = useLanguage()

    // Use targetUserId if provided, otherwise use current user's uid
    const effectiveUserId = targetUserId || user?.uid
    const locale = language === 'tr' ? tr : enUS

    const [stats, setStats] = useState({
        totalChats: 0,
        totalMessages: 0,
        avgMessagesPerChat: 0,
    })
    const [chartData, setChartData] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            if (!effectiveUserId) return

            try {
                // Fetch from API to get correct aggregations and ISO date handling
                const queryParams = new URLSearchParams({
                    chatbotId: effectiveUserId,
                    startDate: subDays(new Date(), 30).toISOString(), // Last 30 days default
                    endDate: new Date().toISOString()
                })

                const res = await fetch(`/api/analytics?${queryParams}`)
                if (!res.ok) throw new Error("Failed to fetch analytics")

                const data: AnalyticsSummary = await res.json()

                setStats({
                    totalChats: data.totalConversations,
                    totalMessages: data.totalMessages,
                    avgMessagesPerChat: data.averageMessagesPerConversation,
                })

                // Format Chart Data
                const formattedChartData = data.dailyStats.map(dayStat => {
                    const date = new Date(dayStat.date)
                    return {
                        name: format(date, "EEE", { locale }),
                        chats: dayStat.conversations,
                        fullDate: format(date, "d MMM", { locale }),
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
            <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('totalChats')}</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalChats}</div>
                        <p className="text-xs text-muted-foreground">
                            {t('lifetimeConversations')}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('totalMessages')}</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalMessages}</div>
                        <p className="text-xs text-muted-foreground">
                            {t('messagesProcessed')}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('avgMessagesPerChat')}</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.avgMessagesPerChat}</div>
                        <p className="text-xs text-muted-foreground">
                            {t('engagementDepth')}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
