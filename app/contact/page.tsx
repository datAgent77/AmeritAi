"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle2, Home, ChevronRight } from "lucide-react"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { HeroBackgroundGradient } from "@/components/landing/hero-background-gradient"

export default function ContactPage() {
    const { language } = useLanguage()
    const { toast } = useToast()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        company: '',
        subject: 'general',
        message: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (response.ok) {
                setIsSubmitted(true)
                toast({
                    title: language === 'tr' ? 'Mesaj Gönderildi' : 'Message Sent',
                    description: language === 'tr' ? 'En kısa sürede size dönüş yapacağız.' : 'We will get back to you soon.'
                })
            } else {
                throw new Error('Failed to send')
            }
        } catch (error) {
            toast({
                title: language === 'tr' ? 'Hata' : 'Error',
                description: language === 'tr' ? 'Mesaj gönderilemedi. Lütfen tekrar deneyin.' : 'Failed to send message. Please try again.',
                variant: 'destructive'
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="dark min-h-screen bg-black text-white selection:bg-white/20 font-sans relative overflow-hidden">
            <PublicHeader transparent={true} />

            <div className="absolute top-0 left-0 w-full h-[120vh] min-h-[800px] overflow-hidden -z-10">
                <HeroBackgroundGradient />
            </div>

            {/* Breadcrumb */}
            <div className="container mx-auto px-4 pt-24 pb-4 relative z-10">
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Link href="/" className="hover:text-white transition-colors flex items-center gap-1">
                        <Home className="w-4 h-4" />
                        Home
                    </Link>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-white">{language === 'tr' ? 'İletişim' : 'Contact'}</span>
                </div>
            </div>

            {/* Hero */}
            <section className="relative pt-12 pb-16 overflow-hidden border-b border-white/5">
                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-2xl mx-auto text-center space-y-4 animate-in fade-in zoom-in-95 duration-700">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
                            {language === 'tr' ? 'Bize Ulaşın' : 'Contact Us'}
                        </h1>
                        <p className="text-lg text-zinc-400 font-light">
                            {language === 'tr'
                                ? 'Sorularınız için buradayız. Demo talep edin veya destek alın.'
                                : 'We\'re here for your questions. Request a demo or get support.'}
                        </p>
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section className="py-16 relative z-10">
                <div className="container mx-auto px-4">
                    <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">

                        {/* Contact Form */}
                        <div className="bg-white/5 border border-white/5 rounded-3xl p-8 backdrop-blur-sm">
                            {isSubmitted ? (
                                <div className="text-center py-12 animate-in fade-in zoom-in">
                                    <CheckCircle2 className="w-16 h-16 text-white mx-auto mb-4" />
                                    <h3 className="text-2xl font-bold mb-2">
                                        {language === 'tr' ? 'Teşekkürler!' : 'Thank You!'}
                                    </h3>
                                    <p className="text-zinc-500">
                                        {language === 'tr'
                                            ? 'Mesajınızı aldık. En kısa sürede size dönüş yapacağız.'
                                            : 'We received your message. We will get back to you soon.'}
                                    </p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name" className="text-zinc-400">{language === 'tr' ? 'İsim' : 'Name'} *</Label>
                                            <Input
                                                id="name"
                                                required
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="bg-black/50 border-white/10 focus:border-white/20 text-white placeholder:text-zinc-600"
                                                placeholder={language === 'tr' ? 'Adınız Soyadınız' : 'Your Name'}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-zinc-400">{language === 'tr' ? 'E-posta' : 'Email'} *</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="bg-black/50 border-white/10 focus:border-white/20 text-white placeholder:text-zinc-600"
                                                placeholder="you@company.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="company" className="text-zinc-400">{language === 'tr' ? 'Şirket' : 'Company'}</Label>
                                            <Input
                                                id="company"
                                                value={formData.company}
                                                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                                className="bg-black/50 border-white/10 focus:border-white/20 text-white placeholder:text-zinc-600"
                                                placeholder={language === 'tr' ? 'Şirket Adı' : 'Company Name'}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="subject" className="text-zinc-400">{language === 'tr' ? 'Konu' : 'Subject'}</Label>
                                            <select
                                                id="subject"
                                                value={formData.subject}
                                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                                className="w-full h-10 rounded-md bg-black/50 border border-white/10 px-3 text-sm text-white focus:outline-none focus:border-white/20"
                                            >
                                                <option value="general">{language === 'tr' ? 'Genel Soru' : 'General Question'}</option>
                                                <option value="demo">{language === 'tr' ? 'Demo Talebi' : 'Demo Request'}</option>
                                                <option value="support">{language === 'tr' ? 'Teknik Destek' : 'Technical Support'}</option>
                                                <option value="partnership">{language === 'tr' ? 'İş Ortaklığı' : 'Partnership'}</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="message" className="text-zinc-400">{language === 'tr' ? 'Mesaj' : 'Message'} *</Label>
                                        <Textarea
                                            id="message"
                                            required
                                            rows={5}
                                            value={formData.message}
                                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                            className="bg-black/50 border-white/10 focus:border-white/20 text-white placeholder:text-zinc-600"
                                            placeholder={language === 'tr' ? 'Mesajınızı buraya yazın...' : 'Write your message here...'}
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-medium"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4 mr-2" />
                                                {language === 'tr' ? 'Gönder' : 'Send Message'}
                                            </>
                                        )}
                                    </Button>
                                </form>
                            )}
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-8">
                            <div>
                                <h2 className="text-2xl font-bold mb-6 text-white">
                                    {language === 'tr' ? 'İletişim Bilgileri' : 'Contact Information'}
                                </h2>
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                                            <Mail className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold mb-1 text-white">{language === 'tr' ? 'E-posta' : 'Email'}</h3>
                                            <a href="mailto:info@userex.com.tr" className="text-zinc-400 hover:text-white transition-colors">
                                                info@userex.com.tr
                                            </a>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                                            <Phone className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold mb-1 text-white">{language === 'tr' ? 'Telefon' : 'Phone'}</h3>
                                            <a href="tel:+905443357784" className="text-zinc-400 hover:text-white transition-colors">
                                                0 544 335 77 84
                                            </a>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                                            <MapPin className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold mb-1 text-white">{language === 'tr' ? 'Adres' : 'Address'}</h3>
                                            <p className="text-zinc-400">
                                                Caferağa Mh. Şifa Sk. No:19<br />
                                                Kadıköy / İstanbul / Turkey
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Links */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <h3 className="font-semibold mb-4 text-white">
                                    {language === 'tr' ? 'Hızlı Bağlantılar' : 'Quick Links'}
                                </h3>
                                <div className="space-y-3">
                                    <a href="/pricing" className="block text-zinc-400 hover:text-white transition-colors">
                                        → {language === 'tr' ? 'Fiyatlandırma' : 'Pricing'}
                                    </a>
                                    <a href="/why-us" className="block text-zinc-400 hover:text-white transition-colors">
                                        → {language === 'tr' ? 'Neden Vion?' : 'Why Vion?'}
                                    </a>
                                    <a href="/industries" className="block text-zinc-400 hover:text-white transition-colors">
                                        → {language === 'tr' ? 'Sektörler' : 'Industries'}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <PublicFooter />
        </div>
    )
}
