import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function POST(req: Request) {
    try {
        const { url, selector } = await req.json();

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        // Validate URL
        try {
            new URL(url);
        } catch (e) {
            return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
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

        // Basic content length check
        if (text.length < 50) {
            return NextResponse.json({ error: "Insufficient content found on the page." }, { status: 400 });
        }

        const title = $('title').text().trim() || url;

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
