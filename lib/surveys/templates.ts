import type { SurveyContactCaptureConfig, SurveyConsentConfig, SurveyQuestion, SurveyTemplateType } from "@/lib/surveys/types"

export const DEFAULT_SURVEY_CONSENT: SurveyConsentConfig = {
    title: "Aydinlatma ve Acik Riza",
    body: "Bu ankette paylastiginiz cevaplar istatistiksel raporlama amaciyla islenecektir. Kimlik bilgileriniz yalnizca siz acikca paylasirsaniz kaydedilir.",
    checkboxLabel: "Aydinlatma metnini okudum ve ankete katilmayi kabul ediyorum.",
    required: true,
}

export const DEFAULT_SURVEY_CONTACT_CAPTURE: SurveyContactCaptureConfig = {
    enabled: false,
    nameEnabled: false,
    emailEnabled: false,
    phoneEnabled: false,
    nameRequired: false,
    emailRequired: false,
    phoneRequired: false,
    title: "Opsiyonel Iletisim Bilgileri",
    description: "Dilerseniz iletisim bilgilerinizi de birakabilirsiniz.",
}

function question(input: SurveyQuestion): SurveyQuestion {
    return input
}

export function buildQuestionsForTemplate(templateType: SurveyTemplateType): SurveyQuestion[] {
    switch (templateType) {
        case "political_poll":
            return [
                question({
                    id: "party_preference",
                    type: "singleChoice",
                    title: "Bugun secim olsa hangi partiye oy vermeyi dusunursunuz?",
                    required: true,
                    allowOther: true,
                    demographicKey: "party_preference",
                    options: [
                        "AK Parti",
                        "CHP",
                        "MHP",
                        "IYI Parti",
                        "DEM Parti",
                        "Zafer Partisi",
                        "Yeniden Refah Partisi",
                        "Kararsizim",
                        "Oy kullanmayacagim",
                    ],
                }),
                question({
                    id: "confidence",
                    type: "singleChoice",
                    title: "Bu tercihinizde ne kadar kararlisiniz?",
                    required: true,
                    options: ["Kesin kararliyim", "Fikrim degisebilir", "Henuz emin degilim"],
                }),
                question({
                    id: "age_range",
                    type: "singleChoice",
                    title: "Yas araliginiz nedir?",
                    required: true,
                    demographicKey: "age_range",
                    options: ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"],
                }),
                question({
                    id: "gender",
                    type: "singleChoice",
                    title: "Cinsiyetiniz nedir?",
                    required: false,
                    allowOther: true,
                    demographicKey: "gender",
                    options: ["Kadin", "Erkek", "Belirtmek istemiyorum"],
                }),
                question({
                    id: "city",
                    type: "shortText",
                    title: "Hangi ilde yasiyorsunuz?",
                    required: true,
                    demographicKey: "city",
                }),
                question({
                    id: "district",
                    type: "shortText",
                    title: "Ilceniz nedir?",
                    required: false,
                    demographicKey: "district",
                }),
            ]
        case "satisfaction":
            return [
                question({
                    id: "overall_score",
                    type: "number",
                    title: "Genel memnuniyet puaniniz nedir? (1-10)",
                    required: true,
                    demographicKey: "overall_score",
                }),
                question({
                    id: "recommendation",
                    type: "singleChoice",
                    title: "Bizi tavsiye etme olasiliginiz nedir?",
                    required: true,
                    options: ["Cok yuksek", "Yuksek", "Orta", "Dusuk"],
                }),
                question({
                    id: "liked_most",
                    type: "longText",
                    title: "En memnun kaldiginiz nokta nedir?",
                    required: false,
                }),
                question({
                    id: "improvement_area",
                    type: "longText",
                    title: "Gelistirmemizi istediginiz alan nedir?",
                    required: false,
                }),
            ]
        case "market_research":
            return [
                question({
                    id: "usage_frequency",
                    type: "singleChoice",
                    title: "Benzer urun veya hizmetleri ne siklikla kullaniyorsunuz?",
                    required: true,
                    options: ["Her gun", "Haftada birkac kez", "Ayda birkac kez", "Nadiren"],
                }),
                question({
                    id: "decision_factors",
                    type: "multiChoice",
                    title: "Satin alma kararinizda en etkili faktorler nelerdir?",
                    required: true,
                    allowOther: true,
                    options: ["Fiyat", "Kalite", "Marka", "Hiz", "Musteri hizmetleri"],
                }),
                question({
                    id: "budget",
                    type: "number",
                    title: "Bu kategori icin ortalama butceniz nedir?",
                    required: false,
                }),
                question({
                    id: "needs",
                    type: "longText",
                    title: "Bu alandaki en buyuk ihtiyaciniz veya probleminiz nedir?",
                    required: false,
                }),
            ]
        case "blank":
        default:
            return [
                question({
                    id: "first_question",
                    type: "singleChoice",
                    title: "Ilk sorunuz",
                    required: true,
                    options: ["Secenek 1", "Secenek 2", "Secenek 3"],
                }),
            ]
    }
}

export function getTemplateDefaults(templateType: SurveyTemplateType) {
    switch (templateType) {
        case "political_poll":
            return {
                title: "Siyasi Egilim Anketi",
                description: "Secmen egilimlerini anlamaya yonelik kisa bir siyasi anket.",
                introTitle: "Ankete Hos Geldiniz",
                introText: "Bu anket tamamen gonulluluk esasina dayanir ve cevaplariniz toplu istatistiksel analiz icin kullanilir.",
                thankYouTitle: "Tesekkur Ederiz",
                thankYouText: "Anketimize katildiginiz icin tesekkur ederiz.",
            }
        case "satisfaction":
            return {
                title: "Memnuniyet Anketi",
                description: "Deneyiminizi olcmek ve hizmetimizi gelistirmek icin hazirlandi.",
                introTitle: "Gorusunuz Bizim Icin Degerli",
                introText: "Kisa anketi tamamlayarak bize geri bildirim verebilirsiniz.",
                thankYouTitle: "Tesekkurler",
                thankYouText: "Paylastiginiz geri bildirimler icin tesekkur ederiz.",
            }
        case "market_research":
            return {
                title: "Pazar Arastirmasi",
                description: "Hedef kitlenin beklenti ve davranislarini anlamaya yonelik arastirma.",
                introTitle: "Pazar Arastirmasi",
                introText: "Cevaplariniz yeni urun ve hizmet gelistirme surecimize katkida bulunur.",
                thankYouTitle: "Katkiniz Icin Tesekkurler",
                thankYouText: "Anket yanitiniz basariyla kaydedildi.",
            }
        case "blank":
        default:
            return {
                title: "Yeni Anket",
                description: "Sifirdan olusturulan ozel anket.",
                introTitle: "Ankete Basla",
                introText: "Sorulari yanitlayarak anketi tamamlayabilirsiniz.",
                thankYouTitle: "Tesekkurler",
                thankYouText: "Anket yanitiniz kaydedildi.",
            }
    }
}
