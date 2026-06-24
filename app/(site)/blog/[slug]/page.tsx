"use client"

import { useEffect, useState } from "react"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { useLanguage } from "@/context/LanguageContext"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, ArrowLeft, User, Share2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { SEED_BLOG_POSTS } from "@/lib/seed-cms-data"

// Type definition (same as list page)
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

const BLOG_IMAGE_FALLBACK = "/blog/customer-service-ai.jpg";

function resolveBlogImage(image: string | undefined) {
    if (!image || !image.trim()) return BLOG_IMAGE_FALLBACK;
    return image;
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
    const { t, language } = useLanguage()
    const initialPost = (SEED_BLOG_POSTS as BlogPost[]).find((item) => item.slug === params.slug) || null
    const [post, setPost] = useState<BlogPost | null>(initialPost)
    const [loading, setLoading] = useState(!initialPost)
    const [error, setError] = useState(false)

    useEffect(() => {
        setLoading(true)
        fetch(`/api/cms/blog/${params.slug}`)
            .then(res => {
                if (!res.ok) throw new Error("Not found")
                return res.json()
            })
            .then(data => {
                setPost(data)
                setLoading(false)
            })
            .catch(err => {
                console.error(err)
                setError(true)
                setLoading(false)
            })
    }, [params.slug])

    if (loading) {
        return (
            <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
                <PublicHeader />
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
                </div>
                <PublicFooter />
            </div>
        )
    }

    if (error || !post) {
        return (
            <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
                <PublicHeader />
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                    <h1 className="text-4xl font-bold mb-4">404</h1>
                    <p className="text-muted-foreground mb-8">{language === 'tr' ? 'Yazı bulunamadı.' : 'Post not found.'}</p>
                    <Link href="/blog">
                        <Button variant="outline" className="text-foreground border-border hover:bg-accent">
                            <ArrowLeft className="mr-2 w-4 h-4" />
                            {language === 'tr' ? 'Bloga Dön' : 'Back to Blog'}
                        </Button>
                    </Link>
                </div>
                <PublicFooter />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <PublicHeader />

            {/* Hero Section */}
            <div className="relative pt-32 pb-12 md:pb-20 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-background pointer-events-none" />

                <div className="container mx-auto px-4 relative z-10">
                    <Link href="/blog" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {language === 'tr' ? 'Bloga Geri Dön' : 'Back to Blog'}
                    </Link>

                    <div className="flex flex-wrap gap-4 items-center mb-6">
                        <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20">
                            {post.category}
                        </Badge>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Calendar className="w-4 h-4" />
                            <span>{post.date}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Clock className="w-4 h-4" />
                            <span>{post.readTime}</span>
                        </div>
                    </div>

                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight max-w-4xl">
                        {post.title[language as 'en' | 'tr']}
                    </h1>

                    <div className="flex items-center justify-between border-t border-b border-border py-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                                {post.author.name.charAt(0)}
                            </div>
                            <div>
                                <div className="font-medium">{post.author.name}</div>
                                <div className="text-xs text-muted-foreground">{language === 'tr' ? 'Yazar' : 'Author'}</div>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-accent">
                            <Share2 className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <article className="container mx-auto px-4 max-w-4xl pb-24">
                <div className="rounded-2xl overflow-hidden mb-12 border border-border bg-card/50 relative h-auto">
                    <Image
                        src={resolveBlogImage(post.image)}
                        alt={post.title[language as 'en' | 'tr']}
                        width={800}
                        height={500}
                        sizes="(max-width: 1024px) 100vw, 800px"
                        className="w-full h-auto max-h-[500px] object-cover"
                        unoptimized
                    />
                </div>

                <div className="prose dark:prose-invert prose-lg max-w-none">
                    {/* Basic rendering of content - in a real app might need markdown parser */}
                    {post.content[language as 'en' | 'tr'].split('\n').map((paragraph, i) => (
                        <p key={i} className="mb-4 text-foreground/90 leading-relaxed">
                            {paragraph}
                        </p>
                    ))}
                </div>
            </article>

            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "BlogPosting",
                        "headline": post.title[language as 'en' | 'tr'],
                        "image": [`https://www.ameritai.com${post.image}`],
                        "datePublished": post.date,
                        "dateModified": post.date,
                        "author": [{
                            "@type": "Person",
                            "name": post.author.name,
                            "url": "https://www.ameritai.com"
                        }],
                        "mainEntityOfPage": `https://www.ameritai.com/blog/${post.slug}`,
                        "description": post.excerpt[language as 'en' | 'tr']
                    })
                }}
            />

            <PublicFooter />
        </div>
    )
}
