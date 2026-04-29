"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import {
    Activity,
    ArrowUpRight,
    Bot,
    Building2,
    CalendarClock,
    ClipboardList,
    FileText,
    Gauge,
    Loader2,
    MessageCircle,
    MessageSquare,
    ShieldCheck,
    TrendingUp,
    UserCheck,
    Users,
    UserX,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { AdminActivityFeed } from "@/components/admin-activity-feed"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"

interface UserData {
    id: string
    email: string
    role: string
    isActive: boolean
    createdAt: string
    isArchived?: boolean
}

function toDate(value: any): Date | null {
    if (!value) return null
    if (typeof value === "string") {
        const parsed = new Date(value)
        return Number.isNaN(parsed.getTime()) ? null : parsed
    }
    if (typeof value.seconds === "number") {
        return new Date(value.seconds * 1000)
    }
    return null
}

function formatRatio(value: number) {
    return Number.isFinite(value) ? value.toFixed(1) : "0.0"
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
    const [users, setUsers] = useState<UserData[]>([])

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
            setUsers(data.users || [])

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
    const inactiveTenants = Math.max(stats.totalTenants - stats.activeTenants, 0)
    const activationRate = stats.totalTenants > 0
        ? Math.round((stats.activeTenants / stats.totalTenants) * 100)
        : 0
    const chatbotCoverage = stats.totalTenants > 0
        ? Math.round((stats.totalChatbots / stats.totalTenants) * 100)
        : 0
    const chatbotCoverageLabel = chatbotCoverage > 100 ? "100%+" : `${chatbotCoverage}%`
    const conversationsPerBot = stats.totalChatbots > 0
        ? stats.totalChatSessions / stats.totalChatbots
        : 0
    const agencyAdmins = users.filter((item) => item.role === "AGENCY_ADMIN").length
    const superAdmins = users.filter((item) => item.role === "SUPER_ADMIN").length
    const archivedUsers = users.filter((item) => item.isArchived).length
    const newUsersThisWeek = users.filter((item) => {
        const createdAt = toDate(item.createdAt)
        if (!createdAt) return false

        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        return createdAt >= sevenDaysAgo
    }).length

    const actionItems = [
        {
            title: "Pasif hesapları gözden geçir",
            description: `${inactiveTenants} tenant şu anda pasif görünüyor.`,
            href: "/admin/end-users",
            tone: inactiveTenants > 0 ? "warning" : "success",
        },
        {
            title: "Chatbot kapsamını artır",
            description: `${stats.totalTenants} tenant için ${stats.totalChatbots} chatbot kayıtlı.`,
            href: "/admin/end-users",
            tone: chatbotCoverage >= 100 ? "success" : "neutral",
        },
        {
            title: "Partner kanalını kontrol et",
            description: `${agencyAdmins} aktif partner yöneticisi listeleniyor.`,
            href: "/admin/agencies",
            tone: "neutral",
        },
    ]

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

            <div className="grid gap-4 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base">Hesap Sağlığı</CardTitle>
                                <CardDescription>Tenant aktivasyon durumu</CardDescription>
                            </div>
                            <Gauge className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Aktivasyon oranı</span>
                                <span className="font-medium">{activationRate}%</span>
                            </div>
                            <Progress value={activationRate} className="h-2" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-md border p-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <UserCheck className="h-4 w-4 text-emerald-600" />
                                    Aktif
                                </div>
                                <div className="mt-2 text-2xl font-semibold">{stats.activeTenants}</div>
                            </div>
                            <div className="rounded-md border p-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <UserX className="h-4 w-4 text-amber-600" />
                                    Pasif
                                </div>
                                <div className="mt-2 text-2xl font-semibold">{inactiveTenants}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base">Kullanım Kapsamı</CardTitle>
                                <CardDescription>Chatbot ve konuşma yoğunluğu</CardDescription>
                            </div>
                            <TrendingUp className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between rounded-md border p-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Bot className="h-4 w-4" />
                                Tenant başına chatbot
                            </div>
                            <span className="text-lg font-semibold">{formatRatio(stats.totalChatbots / Math.max(stats.totalTenants, 1))}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-md border p-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MessageCircle className="h-4 w-4" />
                                Chatbot başına sohbet
                            </div>
                            <span className="text-lg font-semibold">{formatRatio(conversationsPerBot)}</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Chatbot kapsamı</span>
                                <span className="font-medium">{chatbotCoverageLabel}</span>
                            </div>
                            <Progress value={Math.min(chatbotCoverage, 100)} className="h-2" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base">Yönetim Kısayolları</CardTitle>
                                <CardDescription>Sık kullanılan süper admin alanları</CardDescription>
                            </div>
                            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        <Button variant="outline" className="justify-between" asChild>
                            <Link href="/admin/end-users">
                                Son kullanıcılar
                                <ArrowUpRight className="h-4 w-4" />
                            </Link>
                        </Button>
                        <Button variant="outline" className="justify-between" asChild>
                            <Link href="/admin/agencies">
                                Partner ajanslar
                                <ArrowUpRight className="h-4 w-4" />
                            </Link>
                        </Button>
                        <Button variant="outline" className="justify-between" asChild>
                            <Link href="/admin/appointments">
                                Randevular
                                <ArrowUpRight className="h-4 w-4" />
                            </Link>
                        </Button>
                        <Button variant="outline" className="justify-between" asChild>
                            <Link href="/admin/contracts">
                                Sözleşmeler
                                <ArrowUpRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-8 md:grid-cols-2">
                <AdminActivityFeed />
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Operasyon Özeti</CardTitle>
                                <CardDescription>Takip edilecek başlıklar ve sistem dağılımı</CardDescription>
                            </div>
                            <ClipboardList className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-md border p-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Building2 className="h-4 w-4" />
                                    Partner Admin
                                </div>
                                <div className="mt-2 text-2xl font-semibold">{agencyAdmins}</div>
                            </div>
                            <div className="rounded-md border p-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <ShieldCheck className="h-4 w-4" />
                                    Süper Admin
                                </div>
                                <div className="mt-2 text-2xl font-semibold">{superAdmins}</div>
                            </div>
                            <div className="rounded-md border p-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <CalendarClock className="h-4 w-4" />
                                    Bu hafta yeni
                                </div>
                                <div className="mt-2 text-2xl font-semibold">{newUsersThisWeek}</div>
                            </div>
                            <div className="rounded-md border p-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <FileText className="h-4 w-4" />
                                    Arşivli kayıt
                                </div>
                                <div className="mt-2 text-2xl font-semibold">{archivedUsers}</div>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                            {actionItems.map((item) => (
                                <Link
                                    key={item.title}
                                    href={item.href}
                                    className="flex items-start justify-between gap-4 rounded-md border p-3 transition-colors hover:bg-muted/50"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium leading-none">{item.title}</p>
                                            <Badge variant={item.tone === "warning" ? "destructive" : "secondary"}>
                                                {item.tone === "success" ? "İyi" : item.tone === "warning" ? "Takip" : "Bilgi"}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{item.description}</p>
                                    </div>
                                    <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
