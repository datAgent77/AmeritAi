
"use client"

import { SolutionLayout } from "@/components/solutions/solution-layout"
import { useLanguage } from "@/context/LanguageContext"
import { QrCode, Globe, UtensilsCrossed } from "lucide-react"

export default function RestaurantMenuPage() {
    const { language } = useLanguage()

    return (
        <SolutionLayout
            title={language === 'tr' ? "Dijital & Akıllı Menü" : "Digital & Smart Menu"}
            subtitle={language === 'tr'
                ? "Sadece bir liste değil. Sorulara cevap veren, satış yapan ve çok dilli çalışan interaktif menü."
                : "Not just a list. An interactive menu that answers questions, sells, and speaks multiple languages."}
            icon={<UtensilsCrossed className="w-5 h-5 text-orange-400" />}
            features={[
                {
                    title: language === 'tr' ? "QR Entegrasyonu" : "QR Integration",
                    description: language === 'tr'
                        ? "Mevcut QR kodlarınızla çalışır. Uygulama indirmeye gerek kalmadan tarayıcıda açılır."
                        : "Works with your existing QR codes. Opens in browser without downloading an app.",
                    icon: <QrCode className="w-6 h-6 text-white" />
                },
                {
                    title: language === 'tr' ? "Alerjen Filtresi" : "Allergen Filter",
                    description: language === 'tr'
                        ? "Müşteriler 'Fıstıksız tatlılar' veya 'Vegan seçenekler' diye sorduğunda anında liste sunar."
                        : "Instantly lists items when customers ask for 'Nut-free desserts' or 'Vegan options'.",
                    icon: <UtensilsCrossed className="w-6 h-6 text-red-400" />
                },
                {
                    title: language === 'tr' ? "100+ Dil Desteği" : "100+ Language Support",
                    description: language === 'tr'
                        ? "Google Gemini altyapısı ile menünüzü ve açıklamaları anında müşterinin diline çevirir."
                        : "Instantly translates your menu and descriptions to the customer's language using Google Gemini infrastructure.",
                    icon: <Globe className="w-6 h-6 text-blue-400" />
                }
            ]}
            promptExample={{
                user: language === 'tr' ? "Acı olmayan, çocuklara uygun ne önerirsin?" : "What do you recommend for kids that isn't spicy?",
                ai: language === 'tr'
                    ? "Minik misafirlerimiz için 'Ev Yapımı Köfte' veya 'Domates Soslu Makarna' harika seçenekler. İkisi de acısızdır ve çok sevilir. Yanına ev yapımı limonata ekleyelim mi?"
                    : "For our little guests, 'Homemade Meatballs' or 'Pasta with Tomato Sauce' are great choices. Both are non-spicy and very popular. Shall we add a homemade lemonade with that?"
            }}
        />
    )
}
