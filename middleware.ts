import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LANGUAGE_COOKIE_NAME = 'language';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const blockedPaths = ['/api/test', '/api/test-env', '/api/test-firebase-config', '/api/temp-debug'];

// Origins permitted to make *credentialed* cross-origin calls to privileged
// (admin/console/agency) APIs. Same-origin admin usage never hits CORS, so this
// only gates genuine cross-origin access. Extra brands/domains can be added via
// the ADMIN_ALLOWED_ORIGINS env var (comma-separated) without a code change.
const allowedOrigins = [
    'https://www.getvion.com',
    'https://getvion.com',
    'http://localhost:3000',
    ...(process.env.ADMIN_ALLOWED_ORIGINS || '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
];

// Privileged API prefixes that must NOT be world-open via CORS.
const restrictedApiPrefixes = ['/api/admin', '/api/console', '/api/agency'];

const CORS_METHODS = 'GET,POST,PUT,DELETE,PATCH,OPTIONS';
const CORS_HEADERS = 'Content-Type, Authorization, X-Requested-With, Accept, X-Api-Version';

/**
 * Applies CORS headers based on path sensitivity.
 * - Privileged APIs: reflect only allow-listed origins, with credentials.
 * - All other APIs (public widget/embed endpoints): allow any origin WITHOUT
 *   credentials. This is the safe pattern for an embeddable widget consumed
 *   from arbitrary customer domains using bearer tokens (not cookies).
 */
function applyApiCors(request: NextRequest, response: NextResponse, pathname: string) {
    if (!pathname.startsWith('/api')) return;

    const origin = request.headers.get('origin') || '';
    const isRestricted = restrictedApiPrefixes.some((p) => pathname.startsWith(p));

    if (isRestricted) {
        if (origin && allowedOrigins.includes(origin)) {
            response.headers.set('Access-Control-Allow-Origin', origin);
            response.headers.set('Access-Control-Allow-Credentials', 'true');
            response.headers.set('Vary', 'Origin');
        }
        // Unrecognized origins receive no ACAO header -> browser blocks the read.
    } else {
        // Public/widget endpoints: open, but never with credentials (which would
        // be both invalid alongside "*" and an exfiltration risk).
        response.headers.set('Access-Control-Allow-Origin', '*');
    }

    response.headers.set('Access-Control-Allow-Methods', CORS_METHODS);
    response.headers.set('Access-Control-Allow-Headers', CORS_HEADERS);
}

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

    // === CORS PREFLIGHT ===
    if (request.method === 'OPTIONS' && pathname.startsWith('/api')) {
        const preflight = new NextResponse(null, { status: 204 });
        applyApiCors(request, preflight, pathname);
        return preflight;
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
    // Privileged APIs are locked to allow-listed origins; public/widget APIs are
    // open without credentials. (Previously a global "*" + credentials header in
    // next.config applied to every /api route and overrode this segmentation.)
    applyApiCors(request, response, pathname);

    return response;
}

export const config = {
    matcher: [
        // Match all non-static routes (pages + api + admin + console)
        '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.[^/]+$).*)',
    ],
};
