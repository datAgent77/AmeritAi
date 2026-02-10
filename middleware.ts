import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for route protection and security headers.
 * 
 * - Blocks access to known debug/test API routes
 * - Adds security headers to all responses
 * - CORS segmentation: admin/console APIs restricted to own domain
 */
export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // === BLOCK DEBUG/TEST ROUTES ===
    const blockedPaths = ['/api/test', '/api/test-env', '/api/test-firebase-config', '/api/temp-debug'];
    if (blockedPaths.some(p => pathname.startsWith(p))) {
        return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const response = NextResponse.next();

    // === SECURITY HEADERS ===
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    // === CORS SEGMENTATION ===
    if (pathname.startsWith('/api/admin') || pathname.startsWith('/api/console')) {
        const origin = request.headers.get('origin') || '';
        const allowedOrigins = [
            'https://www.getvion.com',
            'https://getvion.com',
            'http://localhost:3000',
        ];

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
        // Match all API routes
        '/api/:path*',
        // Match admin and console pages (for future auth middleware)
        '/admin/:path*',
        '/console/:path*',
    ],
};
