
"use client"

import { SolutionLayout } from "@/components/solutions/solution-layout"
import { useLanguage } from "@/context/LanguageContext"
import { Eye, Camera, Scan } from "lucide-react"

export default function VisualDiagnosisPage() {
    const { language } = useLanguage()

    return (
        <SolutionLayout
            title={language === 'tr' ? "Görsel Tanı & Analiz" : "Visual Diagnosis & Analysis"}
            subtitle={language === 'tr'
                ? "Müşterileriniz fotoğraf göndersin, yapay zeka anında analiz edip sorunu çözsün. Tarım, Cilt Bakımı ve Teknik Destek için."
                : "Let customers upload photos, AI instantly analyzes and solves the problem. For Agriculture, Skincare, and Tech Support."}
            icon={<Eye className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
            features={[
                {
                    title: language === 'tr' ? "Multimodal Analiz" : "Multimodal Analysis",
                    description: language === 'tr'
                        ? "GPT-4o Vision teknolojisi ile görseldeki nesneleri, sorunları veya metinleri insan hassasiyetinde tanır."
                        : "Recognizes objects, issues, or text in images with human-like precision using GPT-4o Vision technology.",
                    icon: <Scan className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                },
                {
                    title: language === 'tr' ? "Teknik Arıza Tespiti" : "Technical Issue Detect",
                    description: language === 'tr'
                        ? "Kullanıcı bozuk cihazın fotoğrafını atar, AI modelini ve muhtemel arızayı tespit eder."
                        : "User uploads a photo of the broken device, AI identifies the model and potential fault.",
                    icon: <Camera className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
                },
                {
                    title: language === 'tr' ? "Cilt & Güzellik (Demo)" : "Skin & Beauty (Demo)",
                    description: language === 'tr'
                        ? "Cilt tipi analizi yaparak kişiye özel krem veya bakım ürünleri önerir."
                        : "Analyzes skin type and suggests personalized cream or care products.",
                    icon: <Eye className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                }
            ]}
            promptExample={{
                user: language === 'tr' ? "[Fotoğraf: Kırmızı lekeli bir yüz] Cildimde bunlar çıktı, hangi kremi kullanmalıyım?" : "[Photo: Face with red spots] I have these on my skin, which cream should I use?",
                ai: language === 'tr'
                    ? "Fotoğrafı inceledim. Cildinizde hassasiyet ve kızarıklık görünüyor. Yatıştırıcı etkisi olan 'Aloe Vera & Panthenol' içerikli nemlendiricimizi kullanmanız iyi gelebilir. Ürünü incelemek ister misiniz?"
                    : "I've examined the photo. Your skin appears sensitive and red. Using our moisturizer with 'Aloe Vera & Panthenol', which has soothing effects, might help. Would you like to view the product?"
            }}
        />
    )
}
