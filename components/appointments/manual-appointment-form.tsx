"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

import { AppointmentSlotPicker } from "@/components/appointments/appointment-slot-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"

interface ManualAppointmentFormProps {
    chatbotId: string
    getAuthHeaders: (withContentType?: boolean) => Promise<Record<string, string>>
    onCreated?: () => Promise<void> | void
}

interface ManualAppointmentFormState {
    customerName: string
    customerEmail: string
    customerPhone: string
    date: string
    time: string
    type: string
    status: "pending" | "confirmed"
    notes: string
}

const INITIAL_STATE: ManualAppointmentFormState = {
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    date: "",
    time: "",
    type: "Consultation",
    status: "confirmed",
    notes: "",
}

export function ManualAppointmentForm({
    chatbotId,
    getAuthHeaders,
    onCreated,
}: ManualAppointmentFormProps) {
    const { language } = useLanguage()
    const { toast } = useToast()
    const [form, setForm] = useState<ManualAppointmentFormState>(INITIAL_STATE)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const copy = language === "tr"
        ? {
            title: "Manuel Randevu Ekle",
            description: "Panelden yeni bir randevu oluşturun. Takvim sadece musait gun ve saatleri gosterir.",
            name: "Musteri Adi",
            email: "E-posta",
            phone: "Telefon",
            type: "Randevu Tipi",
            status: "Durum",
            notes: "Notlar",
            contactHint: "E-posta veya telefon alanlarindan en az birini doldurun.",
            create: "Randevu Kaydet",
            creating: "Kaydediliyor...",
            date: "Tarih",
            time: "Saat",
            success: "Randevu olusturuldu.",
            error: "Randevu olusturulamadi.",
            notesPlaceholder: "Ic notlar veya gorusme detaylari",
            typePlaceholder: "Ornek: Muayene, Demo, Konsultasyon",
            pending: "Beklemede",
            confirmed: "Onayli",
            dateTimeRequired: "Lutfen tarih ve saat secin.",
            contactRequired: "E-posta veya telefon gerekli.",
        }
        : {
            title: "Create Appointment",
            description: "Create a new appointment from the panel. The picker only shows open days and times.",
            name: "Customer Name",
            email: "Email",
            phone: "Phone",
            type: "Appointment Type",
            status: "Status",
            notes: "Notes",
            contactHint: "Fill at least one of the email or phone fields.",
            create: "Save Appointment",
            creating: "Saving...",
            date: "Date",
            time: "Time",
            success: "Appointment created.",
            error: "Failed to create appointment.",
            notesPlaceholder: "Internal notes or context",
            typePlaceholder: "Example: Consultation, Demo, Meeting",
            pending: "Pending",
            confirmed: "Confirmed",
            dateTimeRequired: "Please select a date and time.",
            contactRequired: "Email or phone is required.",
        }

    const setField = (key: keyof ManualAppointmentFormState, value: string) => {
        setForm((current) => ({ ...current, [key]: value }))
    }

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()

        if (!form.date || !form.time) {
            toast({
                title: copy.error,
                description: copy.dateTimeRequired,
                variant: "destructive",
            })
            return
        }

        if (!form.customerEmail.trim() && !form.customerPhone.trim()) {
            toast({
                title: copy.error,
                description: copy.contactRequired,
                variant: "destructive",
            })
            return
        }

        setIsSubmitting(true)

        try {
            const response = await fetch("/api/appointments", {
                method: "POST",
                headers: await getAuthHeaders(true),
                body: JSON.stringify({
                    chatbotId,
                    customerName: form.customerName,
                    customerEmail: form.customerEmail,
                    customerPhone: form.customerPhone,
                    date: form.date,
                    time: form.time,
                    type: form.type,
                    status: form.status,
                    notes: form.notes,
                    source: "manual",
                }),
            })

            const payload = await response.json()
            if (!response.ok) {
                throw new Error(payload.error || copy.error)
            }

            toast({
                title: copy.success,
                description: `${form.date} ${form.time}`,
            })

            setForm((current) => ({
                ...INITIAL_STATE,
                type: current.type || INITIAL_STATE.type,
                status: current.status,
            }))
            await onCreated?.()
        } catch (submitError: any) {
            toast({
                title: copy.error,
                description: submitError?.message || copy.error,
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="manual-appointment-name">{copy.name}</Label>
                    <Input
                        id="manual-appointment-name"
                        value={form.customerName}
                        onChange={(event) => setField("customerName", event.target.value)}
                        placeholder={copy.name}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="manual-appointment-type">{copy.type}</Label>
                    <Input
                        id="manual-appointment-type"
                        value={form.type}
                        onChange={(event) => setField("type", event.target.value)}
                        placeholder={copy.typePlaceholder}
                    />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="manual-appointment-email">{copy.email}</Label>
                    <Input
                        id="manual-appointment-email"
                        type="email"
                        value={form.customerEmail}
                        onChange={(event) => setField("customerEmail", event.target.value)}
                        placeholder="ornek@firma.com"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="manual-appointment-phone">{copy.phone}</Label>
                    <Input
                        id="manual-appointment-phone"
                        value={form.customerPhone}
                        onChange={(event) => setField("customerPhone", event.target.value)}
                        placeholder="+90 5xx xxx xx xx"
                    />
                </div>
            </div>

            <p className="text-xs text-muted-foreground">{copy.contactHint}</p>

            <AppointmentSlotPicker
                chatbotId={chatbotId}
                date={form.date}
                time={form.time}
                onDateChange={(value) => setField("date", value)}
                onTimeChange={(value) => setField("time", value)}
                dateLabel={copy.date}
                timeLabel={copy.time}
            />

            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="manual-appointment-status">{copy.status}</Label>
                    <select
                        id="manual-appointment-status"
                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        value={form.status}
                        onChange={(event) => setField("status", event.target.value as "pending" | "confirmed")}
                    >
                        <option value="confirmed">{copy.confirmed}</option>
                        <option value="pending">{copy.pending}</option>
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="manual-appointment-notes">{copy.notes}</Label>
                <Textarea
                    id="manual-appointment-notes"
                    rows={3}
                    value={form.notes}
                    onChange={(event) => setField("notes", event.target.value)}
                    placeholder={copy.notesPlaceholder}
                />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? copy.creating : copy.create}
            </Button>
        </form>
    )
}
