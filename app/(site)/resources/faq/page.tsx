"use client"

import { useEffect, useState } from "react"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { useLanguage } from "@/context/LanguageContext"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Search, MessageCircleQuestion, Phone, Mail } from "lucide-react"

interface FaqItem {
    id: string;
    question: { en: string; tr: string };
    answer: { en: string; tr: string };
    category: string;
}

export default function FaqPage() {
    const { t, language } = useLanguage()
    const [faqs, setFaqs] = useState<FaqItem[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [activeCategory, setActiveCategory] = useState("all")

    useEffect(() => {
        fetch('/api/cms/faq')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setFaqs(data)
            })
            .catch(err => console.error(err))
    }, [])

    // Get unique categories (mapped for display if needed)
    // For simplicity, we'll rely on the raw category strings from seed data
    // Ideally we should translate these categories.
    const categories = [
        { id: 'all', label: { en: 'All Questions', tr: 'Tüm Sorular' } },
        { id: 'general', label: { en: 'General', tr: 'Genel' } },
        { id: 'pricing', label: { en: 'Pricing', tr: 'Fiyatlandırma' } },
        { id: 'integration', label: { en: 'Integration', tr: 'Entegrasyon' } },
        { id: 'customization', label: { en: 'Customization', tr: 'Özelleştirme' } },
        { id: 'security', label: { en: 'Security', tr: 'Güvenlik' } }
    ]

    const filteredFaqs = faqs.filter(faq => {
        const matchesCategory = activeCategory === 'all' || faq.category.toLowerCase() === activeCategory;
        const q = searchQuery.toLowerCase();
        const matchesSearch =
            faq.question[language as 'en' | 'tr']?.toLowerCase().includes(q) ||
            faq.answer[language as 'en' | 'tr']?.toLowerCase().includes(q);

        return matchesCategory && matchesSearch;
    })

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-purple-500/30">
            <PublicHeader />

            {/* Hero */}
            <section className="pt-32 pb-16 relative overflow-hidden border-b border-border bg-background">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/10 via-background to-background opacity-40" />

                <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
                    <Badge variant="outline" className="mb-6 border-purple-500/30 text-purple-600 dark:text-purple-300 bg-purple-500/10 px-4 py-1">
                        {language === 'tr' ? 'Yardım Merkezi' : 'Help Center'}
                    </Badge>
                    <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight text-foreground">
                        {t('faqTitle') || (language === 'tr' ? "Nasıl yardımcı olabiliriz?" : "How can we help?")}
                    </h1>
                    <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto font-light">
                        {language === 'tr'
                            ? 'Vion hakkında merak ettiğiniz her şeyi burada bulabilirsiniz.'
                            : 'Find answers to all your questions about Vion.'}
                    </p>

                    {/* Search Bar */}
                    <div className="relative max-w-xl mx-auto">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder={language === 'tr' ? "Soru arayın..." : "Search for questions..."}
                            className="w-full pl-12 pr-4 h-14 bg-muted/50 border-input rounded-full text-lg focus:ring-purple-500/50 focus:border-purple-500/50 transition-all placeholder:text-muted-foreground"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </section>

            {/* FAQ Content */}
            <section className="py-16 md:py-24">
                <div className="container mx-auto px-4 max-w-5xl">

                    {/* Categories Tabs */}
                    <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory} className="mb-12">
                        <TabsList className="w-full flex flex-wrap justify-center h-auto gap-2 bg-transparent">
                            {categories.map((cat) => (
                                <TabsTrigger
                                    key={cat.id}
                                    value={cat.id}
                                    className="px-6 py-3 rounded-full border border-border bg-muted/50 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:border-foreground transition-all text-muted-foreground"
                                >
                                    {cat.label[language as 'en' | 'tr']}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>

                    {/* Accordion List */}
                    <div className="space-y-4 min-h-[400px]">
                        {filteredFaqs.length > 0 ? (
                            <Accordion type="single" collapsible className="w-full space-y-4">
                                {filteredFaqs.map((faq) => (
                                    <AccordionItem key={faq.id} value={faq.id} className="border border-border px-6 rounded-2xl bg-card hover:bg-muted/50 hover:border-foreground/20 transition-all duration-300">
                                        <AccordionTrigger className="text-left text-lg font-medium py-6 hover:no-underline text-foreground/90 hover:text-foreground">
                                            {faq.question[language as 'en' | 'tr']}
                                        </AccordionTrigger>
                                        <AccordionContent className="text-muted-foreground pb-6 text-base leading-relaxed font-light">
                                            {faq.answer[language as 'en' | 'tr']}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        ) : (
                            <div className="text-center py-20 text-muted-foreground">
                                <MessageCircleQuestion className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>{language === 'tr' ? "Sonuç bulunamadı." : "No results found."}</p>
                            </div>
                        )}
                    </div>

                    {/* Contact Support CTA */}
                    <div className="mt-20 pt-16 border-t border-border text-center">
                        <h3 className="text-2xl font-bold text-foreground mb-4">
                            {language === 'tr' ? "Aradığınızı bulamadınız mı?" : "Still have questions?"}
                        </h3>
                        <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                            {language === 'tr'
                                ? "Destek ekibimiz size yardımcı olmaktan mutluluk duyacaktır."
                                : "Our support team is always ready to help you."}
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <button className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-secondary hover:bg-secondary/80 border border-border transition-colors text-foreground">
                                <Mail className="w-4 h-4" /> info@getvion.com
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <PublicFooter />

            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "FAQPage",
                        "mainEntity": faqs.map(faq => ({
                            "@type": "Question",
                            "name": faq.question[language as 'en' | 'tr'],
                            "acceptedAnswer": {
                                "@type": "Answer",
                                "text": faq.answer[language as 'en' | 'tr']
                            }
                        }))
                    })
                }}
            />
        </div>
    )
}
