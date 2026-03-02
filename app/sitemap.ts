import { MetadataRoute } from 'next'
import { SEED_BLOG_POSTS } from '@/lib/seed-cms-data'

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://www.getvion.com'

    // Core pages — highest priority
    const coreRoutes = ['', '/pricing', '/products', '/solutions', '/industries', '/contact', '/why'].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: route === '' ? 1.0 : 0.9,
    }))

    const adLandingRoutes: MetadataRoute.Sitemap = []

    // Secondary pages
    const secondaryRoutes = ['/blog', '/why-us', '/resources/faq', '/resources/education'].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
    }))

    // Legal / Auth pages — low priority
    const legalRoutes = ['/about', '/privacy', '/terms', '/distance-sales'].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'yearly' as const,
        priority: 0.3,
    }))

    // Product pages (static slugs matching actual directories)
    const productSlugs = [
        'ai-support',
        'campaign-manager',
        'gamification',
        'personal-shopper',
        'restaurant-menu',
        'visual-diagnosis',
    ]

    const productRoutes = productSlugs.map((slug) => ({
        url: `${baseUrl}/products/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.8,
    }))

    // Dynamic Blog Posts
    const blogRoutes = SEED_BLOG_POSTS.map((post) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: new Date(post.date),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
    }))

    return [...coreRoutes, ...adLandingRoutes, ...secondaryRoutes, ...productRoutes, ...blogRoutes, ...legalRoutes]
}
