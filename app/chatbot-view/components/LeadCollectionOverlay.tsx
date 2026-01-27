import { ChatbotSettings } from "@/types/chatbot"
import { UserPlus, Mail, Phone, User, Building2 } from "lucide-react"
import { useState } from "react"

interface LeadCollectionOverlayProps {
    show: boolean
    onSubmit: (data: any) => Promise<void>
    isSubmitting: boolean
    settings: ChatbotSettings
    t: (key: string) => string
    description?: string
}

export function LeadCollectionOverlay({
    show,
    onSubmit,
    isSubmitting,
    settings,
    t,
    description
}: LeadCollectionOverlayProps) {
    const [formData, setFormData] = useState<{
        name: string
        email: string
        phone: string
        company: string
        customFields: Record<string, string>
    }>({
        name: "",
        email: "",
        phone: "",
        company: "",
        customFields: {}
    })
    const [errors, setErrors] = useState<Record<string, string>>({})

    if (!show) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const newErrors: Record<string, string> = {}

        // Name Validation
        if (!formData.name) {
            newErrors.name = t('nameRequired') || "Name is required"
        }

        // Contact Info Validation
        if (!formData.email && !formData.phone) {
            const msg = t('contactRequired') || "Please provide either email or phone"
            newErrors.email = msg
            newErrors.phone = msg
        }

        // Email Format Validation
        if (formData.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(formData.email)) {
                newErrors.email = t('invalidEmail') || "Invalid email address"
            }
        }

        // Phone Validation
        if (formData.phone) {
            const phoneDigits = formData.phone.replace(/\D/g, '')
            const isValidChars = /^[\d\s\+\-\(\)]+$/.test(formData.phone)
            
            if (!isValidChars || phoneDigits.length < 7) {
                newErrors.phone = t('invalidPhone') || "Invalid phone number"
            }
        }

        // Custom Fields Validation
        if (settings.leadCustomFields) {
            settings.leadCustomFields.forEach((field: any) => {
                if (field.required && !formData.customFields?.[field.id]) {
                    newErrors[field.id] = t('fieldRequired') || "This field is required"
                }
            })
        }

        setErrors(newErrors)

        if (Object.keys(newErrors).length > 0) {
            return
        }

        await onSubmit(formData)
    }

    return (
        <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
        <div className="w-full max-w-sm space-y-6 overflow-y-auto max-h-full p-4">
                <div className="text-center space-y-2">
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg mx-auto"
                        style={{ backgroundColor: settings.brandColor }}
                    >
                        <UserPlus className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">{settings.leadFormConfig?.title || t('getStarted')}</h2>
                    <p className="text-sm text-gray-500">{settings.leadFormConfig?.subtitle || t('leadFormSubtitle') || "Lütfen bilgilerinizi girerek sohbete başlayın."}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div className="space-y-1">
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('fullName') || "Full Name"}
                                required
                                value={formData.name}
                                onChange={(e) => {
                                    setFormData({ ...formData, name: e.target.value })
                                    if (errors.name) setErrors({ ...errors, name: "" })
                                }}
                                className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all bg-white ${
                                    errors.name ? 'border-red-500 focus:ring-red-200' : 'border-gray-200'
                                }`}
                                style={{ '--tw-ring-color': errors.name ? '#EF4444' : settings.brandColor } as any}
                            />
                        </div>
                        {errors.name && <p className="text-xs text-red-500 ml-1">{errors.name}</p>}
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="email"
                                placeholder={t('email') || "Email Address"}
                                value={formData.email}
                                onChange={(e) => {
                                    setFormData({ ...formData, email: e.target.value })
                                    if (errors.email) setErrors({ ...errors, email: "" })
                                }}
                                className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all bg-white ${
                                    errors.email ? 'border-red-500 focus:ring-red-200' : 'border-gray-200'
                                }`}
                                style={{ '--tw-ring-color': errors.email ? '#EF4444' : settings.brandColor } as any}
                            />
                        </div>
                        {errors.email && <p className="text-xs text-red-500 ml-1">{errors.email}</p>}
                    </div>

                    {/* Phone */}
                    <div className="space-y-1">
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="tel"
                                placeholder={t('phone') || "Phone Number"}
                                value={formData.phone}
                                onChange={(e) => {
                                    setFormData({ ...formData, phone: e.target.value })
                                    if (errors.phone) setErrors({ ...errors, phone: "" })
                                }}
                                className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all bg-white ${
                                    errors.phone ? 'border-red-500 focus:ring-red-200' : 'border-gray-200'
                                }`}
                                style={{ '--tw-ring-color': errors.phone ? '#EF4444' : settings.brandColor } as any}
                            />
                        </div>
                        {errors.phone && <p className="text-xs text-red-500 ml-1">{errors.phone}</p>}
                    </div>

                    {/* Company (Optional) */}
                    <div className="space-y-1">
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('company') || "Company (Optional)"}
                                value={formData.company}
                                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all bg-white"
                                style={{ '--tw-ring-color': settings.brandColor } as any}
                            />
                        </div>
                    </div>

                    {/* Custom Fields Restoration */}
                    {settings.leadCustomFields && settings.leadCustomFields.length > 0 && (
                        <div className="space-y-3 pt-2 border-t border-gray-100">
                             {settings.leadCustomFields.map((field: any) => (
                                <div key={field.id} className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-600 ml-1">
                                        {field.label}{field.required && <span className="text-red-500">*</span>}
                                    </label>
                                    {field.type === 'textarea' ? (
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
                                            className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all bg-white min-h-[80px] ${
                                                errors[field.id] ? 'border-red-500 focus:ring-red-200' : 'border-gray-200'
                                            }`}
                                            style={{ '--tw-ring-color': errors[field.id] ? '#EF4444' : settings.brandColor } as any}
                                            placeholder={field.placeholder || ''}
                                        />
                                    ) : field.type === 'select' ? (
                                        <div className="relative">
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
                                                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all bg-white appearance-none ${
                                                    errors[field.id] ? 'border-red-500 focus:ring-red-200' : 'border-gray-200'
                                                }`}
                                                style={{ '--tw-ring-color': errors[field.id] ? '#EF4444' : settings.brandColor } as any}
                                            >
                                                <option value="">{field.placeholder || (t('select') || 'Select...')}</option>
                                                {(field.options || []).map((opt: string, i: number) => (
                                                    <option key={i} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : (
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
                                            className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all bg-white ${
                                                errors[field.id] ? 'border-red-500 focus:ring-red-200' : 'border-gray-200'
                                            }`}
                                            style={{ '--tw-ring-color': errors[field.id] ? '#EF4444' : settings.brandColor } as any}
                                            placeholder={field.placeholder || ''}
                                        />
                                    )}
                                    {errors[field.id] && <p className="text-xs text-red-500 ml-1">{errors[field.id]}</p>}
                                </div>
                            ))}
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
                                {t('processing') || "Processing..."}
                            </span>
                        ) : (
                            t('startChat') || "Start Chat"
                        )}
                    </button>
                    
                    <p className="text-xs text-center text-gray-400">
                        {t('secureInfo') || "Your information is secure and private."}
                    </p>
                </form>
            </div>
        </div>
    )
}
