"use client"

import { useLanguage } from "@/context/LanguageContext"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

export function FAQSection() {
    const { t } = useLanguage()

    return (
        <section className="py-32 bg-zinc-950/30 border-t border-white/5">
            <div className="container mx-auto px-4 max-w-3xl">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        {t('faqTitle')}
                    </h2>
                </div>

                <Accordion type="single" collapsible className="w-full space-y-4">
                    {[1, 2, 3, 4, 5].map((num) => (
                        <AccordionItem key={num} value={`item-${num}`} className="border-white/5 bg-zinc-900/30 px-6 rounded-2xl overflow-hidden">
                            <AccordionTrigger className="text-white hover:no-underline text-left py-6">
                                {t(`faqQ${num}`)}
                            </AccordionTrigger>
                            <AccordionContent className="text-zinc-400 pb-6 leading-relaxed">
                                {t(`faqA${num}`)}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "FAQPage",
                            "mainEntity": [1, 2, 3, 4, 5].map(num => ({
                                "@type": "Question",
                                "name": t(`faqQ${num}`),
                                "acceptedAnswer": {
                                    "@type": "Answer",
                                    "text": t(`faqA${num}`)
                                }
                            }))
                        })
                    }}
                />
            </div>
        </section>
    )
}
