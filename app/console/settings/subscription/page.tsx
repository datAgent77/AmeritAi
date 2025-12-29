"use client"

import { useLanguage } from "@/context/LanguageContext"
import { ContactForm } from "@/components/contact-form"
import { MessageSquare, Shield, Zap, ArrowRight, Check } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function SubscriptionPage() {
    const { language } = useLanguage()

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Hero Section inspired by Pricing Page */}
            <div className="text-center space-y-6 py-8 relative">
                {/* Background effects similar to pricing page but subtle for console */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-[100px] -z-10" />

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-4">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    {language === 'tr' ? 'Özel Çözümler' : 'Custom Solutions'}
                </div>

                <h1 className="text-4xl md:text-5xl font-bold tracking-tight max-w-3xl mx-auto leading-tight">
                    {language === 'tr'
                        ? 'İşletmeniz İçin En Uygun Planı Oluşturalım'
                        : 'Let\'s Build the Perfect Plan for Your Business'}
                </h1>

                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    {language === 'tr'
                        ? 'Her işletmenin ihtiyaçları farklıdır. Size özel ölçeklenebilir çözümler ve avantajlı fiyatlar için satış ekibimizle görüşün.'
                        : 'Every business is unique. Contact our sales team for scalable solutions and custom pricing tailored to your needs.'}
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-start">

                {/* Left Column: Value Props (Trust Indicators from Pricing Page + More) */}
                <div className="space-y-6">
                    <div className="grid gap-6">
                        <Card className="bg-card/50 border-primary/10">
                            <CardContent className="p-6 flex items-start gap-4">
                                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 shrink-0">
                                    <Zap className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">{language === 'tr' ? 'Hızlı Kurulum' : 'Fast Setup'}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {language === 'tr' ? 'Dakikalar içinde başlayın ve entegre olun.' : 'Get started and integrated in minutes.'}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-card/50 border-primary/10">
                            <CardContent className="p-6 flex items-start gap-4">
                                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500 shrink-0">
                                    <Shield className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">{language === 'tr' ? 'Kurumsal Güvenlik' : 'Enterprise Security'}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {language === 'tr' ? 'Verileriniz en yüksek güvenlik standartlarıyla korunur.' : 'Your data is protected with highest security standards.'}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-card/50 border-primary/10">
                            <CardContent className="p-6 flex items-start gap-4">
                                <div className="p-3 bg-green-500/10 rounded-xl text-green-500 shrink-0">
                                    <MessageSquare className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">{language === 'tr' ? '7/24 Destek' : '24/7 Support'}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {language === 'tr' ? 'Uzman ekibimiz her an yanınızda.' : 'Our expert team is always here to help.'}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Additional bullet points if needed to fill space */}
                    <div className="px-4">
                        <ul className="space-y-3">
                            {[
                                language === 'tr' ? 'Özel API Entegrasyonları' : 'Custom API Integrations',
                                language === 'tr' ? 'Öncelikli Özellik Geliştirme' : 'Priority Feature Development',
                                language === 'tr' ? 'Kişiselleştirilmiş Onboarding' : 'Personalized Onboarding'
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Check className="w-4 h-4 text-primary" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Right Column: Contact Form */}
                <Card className="border-primary/20 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -z-10" />
                    <CardContent className="p-6 sm:p-8">
                        <div className="mb-6">
                            <h3 className="text-xl font-semibold mb-2">
                                {language === 'tr' ? 'Bize Ulaşın' : 'Contact Us'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {language === 'tr'
                                    ? 'Formu doldurun, size özel teklifimizle geri dönelim.'
                                    : 'Fill out the form and we\'ll get back to you with a custom offer.'}
                            </p>
                        </div>
                        <ContactForm />
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}
