import { NextResponse } from "next/server";
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: "Missing URL" }, { status: 400 });
        }

        console.log("Sitemap API: Processing", url);

        const baseUrl = new URL(url);
        const origin = baseUrl.origin;
        // Always include the initial URL
        const urls: string[] = [url];

        async function fetchWithTimeout(targetUrl: string, timeout = 8000) {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            try {
                const response = await fetch(targetUrl, {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                        "Accept-Language": "en-US,en;q=0.9,tr;q=0.8",
                        "Cache-Control": "no-cache",
                        "Pragma": "no-cache"
                    },
                    signal: controller.signal
                });
                clearTimeout(id);
                return response;
            } catch (e) {
                clearTimeout(id);
                console.error(`Sitemap API: Fetch failed for ${targetUrl}:`, e);
                return null;
            }
        }

        async function parseSitemap(xmlText: string) {
            const $ = cheerio.load(xmlText, { xmlMode: true });

            // Check for sitemap index
            if ($('sitemapindex').length > 0) {
                const sitemaps: string[] = [];
                $('sitemap loc, loc').each((_, el) => {
                    const loc = $(el).text().trim();
                    if (loc && loc.includes('sitemap')) {
                        try {
                            const abs = loc.startsWith('http') ? loc : new URL(loc, origin).toString();
                            sitemaps.push(abs);
                        } catch (e) { }
                    }
                });

                // Fetch up to 5 sub-sitemaps
                for (const sitemapUrl of Array.from(new Set(sitemaps)).slice(0, 5)) {
                    if (sitemapUrl === url) continue;
                    const res = await fetchWithTimeout(sitemapUrl);
                    if (res?.ok) {
                        const subXml = await res.text();
                        await parseSitemap(subXml);
                    }
                }
            } else {
                $('url loc, loc').each((_, el) => {
                    const loc = $(el).text().trim();
                    if (loc && (loc.startsWith('http') || loc.startsWith('/'))) {
                        try {
                            const abs = loc.startsWith('http') ? loc : new URL(loc, origin).toString();
                            if (abs.startsWith(origin)) urls.push(abs);
                        } catch (e) { }
                    }
                });
            }
        }

        // 1. Try provided URL as sitemap/HTML
        const mainRes = await fetchWithTimeout(url);
        if (mainRes?.ok) {
            const text = await mainRes.text();
            const contentType = (mainRes.headers.get("content-type") || "").toLowerCase();

            if (contentType.includes("xml") || text.trim().startsWith("<?xml") || text.includes("<urlset") || text.includes("<sitemapindex")) {
                await parseSitemap(text);
            } else {
                // HTML fallback
                const $ = cheerio.load(text);
                $('a').each((_, el) => {
                    const href = $(el).attr('href');
                    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                        try {
                            const absoluteUrl = new URL(href, url).toString();
                            const normalizedAbsolute = absoluteUrl.split('#')[0].replace(/\/$/, "");
                            const normalizedOrigin = origin.replace("www.", "").replace(/\/$/, "");

                            if (normalizedAbsolute.replace("www.", "").startsWith(normalizedOrigin)) {
                                urls.push(absoluteUrl);
                            }
                        } catch (e) { }
                    }
                });

                // If very few links, try regex for more aggressive discovery
                if (urls.length < 5) {
                    const matches = text.match(new RegExp(`(https?://${baseUrl.host}[\\w/.-]+)`, 'g'));
                    if (matches) matches.forEach(m => urls.push(m));
                }
            }
        }

        // 2. If only initial URL found, try common paths
        if (urls.length <= 1) {
            const commonPaths = ["/sitemap.xml", "/sitemap_index.xml", "/robots.txt", "/sitemap-index.xml"];
            for (const path of commonPaths) {
                const target = new URL(path, origin).toString();
                const res = await fetchWithTimeout(target);
                if (res?.ok) {
                    const content = await res.text();
                    if (path === "/robots.txt") {
                        const matches = content.matchAll(/Sitemap:\s*(https?:\/\/\S+)/ig);
                        for (const match of matches) {
                            if (match[1]) {
                                const sRes = await fetchWithTimeout(match[1]);
                                if (sRes?.ok) await parseSitemap(await sRes.text());
                            }
                        }
                    } else if (content.includes('<urlset') || content.includes('<sitemapindex') || content.includes('<loc')) {
                        await parseSitemap(content);
                    }
                    if (urls.length > 3) break;
                }
            }
        }

        // Dedup and filter
        const finalUrls = Array.from(new Set(urls.map(u => u.split('#')[0].split('?')[0].replace(/\/$/, ""))))
            .filter(u => {
                try {
                    const p = new URL(u);
                    if (p.origin.replace('www.', '') !== origin.replace('www.', '')) return false;

                    const pathname = p.pathname.toLowerCase();
                    const ignored = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.zip', '.gz', '.mp4', '.mp3', '.css', '.js', '.ico'];
                    if (ignored.some(ext => pathname.endsWith(ext))) return false;

                    const patterns = ['/login', '/signup', '/cart', '/checkout', '/admin', '/wp-admin'];
                    if (patterns.some(pat => pathname.includes(pat))) return false;

                    return true;
                } catch (e) { return false; }
            })
            .slice(0, 60);

        console.log(`Sitemap API: Found ${finalUrls.length} unique URLs for ${url}`);

        return NextResponse.json({ urls: finalUrls });

    } catch (error: any) {
        console.error("Sitemap error:", error);
        return NextResponse.json({ error: "Internal Error: " + error.message }, { status: 500 });
    }
}
