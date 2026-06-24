
import { MessageSquare, BookOpen, GraduationCap } from "lucide-react";

export interface BlogPost {
    id: string;
    slug: string;
    title: {
        en: string;
        tr: string;
    };
    excerpt: {
        en: string;
        tr: string;
    };
    content: {
        en: string;
        tr: string;
    };
    category: string;
    date: string;
    readTime: string;
    image: string;
    author: {
        name: string;
        avatar: string;
    };
}

export interface FaqItem {
    id: string;
    question: {
        en: string;
        tr: string;
    };
    answer: {
        en: string;
        tr: string;
    };
    category: string;
}

export interface EducationResource {
    id: string;
    title: {
        en: string;
        tr: string;
    };
    description: {
        en: string;
        tr: string;
    };
    type: 'video' | 'article' | 'guide';
    url: string;
    duration?: string;
}

// Mock Database mimicking Strapi
const BLOG_POSTS: BlogPost[] = [
    {
        id: "1",
        slug: "future-of-ai-commerce",
        title: {
            en: "The Future of AI in E-Commerce: Beyond Chatbots",
            tr: "E-Ticarette Yapay Zekanın Geleceği: Chatbotların Ötesi"
        },
        excerpt: {
            en: "How autonomous agents are transforming the online shopping experience from reactive support to proactive sales.",
            tr: "Otonom ajanlar online alışveriş deneyimini reaktif destekten proaktif satışa nasıl dönüştürüyor?"
        },
        content: {
            en: "Full article content placeholder...",
            tr: "Tam makale içeriği yer tutucusu..."
        },
        category: "E-Commerce",
        date: "Dec 28, 2025",
        readTime: "5 min read",
        image: "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?q=80&w=2000&auto=format&fit=crop",
        author: {
            name: "Sarah Chen",
            avatar: "SC"
        }
    },
    {
        id: "2",
        slug: "ai-in-healthcare-triage",
        title: {
            en: "AI Triage Systems: Reducing Wait Times in Clinics",
            tr: "AI Triyaj Sistemleri: Kliniklerde Bekleme Sürelerini Azaltma"
        },
        excerpt: {
            en: "Implementing initial patient screening using natural language processing to prioritize urgent cases.",
            tr: "Acil vakaları önceliklendirmek için doğal dil işleme kullanarak ilk hasta taramasının uygulanması."
        },
        content: {
            en: "Full article content placeholder...",
            tr: "Tam makale içeriği yer tutucusu..."
        },
        category: "Healthcare",
        date: "Dec 25, 2025",
        readTime: "7 min read",
        image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=2000&auto=format&fit=crop",
        author: {
            name: "Dr. James Wilson",
            avatar: "JW"
        }
    },
    {
        id: "3",
        slug: "smart-farming-iot",
        title: {
            en: "Integrating IoT with AI for Precision Agriculture",
            tr: "Hassas Tarım için IoT ile Yapay Zeka Entegrasyonu"
        },
        excerpt: {
            en: "Connecting soil sensors and weather data to AI assistants for real-time crop management advice.",
            tr: "Gerçek zamanlı ürün yönetimi tavsiyesi için toprak sensörlerini ve hava durumu verilerini yapay zeka asistanlarına bağlamak."
        },
        content: {
            en: "Full article content placeholder...",
            tr: "Tam makale içeriği yer tutucusu..."
        },
        category: "Agriculture",
        date: "Dec 20, 2025",
        readTime: "6 min read",
        image: "https://images.unsplash.com/photo-1625246333195-5819acf4251c?q=80&w=2000&auto=format&fit=crop",
        author: {
            name: "Mehmet Yılmaz",
            avatar: "MY"
        }
    }
];

const FAQS: FaqItem[] = [
    {
        id: "1",
        category: "General",
        question: {
            en: "Does the chatbot hallucinate or make up facts?",
            tr: "Chatbot halüsinasyon görür mü veya yanlış bilgi uydurur mu?"
        },
        answer: {
            en: "No. AmeritAI is designed with strict 'Guardrails'. If it doesn't find the answer in your provided AI Training Resources, it will honestly say 'I don't know' or redirect to a human agent.",
            tr: "Hayır. AmeritAI, katı 'Güvenlik Önlemleri' (Guardrails) ile tasarlanmıştır. Cevabı sağladığınız AI Eğitim Kaynakları'nda bulamazsa, dürüstçe 'Bilmiyorum' der veya bir insan temsilciye yönlendirir."
        }
    },
    {
        id: "2",
        category: "Integration",
        question: {
            en: "How long does it take to integrate onto my website?",
            tr: "Web siteme entegre etmek ne kadar sürer?"
        },
        answer: {
            en: "Less than 5 minutes. You simply copy and paste a small JavaScript snippet into your website's footer.",
            tr: "5 dakikadan az. Tek yapmanız gereken küçük bir JavaScript kod parçacığını web sitenizin altbilgisine (footer) kopyalayıp yapıştırmaktır."
        }
    },
    {
        id: "3",
        category: "Pricing",
        question: {
            en: "Can I upgrade my plan later?",
            tr: "Planımı daha sonra yükseltebilir miyim?"
        },
        answer: {
            en: "Yes, you can scale your plan up or down at any time from the administration console.",
            tr: "Evet, yönetim konsolundan planınızı istediğiniz zaman büyütebilir veya küçültebilirsiniz."
        }
    }
];

const EDUCATION_CONTENT: EducationResource[] = [
    {
        id: "1",
        title: { en: "Getting Started Guide", tr: "Başlangıç Rehberi" },
        description: { en: "Learn the basics of setting up your first AI agent.", tr: "İlk AI ajanınızı kurmanın temellerini öğrenin." },
        type: "guide",
        url: "/docs/getting-started",
        duration: "10 min"
    },
    {
        id: "2",
        title: { en: "Training Your AI", tr: "Yapay Zekanızı Eğitmek" },
        description: { en: "Best practices for uploading documents and websites.", tr: "Doküman ve web sitesi yüklemek için en iyi uygulamalar." },
        type: "video",
        url: "/docs/training",
        duration: "5:30"
    }
];

export const mockCms = {
    getBlogPosts: async () => {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 100));
        return BLOG_POSTS;
    },
    getFaqs: async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return FAQS;
    },
    getEducationContent: async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return EDUCATION_CONTENT;
    }
};
