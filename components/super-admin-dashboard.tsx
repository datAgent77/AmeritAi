"use client"

import { useEffect, useState, useCallback } from "react"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Users, Activity, MessageSquare, MessageCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminActivityFeed } from "@/components/admin-activity-feed"
import { AdminAnnouncementSettings } from "@/components/admin-announcement-settings"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"

interface UserData {
    id: string
    email: string
    role: string
    isActive: boolean
    createdAt: string
}

export function SuperAdminDashboard() {
    const [isLoading, setIsLoading] = useState(true)
    const { toast } = useToast()
    const { t } = useLanguage()
    const { user } = useAuth()

    // Dashboard Stats
    const [stats, setStats] = useState({
        totalTenants: 0,
        activeTenants: 0,
        totalChatbots: 0,
        totalChatSessions: 0
    })

    const fetchDashboardData = useCallback(async () => {
        try {
            const currentUser = auth.currentUser
            if (!currentUser) return

            const token = await currentUser.getIdToken()
            const response = await fetch("/api/admin/dashboard-stats", {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to fetch dashboard data")
            }

            const data = await response.json()

            setStats({
                totalTenants: data.stats?.totalTenants || 0,
                activeTenants: data.stats?.activeTenants || 0,
                totalChatbots: data.stats?.totalChatbots || 0,
                totalChatSessions: data.stats?.totalChatSessions || 0
            })

        } catch (error: any) {
            console.error("Error fetching dashboard data:", error)
            toast({
                title: "Error",
                description: error.message || "Failed to load dashboard data.",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }, [toast])

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                fetchDashboardData()
            }
        })
        return () => unsubscribe()
    }, [fetchDashboardData])

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    // ...

    return (
        <div className="space-y-8">
            {/* Header & Stats */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">{t('superAdminDashboard')}</h2>
                        <p className="text-muted-foreground">{t('systemPerformanceOverview')}</p>
                    </div>
                    <Button variant="outline" onClick={() => window.open(`/widget-test?id=${user?.uid}`, '_blank')}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        {t('testWidget')}
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('totalTenants')}</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalTenants}</div>
                            <p className="text-xs text-muted-foreground">{t('registeredTenantAccounts')}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('activeTenants')}</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{stats.activeTenants}</div>
                            <p className="text-xs text-muted-foreground">{t('currentlyActiveAccounts')}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('totalChatbots')}</CardTitle>
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalChatbots}</div>
                            <p className="text-xs text-muted-foreground">{t('deployedChatbots')}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('totalChatSessions')}</CardTitle>
                            <MessageCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalChatSessions}</div>
                            <p className="text-xs text-muted-foreground">{t('totalConversations')}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-8 md:grid-cols-2">
                <AdminActivityFeed />
                <AdminAnnouncementSettings />
            </div>
        </div>
    )
}
