"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { Utensils, Receipt, Clock, TrendingUp, Loader2 } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"

interface Stats {
    total: number
    calls: number
    bills: number
    avgResponseTime: number // in minutes
}

export function DigitalWaiterAnalytics({ chatbotId }: { chatbotId: string }) {
    const { t } = useLanguage()
    const [stats, setStats] = useState<Stats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!chatbotId) return

        const fetchStats = async () => {
            try {
                const q = query(
                    collection(db, "waiter_requests"),
                    where("chatbotId", "==", chatbotId)
                )
                
                const querySnapshot = await getDocs(q)
                const docs = querySnapshot.docs.map(doc => doc.data())
                
                const calls = docs.filter(d => d.type === 'call_staff').length
                const bills = docs.filter(d => d.type === 'request_bill').length
                
                // Calculate avg response time (createdAt to completedAt)
                let totalTime = 0
                let completedCount = 0
                
                docs.forEach(doc => {
                    if (doc.status === 'completed' && doc.createdAt && doc.completedAt) {
                        const start = new Date(doc.createdAt).getTime()
                        const end = new Date(doc.completedAt).getTime()
                        totalTime += (end - start)
                        completedCount++
                    }
                })
                
                const avgResponseTime = completedCount > 0 ? (totalTime / completedCount / 60000) : 0

                setStats({
                    total: docs.length,
                    calls,
                    bills,
                    avgResponseTime: Math.round(avgResponseTime)
                })
            } catch (error) {
                console.error("Analytics fetch failed", error)
            } finally {
                setLoading(false)
            }
        }

        fetchStats()
    }, [chatbotId])

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
    }

    if (!stats) return null

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-primary/5 border-primary/10">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">{t('totalRequests')}</CardTitle>
                        <TrendingUp className="w-4 h-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">Tüm zamanlar</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">{t('staffCalls')}</CardTitle>
                        <Utensils className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-500">{stats.calls}</div>
                        <p className="text-xs text-muted-foreground">Toplam çağrı</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">{t('billRequests')}</CardTitle>
                        <Receipt className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-500">{stats.bills}</div>
                        <p className="text-xs text-muted-foreground">Toplam ödeme talebi</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">{t('avgResponseTime')}</CardTitle>
                        <Clock className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.avgResponseTime} dk</div>
                        <p className="text-xs text-muted-foreground">İstek - Tamamlanma</p>
                    </CardContent>
                </Card>
            </div>

            {/* Gelecekte buraya grafikler eklenebilir */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('servicePerformance')}</CardTitle>
                </CardHeader>
                <CardContent className="h-48 flex items-center justify-center text-muted-foreground italic border-2 border-dashed rounded-lg">
                    {t('servicePerformanceDesc')}
                </CardContent>
            </Card>
        </div>
    )
}
