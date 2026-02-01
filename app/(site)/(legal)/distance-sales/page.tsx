"use client"

import { useLanguage } from "@/context/LanguageContext"
import { legalTexts } from "@/lib/legal-texts"

export default function DistanceSalesPage() {
  const { language } = useLanguage()
  const t = legalTexts[language === 'tr' ? 'tr' : 'en'].distanceSales

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto prose prose-slate dark:prose-invert">
          <h1>{t.title}</h1>
          <p className="lead text-xl text-muted-foreground mb-8">
            {t.lead}
          </p>
          <div dangerouslySetInnerHTML={{ __html: t.content }} />
        </div>
      </div>
    </div>
  )
}
