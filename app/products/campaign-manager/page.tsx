
"use client"

import { SolutionLayout } from "@/components/solutions/solution-layout"
import { useLanguage } from "@/context/LanguageContext"
import { Megaphone, Timer, CloudRain } from "lucide-react"

export default function CampaignManagerPage() {
    const { language } = useLanguage()

    return (
        <SolutionLayout
            title={language === 'tr' ? "Akıllı Kampanya Yöneticisi" : "Smart Campaign Manager"}
            subtitle={language === 'tr'
                ? "Hava durumu, stok durumu veya saat dilimine göre otomatik değişen dinamik kampanyalar yaratın."
                : "Create dynamic campaigns that automatically change based on weather, stock, or time zone."}
            icon={<Megaphone className="w-5 h-5 text-red-500" />}
            features={[
                {
                    title: language === 'tr' ? "Bağlamsal Tetikleyiciler" : "Contextual Triggers",
                    description: language === 'tr'
                        ? "Yağmur yağdığında 'Şemsiye %30 İndirim' veya akşam saatinde 'Akşam Yemeği Fırsatı' sunun."
                        : "Offer '30% Off Umbrellas' when it rains or 'Dinner Deal' during evening hours.",
                    icon: <CloudRain className="w-6 h-6 text-blue-300" />
                },
                {
                    title: language === 'tr' ? "Stok Eritme Modu" : "Stock Clearance Mode",
                    description: language === 'tr'
                        ? "Stokta fazla kalan ürünleri tespit eder ve bunları otomatik olarak sohbette öne çıkarır."
                        : "Identifies overstock items and automatically highlights them in the chat.",
                    icon: <Timer className="w-6 h-6 text-orange-400" />
                },
                {
                    title: language === 'tr' ? "Kişiye Özel İndirim" : "Personalized Discount",
                    description: language === 'tr'
                        ? "Her müşteriye aynı indirimi vermek yerine, sadece kararsız kalanlara özel teklif sunar."
                        : "Instead of giving everyone the same discount, offers special deals only to hesitant customers.",
                    icon: <Megaphone className="w-6 h-6 text-red-500" />
                }
            ]}
            promptExample={{
                user: language === 'tr' ? "Hava çok sıcak, serinletici ne var?" : "It's so hot, what do you have for cooling off?",
                ai: language === 'tr'
                    ? "Sıcaklar bastırdı değil mi? ☀️ Tam şu an 'Buzz Gibi Soğuk Kahve'lerimizde %50 İndirim kampanyası başladı! (Sadece 2 saat geçerli). Bir tane hazırlayalım mı?"
                    : "Heatwave, right? ☀️ A 50% Employee Discount on 'Ice Cold Coffees' just started right now! (Valid for 2 hours only). Shall we prepare one?"
            }}
        />
    )
}
