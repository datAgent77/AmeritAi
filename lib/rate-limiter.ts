/**
 * Simple in-memory rate limiter
 * For production at scale, consider using Redis or Upstash
 */

interface RateLimitEntry {
    count: number;
    firstRequest: number;
}

const ipLimits = new Map<string, RateLimitEntry>();
const sessionLimits = new Map<string, RateLimitEntry>();

// Configuration
const IP_LIMIT = 30; // requests per window
const SESSION_LIMIT = 50; // requests per window
const WINDOW_MS = 60 * 1000; // 1 minute window

// Cleanup old entries every minute
let lastCleanup = Date.now();

function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < WINDOW_MS) return;

    lastCleanup = now;

    for (const [key, entry] of ipLimits.entries()) {
        if (now - entry.firstRequest > WINDOW_MS) {
            ipLimits.delete(key);
        }
    }

    for (const [key, entry] of sessionLimits.entries()) {
        if (now - entry.firstRequest > WINDOW_MS) {
            sessionLimits.delete(key);
        }
    }
}

function checkLimit(
    map: Map<string, RateLimitEntry>,
    key: string,
    limit: number
): { allowed: boolean; remaining: number; resetIn: number } {
    cleanup();

    const now = Date.now();
    const entry = map.get(key);

    if (!entry) {
        map.set(key, { count: 1, firstRequest: now });
        return { allowed: true, remaining: limit - 1, resetIn: WINDOW_MS };
    }

    // Check if window has expired
    if (now - entry.firstRequest > WINDOW_MS) {
        map.set(key, { count: 1, firstRequest: now });
        return { allowed: true, remaining: limit - 1, resetIn: WINDOW_MS };
    }

    // Increment and check
    entry.count++;
    const remaining = Math.max(0, limit - entry.count);
    const resetIn = WINDOW_MS - (now - entry.firstRequest);

    if (entry.count > limit) {
        return { allowed: false, remaining: 0, resetIn };
    }

    return { allowed: true, remaining, resetIn };
}

export function checkRateLimit(ip: string, sessionId?: string): {
    allowed: boolean;
    reason?: string;
    remaining: number;
    resetIn: number;
} {
    // Check IP limit
    const ipResult = checkLimit(ipLimits, ip, IP_LIMIT);
    if (!ipResult.allowed) {
        return {
            allowed: false,
            reason: "IP rate limit exceeded",
            remaining: 0,
            resetIn: ipResult.resetIn
        };
    }

    // Check session limit (if provided)
    if (sessionId) {
        const sessionResult = checkLimit(sessionLimits, sessionId, SESSION_LIMIT);
        if (!sessionResult.allowed) {
            return {
                allowed: false,
                reason: "Session rate limit exceeded",
                remaining: 0,
                resetIn: sessionResult.resetIn
            };
        }
        return {
            allowed: true,
            remaining: Math.min(ipResult.remaining, sessionResult.remaining),
            resetIn: Math.min(ipResult.resetIn, sessionResult.resetIn)
        };
    }

    return {
        allowed: true,
        remaining: ipResult.remaining,
        resetIn: ipResult.resetIn
    };
}

export function getRateLimitHeaders(result: ReturnType<typeof checkRateLimit>) {
    return {
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": Math.ceil(result.resetIn / 1000).toString(),
    };
}
