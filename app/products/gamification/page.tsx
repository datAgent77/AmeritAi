
"use client"

import { SolutionLayout } from "@/components/solutions/solution-layout"
import { useLanguage } from "@/context/LanguageContext"
import { Gamepad2, Gift, Dices } from "lucide-react"

export default function GamificationPage() {
    const { language } = useLanguage()

    return (
        <SolutionLayout
            title={language === 'tr' ? "Oyunlaştırma & Sadakat" : "Gamification & Loyalty"}
            subtitle={language === 'tr'
                ? "Sıkıcı pop-up'lar yerine eğlenceli oyunlarla e-posta toplayın ve satışları artırın."
                : "Collect emails and boost sales with fun games instead of boring pop-ups."}
            icon={<Gamepad2 className="w-5 h-5 text-purple-500" />}
            features={[
                {
                    title: language === 'tr' ? "Çarkıfelek (Spin-to-Win)" : "Spin-to-Win",
                    description: language === 'tr'
                        ? "Ziyaretçilere indirim kazanma şansı vererek e-posta bülteninize abone olmalarını sağlayın."
                        : "Get visitors to subscribe to your newsletter by giving them a chance to win discounts.",
                    icon: <Dices className="w-6 h-6 text-pink-400" />
                },
                {
                    title: language === 'tr' ? "Çıkış Niyeti (Exit Intent)" : "Exit Intent",
                    description: language === 'tr'
                        ? "Kullanıcı tam siteden çıkacakken 'Dur, şansını dene!' diyerek onu geri kazanın."
                        : "Win back the user just as they are about to leave by saying 'Wait, try your luck!'.",
                    icon: <Gamepad2 className="w-6 h-6 text-purple-400" />
                },
                {
                    title: language === 'tr' ? "Sadakat Puanları" : "Loyalty Points",
                    description: language === 'tr'
                        ? "Tekrarlayan müşterilerinize dijital damga kartı veya puan sistemi sunun."
                        : "Offer digital stamp cards or points systems to your recurring customers.",
                    icon: <Gift className="w-6 h-6 text-yellow-400" />
                }
            ]}
            promptExample={{
                user: language === 'tr' ? "[Çark Çevrildi] %20 İndirim Kazandınız!" : "[Wheel Spun] You Won 20% Off!",
                ai: language === 'tr'
                    ? "Tebrikler! 🎉 %20 İndirim kodunuz: SANSLI20. Bu kodu 15 dakika içinde kullanırsanız ekstra kargo bedava! Hemen kullanmak ister misiniz?"
                    : "Congratulations! 🎉 Your 20% Off code: LUCKY20. Use it within 15 minutes for extra free shipping! Want to use it now?"
            }}
        />
    )
}
