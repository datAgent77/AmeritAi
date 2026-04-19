"use client"

import { useState } from "react"
import { Calendar, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { ChatbotSettings } from "@/types/chatbot"

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
    // Contact fields — shown only if no lead data
    name: string
    email: string
    phone: string
}

export function InlineBookingForm({ chatbotId, sessionId, settings, t, onSuccess }: InlineBookingFormProps) {
    const todayStr = new Date().toISOString().split("T")[0]

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
    const hasContactInfo = Boolean(leadData?.email)

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
    const [appointmentId, setAppointmentId] = useState("")

    const set = (key: keyof BookingFormData, value: string) =>
        setForm((prev) => ({ ...prev, [key]: value }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus("submitting")
        setErrorMsg("")

        try {
            const res = await fetch("/api/appointments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chatbotId,
                    sessionId: sessionId || undefined,
                    customerName: form.name || leadData?.name || "Misafir",
                    customerEmail: form.email || leadData?.email,
                    customerPhone: form.phone || leadData?.phone || "",
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

    return (
        <form onSubmit={handleSubmit} className="mt-3 space-y-2.5 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
            {/* Appointment Type */}
            {settings.appointmentTypes && settings.appointmentTypes.length > 0 && (
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
                        {settings.appointmentTypes.map((tp) => (
                            <option key={tp} value={tp}>{tp}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {t("date") === "date" ? "Tarih" : t("date")}
                    </label>
                    <input
                        type="date"
                        required
                        min={todayStr}
                        value={form.date}
                        onChange={(e) => set("date", e.target.value)}
                        className={inputClass}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {t("time") === "time" ? "Saat" : t("time")}
                    </label>
                    <input
                        type="time"
                        required
                        value={form.time}
                        onChange={(e) => set("time", e.target.value)}
                        className={inputClass}
                    />
                </div>
            </div>

            {/* Contact fields — only if no pre-collected lead */}
            {!hasContactInfo && (
                <>
                    <input
                        type="text"
                        placeholder="Adınız"
                        required
                        value={form.name}
                        onChange={(e) => set("name", e.target.value)}
                        className={inputClass}
                    />
                    <input
                        type="email"
                        placeholder="E-posta adresiniz"
                        required
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        className={inputClass}
                    />
                    <input
                        type="tel"
                        placeholder="Telefon (opsiyonel)"
                        value={form.phone}
                        onChange={(e) => set("phone", e.target.value)}
                        className={inputClass}
                    />
                </>
            )}

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
