import { ChatbotSettings } from "@/types/chatbot"
import { Calendar } from "lucide-react"
import { AppointmentSlotPicker } from "@/components/appointments/appointment-slot-picker"
import { useState } from "react"

interface BookingOverlayProps {
    chatbotId: string
    showBooking: boolean
    setShowBooking: (val: boolean) => void
    bookingData: any
    setBookingData: (val: any) => void
    handleBookingSubmit: (e: React.FormEvent) => void
    isSubmittingBooking: boolean
    settings: ChatbotSettings
    t: (key: string) => string
    privacyConsent?: {
        required: boolean
        checkboxLabel: string
        errorText: string
        onReadNotice: () => void
    }
}

export function BookingOverlay({
    chatbotId,
    showBooking,
    setShowBooking,
    bookingData,
    setBookingData,
    handleBookingSubmit,
    isSubmittingBooking,
    settings,
    t,
    privacyConsent
}: BookingOverlayProps) {
    const [privacyChecked, setPrivacyChecked] = useState(false)
    const [privacyError, setPrivacyError] = useState("")

    if (!showBooking) return null

    const onSubmit = (event: React.FormEvent) => {
        if (privacyConsent?.required && !privacyChecked) {
            event.preventDefault()
            setPrivacyError(privacyConsent.errorText)
            return
        }

        setPrivacyError("")
        handleBookingSubmit(event)
    }

    return (
        <div className="absolute inset-0 z-50 bg-white/95 dark:bg-zinc-950/98 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="w-full max-w-sm space-y-6 overflow-y-auto max-h-full py-4">
                <div className="text-center space-y-2">
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg mx-auto"
                        style={{ backgroundColor: settings.brandColor }}
                    >
                        <Calendar className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-zinc-100">{t('bookAppointment') || "Book Appointment"}</h2>
                    <p className="text-sm text-gray-500 dark:text-zinc-400">{t('bookAppointmentDesc') || "Please select a time that works for you."}</p>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="grid gap-3">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">{t('name') || "Name"}</label>
                            <input
                                type="text"
                                required
                                autoComplete="name"
                                value={bookingData.name || ""}
                                onChange={(e) => setBookingData({ ...bookingData, name: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none"
                                placeholder={t('fullName') || "Full Name"}
                            />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">{t('email') || "Email"}</label>
                                <input
                                    type="email"
                                    autoComplete="email"
                                    value={bookingData.email || ""}
                                    onChange={(e) => setBookingData({ ...bookingData, email: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none"
                                    placeholder={t('email') || "Email"}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">{t('phone') || "Phone"}</label>
                                <input
                                    type="tel"
                                    autoComplete="tel"
                                    value={bookingData.phone || ""}
                                    onChange={(e) => setBookingData({ ...bookingData, phone: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none"
                                    placeholder={t('phone') || "Phone"}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">
                            {t('contactRequired') || "Email or Phone is required"}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">{t('appointmentType') || "Type"}</label>
                        <select
                            required
                            value={bookingData.type}
                            onChange={(e) => setBookingData({ ...bookingData, type: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-opacity-50"
                            style={{ '--tw-ring-color': settings.brandColor } as any}
                        >
                            <option value="">{t('selectType') || "Select type..."}</option>
                            {settings.appointmentTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <AppointmentSlotPicker
                            chatbotId={chatbotId}
                            date={bookingData.date}
                            time={bookingData.time}
                            onDateChange={(value) => setBookingData({ ...bookingData, date: value })}
                            onTimeChange={(value) => setBookingData({ ...bookingData, time: value })}
                            dateLabel={t('date') || "Date"}
                            timeLabel={t('time') || "Time"}
                            buttonClassName="w-full justify-start px-4 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                            contentClassName="dark:border-zinc-700 dark:bg-zinc-900"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">{t('notes') || "Notes (Optional)"}</label>
                        <textarea
                            value={bookingData.notes}
                            onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none"
                            rows={2}
                        />
                    </div>

                    {privacyConsent?.required && (
                        <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/70">
                            <label className="flex items-start gap-3 text-xs leading-5 text-gray-600 dark:text-zinc-300">
                                <input
                                    type="checkbox"
                                    checked={privacyChecked}
                                    onChange={(event) => {
                                        setPrivacyChecked(event.target.checked)
                                        if (privacyError) setPrivacyError("")
                                    }}
                                    className="mt-1 h-4 w-4 rounded border-gray-300"
                                />
                                <span>{privacyConsent.checkboxLabel}</span>
                            </label>
                            <button
                                type="button"
                                onClick={privacyConsent.onReadNotice}
                                className="text-xs font-medium text-gray-700 underline underline-offset-4 dark:text-zinc-200"
                            >
                                {t("privacyNoticeOpen") === "privacyNoticeOpen" ? "Aydınlatma Metni" : t("privacyNoticeOpen")}
                            </button>
                            {privacyError && <p className="text-xs text-red-500">{privacyError}</p>}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => setShowBooking(false)}
                            className="flex-1 py-3 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 font-medium hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                            {t('cancel') || "Cancel"}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmittingBooking}
                            className="flex-1 py-3 rounded-lg text-white font-medium shadow-md hover:opacity-90 disabled:opacity-50"
                            style={{ backgroundColor: settings.brandColor }}
                        >
                            {isSubmittingBooking ? "..." : (t('confirmBooking') || "Book Now")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
