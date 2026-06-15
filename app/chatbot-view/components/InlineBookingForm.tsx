"use client"

import { useState } from "react"
import { CheckCircle, AlertCircle } from "lucide-react"
import { ChatbotSettings } from "@/types/chatbot"
import { AppointmentSlotPicker } from "@/components/appointments/appointment-slot-picker"
import { useLanguage } from "@/context/LanguageContext"


interface InlineBookingFormProps {
    chatbotId: string
    sessionId?: string | null
    settings: ChatbotSettings
    t: (key: string) => string
    onSuccess?: (appointmentId: string) => void
    privacyConsent?: {
        required: boolean
        checkboxLabel: string
        errorText: string
        onReadNotice: () => void
        onGrant?: () => Promise<void>
    }
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

export function InlineBookingForm({ chatbotId, sessionId, settings, t, onSuccess, privacyConsent }: InlineBookingFormProps) {
    const { language } = useLanguage()
    const isTr = language === "tr"
    const copy = {
        selectDateTime: isTr ? "Lutfen tarih ve saat secin." : "Please select a date and time.",
        nameRequired: isTr ? "Ad Soyad gereklidir" : "Full name is required",
        contactRequired: isTr ? "E-posta veya telefon gereklidir" : "Email or phone is required",
        contactHelper: isTr ? "En az bir iletisim bilgisi paylasin." : "Share at least one contact detail.",
        invalidEmail: isTr ? "Gecersiz e-posta adresi" : "Invalid email address",
        invalidPhone: isTr ? "Gecersiz telefon numarasi" : "Invalid phone number",
        genericError: isTr ? "Bir hata olustu. Lutfen tekrar deneyin." : "Something went wrong. Please try again.",
        networkError: isTr ? "Baglanti hatasi. Lutfen tekrar deneyin." : "Connection error. Please try again.",
        submitting: isTr ? "Gonderiliyor..." : "Submitting...",
        successTitle: isTr ? "Randevu basariyla olusturuldu" : "Booking Success",
        appointmentType: isTr ? "Randevu Turu" : "Appointment Type",
        select: isTr ? "Seciniz..." : "Select...",
        fullName: isTr ? "Ad Soyad" : "Full Name",
        email: isTr ? "E-posta" : "Email",
        phone: isTr ? "Telefon" : "Phone",
        notes: isTr ? "Notlar (opsiyonel)" : "Notes (optional)",
        confirm: isTr ? "Randevuyu Onayla" : "Confirm Booking",
    }

    const localizeServerError = (message?: string) => {
        const normalized = String(message || "").trim()
        if (!normalized) return copy.genericError

        const map: Record<string, string> = {
            "Missing required fields": isTr ? "Eksik alanlar var." : "Missing required fields.",
            "Email or phone is required": copy.contactRequired,
            "Invalid email address": copy.invalidEmail,
            "Invalid phone number": copy.invalidPhone,
            "Invalid date or time format": isTr ? "Gecersiz tarih veya saat formati." : "Invalid date or time format.",
            "Invalid appointment date or time": isTr ? "Gecersiz randevu tarihi veya saati." : "Invalid appointment date or time.",
            "Appointment must be in the future": isTr ? "Randevu ileri bir tarih/saatte olmali." : "Appointment must be in the future.",
            "Appointment date is too far in the future": isTr ? "Randevu tarihi cok ileri bir tarihte." : "Appointment date is too far in the future.",
            "Too many appointment requests. Please try again later.": isTr ? "Cok fazla randevu talebi gonderildi. Lutfen daha sonra tekrar deneyin." : "Too many appointment requests. Please try again later.",
            "Too many booking attempts for this contact. Please try again later.": isTr ? "Bu iletisim bilgisi icin cok fazla randevu denemesi yapildi. Lutfen daha sonra tekrar deneyin." : "Too many booking attempts for this contact. Please try again later.",
            "Chatbot not found": isTr ? "Chatbot bulunamadi." : "Chatbot not found.",
            "Account is inactive": isTr ? "Hesap aktif degil." : "Account is inactive.",
            "Appointments are disabled for this chatbot": isTr ? "Bu chatbot icin randevu modulu kapali." : "Appointments are disabled for this chatbot.",
            "Selected day is outside working days": isTr ? "Secilen gun calisma gunleri disinda." : "Selected day is outside working days.",
            "Selected time is outside working hours": isTr ? "Secilen saat calisma saatleri disinda." : "Selected time is outside working hours.",
            "Invalid session for chatbot": isTr ? "Oturum yenilenemedi. Lutfen tekrar deneyin." : "Session could not be verified. Please try again.",
            "Selected time is not available": isTr ? "Secilen saat dolu. Lutfen farkli bir saat secin." : "Selected time is not available. Please choose another time.",
        }

        return map[normalized] || normalized
    }

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
    const [privacyChecked, setPrivacyChecked] = useState(false)
    // TCPA opt-in (US messaging consent) — appointment reminders via SMS/WhatsApp.
    const [tcpaChecked, setTcpaChecked] = useState(false)
    const tcpaConsentLabel = t('tcpaConsentLabel')

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
            setErrorMsg(copy.selectDateTime)
            setStatus("error")
            return
        }

        if (!trimmedName) {
            setErrorMsg(t("nameRequired") === "nameRequired" ? copy.nameRequired : t("nameRequired"))
            setStatus("error")
            return
        }

        if (!trimmedEmail && !trimmedPhone) {
            setErrorMsg(t("contactRequired") === "contactRequired" ? copy.contactRequired : t("contactRequired"))
            setStatus("error")
            return
        }

        if (trimmedEmail && !emailRegex.test(trimmedEmail)) {
            setErrorMsg(t("invalidEmail") === "invalidEmail" ? copy.invalidEmail : t("invalidEmail"))
            setStatus("error")
            return
        }

        if (trimmedPhone && (!phoneRegex.test(trimmedPhone) || phoneDigits.length < 7)) {
            setErrorMsg(t("invalidPhone") === "invalidPhone" ? copy.invalidPhone : t("invalidPhone"))
            setStatus("error")
            return
        }

        if (privacyConsent?.required && !privacyChecked) {
            setErrorMsg(privacyConsent.errorText)
            setStatus("error")
            return
        }

        persistContactDraft(trimmedName, trimmedEmail, trimmedPhone)
        setStatus("submitting")
        setErrorMsg("")

        try {
            if (privacyConsent?.required) {
                await privacyConsent.onGrant?.()
            }

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
                    tcpaOptIn: trimmedPhone ? tcpaChecked : undefined,
                    tcpaConsentText: trimmedPhone && tcpaChecked ? tcpaConsentLabel : undefined,
                }),
            })

            const json = await res.json()

            if (!res.ok) {
                setErrorMsg(localizeServerError(json.error))
                setStatus("error")
                return
            }

            setAppointmentId(json.appointmentId)
            setStatus("success")
            onSuccess?.(json.appointmentId)
        } catch {
            setErrorMsg(copy.networkError)
            setStatus("error")
        }
    }

    if (status === "success") {
        return (
            <div className="mt-3 p-4 bg-green-50 rounded-xl border border-green-100 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-semibold text-green-800">
                        {copy.successTitle}
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
                        {t("appointmentType") === "appointmentType" ? copy.appointmentType : t("appointmentType")}
                    </label>
                    <select
                        required
                        value={form.type}
                        onChange={(e) => set("type", e.target.value)}
                        className={inputClass}
                    >
                        <option value="">{copy.select}</option>
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
                dateLabel={t("date") === "date" ? (isTr ? "Tarih" : "Date") : t("date")}
                timeLabel={t("time") === "time" ? (isTr ? "Saat" : "Time") : t("time")}
                buttonClassName={pickerButtonClass}
            />

            {/* Contact fields */}
            <div className="space-y-2">
                <input
                    type="text"
                    placeholder={t("fullName") === "fullName" ? copy.fullName : t("fullName")}
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    className={inputClass}
                />
                <input
                    type="email"
                    placeholder={t("email") === "email" ? copy.email : t("email")}
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    className={inputClass}
                />
                <input
                    type="tel"
                    placeholder={t("phone") === "phone" ? copy.phone : t("phone")}
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    className={inputClass}
                />
                <p className="text-[11px] text-gray-500">
                    {t("contactRequired") === "contactRequired"
                        ? copy.contactHelper
                        : t("contactRequired")}
                </p>
            </div>

            {/* Notes */}
            <textarea
                placeholder={t("notes") === "notes" ? copy.notes : t("notes")}
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

            {privacyConsent?.required && (
                <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-2.5">
                    <label className="flex items-start gap-2 text-[11px] leading-4 text-gray-600">
                        <input
                            type="checkbox"
                            checked={privacyChecked}
                            onChange={(event) => {
                                setPrivacyChecked(event.target.checked)
                                if (errorMsg === privacyConsent.errorText) {
                                    setErrorMsg("")
                                    setStatus("idle")
                                }
                            }}
                            className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300"
                        />
                        <span>{privacyConsent.checkboxLabel}</span>
                    </label>
                    <button
                        type="button"
                        onClick={privacyConsent.onReadNotice}
                        className="text-[11px] font-medium text-gray-700 underline underline-offset-4"
                    >
                        {t("privacyNoticeOpen") === "privacyNoticeOpen" ? "Aydınlatma Metni" : t("privacyNoticeOpen")}
                    </button>
                </div>
            )}

            {tcpaConsentLabel !== 'tcpaConsentLabel' && (
                <label className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-2.5 text-[11px] leading-4 text-gray-600">
                    <input
                        type="checkbox"
                        checked={tcpaChecked}
                        onChange={(event) => setTcpaChecked(event.target.checked)}
                        className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300"
                    />
                    <span>{tcpaConsentLabel}</span>
                </label>
            )}

            <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: settings.brandColor }}
            >
                {status === "submitting"
                    ? copy.submitting
                    : (t("confirmBooking") === "confirmBooking" ? copy.confirm : t("confirmBooking"))}
            </button>
        </form>
    )
}
