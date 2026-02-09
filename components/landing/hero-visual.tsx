"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useLanguage } from "@/context/LanguageContext"
import NextImage from "next/image"
import {
    ShoppingBag, Utensils, Building2, Stethoscope,
    GraduationCap, Anchor, User
} from "lucide-react"

interface ConversationLine {
    role: 'user' | 'bot'
    text: string
}

interface IndustryConversation {
    id: string
    label: { tr: string; en: string }
    icon: React.ElementType
    color: string
    conversation: {
        tr: ConversationLine[]
        en: ConversationLine[]
    }
}

const INDUSTRY_CONVERSATIONS: IndustryConversation[] = [
    {
        id: 'ecommerce',
        label: { tr: 'E-Ticaret', en: 'E-Commerce' },
        icon: ShoppingBag,
        color: 'from-blue-500 to-indigo-500',
        conversation: {
            tr: [
                { role: 'user', text: 'Bu ayakkabının 42 numarası var mı?' },
                { role: 'bot', text: '42 numara stoklarda mevcut! Siyah ve beyaz renk seçenekleri var. Hangisini tercih edersiniz?' },
                { role: 'user', text: 'Siyah olsun, kargoya ne zaman verilir?' },
                { role: 'bot', text: 'Siyah 42 numara sepetinize eklendi. Bugün sipariş verirseniz yarın kargoya teslim edilir. 🚀' },
            ],
            en: [
                { role: 'user', text: 'Do you have this shoe in size 42?' },
                { role: 'bot', text: 'Size 42 is in stock! Available in black and white. Which do you prefer?' },
                { role: 'user', text: 'Black please, when will it ship?' },
                { role: 'bot', text: 'Black size 42 added to your cart. Order today and it ships tomorrow. 🚀' },
            ]
        }
    },
    {
        id: 'restaurant',
        label: { tr: 'Restoran', en: 'Restaurant' },
        icon: Utensils,
        color: 'from-orange-500 to-red-500',
        conversation: {
            tr: [
                { role: 'user', text: 'Vejetaryen menünüz var mı?' },
                { role: 'bot', text: 'Tabii! Falafel Tabağı, Mantar Risotto ve Sebzeli Wrap önerebilirim. Alerjiniz var mı?' },
                { role: 'user', text: 'Gluten alerjim var.' },
                { role: 'bot', text: 'O zaman Mantar Risotto mükemmel bir seçim, glutensizdir. 2 kişilik masa için rezervasyon yapmamı ister misiniz?' },
            ],
            en: [
                { role: 'user', text: 'Do you have a vegetarian menu?' },
                { role: 'bot', text: 'Of course! I can recommend our Falafel Plate, Mushroom Risotto, and Veggie Wrap. Any allergies?' },
                { role: 'user', text: 'I have a gluten allergy.' },
                { role: 'bot', text: 'Then Mushroom Risotto is a perfect choice, it\'s gluten-free. Shall I book a table for 2?' },
            ]
        }
    },
    {
        id: 'realestate',
        label: { tr: 'Emlak', en: 'Real Estate' },
        icon: Building2,
        color: 'from-emerald-500 to-teal-500',
        conversation: {
            tr: [
                { role: 'user', text: 'Kadıköy\'de 2+1 kiralık var mı?' },
                { role: 'bot', text: '3 uygun ilan buldum. Bütçeniz ne kadar? Evcil hayvan dostu olması gerekiyor mu?' },
                { role: 'user', text: '15 bin liraya kadar, kedim var.' },
                { role: 'bot', text: 'Harika! Evcil hayana uygun 2 ilan var. Size randevu ayarlamamı ister misiniz?' },
            ],
            en: [
                { role: 'user', text: 'Any 2-bedroom apartments for rent in Kadıköy?' },
                { role: 'bot', text: 'I found 3 listings. What\'s your budget? Do you need pet-friendly?' },
                { role: 'user', text: 'Up to 15K TL, I have a cat.' },
                { role: 'bot', text: 'Great! 2 pet-friendly options available. Shall I schedule a viewing?' },
            ]
        }
    },
    {
        id: 'healthcare',
        label: { tr: 'Sağlık', en: 'Healthcare' },
        icon: Stethoscope,
        color: 'from-cyan-500 to-blue-500',
        conversation: {
            tr: [
                { role: 'user', text: 'Diş temizliği için randevu almak istiyorum.' },
                { role: 'bot', text: 'Diş temizliği için en yakın müsait tarih 14 Şubat Cuma. 10:00 veya 14:30 uygun. Hangisi?' },
                { role: 'user', text: '14:30 olsun.' },
                { role: 'bot', text: 'Randevunuz 14 Şubat Cuma saat 14:30 olarak oluşturuldu. Hatırlatma SMS\'i gönderilecek. ✅' },
            ],
            en: [
                { role: 'user', text: 'I\'d like to book a dental cleaning.' },
                { role: 'bot', text: 'The nearest available slot is Friday, Feb 14th. 10:00 AM or 2:30 PM works. Which one?' },
                { role: 'user', text: '2:30 PM please.' },
                { role: 'bot', text: 'Your appointment is set for Friday, Feb 14th at 2:30 PM. You\'ll receive a reminder SMS. ✅' },
            ]
        }
    },
    {
        id: 'education',
        label: { tr: 'Eğitim', en: 'Education' },
        icon: GraduationCap,
        color: 'from-violet-500 to-purple-500',
        conversation: {
            tr: [
                { role: 'user', text: 'İngilizce kursunuz ne kadar?' },
                { role: 'bot', text: 'B1 seviyesi 3 aylık kurs 4.500₺. Erken kayıt indirimi ile 3.800₺. Seviye testiniz yapıldı mı?' },
                { role: 'user', text: 'Hayır, nereden yapabilirim?' },
                { role: 'bot', text: 'Online seviye testini hemen başlatabilirim, sadece 10 dakika sürer. Başlayalım mı?' },
            ],
            en: [
                { role: 'user', text: 'How much is your English course?' },
                { role: 'bot', text: 'B1 level 3-month course is $450. Early bird: $380. Have you taken a placement test?' },
                { role: 'user', text: 'No, where can I take it?' },
                { role: 'bot', text: 'I can start an online placement test right now, only takes 10 minutes. Shall we begin?' },
            ]
        }
    },
    {
        id: 'maritime',
        label: { tr: 'Denizcilik', en: 'Maritime' },
        icon: Anchor,
        color: 'from-sky-500 to-blue-600',
        conversation: {
            tr: [
                { role: 'user', text: 'İstanbul-Trabzon hattı için konteyner fiyatı nedir?' },
                { role: 'bot', text: '20ft konteyner için 12.500₺, 40ft için 22.000₺. Tahmini transit süresi 3 gündür. Yük türü nedir?' },
                { role: 'user', text: 'Gıda ürünleri, soğuk zincir gerekiyor.' },
                { role: 'bot', text: 'Reefer konteyner (soğutmalı) ek 40% fiyat farkı ile sunuyoruz. Detaylı teklif için iletişim bilgilerinizi alayım.' },
            ],
            en: [
                { role: 'user', text: 'Container pricing for Istanbul-Trabzon route?' },
                { role: 'bot', text: '20ft container: $450, 40ft: $780. Estimated transit: 3 days. What\'s the cargo type?' },
                { role: 'user', text: 'Food products, needs cold chain.' },
                { role: 'bot', text: 'Reefer container available at 40% surcharge. Let me get your contact info for a detailed quote.' },
            ]
        }
    },
]

export function HeroVisual() {
    const { language } = useLanguage()
    const lang = language === 'tr' ? 'tr' : 'en'

    const [currentIndustryIndex, setCurrentIndustryIndex] = useState(0)
    const [visibleLines, setVisibleLines] = useState(0)

    const currentConversation = INDUSTRY_CONVERSATIONS[currentIndustryIndex]
    const lines = currentConversation.conversation[lang]

    // Stream lines one by one
    useEffect(() => {
        setVisibleLines(0)
        const lineTimers: NodeJS.Timeout[] = []

        lines.forEach((_, i) => {
            const timer = setTimeout(() => {
                setVisibleLines(i + 1)
            }, (i + 1) * 1200) // 1.2s per message
            lineTimers.push(timer)
        })

        // After all lines shown, wait 3s then switch industry
        const switchTimer = setTimeout(() => {
            setCurrentIndustryIndex(prev => (prev + 1) % INDUSTRY_CONVERSATIONS.length)
        }, lines.length * 1200 + 3000)

        return () => {
            lineTimers.forEach(clearTimeout)
            clearTimeout(switchTimer)
        }
    }, [currentIndustryIndex, lang])

    const Icon = currentConversation.icon

    return (
        <div className="relative w-full max-w-[460px] mx-auto">
            {/* Industry Indicator */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                        {currentConversation.label[lang]}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    {INDUSTRY_CONVERSATIONS.map((ind, i) => (
                        <button
                            key={ind.id}
                            onClick={() => setCurrentIndustryIndex(i)}
                            className={`rounded-full transition-all duration-300 ${
                                i === currentIndustryIndex
                                    ? 'w-5 h-1.5 bg-foreground'
                                    : 'w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60'
                            }`}
                            aria-label={ind.label[lang]}
                        />
                    ))}
                </div>
            </div>

            {/* Chat Window */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentConversation.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                    className="relative bg-card border border-border rounded-2xl shadow-lg overflow-hidden h-[360px]"
                >
                    {/* Chat Header */}
                    <div className={`flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r ${currentConversation.color} text-white`}>
                        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Icon className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold">{currentConversation.label[lang]}</div>
                            <div className="text-[10px] opacity-80 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-300 inline-block" />
                                Vion AI
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="p-4 space-y-3 h-[300px] overflow-y-auto">
                        {lines.slice(0, visibleLines).map((line, i) => (
                            <motion.div
                                key={`${currentConversation.id}-${i}`}
                                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.35, ease: "easeOut" }}
                                className={`flex items-end gap-2 ${line.role === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                                {/* Avatar */}
                                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden ${
                                    line.role === 'bot'
                                        ? 'bg-black'
                                        : 'bg-muted text-muted-foreground'
                                }`}>
                                    {line.role === 'bot'
                                        ? <NextImage src="/vion-logo-icon-white.png" alt="Vion AI" width={18} height={18} className="object-contain" />
                                        : <User className="w-3.5 h-3.5" />
                                    }
                                </div>

                                {/* Bubble */}
                                <div className={`max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed ${
                                    line.role === 'bot'
                                        ? 'bg-muted rounded-2xl rounded-bl-md text-foreground'
                                        : 'bg-foreground text-background rounded-2xl rounded-br-md'
                                }`}>
                                    {line.text}
                                </div>
                            </motion.div>
                        ))}

                        {/* Typing indicator */}
                        {visibleLines < lines.length && visibleLines > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-end gap-2"
                            >
                                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden bg-black">
                                    <NextImage src="/vion-logo-icon-white.png" alt="Vion AI" width={18} height={18} className="object-contain" />
                                </div>
                                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>


        </div>
    )
}
