
// -- GENERATED SEED DATA --
// Expanded to 50 Blog Posts and 100 FAQs

const generateBlogContent = (topic: string, sector: string) => {
    return {
        en: `
        The integration of Artificial Intelligence in the ${sector} sector is reshaping how businesses operate. ${topic} involves leveraging machine learning algorithms to process vast amounts of data and derive actionable insights.

        One of the key benefits is efficiency. By automating routine tasks, AI allows professionals in ${sector} to focus on high-value activities. For instance, chatbots can handle initial customer queries, while predictive models manage inventory or schedules.

        Furthermore, personalization has reached new heights. In ${sector}, understanding client needs is paramount. AI analyzes behavior patterns to tailor recommendations, offers, and services, ensuring a unique experience for every individual.

        However, implementing these technologies requires a strategic approach. Data privacy and security must be prioritized. Businesses need to ensure that their AI systems are compliant with regulations like GDPR to maintain trust.

        Looking ahead, the future of ${sector} with AI is bright. Innovations such as autonomous agents and advanced natural language processing will continue to drive growth, making operations smarter, faster, and more customer-centric.
        `,
        tr: `
        ${sector} sektöründe Yapay Zeka entegrasyonu, işletmelerin çalışma şeklini yeniden şekillendiriyor. ${topic}, büyük miktarda veriyi işlemek ve eyleme dönüştürülebilir içgörüler elde etmek için makine öğrenimi algoritmalarından yararlanmayı içerir.

        En önemli faydalardan biri verimliliktir. Rutin görevleri otomatikleştirerek, AI ${sector} profesyonellerinin yüksek değerli aktivitelere odaklanmasını sağlar. Örneğin, chatbotlar ilk müşteri sorgularını ele alırken, tahmine dayalı modeller envanteri veya programları yönetir.

        Ayrıca, kişiselleştirme yeni zirvelere ulaştı. ${sector} alanında müşteri ihtiyaçlarını anlamak çok önemlidir. AI, her birey için benzersiz bir deneyim sağlamak amacıyla önerileri, teklifleri ve hizmetleri uyarlamak için davranış kalıplarını analiz eder.

        Ancak, bu teknolojileri uygulamak stratejik bir yaklaşım gerektirir. Veri gizliliği ve güvenliği önceliklendirilmelidir. İşletmeler, güveni korumak için AI sistemlerinin KVKK gibi düzenlemelere uyumlu olduğundan emin olmalıdır.

        İleriye bakıldığında, AI ile ${sector} sektörünün geleceği parlak. Otonom ajanlar ve gelişmiş doğal dil işleme gibi yenilikler büyümeyi sürdürecek, operasyonları daha akıllı, daha hızlı ve daha müşteri odaklı hale getirecektir.
        `
    };
};

const BLOG_SECTORS = [
    { name: "E-Commerce", trName: "E-Ticaret", category: "E-Ticaret" },
    { name: "Healthcare", trName: "Sağlık", category: "Sağlık" },
    { name: "Real Estate", trName: "Emlak", category: "Emlak" },
    { name: "Finance", trName: "Finans", category: "Finans" },
    { name: "Education", trName: "Eğitim", category: "Eğitim" },
    { name: "Service", trName: "Hizmet", category: "Hizmet" },
    { name: "Travel", trName: "Seyahat", category: "Seyahat" },
    { name: "Restaurant", trName: "Restoran", category: "Restoran" },
    { name: "Agriculture", trName: "Tarım", category: "Tarım" },
    { name: "SaaS", trName: "Yazılım", category: "Teknoloji" }
];

const BLOG_TOPICS = [
    "Transformation", "Efficiency Boost", "Customer Experience", "Future Trends", "Automation Strategies"
];

// Generate 50 Blog Posts
export const SEED_BLOG_POSTS = BLOG_SECTORS.flatMap((sector, sIdx) =>
    BLOG_TOPICS.map((topic, tIdx) => {
        const titleEn = `${topic} in ${sector.name}`;
        const titleTr = `${sector.trName} Sektöründe ${topic === "Transformation" ? "Dönüşüm" : topic === "Efficiency Boost" ? "Verimlilik Artışı" : topic === "Customer Experience" ? "Müşteri Deneyimi" : topic === "Future Trends" ? "Gelecek Trendleri" : "Otomasyon Stratejileri"}`;

        const content = generateBlogContent(titleEn, sector.name);

        return {
            slug: `${sector.name.toLowerCase()}-${topic.toLowerCase().replace(/ /g, '-')}-${sIdx}${tIdx}`,
            title: { en: titleEn, tr: titleTr },
            excerpt: {
                en: `Explore how ${topic} is driving change in the ${sector.name} industry.`,
                tr: `${sector.trName} sektöründe ${topic === "Transformation" ? "dönüşümün" : "yeniliklerin"} değişimi nasıl tetiklediğini keşfedin.`
            },
            content: { en: content.en, tr: content.tr },
            category: sector.category,
            date: `2025-${(sIdx % 12) + 1}-${(tIdx % 28) + 1}`,
            readTime: `${5 + (tIdx % 3)} min`,
            image: `https://images.unsplash.com/photo-${1500000000000 + (sIdx * 100) + tIdx}?auto=format&fit=crop&w=800&q=80`, // Placeholder-ish URL structure, realistically would need real IDs
            author: { name: "Vion AI Team", avatar: "VA" }
        };
    })
);


// Generate 100 FAQs
// 10 Categories x 10 Questions
const FAQ_CATEGORIES = [
    { id: "integration", en: "Integration", tr: "Entegrasyon" },
    { id: "pricing", en: "Pricing", tr: "Fiyatlandırma" },
    { id: "security", en: "Security", tr: "Güvenlik" },
    { id: "customization", en: "Customization", tr: "Özelleştirme" },
    { id: "general", en: "General", tr: "Genel" },
    { id: "troubleshooting", en: "Troubleshooting", tr: "Sorun Giderme" },
    { id: "features", en: "Features", tr: "Özellikler" },
    { id: "account", en: "Account Management", tr: "Hesap Yönetimi" },
    { id: "billing", en: "Billing", tr: "Fatura" },
    { id: "api", en: "API & Developers", tr: "API & Geliştiriciler" }
];

export const SEED_FAQS = FAQ_CATEGORIES.flatMap((cat, cIdx) =>
    Array.from({ length: 10 }).map((_, qIdx) => ({
        question: {
            en: `${cat.en} Question ${qIdx + 1}: How does this work?`,
            tr: `${cat.tr} Sorusu ${qIdx + 1}: Bu nasıl çalışır?`
        },
        answer: {
            en: `This is a detailed answer regarding ${cat.en} aspect number ${qIdx + 1}. Vion ensures seamless experience in this area.`,
            tr: `${cat.tr} konusuyla ilgili ${qIdx + 1} numaralı detaylı cevaptır. Vion bu alanda sorunsuz bir deneyim sağlar.`
        },
        category: cat.id
    }))
);


export const SEED_EDUCATION = [
    {
        title: { en: "Platform Overview", tr: "Platforma Genel Bakış" },
        description: { en: "A tour of the main features.", tr: "Ana özelliklerin bir turu." },
        type: "video",
        url: "#",
        duration: "5:00",
        thumbnailUrl: "",
        category: "Başlangıç"
    },
    {
        title: { en: "Setting Up Knowledge Base", tr: "Bilgi Tabanı Kurulumu" },
        description: { en: "How to upload PDFs and crawl websites.", tr: "PDF yükleme ve web sitesi tarama." },
        type: "video",
        url: "#",
        duration: "8:20",
        thumbnailUrl: "",
        category: "Eğitim"
    },
    {
        title: { en: "Lead Collection Strategies", tr: "Lead Toplama Stratejileri" },
        description: { en: "Best practices for capturing user info.", tr: "Kullanıcı bilgisi toplamak için en iyi uygulamalar." },
        type: "article",
        url: "#",
        duration: "5 dk okuma",
        thumbnailUrl: "",
        category: "Pazarlama"
    },
    {
        title: { en: "Advanced Analytics", tr: "Gelişmiş Analitik" },
        description: { en: "Understanding your dashboard metrics.", tr: "Panel metriklerinizi anlama." },
        type: "guide",
        url: "#",
        duration: "10 dk okuma",
        thumbnailUrl: "",
        category: "Raporlama"
    }
];
