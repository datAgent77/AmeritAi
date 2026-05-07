import { ChatbotSettings } from "@/types/chatbot"
import { User, Mail, Phone, Send, FileText, AlignLeft, Hash, List, Building2, Link2 } from "lucide-react"
import { useState } from "react"
import React from 'react';
import { useLanguage } from "@/context/LanguageContext"

interface InlineLeadFormProps {
    onSubmit: (data: any, options?: { source?: "inline" | "overlay"; flow?: "lead" | "handoff" }) => Promise<void>
    settings: ChatbotSettings
    t: (key: string) => string
    variant?: "lead" | "handoff"
    privacyConsent?: {
        required: boolean
        checkboxLabel: string
        errorText: string
        onReadNotice: () => void
    }
}

export function InlineLeadForm({ onSubmit, settings, t, variant = "lead", privacyConsent }: InlineLeadFormProps) {
    const { language } = useLanguage()
    const isHandoff = variant === "handoff"
    const defaultHandoffConfig = {
        nameEnabled: true,
        emailEnabled: true,
        phoneEnabled: true,
        nameRequired: true,
        emailRequired: false,
        phoneRequired: false,
        namePlaceholder: language === "tr" ? "Ad Soyad" : "Full Name",
        emailPlaceholder: language === "tr" ? "E-posta" : "Email",
        phonePlaceholder: language === "tr" ? "Telefon" : "Phone",
    }
    const config = isHandoff ? defaultHandoffConfig : (settings.leadFormConfig || {})
    const customFields = isHandoff ? [] : (settings.leadCustomFields || [])
    const [errorMessage, setErrorMessage] = useState("")

    const [formData, setFormData] = useState<Record<string, string>>(() => {
        // Initialize state including custom fields
        const initial: Record<string, string> = {}
        if (config.nameEnabled !== false) initial.name = ""
        if (config.emailEnabled !== false) initial.email = ""
        if (config.phoneEnabled !== false) initial.phone = ""
        customFields.forEach(f => initial[f.id] = "")
        return initial
    })
    
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle')
    const [privacyChecked, setPrivacyChecked] = useState(false)

    const getIcon = (field: any) => {
        const label = (field.label || '').toLowerCase();
        
        // Smart icon detection based on label
        if (label.includes('firma') || label.includes('company') || label.includes('şirket')) return Building2;
        if (label.includes('link') || label.includes('url') || label.includes('site')) return Link2;

        // Fallback to type-based icons
        switch (field.type) {
            case 'email': return Mail;
            case 'phone': return Phone;
            case 'textarea': return AlignLeft;
            case 'select': return List; // or ChevronDown if preferred, but List implies a menu
            case 'number': return Hash;
            default: return FileText;
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus('submitting')
        setErrorMessage("")

        const name = String(formData.name || "").trim()
        const email = String(formData.email || "").trim()
        const phone = String(formData.phone || "").trim()
        const phoneDigits = phone.replace(/\D/g, '')

        if (isHandoff) {
            if (!name) {
                setErrorMessage(language === "tr" ? "Ad soyad gerekli." : "Full name is required.")
                setStatus('idle')
                return
            }

            if (!email && !phone) {
                setErrorMessage(t('contactRequired') === 'contactRequired'
                    ? (language === "tr" ? "E-posta veya telefon bilgisinden en az birini paylaşın." : "Please provide either an email or phone number.")
                    : t('contactRequired'))
                setStatus('idle')
                return
            }

            if (email) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                if (!emailRegex.test(email)) {
                    setErrorMessage(t('invalidEmail') === 'invalidEmail' ? "Invalid email address" : t('invalidEmail'))
                    setStatus('idle')
                    return
                }
            }

            if (phone) {
                const isValidChars = /^[\d\s\+\-\(\)]+$/.test(phone)
                if (!isValidChars || phoneDigits.length < 7) {
                    setErrorMessage(t('invalidPhone') === 'invalidPhone' ? "Invalid phone number" : t('invalidPhone'))
                    setStatus('idle')
                    return
                }
            }
        }
        
        // Basic validation for enabled required fields
        if (config.nameEnabled !== false && config.nameRequired !== false && !name) {
             setStatus('idle'); return
        }
        if (config.emailEnabled !== false && config.emailRequired !== false && !email) {
             setStatus('idle'); return
        }

        if (privacyConsent?.required && !privacyChecked) {
            setErrorMessage(privacyConsent.errorText)
            setStatus('idle')
            return
        }
        
        try {
            await onSubmit({
                ...formData,
                privacyConsentAccepted: privacyConsent?.required ? privacyChecked : undefined,
            }, { source: "inline", flow: variant })
            setStatus('success')
        } catch (_error) {
            setStatus('idle')
        }
    }

    if (status === 'success') {
        const successText = isHandoff
            ? (t('handoffReceived') === 'handoffReceived'
                ? "Thank you! Our agent will reach out shortly."
                : t('handoffReceived'))
            : (t('infoReceived') === 'infoReceived'
                ? "Your information has been received. Thank you!"
                : t('infoReceived'))
        return (
            <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center justify-center gap-2 mt-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Send className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-sm font-medium text-green-700">{successText}</p>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="mt-3 space-y-2.5 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
            {isHandoff ? (
                <div className="space-y-1 rounded-lg border border-violet-100 bg-violet-50/80 px-3 py-2">
                    <p className="text-sm font-medium text-violet-900">
                        {language === "tr" ? "Temsilci baglanti formu" : "Agent contact form"}
                    </p>
                    <p className="text-xs leading-relaxed text-violet-700">
                        {language === "tr"
                            ? "Adinizi ve en az bir iletisim bilginizi paylasin. Uygunsa temsilci talebinizi dogrudan olusturalim."
                            : "Share your name and at least one contact method so we can create your agent request directly."}
                    </p>
                </div>
            ) : null}

            {/* Standard Fields */}
            {config.nameEnabled !== false && (
                <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder={config.namePlaceholder || (t('fullName') || "Full Name")}
                        required={config.nameRequired !== false}
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                </div>
            )}

            {config.phoneEnabled !== false && (
                <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="tel"
                        placeholder={config.phonePlaceholder || (t('phone') || "Phone")}
                        required={config.phoneRequired === true}
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                </div>
            )}

            {config.emailEnabled !== false && (
                <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="email"
                        placeholder={config.emailPlaceholder || (t('email') || "Email")}
                        required={config.emailRequired !== false}
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                </div>
            )}

            {/* Custom Fields */}
            {customFields.map((field) => {
                const Icon = getIcon(field);
                return (
                    <div key={field.id} className="relative">
                        <Icon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        {field.type === 'select' ? (
                            <select
                                required={field.required}
                                value={formData[field.id] || ''}
                                onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                                className="w-full pl-9 pr-3 py-2 text-sm text-gray-900 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white appearance-none"
                            >
                                <option value="">{field.placeholder || field.label}</option>
                                {field.options?.map((opt, i) => (
                                    <option key={i} value={opt}>{opt}</option>
                                ))}
                            </select>
                        ) : field.type === 'textarea' ? (
                            <textarea
                                placeholder={field.placeholder || field.label}
                                required={field.required}
                                value={formData[field.id] || ''}
                                onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                                className="w-full pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white min-h-[60px]"
                            />
                        ) : (
                            <input
                                type={field.type}
                                placeholder={field.placeholder || field.label}
                                required={field.required}
                                value={formData[field.id] || ''}
                                onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                                className="w-full pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                            />
                        )}
                    </div>
                );
            })}

            {errorMessage ? (
                <p className="text-xs font-medium text-red-500">{errorMessage}</p>
            ) : null}

            {privacyConsent?.required && (
                <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-2.5">
                    <label className="flex items-start gap-2 text-[11px] leading-4 text-gray-600">
                        <input
                            type="checkbox"
                            checked={privacyChecked}
                            onChange={(event) => {
                                setPrivacyChecked(event.target.checked)
                                if (errorMessage === privacyConsent.errorText) setErrorMessage("")
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
            
            <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: settings.brandColor }}
            >
                {status === 'submitting'
                    ? (t('sending') === 'sending' ? "Sending..." : t('sending'))
                    : isHandoff
                        ? (t('requestAgent') === 'requestAgent' ? "Request Agent" : t('requestAgent'))
                        : (t('sendInfo') === 'sendInfo' ? "Send Info" : t('sendInfo'))
                }
            </button>
        </form>
    )
}
