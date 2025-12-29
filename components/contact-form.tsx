"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Send, Loader2, CheckCircle2 } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"

export function ContactForm() {
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

    if (isSubmitted) {
        return (
            <div className="text-center py-12 animate-in fade-in zoom-in">
                <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">
                    {language === 'tr' ? 'Teşekkürler!' : 'Thank You!'}
                </h3>
                <p className="text-muted-foreground">
                    {language === 'tr'
                        ? 'Mesajınızı aldık. En kısa sürede size dönüş yapacağız.'
                        : 'We received your message. We will get back to you soon.'}
                </p>
                <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => {
                        setIsSubmitted(false)
                        setFormData({ name: '', email: '', company: '', subject: 'general', message: '' })
                    }}
                >
                    {language === 'tr' ? 'Yeni Mesaj Gönder' : 'Send New Message'}
                </Button>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">{language === 'tr' ? 'İsim' : 'Name'} *</Label>
                    <Input
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={language === 'tr' ? 'Adınız Soyadınız' : 'Your Name'}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">{language === 'tr' ? 'E-posta' : 'Email'} *</Label>
                    <Input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="you@company.com"
                    />
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="company">{language === 'tr' ? 'Şirket' : 'Company'}</Label>
                    <Input
                        id="company"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        placeholder={language === 'tr' ? 'Şirket Adı' : 'Company Name'}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="subject">{language === 'tr' ? 'Konu' : 'Subject'}</Label>
                    <select
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="general">{language === 'tr' ? 'Genel Soru' : 'General Question'}</option>
                        <option value="demo">{language === 'tr' ? 'Demo Talebi' : 'Demo Request'}</option>
                        <option value="support">{language === 'tr' ? 'Teknik Destek' : 'Technical Support'}</option>
                        <option value="partnership">{language === 'tr' ? 'İş Ortaklığı' : 'Partnership'}</option>
                        <option value="billing">{language === 'tr' ? 'Fatura / Ödeme' : 'Billing / Payment'}</option>
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="message">{language === 'tr' ? 'Mesaj' : 'Message'} *</Label>
                <Textarea
                    id="message"
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder={language === 'tr' ? 'Mesajınızı buraya yazın...' : 'Write your message here...'}
                />
            </div>

            <Button
                type="submit"
                className="w-full"
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
    )
}
