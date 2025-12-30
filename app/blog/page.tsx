
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
        <div className="min-h-screen bg-black text-white font-sans">
            <PublicHeader />

            {/* Hero */}
            <section className="pt-32 pb-12 md:pt-48 md:pb-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 to-black pointer-events-none" />
                <div className="container mx-auto px-4 relative z-10 text-center">
                    <Badge variant="outline" className="mb-6 border-blue-500/30 text-blue-300">
                        {language === 'tr' ? 'Blog & İçgörüler' : 'Blog & Insights'}
                    </Badge>
                    <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
                        {language === 'tr' ? 'Yapay Zeka Dünyasından Haberler' : 'Latest from the AI World'}
                    </h1>
                    <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
                        {language === 'tr'
                            ? 'Sektörel trendler, kullanım örnekleri ve ürün güncellemeleri.'
                            : 'Industry trends, use cases, and product updates.'}
                    </p>
                </div>
            </section>

            {/* Content Grid */}
            <section className="py-12 md:py-20 bg-zinc-900/50">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {posts.map((post) => (
                            <Link key={post.id} href={`/blog/${post.slug}`} className="group">
                                <article className="bg-black border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all hover:translate-y-[-4px]">
                                    <div className="aspect-video relative overflow-hidden">
                                        <Image
                                            src={post.image}
                                            alt={post.title[language as 'en' | 'tr']}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                            unoptimized
                                        />
                                        <div className="absolute top-4 left-4">
                                            <Badge className="bg-black/50 backdrop-blur border-white/10 text-white hover:bg-black/70">
                                                {post.category}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <div className="flex items-center gap-4 text-xs text-zinc-500 mb-4">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" /> {post.date}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {post.readTime}
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-bold mb-3 group-hover:text-blue-400 transition-colors line-clamp-2">
                                            {post.title[language as 'en' | 'tr']}
                                        </h3>
                                        <p className="text-zinc-400 text-sm mb-6 line-clamp-3">
                                            {post.excerpt[language as 'en' | 'tr']}
                                        </p>
                                        <div className="flex items-center justify-between mt-auto">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-blue-900/30 flex items-center justify-center text-[10px] font-bold text-blue-300">
                                                    {post.author.name.charAt(0)}
                                                </div>
                                                <span className="text-sm text-zinc-400">{post.author.name}</span>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
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
