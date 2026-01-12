import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/console/', '/api/'],
        },
        sitemap: 'https://getvion.com/sitemap.xml',
    }
}
