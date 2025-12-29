"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    FileText,
    HelpCircle,
    GraduationCap,
    Plus,
    Pencil,
    Trash2,
    Search,
    Loader2,
    Save,
    ExternalLink,
    Eye,
    EyeOff
} from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"

// Types
interface BlogPost {
    id: string;
    slug: string;
    title: { en: string; tr: string };
    category: string;
    date: string;
    readTime: string;
    published?: boolean;
}

interface FAQItem {
    id: string;
    question: { en: string; tr: string };
    answer: { en: string; tr: string };
    category: string;
    order: number;
}

interface EducationItem {
    id: string;
    title: { en: string; tr: string };
    description: { en: string; tr: string };
    type: 'video' | 'article' | 'guide';
    url?: string;
}

export default function ContentManagement() {
    const { t, language } = useLanguage()
    const { toast } = useToast()
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    // State
    const [activeTab, setActiveTab] = useState("blog")
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState("")

    // Data states
    const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
    const [faqItems, setFaqItems] = useState<FAQItem[]>([])
    const [educationItems, setEducationItems] = useState<EducationItem[]>([])

    // Sync active tab with URL parameter
    useEffect(() => {
        const tabParam = searchParams.get('tab')
        if (tabParam && ['blog', 'faq', 'education'].includes(tabParam)) {
            setActiveTab(tabParam)
        }
    }, [searchParams])

    // Load data based on active tab
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true)
            try {
                if (activeTab === 'blog') {
                    const res = await fetch('/api/cms/blog')
                    const data = await res.json()
                    if (Array.isArray(data)) setBlogPosts(data)
                } else if (activeTab === 'faq') {
                    const res = await fetch('/api/cms/faq')
                    const data = await res.json()
                    if (Array.isArray(data)) setFaqItems(data)
                } else if (activeTab === 'education') {
                    const res = await fetch('/api/cms/education')
                    const data = await res.json()
                    if (Array.isArray(data)) setEducationItems(data)
                }
            } catch (error) {
                console.error("Failed to load data:", error)
            } finally {
                setIsLoading(false)
            }
        }
        loadData()
    }, [activeTab])

    const handleTabChange = (value: string) => {
        setActiveTab(value)
        setSearch("")
        const params = new URLSearchParams(searchParams)
        params.set('tab', value)
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }

    const handleDelete = async (id: string, type: string) => {
        if (!confirm("Bu öğeyi silmek istediğinizden emin misiniz?")) return

        // Optimistic update
        if (type === 'blog') {
            setBlogPosts(prev => prev.filter(p => p.id !== id))
        } else if (type === 'faq') {
            setFaqItems(prev => prev.filter(p => p.id !== id))
        } else if (type === 'education') {
            setEducationItems(prev => prev.filter(p => p.id !== id))
        }

        toast({
            title: "Silindi",
            description: "Öğe başarıyla silindi.",
        })
    }

    const handleEdit = (id: string) => {
        toast({
            title: "Düzenleme",
            description: `${id} için düzenleme modalı açılacak.`,
        })
    }

    const handleNew = () => {
        toast({
            title: "Yeni Oluştur",
            description: `Yeni ${activeTab} öğesi oluşturma modalı açılacak.`,
        })
    }

    // Menu items for sidebar
    const menuItems = [
        {
            id: 'blog',
            label: 'Blog Yazıları',
            icon: <FileText className="w-4 h-4" />,
            count: blogPosts.length
        },
        {
            id: 'faq',
            label: 'SSS (FAQ)',
            icon: <HelpCircle className="w-4 h-4" />,
            count: faqItems.length
        },
        {
            id: 'education',
            label: 'Eğitim İçerikleri',
            icon: <GraduationCap className="w-4 h-4" />,
            count: educationItems.length
        },
    ]

    // Get header info based on active tab
    const getHeaderInfo = () => {
        switch (activeTab) {
            case 'blog':
                return {
                    title: 'Blog Yazıları',
                    desc: 'Web sitenizdeki blog yazılarını yönetin ve düzenleyin.'
                }
            case 'faq':
                return {
                    title: 'Sıkça Sorulan Sorular',
                    desc: 'Müşterilerinizin sık sorduğu soruları ve cevaplarını yönetin.'
                }
            case 'education':
                return {
                    title: 'Eğitim İçerikleri',
                    desc: 'Video, makale ve rehberlerinizi düzenleyin.'
                }
            default:
                return { title: 'İçerik Yönetimi', desc: 'Web sitesi içeriklerinizi yönetin.' }
        }
    }

    const { title: headerTitle, desc: headerDesc } = getHeaderInfo()

    // Filter items based on search
    const filteredBlogPosts = blogPosts.filter(post =>
        post.title.en.toLowerCase().includes(search.toLowerCase()) ||
        post.title.tr.toLowerCase().includes(search.toLowerCase())
    )

    const filteredFaqItems = faqItems.filter(item =>
        item.question.en.toLowerCase().includes(search.toLowerCase()) ||
        item.question.tr.toLowerCase().includes(search.toLowerCase())
    )

    const filteredEducationItems = educationItems.filter(item =>
        item.title.en.toLowerCase().includes(search.toLowerCase()) ||
        item.title.tr.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="flex h-full bg-white">
            {/* Sidebar Menu */}
            <div className="w-56 border-r bg-muted/30 p-4 flex-shrink-0">
                <h2 className="font-semibold mb-4 px-2">İçerik Yönetimi</h2>
                <nav className="space-y-1">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleTabChange(item.id)}
                            className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${activeTab === item.id
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <span>{item.icon}</span>
                                <span className="truncate">{item.label}</span>
                            </div>
                            {item.count > 0 && (
                                <Badge
                                    variant={activeTab === item.id ? "secondary" : "outline"}
                                    className="text-xs"
                                >
                                    {item.count}
                                </Badge>
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col py-6 px-6 bg-white overflow-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold tracking-tight">{headerTitle}</h3>
                        <p className="text-sm text-muted-foreground">{headerDesc}</p>
                    </div>
                    <Button onClick={handleNew} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Yeni Ekle
                    </Button>
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Ara..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Blog Posts */}
                        {activeTab === 'blog' && (
                            <>
                                {filteredBlogPosts.map((post) => (
                                    <div
                                        key={post.id}
                                        className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                                    >
                                        <div className="grid gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{post.title[language as 'en' | 'tr'] || post.title.en}</span>
                                                <Badge variant="secondary" className="text-xs">{post.category}</Badge>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                                <span>{post.date}</span>
                                                <span>{post.readTime}</span>
                                                <span className="flex items-center gap-1">
                                                    {post.published !== false ? (
                                                        <>
                                                            <Eye className="w-3 h-3" />
                                                            <span className="text-green-600">Yayında</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <EyeOff className="w-3 h-3" />
                                                            <span className="text-amber-600">Taslak</span>
                                                        </>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(post.id)}>
                                                <Pencil className="w-4 h-4 text-muted-foreground" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(post.id, 'blog')}>
                                                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {filteredBlogPosts.length === 0 && (
                                    <div className="text-center py-12 text-muted-foreground">
                                        {search ? 'Sonuç bulunamadı.' : 'Henüz blog yazısı yok.'}
                                    </div>
                                )}
                            </>
                        )}

                        {/* FAQ Items */}
                        {activeTab === 'faq' && (
                            <>
                                {filteredFaqItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                                    >
                                        <div className="grid gap-1 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{item.question[language as 'en' | 'tr'] || item.question.en}</span>
                                                <Badge variant="outline" className="text-xs">{item.category}</Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-1">
                                                {item.answer[language as 'en' | 'tr'] || item.answer.en}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(item.id)}>
                                                <Pencil className="w-4 h-4 text-muted-foreground" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id, 'faq')}>
                                                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {filteredFaqItems.length === 0 && (
                                    <div className="text-center py-12 text-muted-foreground">
                                        {search ? 'Sonuç bulunamadı.' : 'Henüz SSS öğesi yok.'}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Education Items */}
                        {activeTab === 'education' && (
                            <>
                                {filteredEducationItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                                    >
                                        <div className="grid gap-1 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{item.title[language as 'en' | 'tr'] || item.title.en}</span>
                                                <Badge variant="secondary" className="text-xs capitalize">{item.type}</Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-1">
                                                {item.description[language as 'en' | 'tr'] || item.description.en}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {item.url && (
                                                <Button variant="ghost" size="icon" asChild>
                                                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                                                    </a>
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(item.id)}>
                                                <Pencil className="w-4 h-4 text-muted-foreground" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id, 'education')}>
                                                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {filteredEducationItems.length === 0 && (
                                    <div className="text-center py-12 text-muted-foreground">
                                        {search ? 'Sonuç bulunamadı.' : 'Henüz eğitim içeriği yok.'}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
