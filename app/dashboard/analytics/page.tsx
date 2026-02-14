"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, TrendingUp, MessageSquare, ThumbsUp, ThumbsDown, Minus, BarChart3 } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts"

interface AnalyticsData {
    totalConversations: number
    totalMessages: number
    avgMessagesPerSession: number
    sentimentCounts: { Positive: number, Neutral: number, Negative: number }
    topTopics: { topic: string, count: number }[]
    activityData: { date: string, count: number }[]
}

export default function AnalyticsPage() {
    const { user } = useAuth()
    const [data, setData] = useState<AnalyticsData | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchAnalytics = async () => {
            if (!user) return
            try {
                const idToken = await user.getIdToken()
                const res = await fetch(`/api/analytics?chatbotId=${user.uid}`, {
                    headers: {
                        Authorization: `Bearer ${idToken}`
                    }
                })
                if (res.ok) {
                    const jsonData = await res.json()
                    setData(jsonData)
                }
            } catch (error) {
                console.error("Failed to fetch analytics", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchAnalytics()
    }, [user])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!data) return <div>Failed to load data.</div>

    const sentimentData = [
        { name: 'Positive', value: data.sentimentCounts.Positive, color: '#22c55e' },
        { name: 'Neutral', value: data.sentimentCounts.Neutral, color: '#94a3b8' },
        { name: 'Negative', value: data.sentimentCounts.Negative, color: '#ef4444' },
    ].filter(d => d.value > 0);

    return (
        <div className="p-8 space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
                <p className="text-muted-foreground">
                    Deep dive into your chatbot&apos;s performance and user sentiment.
                </p>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.totalConversations}</div>
                        <p className="text-xs text-muted-foreground">
                            Across all channels
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.totalMessages}</div>
                        <p className="text-xs text-muted-foreground">
                            Avg. {data.avgMessagesPerSession} per session
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sentiment Score</CardTitle>
                        <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {data.sentimentCounts.Positive} Positive
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {data.sentimentCounts.Negative} Negative, {data.sentimentCounts.Neutral} Neutral
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Activity Chart */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Weekly Activity</CardTitle>
                        <CardDescription>
                            Number of conversations over the last 7 days.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={data.activityData}>
                                <XAxis
                                    dataKey="date"
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
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                />
                                <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Sentiment Chart */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Sentiment Analysis</CardTitle>
                        <CardDescription>
                            Distribution of user sentiment in messages.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[350px] flex items-center justify-center">
                            {sentimentData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={sentimentData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {sentimentData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-muted-foreground text-sm">No sentiment data yet.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Top Topics */}
            <Card>
                <CardHeader>
                    <CardTitle>Most Asked Topics</CardTitle>
                    <CardDescription>
                        Frequently occurring words in user queries.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {data.topTopics.length > 0 ? (
                            data.topTopics.map((topic, i) => (
                                <div key={i} className="flex items-center">
                                    <div className="w-full max-w-sm flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium capitalize">{topic.topic}</span>
                                            <span className="text-sm text-muted-foreground">{topic.count} mentions</span>
                                        </div>
                                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary"
                                                style={{ width: `${(topic.count / data.topTopics[0].count) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-muted-foreground text-sm">No topics analyzed yet.</div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
