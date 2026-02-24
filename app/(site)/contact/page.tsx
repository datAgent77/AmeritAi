"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle2 } from "lucide-react"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { PublicBreadcrumb } from "@/components/public-breadcrumb"
import { trackLeadGenerated } from "@/lib/marketing-tracking"


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
                trackLeadGenerated('contact_form', {
                    form_name: 'contact_form',
                    subject: formData.subject,
                    language
                })
                toast({
                    title: language === 'tr' ? 'Mesaj Gönderildi' : 'Message Sent',
                    description: language === 'tr' ? 'En kısa sürede size dönüş yapacağız.' : 'We will get back to you soon.'
                })
            } else {
                const data = await response.json()
                throw new Error(data.error || 'Failed to send')
            }
        } catch (error: any) {
            const isAuthIssue = String(error?.message || '').toLowerCase().includes('authentication')
            toast({
                title: language === 'tr' ? 'Hata' : 'Error',
                description: isAuthIssue
                    ? (language === 'tr'
                        ? 'E-posta servisi geçici olarak yapılandırılamadı. Lütfen daha sonra tekrar deneyin.'
                        : 'Email service is temporarily unavailable. Please try again later.')
                    : (language === 'tr'
                        ? 'Mesaj gönderilemedi. Lütfen tekrar deneyin.'
                        : 'Failed to send message. Please try again.'),
                variant: 'destructive'
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-background text-foreground font-sans flex flex-col relative overflow-hidden">
            <PublicHeader />

            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] pointer-events-none z-0" />

            {/* Breadcrumb */}
            {/* Breadcrumb */}
            <PublicBreadcrumb 
                items={[
                    { label: language === 'tr' ? 'İletişim' : 'Contact' }
                ]} 
            />

            {/* Hero */}
            <section className="relative pt-12 pb-16 overflow-hidden border-b border-border">
                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-2xl mx-auto text-center space-y-4 animate-in fade-in zoom-in-95 duration-700">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
                            {language === 'tr' ? 'Bize Ulaşın' : 'Contact Us'}
                        </h1>
                        <p className="text-lg text-muted-foreground font-light">
                            {language === 'tr'
                                ? 'Sorularınız için buradayız. Demo talep edin veya destek alın.'
                                : 'We\'re here for your questions. Request a demo or get support.'}
                        </p>
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section className="py-16 relative z-10 flex-1">
                <div className="container mx-auto px-4">
                    <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">

                        {/* Contact Form */}
                        <div className="bg-card/80 border border-border rounded-3xl p-8 backdrop-blur-sm shadow-lg">
                            {isSubmitted ? (
                                <div className="text-center py-12 animate-in fade-in zoom-in">
                                    <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
                                    <h3 className="text-2xl font-bold mb-2 text-foreground">
                                        {language === 'tr' ? 'Teşekkürler!' : 'Thank You!'}
                                    </h3>
                                    <p className="text-muted-foreground">
                                        {language === 'tr'
                                            ? 'Mesajınızı aldık. En kısa sürede size dönüş yapacağız.'
                                            : 'We received your message. We will get back to you soon.'}
                                    </p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name" className="text-muted-foreground">{language === 'tr' ? 'İsim' : 'Name'} *</Label>
                                            <Input
                                                id="name"
                                                required
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="bg-background/50 border-input focus:border-ring text-foreground placeholder:text-muted-foreground"
                                                placeholder={language === 'tr' ? 'Adınız Soyadınız' : 'Your Name'}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-muted-foreground">{language === 'tr' ? 'E-posta' : 'Email'} *</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="bg-background/50 border-input focus:border-ring text-foreground placeholder:text-muted-foreground"
                                                placeholder="you@company.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="company" className="text-muted-foreground">{language === 'tr' ? 'Şirket' : 'Company'}</Label>
                                            <Input
                                                id="company"
                                                value={formData.company}
                                                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                                className="bg-background/50 border-input focus:border-ring text-foreground placeholder:text-muted-foreground"
                                                placeholder={language === 'tr' ? 'Şirket Adı' : 'Company Name'}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="subject" className="text-muted-foreground">{language === 'tr' ? 'Konu' : 'Subject'}</Label>
                                            <select
                                                id="subject"
                                                value={formData.subject}
                                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                                className="w-full h-10 rounded-md bg-background/50 border border-input px-3 text-sm text-foreground focus:outline-none focus:border-ring"
                                            >
                                                <option value="general">{language === 'tr' ? 'Genel Soru' : 'General Question'}</option>
                                                <option value="demo">{language === 'tr' ? 'Demo Talebi' : 'Demo Request'}</option>
                                                <option value="support">{language === 'tr' ? 'Teknik Destek' : 'Technical Support'}</option>
                                                <option value="partnership">{language === 'tr' ? 'İş Ortaklığı' : 'Partnership'}</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="message" className="text-muted-foreground">{language === 'tr' ? 'Mesaj' : 'Message'} *</Label>
                                        <Textarea
                                            id="message"
                                            required
                                            rows={5}
                                            value={formData.message}
                                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                            className="bg-background/50 border-input focus:border-ring text-foreground placeholder:text-muted-foreground"
                                            placeholder={language === 'tr' ? 'Mesajınızı buraya yazın...' : 'Write your message here...'}
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
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
                                <h2 className="text-2xl font-bold mb-6 text-foreground">
                                    {language === 'tr' ? 'İletişim Bilgileri' : 'Contact Information'}
                                </h2>
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center flex-shrink-0 border border-border">
                                            <Mail className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold mb-1 text-foreground">{language === 'tr' ? 'E-posta' : 'Email'}</h3>
                                            <a href="mailto:info@userex.com.tr" className="text-muted-foreground hover:text-foreground transition-colors">
                                                info@userex.com.tr
                                            </a>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center flex-shrink-0 border border-border">
                                            <Phone className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold mb-1 text-foreground">{language === 'tr' ? 'Telefon' : 'Phone'}</h3>
                                            <a href="tel:+905443357784" className="text-muted-foreground hover:text-foreground transition-colors">
                                                0 544 335 77 84
                                            </a>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center flex-shrink-0 border border-border">
                                            <MapPin className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold mb-1 text-foreground">{language === 'tr' ? 'Adres' : 'Address'}</h3>
                                            <p className="text-muted-foreground">
                                                Caferağa Mh. Şifa Sk. No:19<br />
                                                Kadıköy / İstanbul / Turkey
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Links */}
                            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                                <h3 className="font-semibold mb-4 text-foreground">
                                    {language === 'tr' ? 'Hızlı Bağlantılar' : 'Quick Links'}
                                </h3>
                                <div className="space-y-3">
                                    <a href="/pricing" className="block text-muted-foreground hover:text-foreground transition-colors">
                                        → {language === 'tr' ? 'Fiyatlandırma' : 'Pricing'}
                                    </a>
                                    <a href="/why-us" className="block text-muted-foreground hover:text-foreground transition-colors">
                                        → {language === 'tr' ? 'Neden Vion?' : 'Why Vion?'}
                                    </a>
                                    <a href="/industries" className="block text-muted-foreground hover:text-foreground transition-colors">
                                        → {language === 'tr' ? 'Sektörler' : 'Industries'}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="relative z-10">
                <PublicFooter />
            </div>
        </div>
    )
}
