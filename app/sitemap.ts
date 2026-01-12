import { MetadataRoute } from 'next'
import { SEED_BLOG_POSTS } from '@/lib/seed-cms-data'

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://getvion.com' // Updated to actual domain

    // Static pages
    const routes = [
        '',
        '/about',
        '/products',
        '/solutions',
        '/resources/faq',
        '/industries',
        '/pricing',
        '/contact',
        '/blog',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 1,
    }))

    // Dynamic Blog Posts
    // In a real app, you would fetch this from Firestore
    // For now, we use the seed data which mirrors our "database"
    const blogRoutes = SEED_BLOG_POSTS.map((post) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: new Date(post.date),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }))

    // Dynamic Products (Hardcoded list based on directories if not in DB)
    const productSlugs = [
        'ai-sales-chatbot',
        'ai-copywriter',
        'ai-lead-finder',
        'ai-social-media', // Removed if deleted, but keeping checking
    ]

    const productRoutes = productSlugs.map((slug) => ({
        url: `${baseUrl}/products/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.9,
    }))

    return [...routes, ...blogRoutes, ...productRoutes]
}
