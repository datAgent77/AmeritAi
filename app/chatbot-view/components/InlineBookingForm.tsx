"use client"

import { useState } from "react"
import { CheckCircle, AlertCircle } from "lucide-react"
import { ChatbotSettings } from "@/types/chatbot"
import { AppointmentSlotPicker } from "@/components/appointments/appointment-slot-picker"


interface InlineBookingFormProps {
    chatbotId: string
    sessionId?: string | null
    settings: ChatbotSettings
    t: (key: string) => string
    onSuccess?: (appointmentId: string) => void
}

interface BookingFormData {
    type: string
    date: string
    time: string
    notes: string
    // Contact fields are always shown and prefilled from collected lead data when available.
    name: string
    email: string
    phone: string
}

export function InlineBookingForm({ chatbotId, sessionId, settings, t, onSuccess }: InlineBookingFormProps) {
    // Try to get pre-collected lead data from localStorage
    const getLeadData = () => {
        if (typeof window === "undefined") return null
        try {
            const raw = localStorage.getItem(`lead_${chatbotId}`)
            return raw ? JSON.parse(raw) : null
        } catch {
            return null
        }
    }

    const leadData = getLeadData()

    const [appointmentTypes, setAppointmentTypes] = useState<string[]>(
        settings.appointmentTypes && settings.appointmentTypes.length > 0
            ? settings.appointmentTypes
            : []
    )

    const [form, setForm] = useState<BookingFormData>({
        type: settings.appointmentTypes?.[0] || "",
        date: "",
        time: "",
        notes: "",
        name: leadData?.name || "",
        email: leadData?.email || "",
        phone: leadData?.phone || "",
    })

    const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle")
    const [errorMsg, setErrorMsg] = useState("")
    const [, setAppointmentId] = useState("")

    const set = (key: keyof BookingFormData, value: string) =>
        setForm((prev) => ({ ...prev, [key]: value }))

    const persistContactDraft = (name: string, email: string, phone: string) => {
        if (typeof window === "undefined") return

        try {
            const storedLead = getLeadData() || {}
            localStorage.setItem(`lead_${chatbotId}`, JSON.stringify({
                ...storedLead,
                name,
                email,
                phone,
            }))
        } catch {
            // Ignore draft persistence failures in the widget form.
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const trimmedName = form.name.trim()
        const trimmedEmail = form.email.trim()
        const trimmedPhone = form.phone.trim()
        const phoneDigits = trimmedPhone.replace(/\D/g, "")
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        const phoneRegex = /^[\d\s+\-()]+$/

        if (!form.date || !form.time) {
            setErrorMsg("Lutfen tarih ve saat secin.")
            setStatus("error")
            return
        }

        if (!trimmedName) {
            setErrorMsg(t("nameRequired") === "nameRequired" ? "Ad Soyad gereklidir" : t("nameRequired"))
            setStatus("error")
            return
        }

        if (!trimmedEmail && !trimmedPhone) {
            setErrorMsg(t("contactRequired") === "contactRequired" ? "E-posta veya telefon gereklidir" : t("contactRequired"))
            setStatus("error")
            return
        }

        if (trimmedEmail && !emailRegex.test(trimmedEmail)) {
            setErrorMsg(t("invalidEmail") === "invalidEmail" ? "Geçersiz e-posta adresi" : t("invalidEmail"))
            setStatus("error")
            return
        }

        if (trimmedPhone && (!phoneRegex.test(trimmedPhone) || phoneDigits.length < 7)) {
            setErrorMsg(t("invalidPhone") === "invalidPhone" ? "Geçersiz telefon numarası" : t("invalidPhone"))
            setStatus("error")
            return
        }

        persistContactDraft(trimmedName, trimmedEmail, trimmedPhone)
        setStatus("submitting")
        setErrorMsg("")

        try {
            const res = await fetch("/api/appointments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chatbotId,
                    sessionId: sessionId || undefined,
                    customerName: trimmedName,
                    customerEmail: trimmedEmail,
                    customerPhone: trimmedPhone,
                    date: form.date,
                    time: form.time,
                    type: form.type,
                    notes: form.notes,
                }),
            })

            const json = await res.json()

            if (!res.ok) {
                setErrorMsg(json.error || "Bir hata oluştu. Lütfen tekrar deneyin.")
                setStatus("error")
                return
            }

            setAppointmentId(json.appointmentId)
            setStatus("success")
            onSuccess?.(json.appointmentId)
        } catch {
            setErrorMsg("Bağlantı hatası. Lütfen tekrar deneyin.")
            setStatus("error")
        }
    }

    if (status === "success") {
        return (
            <div className="mt-3 p-4 bg-green-50 rounded-xl border border-green-100 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-semibold text-green-800">
                        {t("bookingSuccess") === "bookingSuccess" ? "Randevunuz oluşturuldu!" : t("bookingSuccess")}
                    </p>
                    <p className="text-xs text-green-600 mt-0.5">
                        {form.date} — {form.time}
                    </p>
                </div>
            </div>
        )
    }

    const inputClass =
        "w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
    const pickerButtonClass =
        "w-full justify-start px-3 text-sm text-gray-900 hover:bg-white focus-visible:ring-1 focus-visible:ring-indigo-400 border-gray-200 bg-white"

    return (
        <form onSubmit={handleSubmit} className="mt-3 space-y-2.5 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
            {/* Appointment Type */}
            {appointmentTypes.length > 0 && (
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                        {t("appointmentType") === "appointmentType" ? "Randevu Tipi" : t("appointmentType")}
                    </label>
                    <select
                        required
                        value={form.type}
                        onChange={(e) => set("type", e.target.value)}
                        className={inputClass}
                    >
                        <option value="">Seçiniz...</option>
                        {appointmentTypes.map((tp) => (
                            <option key={tp} value={tp}>{tp}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Date + Time */}
            <AppointmentSlotPicker
                chatbotId={chatbotId}
                date={form.date}
                time={form.time}
                onDateChange={(value) => set("date", value)}
                onTimeChange={(value) => set("time", value)}
                onSettingsLoaded={(types) => {
                    if (types.length > 0) {
                        setAppointmentTypes(types)
                        setForm((prev) => ({ ...prev, type: prev.type || types[0] }))
                    }
                }}
                dateLabel={t("date") === "date" ? "Tarih" : t("date")}
                timeLabel={t("time") === "time" ? "Saat" : t("time")}
                buttonClassName={pickerButtonClass}
            />

            {/* Contact fields */}
            <div className="space-y-2">
                <input
                    type="text"
                    placeholder={t("fullName") === "fullName" ? "Ad Soyad" : t("fullName")}
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    className={inputClass}
                />
                <input
                    type="email"
                    placeholder={t("email") === "email" ? "E-posta" : t("email")}
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    className={inputClass}
                />
                <input
                    type="tel"
                    placeholder={t("phone") === "phone" ? "Telefon" : t("phone")}
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    className={inputClass}
                />
                <p className="text-[11px] text-gray-500">
                    {t("contactRequired") === "contactRequired"
                        ? "En az bir iletişim bilgisi paylaşın."
                        : t("contactRequired")}
                </p>
            </div>

            {/* Notes */}
            <textarea
                placeholder={t("notes") === "notes" ? "Notlar (opsiyonel)" : t("notes")}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={2}
                className={inputClass + " resize-none"}
            />

            {/* Error */}
            {status === "error" && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {errorMsg}
                </div>
            )}

            <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: settings.brandColor }}
            >
                {status === "submitting"
                    ? "Gönderiliyor..."
                    : (t("confirmBooking") === "confirmBooking" ? "Randevu Oluştur" : t("confirmBooking"))}
            </button>
        </form>
    )
}
