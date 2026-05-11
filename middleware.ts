import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LANGUAGE_COOKIE_NAME = 'language';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const blockedPaths = ['/api/test', '/api/test-env', '/api/test-firebase-config', '/api/temp-debug'];
const allowedOrigins = [
    'https://www.getvion.com',
    'https://getvion.com',
    'http://localhost:3000',
];

function isSupportedLanguage(value: string | undefined): value is 'en' | 'tr' {
    return value === 'en' || value === 'tr';
}

function resolveGeoLanguage(request: NextRequest): 'en' | 'tr' {
    const country = (request.headers.get('x-vercel-ip-country') || '').toUpperCase();
    return country === 'TR' ? 'tr' : 'en';
}

function isPublicSitePage(pathname: string): boolean {
    return !pathname.startsWith('/api')
        && !pathname.startsWith('/admin')
        && !pathname.startsWith('/console');
}

/**
 * Middleware for route protection and security headers.
 * 
 * - Blocks access to known debug/test API routes
 * - Sets initial language by visitor country (TR => tr, otherwise en)
 * - Adds security headers to all responses
 * - CORS segmentation: admin/console APIs restricted to own domain
 */
export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const isEmbeddableWidgetPath = pathname.startsWith('/chatbot-view');

    if (pathname === '/@vite/client') {
        return new NextResponse(null, {
            status: 204,
            headers: {
                'Content-Type': 'application/javascript; charset=utf-8',
                'Cache-Control': 'no-store, max-age=0',
            },
        });
    }

    // === BLOCK DEBUG/TEST ROUTES ===
    if (blockedPaths.some(p => pathname.startsWith(p))) {
        return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const response = NextResponse.next();

    // === SECURITY HEADERS ===
    if (!isEmbeddableWidgetPath) {
        response.headers.set('X-Frame-Options', 'DENY');
    }
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    // === LANGUAGE COOKIE FROM GEO (only for public pages) ===
    if (isPublicSitePage(pathname)) {
        const existingLanguage = request.cookies.get(LANGUAGE_COOKIE_NAME)?.value;
        const resolvedLanguage = isSupportedLanguage(existingLanguage)
            ? existingLanguage
            : resolveGeoLanguage(request);

        if (!isSupportedLanguage(existingLanguage)) {
            response.cookies.set(LANGUAGE_COOKIE_NAME, resolvedLanguage, {
                path: '/',
                maxAge: ONE_YEAR_SECONDS,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
            });
        }

        response.headers.set('Content-Language', resolvedLanguage === 'tr' ? 'tr-TR' : 'en-US');
    }

    // === CORS SEGMENTATION ===
    if (pathname.startsWith('/api/admin') || pathname.startsWith('/api/console') || pathname.startsWith('/api/agency')) {
        const origin = request.headers.get('origin') || '';

        if (allowedOrigins.includes(origin)) {
            response.headers.set('Access-Control-Allow-Origin', origin);
        } else {
            // Block CORS for unrecognized origins on admin/console APIs
            response.headers.delete('Access-Control-Allow-Origin');
        }

        response.headers.set('Access-Control-Allow-Credentials', 'true');
        response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    return response;
}

export const config = {
    matcher: [
        // Match all non-static routes (pages + api + admin + console)
        '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.[^/]+$).*)',
    ],
};
