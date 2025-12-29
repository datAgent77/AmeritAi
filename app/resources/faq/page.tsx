
"use client"

import { useEffect, useState } from "react"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { useLanguage } from "@/context/LanguageContext"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"

interface FaqItem {
    id: string;
    question: { en: string; tr: string };
    answer: { en: string; tr: string };
    category: string;
}

export default function FaqPage() {
    const { t, language } = useLanguage()
    const [faqs, setFaqs] = useState<FaqItem[]>([])

    useEffect(() => {
        fetch('/api/cms/faq')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setFaqs(data)
            })
            .catch(err => console.error(err))
    }, [])

    return (
        <div className="min-h-screen bg-black text-white font-sans">
            <PublicHeader />

            <section className="pt-32 pb-20 relative overflow-hidden">
                <div className="container mx-auto px-4 relative z-10 max-w-3xl text-center mb-16">
                    <Badge variant="outline" className="mb-6 border-purple-500/30 text-purple-300">
                        {language === 'tr' ? 'Yardım & Destek' : 'Help & Support'}
                    </Badge>
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                        {t('faqTitle') || "Frequently Asked Questions"}
                    </h1>
                    <p className="text-xl text-zinc-400">
                        {language === 'tr'
                            ? 'Vion hakkında en çok merak edilen soruların cevapları.'
                            : 'Answers to the most common questions about Vion.'}
                    </p>
                </div>

                <div className="container mx-auto px-4 max-w-3xl">
                    <div className="space-y-4">
                        <Accordion type="single" collapsible className="w-full">
                            {faqs.map((faq) => (
                                <AccordionItem key={faq.id} value={faq.id} className="border-white/10 px-4 rounded-lg mb-4 bg-white/5 hover:bg-white/[0.07] transition-colors data-[state=open]:bg-white/10 data-[state=open]:border-white/20">
                                    <AccordionTrigger className="text-left text-lg py-6 hover:no-underline">
                                        {faq.question[language as 'en' | 'tr']}
                                    </AccordionTrigger>
                                    <AccordionContent className="text-zinc-400 pb-6 text-base leading-relaxed">
                                        {faq.answer[language as 'en' | 'tr']}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                </div>
            </section>

            <PublicFooter />
        </div>
    )
}
