"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Calendar, Clock, Mail, Phone, CheckCircle2, XCircle, Clock3, RefreshCw, CalendarPlus, X, Plus } from "lucide-react"
import { format } from "date-fns"
import { tr, enUS } from 'date-fns/locale'
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { CalendarDays, ExternalLink, AlertCircle, MessageSquare } from "lucide-react"
import { getGoogleCalendarLink, getOutlookCalendarLink } from "@/lib/ical-generator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ManualAppointmentForm } from "@/components/appointments/manual-appointment-form"
import { cn } from "@/lib/utils"

interface Appointment {
    id: string
    customerName: string
    customerEmail: string
    customerPhone: string
    date: string
    time: string
    type: string
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
    notes?: string
    source?: 'chatbot' | 'google' | 'outlook'
    createdAt: any
}

interface AppointmentSettings {
    workingDays: string[]
    workingHoursStart: string
    workingHoursEnd: string
    appointmentDuration: number
    googleCalendarConnected: boolean
    outlookCalendarConnected: boolean
}

interface AppointmentsContentProps {
    targetUserId?: string
}

type AppointmentTab = "overview" | "settings" | "integrations"

function parseAppointmentDate(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
    if (!match) {
        return null
    }

    const [, yearValue, monthValue, dayValue] = match
    const year = Number(yearValue)
    const month = Number(monthValue)
    const day = Number(dayValue)
    const date = new Date(year, month - 1, day)

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null
    }

    return date
}

export function AppointmentsContent({ targetUserId }: AppointmentsContentProps) {
    const searchParams = useSearchParams()
    const { user } = useAuth()
    const { t, language } = useLanguage()
    const { toast } = useToast()
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [settings, setSettings] = useState<AppointmentSettings>({
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        workingHoursStart: '09:00',
        workingHoursEnd: '18:00',
        appointmentDuration: 30,
        googleCalendarConnected: false,
        outlookCalendarConnected: false
    })
    const [activeTab, setActiveTab] = useState<AppointmentTab>("overview")
    const [showAddModal, setShowAddModal] = useState(false)
    const [appointmentTypes, setAppointmentTypes] = useState<string[]>(["Consultation"])
    const [newTypeName, setNewTypeName] = useState("")

    const effectiveUserId = targetUserId || user?.uid

    const showTabs = Boolean(searchParams?.get("tab"))
    const highlightedAppointmentId = searchParams?.get("appointmentId")

    useEffect(() => {
        const requestedTab = searchParams?.get("tab")
        if (highlightedAppointmentId) {
            setActiveTab("overview")
        } else if (requestedTab === "overview" || requestedTab === "settings" || requestedTab === "integrations") {
            setActiveTab(requestedTab)
        } else {
            setActiveTab("overview")
        }
    }, [highlightedAppointmentId, searchParams])

    const getAuthHeaders = useCallback(async (withContentType: boolean = false): Promise<Record<string, string>> => {
        if (!user) {
            throw new Error(t('unauthorized') || "Unauthorized")
        }

        const token = await user.getIdToken()
        const headers: Record<string, string> = {
            Authorization: `Bearer ${token}`
        }
        if (withContentType) {
            headers["Content-Type"] = "application/json"
        }
        return headers
    }, [user, t])

    const fetchData = useCallback(async () => {
        if (!effectiveUserId || !user) return
        setIsLoading(true)

        try {
            // Fetch appointments via API
            const apptRes = await fetch(`/api/appointments?chatbotId=${effectiveUserId}`, {
                headers: await getAuthHeaders()
            })
            if (apptRes.ok) {
                const apptData = await apptRes.json()
                setAppointments(apptData.appointments || [])
            }

            // Fetch settings via API
            const settingsRes = await fetch(`/api/appointments/settings?chatbotId=${effectiveUserId}`, {
                headers: await getAuthHeaders()
            })
            if (settingsRes.ok) {
                const settingsData = await settingsRes.json()
                if (settingsData.settings) {
                    setSettings(prev => ({ ...prev, ...settingsData.settings }))
                    if (Array.isArray(settingsData.settings.appointmentTypes)) {
                        setAppointmentTypes(settingsData.settings.appointmentTypes)
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching data:", error)
            toast({
                title: t('error'),
                description: t('appointmentsFetchFailed'),
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }, [effectiveUserId, user, t, toast, getAuthHeaders])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    useEffect(() => {
        if (!highlightedAppointmentId || isLoading) return

        const row = document.getElementById(`appointment-row-${highlightedAppointmentId}`)
        if (row) {
            row.scrollIntoView({ behavior: "smooth", block: "center" })
        }
    }, [appointments.length, highlightedAppointmentId, isLoading])

    const updateStatus = async (id: string, newStatus: Appointment['status']) => {
        if (!user) return
        try {
            let res;

            // Should we use the approve endpoint?
            if (newStatus === 'confirmed') {
                res = await fetch(`/api/appointments/${id}/approve`, {
                    method: 'POST',
                    headers: await getAuthHeaders(true)
                });
            } else {
                // Use standard update for other statuses
                res = await fetch(`/api/appointments/${id}`, {
                    method: 'PATCH',
                    headers: await getAuthHeaders(true),
                    body: JSON.stringify({ status: newStatus })
                });
            }

            const data = await res.json();

            if (res.ok) {
                setAppointments(prev => prev.map(appt =>
                    appt.id === id ? { ...appt, status: newStatus } : appt
                ))

                // Show specific success message
                if (newStatus === 'confirmed' && data.emailSent) {
                    toast({
                        title: t('success'),
                        description: t('appointmentConfirmedEmailSent') || "Randevu onaylandı ve müşteriye e-posta gönderildi.",
                    })
                } else {
                    toast({
                        title: t('success'),
                        description: t('statusUpdated'),
                    })
                }
            } else {
                throw new Error(data.error || 'Failed to update')
            }
        } catch (error: any) {
            console.error("Error updating status:", error)
            toast({
                title: t('error'),
                description: error.message || t('statusUpdateFailed'),
                variant: "destructive"
            })
        }
    }

    const handleSaveSettings = async () => {
        if (!effectiveUserId || !user) return
        try {
            const res = await fetch('/api/appointments/settings', {
                method: 'POST',
                headers: await getAuthHeaders(true),
                body: JSON.stringify({ chatbotId: effectiveUserId, ...settings, appointmentTypes })
            })

            if (res.ok) {
                toast({
                    title: t('success'),
                    description: t('settingsSaved'),
                })
            } else {
                throw new Error('Failed to save')
            }
        } catch (error) {
            console.error("Error saving settings:", error)
            toast({
                title: t('error'),
                description: t('settingsSaveFailed'),
                variant: "destructive"
            })
        }
    }

    const handleIntegrationConnect = async (provider: 'google' | 'outlook') => {
        if (!effectiveUserId || !user) return

        try {
            // If already connected, disconnect
            if ((provider === 'google' && settings.googleCalendarConnected) ||
                (provider === 'outlook' && settings.outlookCalendarConnected)) {
                // Disconnect logic
                const res = await fetch('/api/appointments/settings', {
                    method: 'POST',
                    headers: await getAuthHeaders(true),
                    body: JSON.stringify({
                        chatbotId: effectiveUserId,
                        [provider === 'google' ? 'googleCalendarConnected' : 'outlookCalendarConnected']: false
                    })
                })
                if (res.ok) {
                    setSettings(prev => ({
                        ...prev,
                        [provider === 'google' ? 'googleCalendarConnected' : 'outlookCalendarConnected']: false
                    }))
                    toast({
                        title: t('success'),
                        description: language === 'tr' ? 'Bağlantı kaldırıldı' : 'Disconnected successfully',
                    })
                }
                return
            }

            // Get OAuth URL and redirect
            const token = await user.getIdToken()
            const authRes = await fetch(`/api/calendar/${provider}/auth?chatbotId=${effectiveUserId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            const authData = await authRes.json()

            if (authData.error) {
                toast({
                    title: t('error'),
                    description: authData.error,
                    variant: "destructive"
                })
                return
            }

            if (authData.authUrl) {
                // Redirect to OAuth consent screen
                window.location.href = authData.authUrl
            }
        } catch (error: any) {
            console.error("Integration connect error:", error)
            toast({
                title: t('error'),
                description: error.message || 'Connection failed',
                variant: "destructive"
            })
        }
    }

    const toggleDay = (day: string) => {
        setSettings((prev: AppointmentSettings) => ({
            ...prev,
            workingDays: prev.workingDays.includes(day)
                ? prev.workingDays.filter(d => d !== day)
                : [...prev.workingDays, day]
        }))
    }

    const getStatusBadge = (status: Appointment['status']) => {
        switch (status) {
            case 'confirmed':
                return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> {t('apptConfirm')}</Badge>
            case 'cancelled':
                return <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200"><XCircle className="w-3 h-3 mr-1" /> {t('apptCancel')}</Badge>
            case 'completed':
                return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200"><CheckCircle2 className="w-3 h-3 mr-1" /> {t('apptComplete')}</Badge>
            default:
                return <Badge variant="outline" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200"><Clock3 className="w-3 h-3 mr-1" /> {t('pending') || "Pending"}</Badge>
        }
    }

    const getSourceBadge = (source?: string) => {
        switch (source) {
            case 'google':
                return <Badge variant="outline" className="text-xs"><CalendarDays className="w-3 h-3 mr-1" />Google</Badge>
            case 'outlook':
                return <Badge variant="outline" className="text-xs"><Mail className="w-3 h-3 mr-1" />Outlook</Badge>
            default:
                return <Badge variant="outline" className="text-xs"><MessageSquare className="w-3 h-3 mr-1" />Chatbot</Badge>
        }
    }

    const daysMap = [
        { key: 'Mon', label: language === 'tr' ? 'Pzt' : 'Mon' },
        { key: 'Tue', label: language === 'tr' ? 'Sal' : 'Tue' },
        { key: 'Wed', label: language === 'tr' ? 'Çar' : 'Wed' },
        { key: 'Thu', label: language === 'tr' ? 'Per' : 'Thu' },
        { key: 'Fri', label: language === 'tr' ? 'Cum' : 'Fri' },
        { key: 'Sat', label: language === 'tr' ? 'Cmt' : 'Sat' },
        { key: 'Sun', label: language === 'tr' ? 'Paz' : 'Sun' },
    ]

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t('appointments')}</h2>
                    <p className="text-muted-foreground">{t('manageAppointmentsDesc')}</p>
                </div>
                <div className="flex gap-2">
                    {effectiveUserId && (
                        <Button size="sm" onClick={() => setShowAddModal(true)}>
                            <CalendarPlus className="w-4 h-4 mr-2" />
                            {language === 'tr' ? 'Manuel Randevu Ekle' : 'Add Appointment'}
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        {t('refresh') || 'Refresh'}
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AppointmentTab)} className="space-y-4">
                {showTabs && (
                    <TabsList>
                        <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
                        <TabsTrigger value="settings">{t('availabilitySettings')}</TabsTrigger>
                        <TabsTrigger value="integrations">{t('integrations')}</TabsTrigger>
                    </TabsList>
                )}

                <TabsContent value="overview" className="space-y-4">
                    <Alert className="flex items-start gap-3">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <div className="space-y-2">
                            <AlertTitle className="mb-1">{t('howItWorks') || "Nasıl Çalışır?"}</AlertTitle>
                            <AlertDescription className="text-sm">
                                {t('appointmentsHowItWorks') || "Randevular, müşteriler chatbot üzerinden rezervasyon yaptığında otomatik olarak oluşturulur. Tüm rezervasyonları buradan yönetebilirsiniz."}
                            </AlertDescription>
                        </div>
                    </Alert>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('upcomingAppointments')}</CardTitle>
                            <CardDescription>
                                {t('appointmentsFromChatbot') || "Chatbot ve senkronize takvimlerden gelen randevular"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : appointments.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>{t('noAppointmentsYet')}</p>
                                    <p className="text-sm mt-2">{t('appointmentsWillAppearHere') || "Müşteriler chatbot üzerinden randevu aldığında burada görünecek."}</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('customer')}</TableHead>
                                                <TableHead>{t('dateTime')}</TableHead>
                                                <TableHead>{t('apptType') || "Tür"}</TableHead>
                                                <TableHead>{t('source') || "Kaynak"}</TableHead>
                                                <TableHead>{t('status')}</TableHead>
                                                <TableHead className="text-right">{t('apptActions') || "İşlemler"}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {appointments.map((appt) => {
                                                const googleCalendarLink = appt.date && appt.time
                                                    ? getGoogleCalendarLink({
                                                        appointmentId: appt.id,
                                                        customerName: appt.customerName || "",
                                                        customerEmail: appt.customerEmail || "",
                                                        companyName: "",
                                                        date: appt.date,
                                                        time: appt.time,
                                                        notes: appt.notes,
                                                    })
                                                    : null
                                                const outlookCalendarLink = appt.date && appt.time
                                                    ? getOutlookCalendarLink({
                                                        appointmentId: appt.id,
                                                        customerName: appt.customerName || "",
                                                        customerEmail: appt.customerEmail || "",
                                                        companyName: "",
                                                        date: appt.date,
                                                        time: appt.time,
                                                        notes: appt.notes,
                                                    })
                                                    : null
                                                const hasCalendarLink = Boolean(googleCalendarLink || outlookCalendarLink)

                                                const appointmentDate = appt.date
                                                    ? parseAppointmentDate(appt.date)
                                                    : null

                                                return (
                                                    <TableRow
                                                        key={appt.id}
                                                        id={`appointment-row-${appt.id}`}
                                                        className={cn(highlightedAppointmentId === appt.id && "bg-primary/5")}
                                                    >
                                                        <TableCell>
                                                            <div>
                                                                <div className="font-medium">{appt.customerName}</div>
                                                                {appt.customerEmail && (
                                                                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                                                                        <Mail className="w-3 h-3" />{appt.customerEmail}
                                                                    </div>
                                                                )}
                                                                {appt.customerPhone && (
                                                                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                                                                        <Phone className="w-3 h-3" />{appt.customerPhone}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                                                {appointmentDate
                                                                    ? format(appointmentDate, 'dd MMMM yyyy', { locale: language === 'tr' ? tr : enUS })
                                                                    : appt.date}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                <Clock className="w-3 h-3" />
                                                                {appt.time}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{appt.type}</TableCell>
                                                        <TableCell>{getSourceBadge(appt.source)}</TableCell>
                                                        <TableCell>{getStatusBadge(appt.status)}</TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2 flex-wrap">
                                                                {appt.status === 'pending' && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                        onClick={() => updateStatus(appt.id, 'confirmed')}
                                                                    >
                                                                        {t('apptConfirm')}
                                                                    </Button>
                                                                )}
                                                                {appt.status === 'confirmed' && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                        onClick={() => updateStatus(appt.id, 'completed')}
                                                                    >
                                                                        {t('apptComplete')}
                                                                    </Button>
                                                                )}
                                                                {(appt.status === 'confirmed' || appt.status === 'pending') && hasCalendarLink && (
                                                                    <div className="relative group">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="text-gray-600 gap-1"
                                                                            title="Takvime Ekle"
                                                                        >
                                                                            <Calendar className="w-3 h-3" />
                                                                            <ExternalLink className="w-3 h-3" />
                                                                        </Button>
                                                                        <div className="absolute right-0 top-8 z-10 hidden group-hover:flex flex-col bg-white border border-gray-200 rounded-lg shadow-lg min-w-[160px] py-1 text-sm">
                                                                            {googleCalendarLink && (
                                                                                <a
                                                                                    href={googleCalendarLink}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                                                                                >
                                                                                    📅 Google Calendar
                                                                                </a>
                                                                            )}
                                                                            {outlookCalendarLink && (
                                                                                <a
                                                                                    href={outlookCalendarLink}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                                                                                >
                                                                                    📅 Outlook
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                                        onClick={() => updateStatus(appt.id, 'cancelled')}
                                                                    >
                                                                        {t('apptCancel')}
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('availabilitySettings')}</CardTitle>
                            <CardDescription>
                                {t('availabilitySettingsDesc') || "Müşterilerin chatbot üzerinden randevu alabileceği zamanları ayarlayın."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium">{t('workingDays')}</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {daysMap.map(day => (
                                        <div key={day.key} className="flex items-center space-x-2 border p-3 rounded-lg">
                                            <Switch
                                                id={`day-${day.key}`}
                                                checked={settings.workingDays.includes(day.key)}
                                                onCheckedChange={() => toggleDay(day.key)}
                                            />
                                            <Label htmlFor={`day-${day.key}`}>{day.label}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-medium">{t('workingHours') || "Çalışma Saatleri"}</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>{t('workingHoursStart')}</Label>
                                        <Input
                                            type="time"
                                            value={settings.workingHoursStart}
                                            onChange={(e) => setSettings({ ...settings, workingHoursStart: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('workingHoursEnd')}</Label>
                                        <Input
                                            type="time"
                                            value={settings.workingHoursEnd}
                                            onChange={(e) => setSettings({ ...settings, workingHoursEnd: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>{t('appointmentDuration')}</Label>
                                <Input
                                    type="number"
                                    value={settings.appointmentDuration}
                                    onChange={(e) => setSettings({ ...settings, appointmentDuration: parseInt(e.target.value) })}
                                />
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-medium">
                                    {language === 'tr' ? 'Randevu Türleri' : 'Appointment Types'}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    {language === 'tr'
                                        ? 'Müşterilerin chatbot üzerinden seçebileceği randevu türleri.'
                                        : 'Appointment types customers can choose when booking via chatbot.'}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {appointmentTypes.map((type) => (
                                        <div
                                            key={type}
                                            className="flex items-center gap-1 px-2.5 py-1 rounded-full border text-sm bg-background"
                                        >
                                            <span>{type}</span>
                                            <button
                                                type="button"
                                                onClick={() => setAppointmentTypes(prev => prev.filter(t => t !== type))}
                                                className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        value={newTypeName}
                                        onChange={(e) => setNewTypeName(e.target.value)}
                                        placeholder={language === 'tr' ? 'Yeni tür adı...' : 'New type name...'}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                const trimmed = newTypeName.trim()
                                                if (trimmed && !appointmentTypes.includes(trimmed)) {
                                                    setAppointmentTypes(prev => [...prev, trimmed])
                                                    setNewTypeName("")
                                                }
                                            }
                                        }}
                                        className="max-w-xs"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const trimmed = newTypeName.trim()
                                            if (trimmed && !appointmentTypes.includes(trimmed)) {
                                                setAppointmentTypes(prev => [...prev, trimmed])
                                                setNewTypeName("")
                                            }
                                        }}
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        {language === 'tr' ? 'Ekle' : 'Add'}
                                    </Button>
                                </div>
                            </div>

                            <div className="pt-4">
                                <Button onClick={handleSaveSettings}>{t('saveSettings') || "Ayarları Kaydet"}</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="integrations" className="space-y-4">
                    {/* Integration Guide */}
                    <Alert className="flex items-start gap-3">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <div className="space-y-2">
                            <AlertTitle className="mb-1">{language === 'tr' ? 'Takvim Entegrasyonu Rehberi' : 'Calendar Integration Guide'}</AlertTitle>
                            <AlertDescription className="space-y-2 text-sm">
                                <p>{language === 'tr'
                                    ? 'Takviminizi bağlayarak müşterilerinizin sadece müsait olduğunuz zamanlarda randevu almasını sağlayabilirsiniz.'
                                    : 'Connect your calendar to ensure customers can only book appointments when you are available.'}</p>
                                <div className="mt-2 p-3 bg-muted/50 rounded-md space-y-1">
                                    <p className="font-medium">{language === 'tr' ? 'Kurulum Adımları:' : 'Setup Steps:'}</p>
                                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                                        <li>{language === 'tr'
                                            ? 'Google Cloud Console veya Azure Portal\'dan OAuth uygulama oluşturun'
                                            : 'Create an OAuth app in Google Cloud Console or Azure Portal'}</li>
                                        <li>{language === 'tr'
                                            ? 'Client ID ve Client Secret değerlerini ortam değişkenlerine ekleyin'
                                            : 'Add Client ID and Client Secret to environment variables'}</li>
                                        <li>{language === 'tr'
                                            ? '"Takvim Bağla" butonuna tıklayarak yetkilendirmeyi tamamlayın'
                                            : 'Click "Connect Calendar" to complete authorization'}</li>
                                    </ol>
                                </div>
                            </AlertDescription>
                        </div>
                    </Alert>

                    <div className="grid md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-lg font-medium">Google Calendar</CardTitle>
                                {settings.googleCalendarConnected ? (
                                    <Badge className="bg-green-100 text-green-700">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />{language === 'tr' ? 'Bağlı' : 'Connected'}
                                    </Badge>
                                ) : (
                                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                )}
                            </CardHeader>
                            <CardContent className="pt-4">
                                <p className="text-sm text-muted-foreground mb-4">
                                    {t('googleCalendarDesc')}
                                </p>
                                <div className="space-y-3">
                                    <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded font-mono">
                                        GOOGLE_CLIENT_ID=your_client_id<br />
                                        GOOGLE_CLIENT_SECRET=your_secret
                                    </div>
                                    <Button
                                        variant={settings.googleCalendarConnected ? "destructive" : "outline"}
                                        className="w-full"
                                        onClick={() => handleIntegrationConnect('google')}
                                    >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        {settings.googleCalendarConnected
                                            ? (language === 'tr' ? 'Bağlantıyı Kes' : 'Disconnect')
                                            : t('connectGoogle')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-lg font-medium">Outlook Calendar</CardTitle>
                                {settings.outlookCalendarConnected ? (
                                    <Badge className="bg-green-100 text-green-700">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />{language === 'tr' ? 'Bağlı' : 'Connected'}
                                    </Badge>
                                ) : (
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                )}
                            </CardHeader>
                            <CardContent className="pt-4">
                                <p className="text-sm text-muted-foreground mb-4">
                                    {t('outlookCalendarDesc')}
                                </p>
                                <div className="space-y-3">
                                    <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded font-mono">
                                        OUTLOOK_CLIENT_ID=your_client_id<br />
                                        OUTLOOK_CLIENT_SECRET=your_secret
                                    </div>
                                    <Button
                                        variant={settings.outlookCalendarConnected ? "destructive" : "outline"}
                                        className="w-full"
                                        onClick={() => handleIntegrationConnect('outlook')}
                                    >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        {settings.outlookCalendarConnected
                                            ? (language === 'tr' ? 'Bağlantıyı Kes' : 'Disconnect')
                                            : t('connectOutlook')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {effectiveUserId && (
                <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <CalendarPlus className="h-5 w-5" />
                                {language === 'tr' ? 'Manuel Randevu Ekle' : 'Add Appointment'}
                            </DialogTitle>
                        </DialogHeader>
                        <ManualAppointmentForm
                            chatbotId={effectiveUserId}
                            getAuthHeaders={getAuthHeaders}
                            onCreated={async () => {
                                setShowAddModal(false)
                                await fetchData()
                            }}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}
