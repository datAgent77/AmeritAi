import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import dns from "dns/promises";
import net from "net";
import { getAdminAuth } from "@/lib/firebase-admin";
import { isSafeUrl } from "@/lib/security";

export const runtime = "nodejs";

const FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;
const MAX_URL_COUNT = 60;

function normalizeOrigin(origin: string): string {
    return origin.replace("www.", "").replace(/\/$/, "");
}

function isPrivateIpv4(ip: string): boolean {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;

    const [a, b, c] = parts;
    if (a === 0) return true;
    if (a === 10) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 0 && c === 0) return true;
    if (a === 192 && b === 0 && c === 2) return true;
    if (a === 192 && b === 88 && c === 99) return true;
    if (a === 192 && b === 168) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a === 198 && b === 51 && c === 100) return true;
    if (a === 203 && b === 0 && c === 113) return true;
    if (a >= 224) return true;
    return false;
}

function isPrivateIp(ip: string): boolean {
    const ipVersion = net.isIP(ip);
    if (!ipVersion) return true;

    if (ipVersion === 4) {
        return isPrivateIpv4(ip);
    }

    const normalized = ip.toLowerCase();
    if (normalized === "::1" || normalized === "::") return true;
    if (/^f[cd][0-9a-f]{2}:/i.test(normalized)) return true; // fc00::/7
    if (/^fe[89ab][0-9a-f]:/i.test(normalized)) return true; // fe80::/10

    // Handle IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1)
    const mappedIpv4Match = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mappedIpv4Match) {
        return isPrivateIpv4(mappedIpv4Match[1]);
    }

    return false;
}

export async function POST(req: Request) {
    try {
        const adminAuth = getAdminAuth();
        if (!adminAuth) {
            return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
        }

        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        try {
            await adminAuth.verifyIdToken(token);
        } catch {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { url } = await req.json();
        if (!url) {
            return NextResponse.json({ error: "Missing URL" }, { status: 400 });
        }

        let targetUrl = String(url).trim();
        if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
            targetUrl = "https://" + targetUrl;
        }

        if (!isSafeUrl(targetUrl)) {
            return NextResponse.json({ error: "Unsafe URL" }, { status: 400 });
        }

        const baseUrl = new URL(targetUrl);
        const origin = baseUrl.origin;
        const normalizedOrigin = normalizeOrigin(origin);
        const urls: string[] = [targetUrl];
        const hostSafetyCache = new Map<string, boolean>();

        async function isHostPublic(hostname: string): Promise<boolean> {
            if (hostSafetyCache.has(hostname)) {
                return hostSafetyCache.get(hostname)!;
            }

            let isPublic = false;
            const ipVersion = net.isIP(hostname);
            if (ipVersion) {
                isPublic = !isPrivateIp(hostname);
            } else {
                try {
                    const records = await dns.lookup(hostname, { all: true, verbatim: true });
                    isPublic = records.length > 0 && records.every((record) => !isPrivateIp(record.address));
                } catch {
                    isPublic = false;
                }
            }

            hostSafetyCache.set(hostname, isPublic);
            return isPublic;
        }

        async function isSafePublicUrl(target: string): Promise<boolean> {
            if (!isSafeUrl(target)) return false;

            let parsed: URL;
            try {
                parsed = new URL(target);
            } catch {
                return false;
            }

            if (!["http:", "https:"].includes(parsed.protocol)) return false;
            if (parsed.port && !["80", "443"].includes(parsed.port)) return false;
            return isHostPublic(parsed.hostname);
        }

        async function fetchWithTimeout(initialUrl: string, timeout = FETCH_TIMEOUT_MS) {
            let currentUrl = initialUrl;

            for (let i = 0; i <= MAX_REDIRECTS; i++) {
                if (!(await isSafePublicUrl(currentUrl))) {
                    console.warn(`Sitemap API: blocked unsafe target ${currentUrl}`);
                    return null;
                }

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);

                try {
                    const response = await fetch(currentUrl, {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                            "Accept-Language": "en-US,en;q=0.9,tr;q=0.8",
                            "Cache-Control": "no-cache",
                            "Pragma": "no-cache"
                        },
                        signal: controller.signal,
                        redirect: "manual"
                    });
                    clearTimeout(timeoutId);

                    if (response.status >= 300 && response.status < 400) {
                        const location = response.headers.get("location");
                        if (!location) return null;

                        currentUrl = new URL(location, currentUrl).toString();
                        continue;
                    }

                    return response;
                } catch (e) {
                    clearTimeout(timeoutId);
                    console.error(`Sitemap API: Fetch failed for ${currentUrl}:`, e);
                    return null;
                }
            }

            return null;
        }

        async function parseSitemap(xmlText: string) {
            const $ = cheerio.load(xmlText, { xmlMode: true });

            if ($("sitemapindex").length > 0) {
                const sitemaps: string[] = [];
                $("sitemap loc, loc").each((_, el) => {
                    const loc = $(el).text().trim();
                    if (!loc || !loc.includes("sitemap")) return;

                    try {
                        const abs = loc.startsWith("http") ? loc : new URL(loc, origin).toString();
                        const parsed = new URL(abs);
                        if (normalizeOrigin(parsed.origin) === normalizedOrigin) {
                            sitemaps.push(abs);
                        }
                    } catch {
                        // Ignore invalid URLs in sitemap
                    }
                });

                for (const sitemapUrl of Array.from(new Set(sitemaps)).slice(0, 5)) {
                    if (sitemapUrl === targetUrl) continue;
                    const res = await fetchWithTimeout(sitemapUrl);
                    if (res?.ok) {
                        const subXml = await res.text();
                        await parseSitemap(subXml);
                    }
                }
            } else {
                $("url loc, loc").each((_, el) => {
                    const loc = $(el).text().trim();
                    if (!loc || (!loc.startsWith("http") && !loc.startsWith("/"))) return;

                    try {
                        const abs = loc.startsWith("http") ? loc : new URL(loc, origin).toString();
                        if (normalizeOrigin(new URL(abs).origin) === normalizedOrigin) {
                            urls.push(abs);
                        }
                    } catch {
                        // Ignore invalid URLs in sitemap
                    }
                });
            }
        }

        const mainRes = await fetchWithTimeout(targetUrl);
        if (mainRes?.ok) {
            const text = await mainRes.text();
            const contentType = (mainRes.headers.get("content-type") || "").toLowerCase();

            if (contentType.includes("xml") || text.trim().startsWith("<?xml") || text.includes("<urlset") || text.includes("<sitemapindex")) {
                await parseSitemap(text);
            } else {
                const $ = cheerio.load(text);
                $("a").each((_, el) => {
                    const href = $(el).attr("href");
                    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

                    try {
                        const absoluteUrl = new URL(href, targetUrl).toString();
                        const normalizedAbsolute = absoluteUrl.split("#")[0].replace(/\/$/, "");
                        if (normalizeOrigin(new URL(normalizedAbsolute).origin) === normalizedOrigin) {
                            urls.push(absoluteUrl);
                        }
                    } catch {
                        // Ignore invalid links
                    }
                });

                if (urls.length < 5) {
                    const matches = text.match(new RegExp(`(https?://${baseUrl.host}[\\w/.-]+)`, "g"));
                    if (matches) {
                        matches.forEach((match) => {
                            try {
                                if (normalizeOrigin(new URL(match).origin) === normalizedOrigin) {
                                    urls.push(match);
                                }
                            } catch {
                                // Ignore invalid regex match
                            }
                        });
                    }
                }
            }
        }

        if (urls.length <= 1) {
            const commonPaths = ["/sitemap.xml", "/sitemap_index.xml", "/robots.txt", "/sitemap-index.xml"];
            for (const path of commonPaths) {
                const target = new URL(path, origin).toString();
                const res = await fetchWithTimeout(target);
                if (!res?.ok) continue;

                const content = await res.text();
                if (path === "/robots.txt") {
                    const matches = content.matchAll(/Sitemap:\s*(https?:\/\/\S+)/ig);
                    for (const match of matches) {
                        const sitemapUrl = match[1];
                        if (!sitemapUrl) continue;
                        try {
                            if (normalizeOrigin(new URL(sitemapUrl).origin) !== normalizedOrigin) {
                                continue;
                            }
                        } catch {
                            continue;
                        }

                        const sRes = await fetchWithTimeout(sitemapUrl);
                        if (sRes?.ok) {
                            await parseSitemap(await sRes.text());
                        }
                    }
                } else if (content.includes("<urlset") || content.includes("<sitemapindex") || content.includes("<loc")) {
                    await parseSitemap(content);
                }

                if (urls.length > 3) break;
            }
        }

        const finalUrls = Array.from(new Set(urls.map((u) => u.split("#")[0].split("?")[0].replace(/\/$/, ""))))
            .filter((u) => {
                try {
                    const parsed = new URL(u);
                    if (normalizeOrigin(parsed.origin) !== normalizedOrigin) return false;

                    const pathname = parsed.pathname.toLowerCase();
                    const ignored = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".zip", ".gz", ".mp4", ".mp3", ".css", ".js", ".ico"];
                    if (ignored.some((ext) => pathname.endsWith(ext))) return false;

                    const patterns = ["/login", "/signup", "/cart", "/checkout", "/admin", "/wp-admin"];
                    if (patterns.some((pat) => pathname.includes(pat))) return false;

                    return true;
                } catch {
                    return false;
                }
            })
            .slice(0, MAX_URL_COUNT);

        return NextResponse.json({ urls: finalUrls });
    } catch (error: any) {
        console.error("Sitemap error:", error);
        return NextResponse.json({ error: "Internal Error: " + error.message }, { status: 500 });
    }
}
