import { ChatbotSettings } from "@/types/chatbot"
import { UserPlus, Users, Mail, Phone, User, Building2, ListOrdered, MessageSquare } from "lucide-react"
import { useState } from "react"
import { useLanguage } from "@/context/LanguageContext"

interface LeadCollectionOverlayProps {
    show: boolean
    onSubmit: (data: any, options?: { source?: "inline" | "overlay" }) => Promise<void>
    isSubmitting: boolean
    settings: ChatbotSettings
    t: (key: string) => string
    description?: string
    variant?: string
    privacyConsent?: {
        required: boolean
        checkboxLabel: string
        errorText: string
        onReadNotice: () => void
    }
}

export function LeadCollectionOverlay({
    show,
    onSubmit,
    isSubmitting,
    settings,
    t,
    description,
    variant,
    privacyConsent
}: LeadCollectionOverlayProps) {
    const { language } = useLanguage()
    const isHandoff = variant === "handoff"
    const [formData, setFormData] = useState<{
        name: string
        email: string
        phone: string
        customFields: Record<string, string>
    }>({
        name: "",
        email: "",
        phone: "",
        customFields: {}
    })
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [privacyChecked, setPrivacyChecked] = useState(false)

    if (!show) return null

    // Get form config from settings
    const handoffFormConfig = {
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
    const formConfig = isHandoff ? handoffFormConfig : (settings.leadFormConfig || {})
    const customFields = isHandoff ? [] : (settings.leadCustomFields || [])
    const nameEnabled = formConfig.nameEnabled !== false
    const emailEnabled = formConfig.emailEnabled !== false
    const phoneEnabled = formConfig.phoneEnabled !== false
    const nameRequired = formConfig.nameRequired !== false
    const emailRequired = formConfig.emailRequired !== false
    const phoneRequired = formConfig.phoneRequired === true

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const newErrors: Record<string, string> = {}

        // Name Validation
        if (nameEnabled && nameRequired && !formData.name) {
            newErrors.name = t('nameRequired') || "Name is required"
        }

        // Email Validation
        if (emailEnabled && emailRequired && !formData.email) {
            newErrors.email = t('emailRequired') || "Email is required"
        }

        // Phone Validation  
        if (phoneEnabled && phoneRequired && !formData.phone) {
            newErrors.phone = t('phoneRequired') || "Phone is required"
        }

        // At least one contact method required (if both enabled)
        if (emailEnabled && phoneEnabled && !emailRequired && !phoneRequired) {
            if (!formData.email && !formData.phone) {
                const msg = t('contactRequired') || "Please provide either email or phone"
                newErrors.email = msg
                newErrors.phone = msg
            }
        }

        // Email Format Validation
        if (formData.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(formData.email)) {
                newErrors.email = t('invalidEmail') || "Invalid email address"
            }
        }

        // Phone Format Validation
        if (formData.phone) {
            const phoneDigits = formData.phone.replace(/\D/g, '')
            const isValidChars = /^[\d\s\+\-\(\)]+$/.test(formData.phone)
            
            if (!isValidChars || phoneDigits.length < 7) {
                newErrors.phone = t('invalidPhone') || "Invalid phone number"
            }
        }

        // Custom Fields Validation
        if (settings.leadCustomFields) {
            customFields.forEach((field: any) => {
                if (field.required && !formData.customFields?.[field.id]) {
                    newErrors[field.id] = t('fieldRequired') || "This field is required"
                }
            })
        }

        if (privacyConsent?.required && !privacyChecked) {
            newErrors.privacyConsent = privacyConsent.errorText
        }

        setErrors(newErrors)

        if (Object.keys(newErrors).length > 0) {
            return
        }

        await onSubmit({
            ...formData,
            privacyConsentAccepted: privacyConsent?.required ? privacyChecked : undefined,
        })
    }

    const HeaderIcon = isHandoff ? Users : UserPlus
    const defaultTitle = isHandoff
        ? (language === "tr" ? "Temsilci ile Görüş" : "Talk to an Agent")
        : t('getStarted')
    const defaultSubtitle = isHandoff
        ? (language === "tr"
            ? "İletişim bilgilerinizi paylaşın, temsilcimiz en kısa sürede size ulaşsın."
            : "Share your contact info and our agent will reach out shortly.")
        : (t('leadFormSubtitle') !== 'leadFormSubtitle'
            ? t('leadFormSubtitle')
            : "Please fill in your details to start chatting.")
    const defaultSubmitText = isHandoff
        ? (language === "tr" ? "Temsilci Talep Et" : "Request Agent")
        : (t('startChat') !== 'startChat' ? t('startChat') : "Sohbete Başla")

    const title = isHandoff ? defaultTitle : (settings.leadFormConfig?.title || defaultTitle)
    const subtitle = isHandoff ? defaultSubtitle : (description || settings.leadFormConfig?.subtitle || defaultSubtitle)
    const submitText = isHandoff ? defaultSubmitText : (settings.leadFormConfig?.submitButtonText || defaultSubmitText)

    return (
        <div className="absolute inset-0 z-50 bg-white/95 dark:bg-zinc-950/98 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
        <div className="w-full max-w-sm space-y-6 overflow-y-auto max-h-full p-4">
                <div className="text-center space-y-2">
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg mx-auto"
                        style={{ backgroundColor: settings.brandColor }}
                    >
                        <HeaderIcon className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-zinc-100">{title}</h2>
                    <p className="text-sm text-gray-500 dark:text-zinc-400">{subtitle}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name Field */}
                    {nameEnabled && (
                        <div className="space-y-1">
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={formConfig.namePlaceholder || t('fullName') || "Full Name"}
                                    required={nameRequired}
                                    value={formData.name}
                                    onChange={(e) => {
                                        setFormData({ ...formData, name: e.target.value })
                                        if (errors.name) setErrors({ ...errors, name: "" })
                                    }}
                                    className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all bg-white dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 ${
                                        errors.name ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 dark:border-zinc-700'
                                    }`}
                                    style={{ '--tw-ring-color': errors.name ? '#EF4444' : settings.brandColor } as any}
                                />
                            </div>
                            {errors.name && <p className="text-xs text-red-500 ml-1">{errors.name}</p>}
                        </div>
                    )}

                    {/* Email Field */}
                    {emailEnabled && (
                        <div className="space-y-1">
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    placeholder={formConfig.emailPlaceholder || t('email') || "Email"}
                                    required={emailRequired}
                                    value={formData.email}
                                    onChange={(e) => {
                                        setFormData({ ...formData, email: e.target.value })
                                        if (errors.email) setErrors({ ...errors, email: "" })
                                    }}
                                    className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all bg-white dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 ${
                                        errors.email ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 dark:border-zinc-700'
                                    }`}
                                    style={{ '--tw-ring-color': errors.email ? '#EF4444' : settings.brandColor } as any}
                                />
                            </div>
                            {errors.email && <p className="text-xs text-red-500 ml-1">{errors.email}</p>}
                        </div>
                    )}

                    {/* Phone Field */}
                    {phoneEnabled && (
                        <div className="space-y-1">
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="tel"
                                    placeholder={formConfig.phonePlaceholder || t('phone') || "Phone"}
                                    required={phoneRequired}
                                    value={formData.phone}
                                    onChange={(e) => {
                                        setFormData({ ...formData, phone: e.target.value })
                                        if (errors.phone) setErrors({ ...errors, phone: "" })
                                    }}
                                    className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all bg-white dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 ${
                                        errors.phone ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 dark:border-zinc-700'
                                    }`}
                                    style={{ '--tw-ring-color': errors.phone ? '#EF4444' : settings.brandColor } as any}
                                />
                            </div>
                            {errors.phone && <p className="text-xs text-red-500 ml-1">{errors.phone}</p>}
                        </div>
                    )}

                    {/* Custom Fields */}
                    {customFields.length > 0 && (
                        <>
                            {customFields.map((field: any) => {
                                // Choose icon based on field type
                                const FieldIcon = field.type === 'email' ? Mail 
                                    : field.type === 'phone' ? Phone 
                                    : field.type === 'textarea' ? MessageSquare
                                    : field.type === 'select' ? ListOrdered
                                    : Building2;
                                
                                return (
                                    <div key={field.id} className="space-y-1">
                                        {field.type === 'textarea' ? (
                                            // Textarea with label
                                            <>
                                                <label className="text-xs font-medium text-gray-500 dark:text-zinc-400 ml-1">
                                                    {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
                                                </label>
                                                <textarea
                                                    required={field.required}
                                                    value={formData.customFields?.[field.id] || ''}
                                                    onChange={(e) => {
                                                        setFormData({ 
                                                            ...formData, 
                                                            customFields: { ...formData.customFields, [field.id]: e.target.value }
                                                        })
                                                        if (errors[field.id]) {
                                                            const newErrors = {...errors}
                                                            delete newErrors[field.id]
                                                            setErrors(newErrors)
                                                        }
                                                    }}
                                                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all bg-white dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 min-h-[80px] resize-none ${
                                                        errors[field.id] ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 dark:border-zinc-700'
                                                    }`}
                                                    style={{ '--tw-ring-color': errors[field.id] ? '#EF4444' : settings.brandColor } as any}
                                                    placeholder={field.placeholder || ''}
                                                />
                                            </>
                                        ) : field.type === 'select' ? (
                                            // Select with icon
                                            <div className="relative">
                                                <ListOrdered className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <select
                                                    required={field.required}
                                                    value={formData.customFields?.[field.id] || ''}
                                                    onChange={(e) => {
                                                        setFormData({ 
                                                            ...formData, 
                                                            customFields: { ...formData.customFields, [field.id]: e.target.value }
                                                        })
                                                        if (errors[field.id]) {
                                                            const newErrors = {...errors}
                                                            delete newErrors[field.id]
                                                            setErrors(newErrors)
                                                        }
                                                    }}
                                                    className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all bg-white dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 appearance-none ${
                                                        errors[field.id] ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 dark:border-zinc-700'
                                                    }`}
                                                    style={{ '--tw-ring-color': errors[field.id] ? '#EF4444' : settings.brandColor } as any}
                                                >
                                                    <option value="">{field.placeholder || field.label || (t('select') || 'Select...')}</option>
                                                    {(field.options || []).map((opt: string, i: number) => (
                                                        <option key={i} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ) : (
                                            // Text/Email/Phone input with icon (same style as default fields)
                                            <div className="relative">
                                                <FieldIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    type={field.type || 'text'}
                                                    required={field.required}
                                                    value={formData.customFields?.[field.id] || ''}
                                                    onChange={(e) => {
                                                        setFormData({ 
                                                            ...formData, 
                                                            customFields: { ...formData.customFields, [field.id]: e.target.value }
                                                        })
                                                        if (errors[field.id]) {
                                                            const newErrors = {...errors}
                                                            delete newErrors[field.id]
                                                            setErrors(newErrors)
                                                        }
                                                    }}
                                                    className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all bg-white dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 ${
                                                        errors[field.id] ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 dark:border-zinc-700'
                                                    }`}
                                                    style={{ '--tw-ring-color': errors[field.id] ? '#EF4444' : settings.brandColor } as any}
                                                    placeholder={field.placeholder || field.label || ''}
                                                />
                                            </div>
                                        )}
                                        {errors[field.id] && <p className="text-xs text-red-500 ml-1">{errors[field.id]}</p>}
                                    </div>
                                )
                            })}
                        </>
                    )}

                    {privacyConsent?.required && (
                        <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/70">
                            <label className="flex items-start gap-3 text-xs leading-5 text-gray-600 dark:text-zinc-300">
                                <input
                                    type="checkbox"
                                    checked={privacyChecked}
                                    onChange={(event) => {
                                        setPrivacyChecked(event.target.checked)
                                        if (errors.privacyConsent) {
                                            const nextErrors = { ...errors }
                                            delete nextErrors.privacyConsent
                                            setErrors(nextErrors)
                                        }
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
                            {errors.privacyConsent && <p className="text-xs text-red-500">{errors.privacyConsent}</p>}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 rounded-xl text-white font-bold shadow-lg shadow-black/5 hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.98]"
                        style={{ backgroundColor: settings.brandColor }}
                    >
                        {isSubmitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                {t('processing') || "İşleniyor..."}
                            </span>
                        ) : (
                            submitText
                        )}
                    </button>
                    
                    <p className="text-xs text-center text-gray-400 dark:text-zinc-500">
                        {t('secureInfo') || "Your information is secure and private."}
                    </p>
                </form>
            </div>
        </div>
    )
}
