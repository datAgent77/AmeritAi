
import { ReactNode } from "react"
import { ShoppingBag, Plane, Home, Code2, Briefcase, HeartPulse, GraduationCap, School, Banknote, ChefHat, Sprout, TrendingUp, RefreshCw, MessageSquare, Award, Clock, Users, Zap, Shield, BarChart3, Globe, Mic, Calendar, Smartphone } from "lucide-react"

export interface IndustryMarketingContent {
    id: string;
    title: { tr: string; en: string };
    subtitle: { tr: string; en: string };
    iconName: string; // Lucide icon name
    features: {
        title: { tr: string; en: string };
        description: { tr: string; en: string };
        iconName: string;
    }[];
    promptExample: {
        user: { tr: string; en: string };
        ai: { tr: string; en: string };
    };
}

export const INDUSTRY_MARKETING_CONTENT: Record<string, IndustryMarketingContent> = {
    ecommerce: {
        id: 'ecommerce',
        title: { tr: "E-Ticaret İçin Yapay Zeka", en: "AI for E-Commerce" },
        subtitle: {
            tr: "Sadece destek vermeyen, aktif satış yapan bir asistan. Ziyaretçilerinizi sadık müşterilere dönüştürün.",
            en: "An assistant that doesn't just support, but actively sells. Turn visitors into loyal customers."
        },
        iconName: 'ShoppingBag',
        features: [
            {
                title: { tr: "Satış Odaklı Asistan", en: "Sales-First Assistant" },
                description: { tr: "Müşterinin ne aradığını anlar ve en doğru ürünü önerir. Kararsız kullanıcıları satın almaya teşvik eder.", en: "Understands customer intent and suggests the right products. Encourages hesitant users to purchase." },
                iconName: 'TrendingUp'
            },
            {
                title: { tr: "Çapraz Satış & Upsell", en: "Cross-Sell & Upsell" },
                description: { tr: "Sepete ürün eklendiğinde 'Bununla harika giden' tamamlayıcı ürünleri önererek sepet tutarını artırır.", en: "Increases basket value by suggesting complementary products when items are added to cart." },
                iconName: 'RefreshCw'
            },
            {
                title: { tr: "Kargo & İade Otomasyonu", en: "Shipping & Return Automation" },
                description: { tr: "Tekrarlayan 'Kargom nerede?' sorularını otomatik yanıtlayarak destek yükünü %70 azaltır.", en: "Automates repetitive 'Where is my order?' questions, reducing support load by 70%." },
                iconName: 'MessageSquare'
            }
        ],
        promptExample: {
            user: { tr: "Yaz için hafif bir elbise arıyorum ama kararsızım.", en: "I'm looking for a light summer dress but can't decide." },
            ai: {
                tr: "Harika bir seçim! ☀️ Yaz koleksiyonumuzda çok popüler olan 'Floral Maxi' modelimiz hem hafif hem de şık. Ayrıca şu an %20 indirimde. Sizin için beden seçeneklerini kontrol etmemi ister misiniz?",
                en: "Great choice! ☀️ Our 'Floral Maxi' model is very popular in our summer collection, lightweight and chic. Plus, it's 20% off right now. Shall I check sizing options for you?"
            }
        }
    },
    booking: {
        id: 'booking',
        title: { tr: "Turizm & Rezervasyon", en: "Travel & Booking" },
        subtitle: {
            tr: "7/24 rezervasyon alan, otel ve uçuş önerileri sunan seyahat asistanı.",
            en: "A travel assistant that takes bookings 24/7 and suggests hotels and flights."
        },
        iconName: 'Plane',
        features: [
            {
                title: { tr: "Akıllı Rezervasyon", en: "Smart Booking" },
                description: { tr: "Sohbet üzerinden anlık müsaitlik kontrolü ve rezervasyon yapma imkanı.", en: "Instant availability check and booking capability via chat." },
                iconName: 'Calendar'
            },
            {
                title: { tr: "Kişiselleştirilmiş Öneriler", en: "Personalized Suggestions" },
                description: { tr: "Müşterinin tercihlerine göre (havuzlu, şehir merkezi vb.) en uygun otelleri listeler.", en: "Lists the most suitable hotels based on customer preferences (pool, city center, etc.)." },
                iconName: 'Star'
            },
            {
                title: { tr: "Çoklu Dil Desteği", en: "Multi-Language Support" },
                description: { tr: "Turistlerle kendi dillerinde konuşarak rezervasyon oranlarını artırır.", en: "Increases booking rates by speaking with tourists in their native language." },
                iconName: 'Languages'
            }
        ],
        promptExample: {
            user: { tr: "Hafta sonu için Antalya'da denize sıfır bir otel arıyorum.", en: "I'm looking for a beachfront hotel in Antalya for the weekend." },
            ai: {
                tr: "Harika! Antalya'da şu an müsait 3 denize sıfır otelimiz var. SeaView Resort özel plajı ve spa hizmetiyle öne çıkıyor. Gecelik 2500₺'den başlıyor. Detayları göndereyim mi?",
                en: "Great! We have 3 beachfront hotels available in Antalya right now. SeaView Resort stands out with its private beach and spa. Starting from $150/night. Shall I send details?"
            }
        }
    },
    'real-estate': {
        id: 'real-estate',
        title: { tr: "Emlak & Gayrimenkul", en: "Real Estate" },
        subtitle: {
            tr: "Potansiyel alıcıları 7/24 karşılayan ve randevu oluşturan emlak danışmanı.",
            en: "Real estate consultant that greets potential buyers 24/7 and schedules viewings."
        },
        iconName: 'Home',
        features: [
            {
                title: { tr: "Lead Kalifikasyonu", en: "Lead Qualification" },
                description: { tr: "Ziyaretçinin bütçesini, aradığı özellikleri öğrenir ve sadece ciddi alıcıları size yönlendirir.", en: "Learns visitor budget and preferences, forwarding only serious buyers to you." },
                iconName: 'Users'
            },
            {
                title: { tr: "Randevu Planlama", en: "Appointment Scheduling" },
                description: { tr: "Emlak gösterimleri için otomatik randevu oluşturur ve takviminize işler.", en: "Automatically schedules property viewings and syncs with your calendar." },
                iconName: 'Clock'
            },
            {
                title: { tr: "Portföy Sunumu", en: "Portfolio Presentation" },
                description: { tr: "Kriterlere uygun ilanları görselleri ve detaylarıyla anında sunar.", en: "Instantly presents listings matching criteria with images and details." },
                iconName: 'Images'
            }
        ],
        promptExample: {
            user: { tr: "İstanbul Kadıköy'de 3+1 kiralık daire bakıyorum.", en: "Looking for a 3-bedroom apartment for rent in Istanbul Kadikoy." },
            ai: {
                tr: "Kadıköy'de şu an portföyümüzde 4 adet 3+1 daire var. Bütçe aralığınız nedir? Size en uygun olanları filtreleyip sunabilirim.",
                en: "We currently have 4 3-bedroom apartments in Kadikoy. What is your budget range? I can filter and present the most suitable ones."
            }
        }
    },
    saas: {
        id: 'saas',
        title: { tr: "SaaS & Teknoloji", en: "SaaS & Technology" },
        subtitle: {
            tr: "Teknik soruları yanıtlayan ve demo ayarlayan ürün uzmanı.",
            en: "Product expert answering technical questions and scheduling demos."
        },
        iconName: 'Code2',
        features: [
            {
                title: { tr: "Teknik Destek", en: "Technical Support" },
                description: { tr: "Dokümantasyonunuzu öğrenir ve karmaşık teknik soruları saniyeler içinde yanıtlar.", en: "Learns your documentation and answers complex technical questions in seconds." },
                iconName: 'Terminal'
            },
            {
                title: { tr: "Demo Dönüşümü", en: "Demo Conversion" },
                description: { tr: "Ziyaretçileri ürünün değerini anlattıktan sonra demo görüşmesine yönlendirir.", en: "Guides visitors to book a demo after explaining product value." },
                iconName: 'Video'
            },
            {
                title: { tr: "7/24 Onboarding", en: "24/7 Onboarding" },
                description: { tr: "Yeni kullanıcıların ürünü keşfetmesine ve ilk adımları atmasına yardımcı olur.", en: "Helps new users discover the product and take their first steps." },
                iconName: 'Rocket'
            }
        ],
        promptExample: {
            user: { tr: "API entegrasyonu nasıl yapılır?", en: "How to integrate the API?" },
            ai: {
                tr: "API entegrasyonu için öncelikle Yönetim Panelinden bir API Key oluşturmalısınız. Ardından dokümantasyonumuzdaki '/auth' endpoint'ini kullanarak token alabilirsiniz. İlgili dokümanı paylaşmamı ister misiniz?",
                en: "For API integration, first generate an API Key from the Admin Panel. Then you can get a token using the '/auth' endpoint in our docs. Would you like me to share the relevant doc?"
            }
        }
    },
    // Add generic content for others to avoid errors, can enrich later
    service: {
        id: 'service',
        title: { tr: "Hizmet & Danışmanlık", en: "Service & Consulting" },
        subtitle: { tr: "Randevu alan ve hizmetlerinizi tanıtan dijital asistan.", en: "Digital assistant promoting your services and booking appointments." },
        iconName: 'Briefcase',
        features: [
            { title: { tr: "Hizmet Tanıtımı", en: "Service Promo" }, description: { tr: "Hizmetlerinizi detaylı anlatır.", en: "Explains services in detail." }, iconName: 'Info' },
            { title: { tr: "Randevu Yönetimi", en: "Appointment Mgmt" }, description: { tr: "Otomatik randevu oluşturur.", en: "Creates appointments automatically." }, iconName: 'Calendar' },
            { title: { tr: "Fiyatlandırma", en: "Pricing" }, description: { tr: "Fiyatlar hakkında bilgi verir.", en: "Provides pricing info." }, iconName: 'DollarSign' }
        ],
        promptExample: { user: { tr: "Danışmanlık ücreti ne kadar?", en: "How much is consulting?" }, ai: { tr: "Saatlik danışmanlık ücretimiz 1500₺. Paket alımlarında indirim uyguluyoruz.", en: "Our hourly rate is $150. We offer discounts for packages." } }
    },
    healthcare: {
        id: 'healthcare',
        title: { tr: "Sağlık & Klinik", en: "Healthcare & Clinic" },
        subtitle: { tr: "Hasta sorularını yanıtlayan ve randevu yöneten sağlık asistanı.", en: "Health assistant answering patient queries and managing appointments." },
        iconName: 'HeartPulse',
        features: [
            { title: { tr: "Randevu Alma", en: "Appointments" }, description: { tr: "Hastalar için 7/24 randevu oluşturur.", en: "Schedules appointments 24/7." }, iconName: 'Calendar' },
            { title: { tr: "Sık Sorulanlar", en: "FAQs" }, description: { tr: "Operasyonlar hakkında bilgi verir.", en: "Provides info about procedures." }, iconName: 'MessageCircle' },
            { title: { tr: "Hazırlık Bilgisi", en: "Prep Info" }, description: { tr: "Randevu öncesi yapılması gerekenleri hatırlatır.", en: "Reminds pre-appointment instructions." }, iconName: 'CheckCircle' }
        ],
        promptExample: { user: { tr: "Diş beyazlatma fiyatı nedir?", en: "Teeth whitening price?" }, ai: { tr: "Diş beyazlatma tedavilerimiz kişiye özel planlanmaktadır. Ücretsiz ilk muayene için randevu oluşturalım mı?", en: "Treatments are personalized. Shall we book a free initial consultation?" } }
    },
    education: {
        id: 'education',
        title: { tr: "Eğitim & Kurs", en: "Education & Course" },
        subtitle: { tr: "Öğrenci adaylarına rehberlik eden kayıt asistanı.", en: "Registration assistant guiding prospective students." },
        iconName: 'GraduationCap',
        features: [
            { title: { tr: "Kurs Tanıtımı", en: "Course Info" }, description: { tr: "Müfredat ve içerik detaylarını sunar.", en: "Presents curriculum details." }, iconName: 'Book' },
            { title: { tr: "Seviye Belirleme", en: "Placement" }, description: { tr: "Öğrenciye uygun seviyeyi önerir.", en: "Suggests suitable level." }, iconName: 'BarChart' },
            { title: { tr: "Kayıt İşlemleri", en: "Enrollment" }, description: { tr: "Kayıt sürecinde rehberlik eder.", en: "Guides through enrollment." }, iconName: 'PenTool' }
        ],
        promptExample: { user: { tr: "İngilizce kursunuz var mı?", en: "Do you have English courses?" }, ai: { tr: "Evet, A1'den C2'ye kadar her seviyede sınıflarımız var. Online mı yüz yüze mi düşünüyorsunuz?", en: "Yes, we have classes from A1 to C2. Are you considering online or in-person?" } }
    },
    // Add skeletons for the rest to match header links: academic, finance, restaurant, agriculture
    academic: { id: 'academic', title: { tr: "Akademik", en: "Academic" }, subtitle: { tr: "Okullar için asistan.", en: "Assistant for schools." }, iconName: 'School', features: [], promptExample: { user: { tr: "Okul ücreti?", en: "Tuition?" }, ai: { tr: "Detaylı bilgi için...", en: "For details..." } } },
    finance: { id: 'finance', title: { tr: "Finans", en: "Finance" }, subtitle: { tr: "Finansal asistan.", en: "Financial assistant." }, iconName: 'Banknote', features: [], promptExample: { user: { tr: "Faiz oranı?", en: "Interest rate?" }, ai: { tr: "Güncel oranlarımız...", en: "Current rates..." } } },
    restaurant: { id: 'restaurant', title: { tr: "Restoran", en: "Restaurant" }, subtitle: { tr: "Geleneksel menünün ötesinde.", en: "Beyond traditional menu." }, iconName: 'ChefHat', features: [], promptExample: { user: { tr: "Menüde ne var?", en: "Whats on menu?" }, ai: { tr: "Bugünün spesyali...", en: "Todays special..." } } },
    agriculture: { id: 'agriculture', title: { tr: "Tarım", en: "Agriculture" }, subtitle: { tr: "Çiftçi dostu asistan.", en: "Farmer friendly assistant." }, iconName: 'Sprout', features: [], promptExample: { user: { tr: "Hava durumu?", en: "Weather?" }, ai: { tr: "Yarın yağmurlu...", en: "Rain tomorrow..." } } }

}
