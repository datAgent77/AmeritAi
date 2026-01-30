import { ChatbotSettings } from "@/types/chatbot"
import { User, Mail, Phone, Send, FileText, AlignLeft, Hash, List, Building2, Link2 } from "lucide-react"
import { useState } from "react"
import React from 'react';

interface InlineLeadFormProps {
    onSubmit: (data: any) => Promise<void>
    settings: ChatbotSettings
    t: (key: string) => string
}

export function InlineLeadForm({ onSubmit, settings, t }: InlineLeadFormProps) {
    const config = settings.leadFormConfig || {}
    const customFields = settings.leadCustomFields || []

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
        
        // Basic validation for enabled required fields
        if (config.nameEnabled !== false && config.nameRequired !== false && !formData.name) {
             setStatus('idle'); return
        }
        if (config.emailEnabled !== false && config.emailRequired !== false && !formData.email) {
             setStatus('idle'); return
        }
        
        try {
            await onSubmit(formData)
            setStatus('success')
        } catch (error) {
            setStatus('idle')
        }
    }

    if (status === 'success') {
        return (
            <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center justify-center gap-2 mt-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Send className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-sm font-medium text-green-700">
                    {t('infoReceived') === 'infoReceived' ? "Bilgileriniz alındı, teşekkürler!" : t('infoReceived')}
                </p>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="mt-3 space-y-2.5 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
            {/* Standard Fields */}
            {config.nameEnabled !== false && (
                <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder={config.namePlaceholder || (t('fullName') || "Ad Soyad")}
                        required={config.nameRequired !== false}
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                </div>
            )}

            {config.phoneEnabled !== false && (
                <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="tel"
                        placeholder={config.phonePlaceholder || (t('phone') || "Telefon")}
                        required={config.phoneRequired === true}
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                </div>
            )}

            {config.emailEnabled !== false && (
                <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="email"
                        placeholder={config.emailPlaceholder || (t('email') || "E-posta")}
                        required={config.emailRequired !== false}
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
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
                                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white appearance-none"
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
                                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white min-h-[60px]"
                            />
                        ) : (
                            <input
                                type={field.type}
                                placeholder={field.placeholder || field.label}
                                required={field.required}
                                value={formData[field.id] || ''}
                                onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                            />
                        )}
                    </div>
                );
            })}
            
            <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: settings.brandColor }}
            >
                {status === 'submitting' 
                    ? (t('sending') === 'sending' ? "Gönderiliyor..." : t('sending')) 
                    : (config.submitButtonText || (t('send') === 'send' ? "Gönder" : t('send')))
                }
            </button>
        </form>
    )
}
