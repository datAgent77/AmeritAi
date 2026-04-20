"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CalendarDays, CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/context/AuthContext"
import { useOmniAccount } from "@/context/OmniAccountContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { formatOmniDateTime, getOmniChannelLabel, getOmniEnumLabel } from "@/lib/omni/i18n"
import type { AppointmentStatus, OmniAppointmentRecord, OmniAppointmentSettings, OmniChannel, OmniTeamMember } from "@/lib/omni/types"

const STATUS_OPTIONS: AppointmentStatus[] = ["pending", "confirmed", "completed", "cancelled"]
const CHANNEL_OPTIONS: OmniChannel[] = ["web", "whatsapp", "instagram", "voice"]
const DEFAULT_SETTINGS: OmniAppointmentSettings = {
    workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    workingHoursStart: "09:00",
    workingHoursEnd: "18:00",
    appointmentDuration: 30,
    googleCalendarConnected: false,
    outlookCalendarConnected: false,
}

function buildDefaultDate() {
    const next = new Date()
    next.setDate(next.getDate() + 1)
    return next.toISOString().split("T")[0]
}

function createEmptyForm(chatbotId: string, params?: { contactKey?: string | null; sourceSessionId?: string | null; canonicalContactId?: string | null }): OmniAppointmentRecord {
    return {
        chatbotId,
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        date: buildDefaultDate(),
        time: "10:00",
        type: "Consultation",
        status: "pending",
        source: "manual",
        sourceChannel: "web",
        sourceSessionId: params?.sourceSessionId || null,
        sessionId: params?.sourceSessionId || null,
        contactKey: params?.contactKey || "",
        canonicalContactId: params?.canonicalContactId || null,
        assignedTo: "",
        notes: "",
    }
}

function formatDateTime(date: string | null | undefined, time: string | null | undefined, language: string) {
    if (!date || !time) return language === "tr" ? "Slot yok" : "No slot"
    const parsed = new Date(`${date}T${time}:00`)
    if (Number.isNaN(parsed.getTime())) {
        return `${date} ${time}`
    }
    return formatOmniDateTime(parsed, language as any)
}

function formatWorkingDays(days: string[]) {
    const labels: Record<string, string> = {
        Mon: "Mon",
        Tue: "Tue",
        Wed: "Wed",
        Thu: "Thu",
        Fri: "Fri",
        Sat: "Sat",
        Sun: "Sun",
    }

    return days.map((day) => labels[day] || day).join(", ")
}

function statusVariant(status: AppointmentStatus) {
    if (status === "confirmed") return "bg-emerald-600 text-white hover:bg-emerald-600"
    if (status === "completed") return "bg-slate-900 text-white hover:bg-slate-900"
    if (status === "cancelled") return "bg-rose-600 text-white hover:bg-rose-600"
    return "bg-amber-500 text-black hover:bg-amber-500"
}

export function OmniAppointmentsPanel() {
    const { user } = useAuth()
    const { activeAccountId: chatbotId } = useOmniAccount()
    const { language, t } = useLanguage()
    const { toast } = useToast()
    const searchParams = useSearchParams()
    const [appointments, setAppointments] = useState<OmniAppointmentRecord[]>([])
    const [settings, setSettings] = useState<OmniAppointmentSettings>(DEFAULT_SETTINGS)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [form, setForm] = useState<OmniAppointmentRecord>(createEmptyForm(""))
    const [searchTerm, setSearchTerm] = useState("")
    const [teamMembers, setTeamMembers] = useState<OmniTeamMember[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isConfirming, setIsConfirming] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const queryAppointmentId = searchParams.get("appointmentId")
    const querySessionId = searchParams.get("sessionId")
    const queryContactId = searchParams.get("contactId")
    const queryContactKey = searchParams.get("contactKey")
    const queryName = searchParams.get("name")
    const queryEmail = searchParams.get("email")
    const queryPhone = searchParams.get("phone")

    const loadData = async () => {
        if (!user) return

        setIsLoading(true)
        try {
            const token = await user.getIdToken()
            const headers = { Authorization: `Bearer ${token}` }
            const [appointmentsResponse, settingsResponse] = await Promise.all([
                fetch(`/api/omni/appointments?chatbotId=${chatbotId || user.uid}`, { headers }),
                fetch(`/api/omni/appointments/settings?chatbotId=${chatbotId || user.uid}`, { headers }),
            ])

            if (!appointmentsResponse.ok) {
                throw new Error("Failed to load appointments")
            }

            const appointmentsData = await appointmentsResponse.json()
            const settingsData = settingsResponse.ok ? await settingsResponse.json() : { settings: DEFAULT_SETTINGS }

            const nextAppointments = (appointmentsData.appointments || []) as OmniAppointmentRecord[]
            setAppointments(nextAppointments)
            setSettings(settingsData.settings || DEFAULT_SETTINGS)

            const selected =
                nextAppointments.find((appointment) => appointment.id === queryAppointmentId) ||
                nextAppointments.find((appointment) => appointment.sourceSessionId === querySessionId || appointment.sessionId === querySessionId) ||
                nextAppointments.find((appointment) => appointment.canonicalContactId === queryContactId) ||
                nextAppointments.find((appointment) => appointment.contactKey === queryContactKey) ||
                nextAppointments.find((appointment) => appointment.id === selectedId) ||
                null

            if (selected) {
                setSelectedId(selected.id || null)
                setForm({ ...selected, chatbotId: chatbotId || user.uid })
            } else {
                setSelectedId(null)
                setForm({
                    ...createEmptyForm(chatbotId || user.uid, { contactKey: queryContactKey, sourceSessionId: querySessionId, canonicalContactId: queryContactId }),
                    customerName: queryName || "",
                    customerEmail: queryEmail || "",
                    customerPhone: queryPhone || "",
                })
            }
        } catch (error) {
            console.error("Failed to load appointments", error)
            toast({
                title: t("omni.appointments.toast.loadFailed.title"),
                description: t("omni.appointments.toast.loadFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadData()
        loadAssignees()
    }, [user, queryAppointmentId, querySessionId, queryContactId, queryContactKey])

    const loadAssignees = async () => {
        if (!user) return

        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/settings?chatbotId=${chatbotId || user.uid}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                throw new Error("Failed to load assignment settings")
            }

            const data = await response.json()
            setTeamMembers(Array.isArray(data.assigneeOptions) ? data.assigneeOptions : [])
        } catch (error) {
            console.error("Failed to load appointment assignees", error)
        }
    }

    const filteredAppointments = useMemo(() => {
        return appointments.filter((appointment) => {
            const haystack = [
                appointment.customerName,
                appointment.customerEmail,
                appointment.customerPhone,
                appointment.contactKey,
                appointment.canonicalContactId,
                appointment.assignedTo,
                appointment.date,
                appointment.time,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()

            return haystack.includes(searchTerm.toLowerCase())
        })
    }, [appointments, searchTerm])

    const counts = useMemo(() => {
        return appointments.reduce(
            (accumulator, appointment) => {
                accumulator.total += 1
                accumulator[appointment.status] += 1
                return accumulator
            },
            {
                total: 0,
                pending: 0,
                confirmed: 0,
                completed: 0,
                cancelled: 0,
            }
        )
    }, [appointments])

    const assigneeSuggestions = useMemo(
        () => teamMembers.map((member) => member.email ? `${member.name} (${member.email})` : member.name),
        [teamMembers]
    )

    const startNewAppointment = () => {
        if (!user) return
        setSelectedId(null)
        setForm({
            ...createEmptyForm(chatbotId || user.uid, { contactKey: queryContactKey, sourceSessionId: querySessionId, canonicalContactId: queryContactId }),
            customerName: queryName || "",
            customerEmail: queryEmail || "",
            customerPhone: queryPhone || "",
        })
    }

    const selectAppointment = (appointment: OmniAppointmentRecord) => {
        if (!user) return
        setSelectedId(appointment.id || null)
        setForm({ ...appointment, chatbotId: chatbotId || user.uid })
    }

    const handleSave = async () => {
        if (!user) return

        setIsSaving(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch(selectedId ? `/api/omni/appointments/${selectedId}` : "/api/omni/appointments", {
                method: selectedId ? "PATCH" : "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...form,
                    chatbotId: chatbotId || user.uid,
                    sessionId: form.sourceSessionId || form.sessionId || null,
                    sourceSessionId: form.sourceSessionId || form.sessionId || null,
                    canonicalContactId: form.canonicalContactId || null,
                }),
            })

            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.error || "Failed to save appointment")
            }

            toast({
                title: selectedId ? t("omni.appointments.toast.updated.title") : t("omni.appointments.toast.created.title"),
                description: selectedId ? t("omni.appointments.toast.updated.description") : t("omni.appointments.toast.created.description"),
            })

            await loadData()
        } catch (error) {
            toast({
                title: t("omni.appointments.toast.saveFailed.title"),
                description: error instanceof Error ? error.message : t("omni.appointments.toast.saveFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleConfirm = async () => {
        if (!user || !selectedId) return

        setIsConfirming(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/appointments/${selectedId}/confirm`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ chatbotId: chatbotId || user.uid }),
            })

            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.error || "Failed to confirm appointment")
            }

            toast({
                title: t("omni.appointments.toast.confirmed.title"),
                description: data?.emailSent ? t("omni.appointments.toast.confirmed.emailSent") : t("omni.appointments.toast.confirmed.description"),
            })
            await loadData()
        } catch (error) {
            toast({
                title: t("omni.appointments.toast.confirmFailed.title"),
                description: error instanceof Error ? error.message : t("omni.appointments.toast.confirmFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsConfirming(false)
        }
    }

    const handleDelete = async () => {
        if (!user || !selectedId) return

        setIsDeleting(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/appointments/${selectedId}?chatbotId=${encodeURIComponent(chatbotId || user.uid)}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.error || "Failed to delete appointment")
            }

            toast({
                title: t("omni.appointments.toast.deleted.title"),
                description: t("omni.appointments.toast.deleted.description"),
            })
            setSelectedId(null)
            setForm({
                ...createEmptyForm(chatbotId || user.uid, { contactKey: queryContactKey, sourceSessionId: querySessionId, canonicalContactId: queryContactId }),
                customerName: queryName || "",
                customerEmail: queryEmail || "",
                customerPhone: queryPhone || "",
            })
            await loadData()
        } catch (error) {
            toast({
                title: t("omni.appointments.toast.deleteFailed.title"),
                description: error instanceof Error ? error.message : t("omni.appointments.toast.deleteFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsDeleting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center rounded-lg border bg-white p-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-4">
                <Card>
                    <CardHeader>
                        <CardDescription>{t("omni.appointments.metric.total")}</CardDescription>
                        <CardTitle className="text-2xl">{counts.total}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        {t("omni.appointments.metric.totalBreakdown")
                            .replace("{pending}", String(counts.pending))
                            .replace("{confirmed}", String(counts.confirmed))}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>{t("omni.appointments.metric.workingWindow")}</CardDescription>
                        <CardTitle className="text-2xl">
                            {settings.workingHoursStart} - {settings.workingHoursEnd}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">{formatWorkingDays(settings.workingDays)}</CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>{t("omni.appointments.metric.calendarSync")}</CardDescription>
                        <CardTitle className="text-2xl">
                            {settings.googleCalendarConnected || settings.outlookCalendarConnected
                                ? t("omni.appointments.metric.connected")
                                : t("omni.appointments.metric.manual")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        {t("omni.appointments.metric.calendarSources")
                            .replace("{google}", settings.googleCalendarConnected ? t("omni.common.enabled") : t("omni.common.disabled"))
                            .replace("{outlook}", settings.outlookCalendarConnected ? t("omni.common.enabled") : t("omni.common.disabled"))}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>{t("omni.appointments.metric.legacy")}</CardDescription>
                        <CardTitle className="text-2xl">{t("omni.appointments.metric.compatibility")}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/console/appointments">{t("omni.appointments.openLegacy")}</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{t("omni.appointments.title")}</CardTitle>
                    <CardDescription>
                        {t("omni.appointments.description")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <Badge className="bg-black text-white hover:bg-black">
                        {`${counts.pending} ${getOmniEnumLabel(t, "appointmentStatus", "pending").toLowerCase()}`}
                    </Badge>
                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                        {`${counts.confirmed} ${getOmniEnumLabel(t, "appointmentStatus", "confirmed").toLowerCase()}`}
                    </Badge>
                    <Badge className="bg-slate-900 text-white hover:bg-slate-900">
                        {`${counts.completed} ${getOmniEnumLabel(t, "appointmentStatus", "completed").toLowerCase()}`}
                    </Badge>
                    <Badge className="bg-rose-600 text-white hover:bg-rose-600">
                        {`${counts.cancelled} ${getOmniEnumLabel(t, "appointmentStatus", "cancelled").toLowerCase()}`}
                    </Badge>
                </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-[1.1fr_1.4fr]">
                <Card>
                    <CardHeader className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-lg">{t("omni.appointments.queue.title")}</CardTitle>
                                <CardDescription>{t("omni.appointments.queue.description")}</CardDescription>
                            </div>
                            <Button variant="outline" onClick={startNewAppointment}>
                                <Plus className="mr-2 h-4 w-4" />
                                {t("omni.appointments.action.new")}
                            </Button>
                        </div>
                        <Input
                            placeholder={t("omni.appointments.searchPlaceholder")}
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {filteredAppointments.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                                {t("omni.appointments.empty")}
                            </div>
                        ) : (
                            filteredAppointments.map((appointment) => (
                                <button
                                    key={appointment.id}
                                    type="button"
                                    onClick={() => selectAppointment(appointment)}
                                    className={`w-full rounded-lg border p-4 text-left transition ${
                                        appointment.id === selectedId ? "border-black bg-black/5" : "hover:border-black/40"
                                    }`}
                                >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="space-y-1">
                                                <div className="font-medium text-foreground">{appointment.customerName || t("omni.appointments.anonymous")}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {appointment.customerEmail || appointment.customerPhone || appointment.contactKey || t("omni.appointments.noContact")}
                                                </div>
                                            </div>
                                            <Badge className={statusVariant(appointment.status)}>
                                                {getOmniEnumLabel(t, "appointmentStatus", appointment.status)}
                                            </Badge>
                                        </div>
                                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                        <CalendarDays className="h-4 w-4" />
                                        <span>{formatDateTime(appointment.date, appointment.time, language)}</span>
                                        <span>·</span>
                                        <span>{appointment.sourceChannel ? getOmniChannelLabel(t, appointment.sourceChannel) : appointment.source || t("omni.common.notAvailable")}</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-lg">{selectedId ? t("omni.appointments.detailTitle") : t("omni.appointments.newTitle")}</CardTitle>
                                <CardDescription>
                                    {selectedId ? t("omni.appointments.detailDescription") : t("omni.appointments.newDescription")}
                                </CardDescription>
                            </div>
                            {selectedId ? (
                                <Badge className={statusVariant(form.status)}>{getOmniEnumLabel(t, "appointmentStatus", form.status)}</Badge>
                            ) : null}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="appointment-name">{t("omni.appointments.field.customerName")}</Label>
                                <Input
                                    id="appointment-name"
                                    value={form.customerName}
                                    onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="appointment-assigned">{t("omni.common.assignedTo")}</Label>
                                <Input
                                    id="appointment-assigned"
                                    list="appointment-owner-options"
                                    value={form.assignedTo || ""}
                                    onChange={(event) => setForm((current) => ({ ...current, assignedTo: event.target.value }))}
                                />
                                <datalist id="appointment-owner-options">
                                    {assigneeSuggestions.map((option) => (
                                        <option key={option} value={option} />
                                    ))}
                                </datalist>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="appointment-email">{t("email")}</Label>
                                <Input
                                    id="appointment-email"
                                    type="email"
                                    value={form.customerEmail}
                                    onChange={(event) => setForm((current) => ({ ...current, customerEmail: event.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="appointment-phone">{t("omni.appointments.field.phone")}</Label>
                                <Input
                                    id="appointment-phone"
                                    value={form.customerPhone}
                                    onChange={(event) => setForm((current) => ({ ...current, customerPhone: event.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="appointment-date">{t("date") || "Date"}</Label>
                                <Input
                                    id="appointment-date"
                                    type="date"
                                    value={form.date}
                                    onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="appointment-time">{t("time")}</Label>
                                <Input
                                    id="appointment-time"
                                    type="time"
                                    value={form.time}
                                    onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="appointment-type">{t("appointmentType")}</Label>
                                <Input
                                    id="appointment-type"
                                    value={form.type || ""}
                                    onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="appointment-status">{t("omni.common.status")}</Label>
                                <select
                                    id="appointment-status"
                                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                    value={form.status}
                                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as AppointmentStatus }))}
                                >
                                    {STATUS_OPTIONS.map((status) => (
                                        <option key={status} value={status}>
                                            {getOmniEnumLabel(t, "appointmentStatus", status)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="appointment-channel">{t("omni.common.sourceChannel")}</Label>
                                <select
                                    id="appointment-channel"
                                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                    value={form.sourceChannel || "web"}
                                    onChange={(event) => setForm((current) => ({ ...current, sourceChannel: event.target.value as OmniChannel }))}
                                >
                                    {CHANNEL_OPTIONS.map((channel) => (
                                        <option key={channel} value={channel}>
                                            {getOmniChannelLabel(t, channel)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="appointment-canonical-contact">Canonical contact ID</Label>
                                <Input id="appointment-canonical-contact" value={form.canonicalContactId || ""} readOnly />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="appointment-contact-key">{t("omni.common.contactKey")}</Label>
                                <Input
                                    id="appointment-contact-key"
                                    value={form.contactKey || ""}
                                    onChange={(event) => setForm((current) => ({ ...current, contactKey: event.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="appointment-session">{t("omni.common.sourceSession")}</Label>
                                <Input
                                    id="appointment-session"
                                    value={form.sourceSessionId || form.sessionId || ""}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            sourceSessionId: event.target.value,
                                            sessionId: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="appointment-notes">{t("notes")}</Label>
                            <Textarea
                                id="appointment-notes"
                                rows={6}
                                value={form.notes || ""}
                                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                            />
                        </div>

                        {selectedId ? (
                            <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                                <div className="font-medium text-foreground">{formatDateTime(form.date, form.time, language)}</div>
                                <div className="mt-1">
                                    {t("omni.appointments.summary")
                                        .replace("{channel}", getOmniChannelLabel(t, form.sourceChannel || "web"))
                                        .replace("{contact}", form.contactKey || form.customerEmail || form.customerPhone || t("omni.common.notAvailable"))}
                                </div>
                            </div>
                        ) : null}

                        <div className="flex flex-wrap justify-between gap-3">
                            <div className="flex flex-wrap gap-3">
                                <Button variant="outline" onClick={startNewAppointment}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    {t("omni.appointments.action.reset")}
                                </Button>
                                {selectedId ? (
                                    <Button variant="outline" onClick={handleConfirm} disabled={isConfirming}>
                                        {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                        {t("omni.appointments.action.confirm")}
                                    </Button>
                                ) : null}
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {selectedId ? (
                                    <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                        {t("omni.appointments.action.delete")}
                                    </Button>
                                ) : null}
                                <Button onClick={handleSave} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {selectedId ? t("omni.appointments.action.saveChanges") : t("omni.appointments.action.create")}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
