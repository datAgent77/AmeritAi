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
// Generic keyed limiter used by the distributed/in-memory fallback path.
const genericLimits = new Map<string, RateLimitEntry>();

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

    for (const [key, entry] of genericLimits.entries()) {
        if (now - entry.firstRequest > WINDOW_MS) {
            genericLimits.delete(key);
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

export function getRateLimitHeaders(result: { remaining: number; resetIn: number }) {
    return {
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": Math.ceil(result.resetIn / 1000).toString(),
    };
}

// ---------------------------------------------------------------------------
// Distributed rate limiting (Upstash Redis REST) with in-memory fallback.
//
// Use this for stateless/serverless routes (e.g. public AI endpoints) where the
// in-memory Map above is ineffective because each instance has its own memory.
// When UPSTASH_REDIS_REST_URL / _TOKEN are set, a shared Redis counter is used;
// otherwise it transparently falls back to the in-memory limiter.
// ---------------------------------------------------------------------------

export type RateLimitResult = { allowed: boolean; remaining: number; resetIn: number };

/**
 * Best-effort extraction of the originating client IP behind proxies/CDNs.
 */
export function getClientIp(req: Request): string {
    const xff = req.headers.get("x-forwarded-for");
    if (xff) {
        const first = xff.split(",")[0]?.trim();
        if (first) return first;
    }
    return (
        req.headers.get("x-real-ip") ||
        req.headers.get("cf-connecting-ip") ||
        "unknown"
    );
}

function checkLimitInMemory(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const entry = genericLimits.get(key);

    if (!entry || now - entry.firstRequest > windowMs) {
        genericLimits.set(key, { count: 1, firstRequest: now });
        return { allowed: true, remaining: Math.max(0, limit - 1), resetIn: windowMs };
    }

    entry.count++;
    const remaining = Math.max(0, limit - entry.count);
    const resetIn = windowMs - (now - entry.firstRequest);
    return { allowed: entry.count <= limit, remaining, resetIn };
}

async function upstashFixedWindow(key: string, windowSec: number): Promise<number | null> {
    const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
    const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
    if (!url || !token) return null;

    try {
        // Atomic fixed-window counter: INCR, and set TTL only when the key is new.
        const res = await fetch(`${url}/pipeline`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify([
                ["INCR", key],
                ["EXPIRE", key, String(windowSec), "NX"],
            ]),
            // Never let the limiter hang a request.
            signal: AbortSignal.timeout(1500),
        });

        if (!res.ok) return null;
        const data = (await res.json()) as Array<{ result?: unknown; error?: unknown }>;
        const count = Number(data?.[0]?.result);
        return Number.isFinite(count) ? count : null;
    } catch {
        // On any transport/timeout error, signal "unavailable" so we fall back.
        return null;
    }
}

/**
 * Distributed-aware rate limit check. Keyed by an arbitrary string (e.g.
 * `ai:copywriter:<ip>`). Returns whether the request is allowed.
 */
export async function checkRateLimitAsync(
    key: string,
    limit: number,
    windowMs: number = WINDOW_MS
): Promise<RateLimitResult> {
    const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
    const count = await upstashFixedWindow(key, windowSec);

    if (count !== null) {
        return {
            allowed: count <= limit,
            remaining: Math.max(0, limit - count),
            resetIn: windowMs,
        };
    }

    // Upstash not configured or unreachable -> in-memory fallback.
    return checkLimitInMemory(key, limit, windowMs);
}
