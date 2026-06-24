import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { isSafeUrl } from "@/lib/security";
import { fetchRenderedText } from "@/lib/fetch-rendered";
import { checkRateLimitAsync, getClientIp, getRateLimitHeaders } from "@/lib/rate-limiter";

export async function POST(req: Request) {
    try {
        // Public endpoint -> throttle per IP to prevent abuse / SSRF-scan fan-out.
        const ip = getClientIp(req);
        const rl = await checkRateLimitAsync(`crawl:${ip}`, 10, 60_000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: "Too many requests" },
                { status: 429, headers: getRateLimitHeaders(rl) }
            );
        }

        const { url, selector } = await req.json();

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        // Validate URL and check for SSRF
        if (!isSafeUrl(url)) {
            return NextResponse.json({ error: "Invalid or restricted URL" }, { status: 400 });
        }

        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; UserexBot/1.0; +https://userex.ai)",
            },
        });

        if (!response.ok) {
            return NextResponse.json({ error: `Failed to fetch URL: ${response.statusText}` }, { status: response.status });
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Remove scripts, styles, and other unnecessary elements
        $('script').remove();
        $('style').remove();
        $('iframe').remove();
        $('noscript').remove();

        // If selector is provided, use it. Otherwise remove nav/footer/header and use body
        let text = "";

        if (selector) {
            try {
                text = $(selector).text();
            } catch (e) {
                console.error("Selector error:", e);
                text = $('body').text();
            }
        }

        if (!text || text.trim().length === 0) {
            $('nav').remove();
            $('footer').remove();
            $('header').remove();
            text = $('body').text();
        }

        // Clean up whitespace
        text = text.replace(/\s+/g, " ").trim();

        let title = $('title').text().trim() || url;

        // SPA / JS-rendered fallback: if the raw HTML yielded little text,
        // retry via Jina Reader which renders JavaScript.
        if (text.length < 200) {
            const rendered = await fetchRenderedText(url);
            if (rendered && rendered.text.length > text.length) {
                text = rendered.text;
                if (rendered.title) title = rendered.title;
            }
        }

        // Basic content length check
        if (text.length < 20) {
            return NextResponse.json({
                error: "Insufficient content found on the page. This site may be a JavaScript-based (SPA) application which requires dynamic rendering."
            }, { status: 400 });
        }

        return NextResponse.json({
            title,
            content: text,
            url
        });

    } catch (error: any) {
        console.error("Crawling error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
