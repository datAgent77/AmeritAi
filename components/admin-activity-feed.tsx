"use client"

import { useEffect, useState } from "react"
import { auth } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bot, User, Loader2 } from "lucide-react"

interface ActivityItem {
    id: string
    type: 'user' | 'chatbot'
    title: string
    subtitle: string
    timestamp: Date
}

export function AdminActivityFeed() {
    const [activities, setActivities] = useState<ActivityItem[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                const currentUser = auth.currentUser
                if (!currentUser) return

                const token = await currentUser.getIdToken()
                const response = await fetch("/api/admin/dashboard-stats", {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                })

                if (response.ok) {
                    const data = await response.json()
                    // Map recentActivity to ActivityItem format
                    const activityItems: ActivityItem[] = (data.recentActivity || []).map((item: any) => ({
                        id: item.id,
                        type: 'user' as const,
                        title: "Yeni kullanıcı kaydı",
                        subtitle: item.userEmail,
                        timestamp: item.timestamp?.seconds
                            ? new Date(item.timestamp.seconds * 1000)
                            : new Date()
                    }))
                    setActivities(activityItems)
                }
            } catch (error) {
                console.warn("AdminActivityFeed: Could not fetch activity")
            } finally {
                setIsLoading(false)
            }
        }

        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                fetchActivity()
            }
        })

        return () => unsubscribe()
    }, [])

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Son Aktivite</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Son Aktivite</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-8">
                    {activities.map((item) => (
                        <div key={`${item.type}-${item.id}`} className="flex items-center">
                            <Avatar className="h-9 w-9">
                                <AvatarFallback className={item.type === 'user' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"}>
                                    {item.type === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                </AvatarFallback>
                            </Avatar>
                            <div className="ml-4 space-y-1">
                                <p className="text-sm font-medium leading-none">{item.title}</p>
                                <p className="text-sm text-muted-foreground">
                                    {item.subtitle}
                                </p>
                            </div>
                            <div className="ml-auto font-medium text-xs text-muted-foreground">
                                {item.timestamp.toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                    {activities.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">Yakın aktivite yok.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
