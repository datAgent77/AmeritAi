import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/console/', '/api/'],
        },
        host: 'https://www.getvion.com',
        sitemap: 'https://www.getvion.com/sitemap.xml',
    }
}
