"use client"

import { useEffect, useState } from "react"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { useLanguage } from "@/context/LanguageContext"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Calendar, Clock } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

// Type definition (should be shared)
interface BlogPost {
    id: string;
    slug: string;
    title: { en: string; tr: string };
    excerpt: { en: string; tr: string };
    content: { en: string; tr: string };
    category: string;
    date: string;
    readTime: string;
    image: string;
    author: { name: string; avatar: string };
}

export default function BlogPage() {
    const { t, language } = useLanguage()
    const [posts, setPosts] = useState<BlogPost[]>([])

    useEffect(() => {
        fetch('/api/cms/blog')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setPosts(data)
            })
            .catch(err => console.error(err))
    }, [])

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <PublicHeader />

            {/* Hero */}
            <section className="pt-32 pb-12 md:pt-48 md:pb-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-background pointer-events-none" />
                <div className="container mx-auto px-4 relative z-10 text-center">
                    <Badge variant="outline" className="mb-6 border-blue-500/30 text-blue-600 dark:text-blue-300">
                        {language === 'tr' ? 'Blog & İçgörüler' : 'Blog & Insights'}
                    </Badge>
                    <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
                        {language === 'tr' ? 'Yapay Zeka Dünyasından Haberler' : 'Latest from the AI World'}
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        {language === 'tr'
                            ? 'Sektörel trendler, kullanım örnekleri ve ürün güncellemeleri.'
                            : 'Industry trends, use cases, and product updates.'}
                    </p>
                </div>
            </section>

            {/* Content Grid */}
            <section className="py-12 md:py-20 bg-muted/30">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {posts.map((post) => (
                            <Link key={post.id} href={`/blog/${post.slug}`} className="group">
                                <article className="bg-card border border-border rounded-2xl overflow-hidden hover:border-foreground/20 transition-all hover:translate-y-[-4px] shadow-sm">
                                    <div className="aspect-video relative overflow-hidden">
                                        <Image
                                            src={post.image}
                                            alt={post.title[language as 'en' | 'tr']}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                            unoptimized
                                        />
                                        <div className="absolute top-4 left-4">
                                            <Badge className="bg-background/80 backdrop-blur border-border text-foreground hover:bg-background">
                                                {post.category}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" /> {post.date}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {post.readTime}
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2">
                                            {post.title[language as 'en' | 'tr']}
                                        </h3>
                                        <p className="text-muted-foreground text-sm mb-6 line-clamp-3">
                                            {post.excerpt[language as 'en' | 'tr']}
                                        </p>
                                        <div className="flex items-center justify-between mt-auto">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                                    {post.author.name.charAt(0)}
                                                </div>
                                                <span className="text-sm text-muted-foreground">{post.author.name}</span>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                                        </div>
                                    </div>
                                </article>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            <PublicFooter />
        </div>
    )
}
