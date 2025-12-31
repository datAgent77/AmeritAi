
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
    conversation?: {
        role: 'user' | 'ai';
        content: { tr: string; en: string };
    }[];
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
        },
        conversation: [
            { role: 'user', content: { tr: "Bu hafta sonu bir düğüne katılacağım, şık ama rahat bir elbise arıyorum.", en: "I'm going to a wedding this weekend, looking for something chic but comfortable." } },
            { role: 'ai', content: { tr: "Harika! Yaz düğünleri için saten midi elbiselerimiz çok popüler. Hangi renkleri tercih edersiniz? Pastel tonlar mı yoksa daha canlı renkler mi?", en: "Lovely! Satin midi dresses are highly popular for summer weddings. Which colors do you prefer? Pastels or vibrant tones?" } },
            { role: 'user', content: { tr: "Pastel mavi veya yeşil tonları olabilir.", en: "Pastel blue or green tones would be nice." } },
            { role: 'ai', content: { tr: "Sizin için 'Aqua Silk' ve 'Mint Breeze' modellerini seçtim. İkisi de şu an stokta ve aynı gün kargo avantajıyla geliyor! Göz atmak ister misiniz?", en: "I've selected the 'Aqua Silk' and 'Mint Breeze' models for you. Both are in stock and come with same-day shipping! Would you like to take a look?" } },
            { role: 'user', content: { tr: "Evet, lütfen gönder.", en: "Yes, please send them." } },
            { role: 'ai', content: { tr: "İşte harika seçenekler! Ayrıca bu elbiselerle mükemmel uyum sağlayan gümüş sandaletlerimizde de %15 indirim var. Kombini tamamlamak ister misiniz?", en: "Here are the great options! We also have a 15% discount on silver sandals that match perfectly. Would you like to complete the look?" } }
        ]
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
        },
        conversation: [
            { role: 'user', content: { tr: "Paris'e 2 kişilik bir seyahat planlıyorum, Ekim ayı için.", en: "Planning a trip to Paris for 2 people in October." } },
            { role: 'ai', content: { tr: "Paris sonbaharda harikadır! 🍂 Tarih aralığınız belli mi, yoksa en uygun fiyatlı uçuşlara göre mi öneri yapayım?", en: "Paris is wonderful in autumn! 🍂 Do you have dates in mind, or should I suggest based on the best flight prices?" } },
            { role: 'user', content: { tr: "En uygun fiyatlı hafta sonu olsun.", en: "Let's go with the most affordable weekend." } },
            { role: 'ai', content: { tr: "15-18 Ekim tarihleri arasında %20 indirimli uçuşlar buldum. Ayrıca Eyfel Kulesi manzaralı butik otellerde de yer var. Paket olarak sunayım mı?", en: "I found flights with 20% off for Oct 15-18. There's also availability in boutique hotels with Eiffel views. Shall I present it as a package?" } }
        ]
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
        },
        conversation: [
            { role: 'user', content: { tr: "Yatırımlık bir dükkan arıyorum.", en: "Looking for a shop for investment." } },
            { role: 'ai', content: { tr: "Yatırım için harika bir zaman. Hangi bölgelerle ilgileniyorsunuz ve amortisman süresi beklentiniz nedir?", en: "Great time for investment. Which regions are you interested in and what's your ROI expectation?" } },
            { role: 'user', content: { tr: "İstanbul Avrupa yakası, merkezi olsun.", en: "Istanbul European side, central location." } },
            { role: 'ai', content: { tr: "Beşiktaş ve Şişli bölgelerinde, halihazırda kurumsal kiracılı 3 portföyümüz var. Getiri oranları oldukça yüksek. Görselleri ve kira sözleşme detaylarını iletmemi ister misiniz?", en: "We have 3 portfolios with corporate tenants in Besiktas and Sisli. High yields. Would you like me to share images and lease details?" } }
        ]
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
        },
        conversation: [
            { role: 'user', content: { tr: "Enterprise paketinizin farkı nedir?", en: "What's the difference in the Enterprise plan?" } },
            { role: 'ai', content: { tr: "Enterprise planımızda sınırsız API isteği, özel müşteri temsilcisi ve kendi sunucunuzda barındırma (On-Premise) seçenekleri sunuyoruz. Ekibiniz kaç kişi?", en: "Our Enterprise plan offers unlimited API requests, a dedicated account manager, and On-Premise hosting options. How large is your team?" } },
            { role: 'user', content: { tr: "Yaklaşık 50 kişilik bir yazılım ekibiyiz.", en: "We are a software team of about 50." } },
            { role: 'ai', content: { tr: "Bu ölçek için SSO ve Gelişmiş Güvenlik modüllerimiz de çok işinize yarayacaktır. Size özel bir demo toplantısı ayarlayalım mı? Mühendislerimiz teknik detayları aktarabilir.", en: "For this scale, our SSO and Advanced Security modules would be very useful. Shall we set up a custom demo meeting? Our engineers can walk you through the technical details." } }
        ]
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
        promptExample: { user: { tr: "Diş beyazlatma fiyatı nedir?", en: "Teeth whitening price?" }, ai: { tr: "Diş beyazlatma tedavilerimiz kişiye özel planlanmaktadır. Ücretsiz ilk muayene için randevu oluşturalım mı?", en: "Treatments are personalized. Shall we book a free initial consultation?" } },
        conversation: [
            { role: 'user', content: { tr: "Burun estetiği sonrası iyileşme süreci nasıl?", en: "How is the recovery process after rhinoplasty?" } },
            { role: 'ai', content: { tr: "Genellikle ilk hafta atel çıkarılır. Morluklar 10 gün içinde geçer. Tam iyileşme 6-12 ay sürer ancak 2. haftadan itibaren sosyal hayata dönebilirsiniz. Doktorumuzdan ön görüşme talep etmek ister misiniz?", en: "Usually, the splint is removed in the first week. Bruising fades within 10 days. Full recovery takes 6-12 months, but you can return to social life after week 2. Would you like to request a consultation with our doctor?" } }
        ]
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
        promptExample: { user: { tr: "İngilizce kursunuz var mı?", en: "Do you have English courses?" }, ai: { tr: "Evet, A1'den C2'ye kadar her seviyede sınıflarımız var. Online mı yüz yüze mi düşünüyorsunuz?", en: "Yes, we have classes from A1 to C2. Are you considering online or in-person?" } },
        conversation: [
            { role: 'user', content: { tr: "Yazılım kurslarınız yeni başlayanlar için uygun mu?", en: "Are your software courses suitable for beginners?" } },
            { role: 'ai', content: { tr: "Kesinlikle! 'Sıfırdan İleri Seviyeye' bootcamp'imiz tam size göre. Hiçbir ön bilgi gerektirmez ve ilk dersten itibaren kod yazmaya başlarsınız. Müfredatı göndermemi ister misiniz?", en: "Absolutely! Our 'Zero to Hero' bootcamp is perfect for you. No prior knowledge required, and you start coding from day one. Shall I send the curriculum?" } }
        ]
    },
    // Add skeletons for the rest to match header links: academic, finance, restaurant, agriculture
    academic: {
        id: 'academic',
        title: { tr: "Akademik", en: "Academic" },
        subtitle: { tr: "Okullar için asistan.", en: "Assistant for schools." },
        iconName: 'School',
        features: [
            { title: { tr: "Kayıt Bilgisi", en: "Registration Info" }, description: { tr: "Velilere kayıt süreçlerini anlatır.", en: "Explains registration processes to parents." }, iconName: 'Book' },
            { title: { tr: "Etkinlik Takvimi", en: "Events Calendar" }, description: { tr: "Okul etkinliklerini duyurur.", en: "Announces school events." }, iconName: 'Calendar' },
            { title: { tr: "Sık Sorulanlar", en: "FAQ" }, description: { tr: "Servis, yemek gibi konuları yanıtlar.", en: "Answers questions about bus, food etc." }, iconName: 'MessageSquare' }
        ],
        promptExample: { user: { tr: "Okul ücreti?", en: "Tuition?" }, ai: { tr: "Detaylı bilgi için...", en: "For details..." } },
        conversation: [
            { role: 'user', content: { tr: "Merhaba, ilkokul kayıt ücretleri hakkında bilgi alabilir miyim?", en: "Hello, can I get information about primary school tuition fees?" } },
            { role: 'ai', content: { tr: "Merhaba! İlkokul 1-4. sınıflar için 2025-2026 eğitim dönemi ücretlerimiz güncellendi. Erken kayıt avantajlarından yararlanmak ister misiniz?", en: "Hello! Our tuition fees for grades 1-4 for the 2025-2026 academic year have been updated. Would you like to take advantage of early registration benefits?" } },
            { role: 'user', content: { tr: "Evet, erken kayıt indirimi ne kadar?", en: "Yes, how much is the early registration discount?" } },
            { role: 'ai', content: { tr: "30 Nisan'a kadar yapılan kayıtlarda %15 indirim uyguluyoruz. Ayrıca kardeş indirimimiz de mevcut. Size detaylı fiyat listesini broşür olarak ileteyim mi?", en: "We offer a 15% discount for registrations made until April 30th. We also have a sibling discount. Shall I send you the detailed price list brochure?" } }
        ]
    },
    finance: {
        id: 'finance',
        title: { tr: "Finans", en: "Finance" },
        subtitle: { tr: "Finansal asistan.", en: "Financial assistant." },
        iconName: 'Banknote',
        features: [
            { title: { tr: "Kredi Hesaplama", en: "Loan Calculator" }, description: { tr: "Anlık kredi taksit hesabı yapar.", en: "Calculates loan installments instantly." }, iconName: 'BarChart' },
            { title: { tr: "Yatırım Danışmanı", en: "Investment Advisor" }, description: { tr: "Piyasa verilerini analiz eder.", en: "Analyzes market data." }, iconName: 'TrendingUp' },
            { title: { tr: "Müşteri Hizmetleri", en: "Customer Service" }, description: { tr: "7/24 bankacılık desteği.", en: "24/7 banking support." }, iconName: 'Users' }
        ],
        promptExample: { user: { tr: "Faiz oranı?", en: "Interest rate?" }, ai: { tr: "Güncel oranlarımız...", en: "Current rates..." } },
        conversation: [
            { role: 'user', content: { tr: "500.000 TL ihtiyaç kredisi çekmek istiyorum.", en: "I want to take out a personal loan of 500,000 TL." } },
            { role: 'ai', content: { tr: "Tabii, yardımcı olabilirim. Vadeniz ne olsun? 12, 24 veya 36 ay seçeneklerimiz var.", en: "Sure, I can help. What maturity would you like? We have 12, 24, or 36 month options." } },
            { role: 'user', content: { tr: "24 ay olsun. Aylık ödemesi ne olur?", en: "Let's say 24 months. What would be the monthly payment?" } },
            { role: 'ai', content: { tr: "Mevcut %3.59 faiz oranıyla 24 ay vade için aylık taksitleriniz yaklaşık 32.450 TL olacaktır. Hemen başvuruyu başlatmamı ister misiniz? Onay sadece 2 dakika sürer.", en: "With the current 3.59% interest rate, your monthly installments for 24 months would be approximately 32,450 TL. Would you like me to start the application now? Approval takes only 2 minutes." } }
        ]
    },
    restaurant: {
        id: 'restaurant',
        title: { tr: "Restoran", en: "Restaurant" },
        subtitle: { tr: "Geleneksel menünün ötesinde.", en: "Beyond traditional menu." },
        iconName: 'ChefHat',
        features: [
            { title: { tr: "Dijital Menü", en: "Digital Menu" }, description: { tr: "Görsel ve içerik zengini menü.", en: "Visual and content rich menu." }, iconName: 'BookOpen' },
            { title: { tr: "Rezervasyon", en: "Reservation" }, description: { tr: "Masa rezervasyonu yönetimi.", en: "Table reservation management." }, iconName: 'Calendar' },
            { title: { tr: "Alerjen Uyarısı", en: "Allergen Alert" }, description: { tr: "Müşteri hassasiyetine göre öneri.", en: "Suggestions based on sensitivity." }, iconName: 'Info' }
        ],
        promptExample: { user: { tr: "Menüde ne var?", en: "Whats on menu?" }, ai: { tr: "Bugünün spesyali...", en: "Todays special..." } },
        conversation: [
            { role: 'user', content: { tr: "Bu akşam 2 kişi için yeriniz var mı?", en: "Do you have a table for 2 tonight?" } },
            { role: 'ai', content: { tr: "Saat kaç için düşünüyorsunuz? Şu an 19:00 ve 21:00 saatlerinde müsaitliğimiz var.", en: "What time are you thinking? We currently have availability at 19:00 and 21:00." } },
            { role: 'user', content: { tr: "19:00 uygun. Vegan menünüz var mı?", en: "19:00 works. Do you have a vegan menu?" } },
            { role: 'ai', content: { tr: "Evet, oldukça geniş bir vegan menümüz var! Özellikle 'Kinoa Köftesi' ve 'Mantar Risotto'muz çok seviliyor. Rezervasyonunuzu 19:00 olarak 'Vegan Tercihli' notuyla oluşturuyorum?", en: "Yes, we have a quite extensive vegan menu! Our 'Quinoa Patties' and 'Mushroom Risotto' are especially popular. Shall I create your reservation for 19:00 with a 'Vegan Preference' note?" } }
        ]
    },
    agriculture: {
        id: 'agriculture',
        title: { tr: "Tarım", en: "Agriculture" },
        subtitle: { tr: "Çiftçi dostu asistan.", en: "Farmer friendly assistant." },
        iconName: 'Sprout',
        features: [
            { title: { tr: "Hastalık Tespiti", en: "Disease Detection" }, description: { tr: "Bitki fotoğrafından hastalık tanır.", en: "Identifies disease from plant photo." }, iconName: 'Eye' },
            { title: { tr: "Hava Durumu", en: "Weather" }, description: { tr: "Zirai don ve yağış uyarıları.", en: "Frost and rain alerts." }, iconName: 'Plane' }, // Using Plane as placeholder or CloudRain if available, sticking to existing lucide imports mostly
            { title: { tr: "Verim Analizi", en: "Yield Analysis" }, description: { tr: "Hasat tahminleri yapar.", en: "Makes harvest predictions." }, iconName: 'BarChart' }
        ],
        promptExample: { user: { tr: "Hava durumu?", en: "Weather?" }, ai: { tr: "Yarın yağmurlu...", en: "Rain tomorrow..." } },
        conversation: [
            { role: 'user', content: { tr: "Domateslerimde yapraklar sararmaya başladı, ne yapmalıyım?", en: "Leaves on my tomatoes started turning yellow, what should I do?" } },
            { role: 'ai', content: { tr: "Sararma genellikle magnezyum eksikliği veya mantar hastalığı belirtisi olabilir. Yaprağın fotoğrafını yükleyebilir misiniz? Hemen analiz edip doğru ilacı önerebilirim.", en: "Yellowing can often be a sign of magnesium deficiency or fungal disease. Can you upload a photo of the leaf? I can analyze it immediately and recommend the right treatment." } },
            { role: 'user', content: { tr: "[Fotoğraf Yüklendi]", en: "[Photo Uploaded]" } },
            { role: 'ai', content: { tr: "Görsele göre bu 'Erken Yanıklık' hastalığı. Bakır içerikli fungisit kullanmanızı öneririm. Bölgenizde yarın yağmur bekleniyor, ilaçlamayı yağmurdan sonra yapmalısınız.", en: "According to the image, this is 'Early Blight'. I recommend using a copper-based fungicide. Rain is expected in your area tomorrow, you should spray after the rain." } }
        ]
    },
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
        promptExample: { user: { tr: "Danışmanlık ücreti ne kadar?", en: "How much is consulting?" }, ai: { tr: "Saatlik danışmanlık ücretimiz 1500₺. Paket alımlarında indirim uyguluyoruz.", en: "Our hourly rate is $150. We offer discounts for packages." } },
        conversation: [
            { role: 'user', content: { tr: "Hukuki danışmanlık hizmetiniz neleri kapsıyor?", en: "What does your legal consulting service cover?" } },
            { role: 'ai', content: { tr: "Şirketler hukuku, sözleşmeler ve KVKK uyumluluğu konularında uzmanız. Hangi alanda desteğe ihtiyacınız var?", en: "We specialize in corporate law, contracts, and GDPR compliance. Which area do you need support in?" } },
            { role: 'user', content: { tr: "Yeni kurduğumuz şirket için sözleşme taslaklarına ihtiyacımız var.", en: "We need contract drafts for our newly established company." } },
            { role: 'ai', content: { tr: "Harika! 'Startup Paketi'miz tam size göre. Ana sözleşme, gizlilik sözleşmeleri ve çalışan sözleşmelerini içerir. Avukatımızla 15 dakikalık ücretsiz bir ön görüşme planlayalım mı?", en: "Great! Our 'Startup Package' is perfect for you. It includes articles of association, NDAs, and employee contracts. Shall we schedule a free 15-minute preliminary meeting with our lawyer?" } }
        ]
    },
    automotive: {
        id: 'automotive',
        title: { tr: "Otomotiv", en: "Automotive" },
        subtitle: {
            tr: "Araç satışından servise, yedek parçadan test sürüşüne kadar her adımda yanınızda.",
            en: "From vehicle sales to service, spare parts to test drives - by your side at every step."
        },
        iconName: 'Car',
        features: [
            {
                title: { tr: "Araç Katalog Tanıtımı", en: "Vehicle Catalog" },
                description: { tr: "Tüm modelleri teknik özellikleri ve fiyatlarıyla sunar.", en: "Presents all models with technical specs and pricing." },
                iconName: 'Car'
            },
            {
                title: { tr: "Servis Randevusu", en: "Service Booking" },
                description: { tr: "Periyodik bakım ve onarım randevularını 7/24 alır.", en: "Books maintenance and repair appointments 24/7." },
                iconName: 'Calendar'
            },
            {
                title: { tr: "Test Sürüşü Planlama", en: "Test Drive Scheduling" },
                description: { tr: "İlgilenilen araç için hemen test sürüşü ayarlar.", en: "Schedules test drives for interested vehicles immediately." },
                iconName: 'Rocket'
            }
        ],
        promptExample: {
            user: { tr: "SUV modelleriniz var mı?", en: "Do you have SUV models?" },
            ai: { tr: "Evet, geniş SUV yelpazemiz var! Bütçenizi ve kullanım amacınızı söylerseniz size en uygun modeli önerebilirim.", en: "Yes, we have a wide SUV range! Tell me your budget and intended use, and I can recommend the best model for you." }
        },
        conversation: [
            { role: 'user', content: { tr: "Aile için 7 kişilik bir araç arıyorum.", en: "I'm looking for a 7-seater for my family." } },
            { role: 'ai', content: { tr: "Harika seçim! Aileler için en popüler modelimiz 'Comfort XL' - geniş bagaj, çocuk koltuğu sabitleme sistemi ve yakıt tasarrufu sunuyor. Test sürüşü ayarlayalım mı?", en: "Great choice! Our most popular model for families is 'Comfort XL' - spacious trunk, child seat anchoring, and fuel efficiency. Shall we schedule a test drive?" } },
            { role: 'user', content: { tr: "Evet, hafta sonu uygun mu?", en: "Yes, is the weekend available?" } },
            { role: 'ai', content: { tr: "Cumartesi 10:00 veya 14:00 müsait. Hangisini tercih edersiniz? Ayrıca takas aracınız varsa değerleme de yapabiliriz.", en: "Saturday 10:00 or 14:00 is available. Which do you prefer? We can also appraise your trade-in if you have one." } }
        ]
    },
    insurance: {
        id: 'insurance',
        title: { tr: "Sigorta", en: "Insurance" },
        subtitle: {
            tr: "Poliçe karşılaştırmasından hasar bildirimine, sigortalı olmak hiç bu kadar kolay olmamıştı.",
            en: "From policy comparison to claim filing, being insured has never been this easy."
        },
        iconName: 'Shield',
        features: [
            {
                title: { tr: "Anında Teklif", en: "Instant Quotes" },
                description: { tr: "Birkaç soruyla saniyeler içinde fiyat teklifi alın.", en: "Get price quotes in seconds with just a few questions." },
                iconName: 'Zap'
            },
            {
                title: { tr: "Hasar Bildirimi", en: "Claim Filing" },
                description: { tr: "Kaza veya hasar durumunda adım adım yönlendirir.", en: "Guides step-by-step in case of accident or damage." },
                iconName: 'MessageSquare'
            },
            {
                title: { tr: "Poliçe Sorgulama", en: "Policy Lookup" },
                description: { tr: "Mevcut poliçe detaylarını ve bitiş tarihini gösterir.", en: "Shows existing policy details and expiration dates." },
                iconName: 'Book'
            }
        ],
        promptExample: {
            user: { tr: "Kasko fiyatı almak istiyorum.", en: "I want to get a comprehensive car insurance quote." },
            ai: { tr: "Tabii! Aracınızın plakasını veya model bilgisini paylaşır mısınız? 30 saniye içinde en uygun teklifleri sunayım.", en: "Sure! Can you share your car's plate or model info? I'll present the best offers in 30 seconds." }
        },
        conversation: [
            { role: 'user', content: { tr: "Trafik sigortam bitiyor, yenilemek istiyorum.", en: "My car insurance is expiring, I want to renew." } },
            { role: 'ai', content: { tr: "Mevcut poliçenizi gördüm. Aynı teminatla yenilersek 2.450 TL, kaskoyla birleşik pakette ise toplam 4.800 TL olur. Hangisini tercih edersiniz?", en: "I see your current policy. If we renew with the same coverage it's 2,450 TL, combined with comprehensive it's 4,800 TL total. Which do you prefer?" } },
            { role: 'user', content: { tr: "Kasko dahil olsun.", en: "Include comprehensive." } },
            { role: 'ai', content: { tr: "Mükemmel seçim! Poliçenizi hemen oluşturuyorum. Ödemeyi kredi kartı ile mi yoksa havale ile mi yapmak istersiniz?", en: "Excellent choice! Creating your policy now. Would you like to pay by credit card or bank transfer?" } }
        ]
    },
    logistics: {
        id: 'logistics',
        title: { tr: "Lojistik & Kargo", en: "Logistics & Shipping" },
        subtitle: {
            tr: "Gönderi takibinden fiyat teklifine, her şey anlık ve otomatik.",
            en: "From shipment tracking to price quotes, everything is instant and automated."
        },
        iconName: 'Truck',
        features: [
            {
                title: { tr: "Kargo Takibi", en: "Shipment Tracking" },
                description: { tr: "Takip numarasıyla anlık konum ve durum bilgisi.", en: "Real-time location and status with tracking number." },
                iconName: 'MapPin'
            },
            {
                title: { tr: "Fiyat Hesaplama", en: "Price Calculator" },
                description: { tr: "Ağırlık ve mesafeye göre anında fiyat teklifi.", en: "Instant quotes based on weight and distance." },
                iconName: 'DollarSign'
            },
            {
                title: { tr: "Teslimat Notifikasyonları", en: "Delivery Notifications" },
                description: { tr: "Müşterilerinize otomatik durum güncellemeleri.", en: "Automatic status updates to your customers." },
                iconName: 'Bell'
            }
        ],
        promptExample: {
            user: { tr: "Kargom nerede?", en: "Where is my package?" },
            ai: { tr: "Takip numaranızı paylaşır mısınız? Hemen güncel konumunu bulayım.", en: "Can you share your tracking number? I'll find the current location right away." }
        },
        conversation: [
            { role: 'user', content: { tr: "İstanbul'dan Ankara'ya 50 kilo kargo göndermek istiyorum.", en: "I want to ship 50 kg from Istanbul to Ankara." } },
            { role: 'ai', content: { tr: "Standart teslimat (2-3 gün) 245 TL, ekspres (ertesi gün) 420 TL. Hangisini tercih edersiniz?", en: "Standard delivery (2-3 days) is 245 TL, express (next day) is 420 TL. Which would you prefer?" } },
            { role: 'user', content: { tr: "Ekspres olsun. Kurye gelip alabilir mi?", en: "Express please. Can a courier come and pick it up?" } },
            { role: 'ai', content: { tr: "Tabii! Yarın 09:00-12:00 arası adresinize kurye gönderebilirim. Adres bilginizi onaylar mısınız?", en: "Of course! I can send a courier to your address tomorrow between 09:00-12:00. Can you confirm your address?" } }
        ]
    },
    beauty: {
        id: 'beauty',
        title: { tr: "Güzellik & Wellness", en: "Beauty & Wellness" },
        subtitle: {
            tr: "Randevu almak, hizmetleri keşfetmek ve güzellik danışmanlığı almak artık çok kolay.",
            en: "Booking appointments, discovering services, and getting beauty consultations is now so easy."
        },
        iconName: 'Sparkles',
        features: [
            {
                title: { tr: "Randevu Yönetimi", en: "Appointment Management" },
                description: { tr: "Kuaför, spa, masaj için 7/24 randevu.", en: "24/7 booking for hair, spa, massage." },
                iconName: 'Calendar'
            },
            {
                title: { tr: "Hizmet Önerileri", en: "Service Recommendations" },
                description: { tr: "Cilt tipine ve tercihlere göre kişisel öneriler.", en: "Personal recommendations based on skin type and preferences." },
                iconName: 'Star'
            },
            {
                title: { tr: "Ürün Danışmanlığı", en: "Product Consulting" },
                description: { tr: "Bakım rutini ve ürün tavsiyeleri.", en: "Skincare routine and product advice." },
                iconName: 'MessageCircle'
            }
        ],
        promptExample: {
            user: { tr: "Bugün için saç kesimi randevusu alabilir miyim?", en: "Can I book a haircut for today?" },
            ai: { tr: "Bugün 14:30 ve 17:00'da müsaitlik var. Hangi stilistimizi tercih edersiniz?", en: "Today we have availability at 14:30 and 17:00. Which stylist would you prefer?" }
        },
        conversation: [
            { role: 'user', content: { tr: "Cilt bakımı için ne önerirsiniz?", en: "What do you recommend for skincare?" } },
            { role: 'ai', content: { tr: "Cilt tipinizi öğrenebilir miyim? Kuru, yağlı veya karma bir cildiniz mi var?", en: "May I know your skin type? Do you have dry, oily, or combination skin?" } },
            { role: 'user', content: { tr: "Karma cildim var ve gözenekler belirgin.", en: "I have combination skin with visible pores." } },
            { role: 'ai', content: { tr: "Karma cilt için 'Deep Cleansing' ve 'Pore Minimizing' bakım paketimizi öneriyorum. 60 dakika sürüyor ve %20 yılbaşı indirimi var. Randevu oluşturalım mı?", en: "For combination skin, I recommend our 'Deep Cleansing' and 'Pore Minimizing' package. It takes 60 minutes and there's a 20% holiday discount. Shall we book?" } }
        ]
    },
    legal: {
        id: 'legal',
        title: { tr: "Hukuk & Avukatlık", en: "Legal Services" },
        subtitle: {
            tr: "Hukuki sorularınıza 7/24 ön bilgi alın, avukat randevusu oluşturun.",
            en: "Get preliminary answers to legal questions 24/7 and schedule lawyer appointments."
        },
        iconName: 'Scale',
        features: [
            {
                title: { tr: "Hukuki Ön Değerlendirme", en: "Legal Pre-Assessment" },
                description: { tr: "Davanızla ilgili genel bilgilendirme yapar.", en: "Provides general information about your case." },
                iconName: 'MessageSquare'
            },
            {
                title: { tr: "Randevu Planlama", en: "Appointment Scheduling" },
                description: { tr: "Uzman avukatlarla görüşme ayarlar.", en: "Schedules meetings with expert lawyers." },
                iconName: 'Calendar'
            },
            {
                title: { tr: "Belge Bilgilendirme", en: "Document Guidance" },
                description: { tr: "Gerekli evraklar hakkında rehberlik eder.", en: "Guides about required documents." },
                iconName: 'Book'
            }
        ],
        promptExample: {
            user: { tr: "Boşanma davası için ne yapmalıyım?", en: "What should I do for a divorce case?" },
            ai: { tr: "Boşanma süreciyle ilgili size ön bilgi verebilirim. Anlaşmalı mı yoksa çekişmeli mi boşanma düşünüyorsunuz?", en: "I can give you preliminary information about the divorce process. Are you considering a mutual or contested divorce?" }
        },
        conversation: [
            { role: 'user', content: { tr: "İş yerimden tazminatsız çıkarıldım, ne yapabilirim?", en: "I was let go from work without severance, what can I do?" } },
            { role: 'ai', content: { tr: "Üzgünüm bu durumu duyduğuma. İş Hukuku kapsamında haklarınız var. Kaç yıl çalıştınız ve istifa mı ettirildiz yoksa fesih mi yapıldı?", en: "I'm sorry to hear this. You have rights under Labor Law. How many years did you work, and were you forced to resign or was it a termination?" } },
            { role: 'user', content: { tr: "3 yıl çalıştım, fesih yapıldı dendi.", en: "I worked 3 years, they said it was termination." } },
            { role: 'ai', content: { tr: "3 yıllık kıdeminiz için hem kıdem hem ihbar tazminatı hakkınız var. Bu hafta İş Hukuku uzmanımızla ücretsiz 15 dakikalık ön görüşme ayarlayabilir miyim?", en: "For your 3 years, you're entitled to both severance and notice pay. Can I schedule a free 15-minute preliminary meeting with our Labor Law expert this week?" } }
        ]
    },
    fitness: {
        id: 'fitness',
        title: { tr: "Spor & Fitness", en: "Sports & Fitness" },
        subtitle: {
            tr: "Üyelik bilgisinden ders programlarına, kişisel antrenör randevusuna kadar her şey.",
            en: "Everything from membership info to class schedules and personal trainer bookings."
        },
        iconName: 'Dumbbell',
        features: [
            {
                title: { tr: "Üyelik Bilgilendirme", en: "Membership Info" },
                description: { tr: "Paketleri, fiyatları ve kampanyaları sunar.", en: "Presents packages, prices, and promotions." },
                iconName: 'DollarSign'
            },
            {
                title: { tr: "Ders Programları", en: "Class Schedules" },
                description: { tr: "Yoga, pilates, spinning ders saatlerini gösterir.", en: "Shows yoga, pilates, spinning class times." },
                iconName: 'Calendar'
            },
            {
                title: { tr: "PT Randevusu", en: "PT Booking" },
                description: { tr: "Kişisel antrenör seansı ayarlar.", en: "Schedules personal trainer sessions." },
                iconName: 'Users'
            }
        ],
        promptExample: {
            user: { tr: "Aylık üyelik ücreti ne kadar?", en: "How much is monthly membership?" },
            ai: { tr: "Aylık üyeliğimiz 990 TL, 3 aylık pakette ise %20 indirimle 2.376 TL. Hangi şubemizi düşünüyorsunuz?", en: "Monthly membership is $99, 3-month package is $237 with 20% off. Which branch are you considering?" }
        },
        conversation: [
            { role: 'user', content: { tr: "Kilo vermek istiyorum, nereden başlamalıyım?", en: "I want to lose weight, where should I start?" } },
            { role: 'ai', content: { tr: "Harika bir hedef! Öncelikle fitness seviyenizi ve hedef kilonuzu öğrenebilir miyim? Size özel bir program oluşturabiliriz.", en: "Great goal! First, can I learn your fitness level and target weight? We can create a personalized program for you." } },
            { role: 'user', content: { tr: "Yeni başlayacağım, 10 kilo vermek istiyorum.", en: "I'm a beginner, want to lose 10 kilos." } },
            { role: 'ai', content: { tr: "Başlangıç seviyesi için 'Kardiyo + Direnç' kombini harika sonuç veriyor. Haftada 3 gün grup derslerine katılabilir, 1 gün de PT seansı yapabilirsiniz. Ücretsiz deneme dersi için bu hafta müsait misiniz?", en: "For beginners, 'Cardio + Resistance' combo gives great results. You can join group classes 3 days a week and do PT sessions once a week. Are you available this week for a free trial class?" } }
        ]
    },
    retail: {
        id: 'retail',
        title: { tr: "Perakende & Mağazacılık", en: "Retail & Stores" },
        subtitle: {
            tr: "Stok sorgulama, mağaza bilgisi, kampanyalar ve sadakat programı yönetimi.",
            en: "Stock inquiries, store info, promotions, and loyalty program management."
        },
        iconName: 'Store',
        features: [
            {
                title: { tr: "Stok Sorgulama", en: "Stock Check" },
                description: { tr: "Ürün mevcudiyetini anlık kontrol eder.", en: "Checks product availability instantly." },
                iconName: 'ShoppingBag'
            },
            {
                title: { tr: "Mağaza Bulucu", en: "Store Finder" },
                description: { tr: "En yakın mağazayı ve çalışma saatlerini gösterir.", en: "Shows nearest store and working hours." },
                iconName: 'MapPin'
            },
            {
                title: { tr: "Kampanya Bilgisi", en: "Promo Info" },
                description: { tr: "Güncel indirim ve fırsatları duyurur.", en: "Announces current discounts and deals." },
                iconName: 'Megaphone'
            }
        ],
        promptExample: {
            user: { tr: "Bu ürün stokta var mı?", en: "Is this product in stock?" },
            ai: { tr: "Ürün adını veya kodunu paylaşır mısınız? Hemen tüm mağazalarımızdaki stok durumunu kontrol edeyim.", en: "Can you share the product name or code? I'll check stock status across all our stores immediately." }
        },
        conversation: [
            { role: 'user', content: { tr: "Mavi renkli XL beden mont var mı?", en: "Do you have the jacket in blue, size XL?" } },
            { role: 'ai', content: { tr: "Stok durumunu kontrol ediyorum... Mavi XL beden Kadıköy ve Beşiktaş mağazalarımızda mevcut. Hangisine yönlendireyim?", en: "Checking stock... Blue XL is available at our Kadikoy and Besiktas stores. Which one should I direct you to?" } },
            { role: 'user', content: { tr: "Kadıköy mağazası ne zaman açık?", en: "When is the Kadikoy store open?" } },
            { role: 'ai', content: { tr: "Kadıköy mağazamız hafta içi 10:00-22:00, hafta sonu 11:00-21:00 saatleri arasında açık. Ayrıca bu ürünü sizin için ayırtmamı ister misiniz? 48 saat bekletebiliriz.", en: "Our Kadikoy store is open weekdays 10:00-22:00, weekends 11:00-21:00. Would you like me to reserve this product for you? We can hold it for 48 hours." } }
        ]
    },

}

