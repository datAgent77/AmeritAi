
"use client"

import { SolutionLayout } from "@/components/solutions/solution-layout"
import { useLanguage } from "@/context/LanguageContext"
import { ShoppingBag, ScanBarcode, UserCheck } from "lucide-react"

export default function PersonalShopperPage() {
    const { language } = useLanguage()

    return (
        <SolutionLayout
            title={language === 'tr' ? "Kişisel Alışveriş Asistanı" : "Personal Shopping Assistant"}
            subtitle={language === 'tr'
                ? "Müşterilerinizin stilini tanıyan, beden önerisi yapan ve satışları artıran yapay zeka."
                : "AI that knows your customers' style, suggests sizes, and boosts sales."}
            icon={<ShoppingBag className="w-5 h-5 text-pink-400" />}
            features={[
                {
                    title: language === 'tr' ? "Görsel Arama" : "Visual Search",
                    description: language === 'tr'
                        ? "Müşteri 'Buna benzer bir şey var mı?' diyerek fotoğraf yükler, AI en yakın ürünleri bulur."
                        : "Customer uploads a photo saying 'Do you have something like this?', AI finds the closest products.",
                    icon: <ScanBarcode className="w-6 h-6 text-purple-400" />
                },
                {
                    title: language === 'tr' ? "Beden & Fit Önerisi" : "Size & Fit Recommendation",
                    description: language === 'tr'
                        ? "Müşterinin boy/kilo bilgilerini alarak iade oranlarını düşüren en doğru bedeni önerir."
                        : "Recommends the right size based on height/weight, reducing return rates.",
                    icon: <UserCheck className="w-6 h-6 text-blue-400" />
                },
                {
                    title: language === 'tr' ? "Kombin Önerileri" : "Outfit Suggestions",
                    description: language === 'tr'
                        ? "Satın alınan bir pantolonun üzerine yakışacak gömlekleri otomatik olarak sunar."
                        : "Automatically suggests shirts that go well with the purchased trousers.",
                    icon: <ShoppingBag className="w-6 h-6 text-pink-400" />
                }
            ]}
            promptExample={{
                user: language === 'tr' ? "Mavi bir kot ceket arıyorum ama çok dar olmasın." : "I'm looking for a blue denim jacket, but not too tight.",
                ai: language === 'tr'
                    ? "Oversize kesimlerimize bayılacaksınız! 'Vintage Wash Denim' modelimiz tam istediğiniz gibi rahat kalıptır. Bedeninizi öğrenebilir miyim? Sizin için stok kontrolü yapayım."
                    : "You'll love our oversize cuts! Our 'Vintage Wash Denim' model is exactly the relaxed fit you want. May I ask your size? let me check the stock for you."
            }}
        />
    )
}
