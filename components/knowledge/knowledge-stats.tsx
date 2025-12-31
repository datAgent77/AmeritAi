"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Type, Globe, FileText, MessageSquare, Database, Loader2 } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"

interface KnowledgeStatsProps {
    userId: string
    refreshTrigger?: number
}

interface Stats {
    total: number
    text: number
    url: number
    file: number
    qa: number
}

export function KnowledgeStats({ userId, refreshTrigger }: KnowledgeStatsProps) {
    const { t } = useLanguage()
    const [stats, setStats] = useState<Stats>({ total: 0, text: 0, url: 0, file: 0, qa: 0 })
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            if (!userId) return
            try {
                const response = await fetch(`/api/knowledge?chatbotId=${userId}&stats=true`)
                if (!response.ok) throw new Error("Failed to fetch stats")
                const data = await response.json()
                setStats(data.stats || { total: 0, text: 0, url: 0, file: 0, qa: 0 })
            } catch (error) {
                console.error("Error fetching knowledge stats:", error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchStats()
    }, [userId, refreshTrigger])

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="h-4 w-20 bg-gray-200 rounded" />
                            <div className="h-4 w-4 bg-gray-200 rounded" />
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 w-12 bg-gray-200 rounded" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    const statCards = [
        {
            title: t('knowledgeText') || "Metin",
            value: stats.text,
            icon: Type,
            color: "text-blue-600",
            bgColor: "bg-blue-50"
        },
        {
            title: t('knowledgeUrl') || "URL",
            value: stats.url,
            icon: Globe,
            color: "text-green-600",
            bgColor: "bg-green-50"
        },
        {
            title: t('knowledgeFile') || "Dosya",
            value: stats.file,
            icon: FileText,
            color: "text-orange-600",
            bgColor: "bg-orange-50"
        },
        {
            title: t('knowledgeQa') || "Soru-Cevap",
            value: stats.qa,
            icon: MessageSquare,
            color: "text-purple-600",
            bgColor: "bg-purple-50"
        }
    ]

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => {
                const IconComponent = stat.icon
                return (
                    <Card key={stat.title} className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.title}
                            </CardTitle>
                            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                                <IconComponent className={`h-4 w-4 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {t('documents') || "döküman"}
                            </p>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
