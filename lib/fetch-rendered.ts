/**
 * Fallback content extractor for JavaScript-rendered (SPA) pages.
 *
 * The primary scraper (plain fetch + cheerio) only sees the raw HTML shell of a
 * client-rendered site, which yields little or no text. When that happens we
 * retry through Jina AI Reader (https://r.jina.ai), a free service that renders
 * the page (executing JavaScript) and returns clean, readable text.
 *
 * Optional: set JINA_READER_API_KEY in the environment for higher rate limits.
 */

const READER_BASE = "https://r.jina.ai/";

export interface RenderedContent {
    title: string;
    text: string;
}

/**
 * Fetch a URL's readable text via Jina Reader (renders JS / SPA pages).
 * Returns null on failure so callers can fall back gracefully.
 */
export async function fetchRenderedText(
    targetUrl: string,
    timeoutMs = 20000
): Promise<RenderedContent | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const headers: Record<string, string> = {
            // Ask for plain text (better for embeddings than markdown/html).
            "X-Return-Format": "text",
            Accept: "text/plain",
        };
        const apiKey = process.env.JINA_READER_API_KEY?.trim();
        if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

        const response = await fetch(`${READER_BASE}${targetUrl}`, {
            signal: controller.signal,
            headers,
        });
        clearTimeout(timeoutId);

        if (!response.ok) return null;

        const raw = (await response.text()).trim();
        if (!raw) return null;

        // Jina prepends metadata lines like "Title: ...", "URL Source: ...",
        // followed by the body. Extract the title and strip the metadata header.
        let title = "";
        let body = raw;

        const titleMatch = raw.match(/^Title:\s*(.+)$/m);
        if (titleMatch) title = titleMatch[1].trim();

        const markerIdx = raw.indexOf("Markdown Content:");
        if (markerIdx !== -1) {
            body = raw.slice(markerIdx + "Markdown Content:".length).trim();
        } else {
            // No explicit marker: drop leading "Key: value" metadata lines.
            body = raw.replace(/^(Title|URL Source|Published Time|Content Length|Language):.*$/gim, "").trim();
        }

        const text = body.replace(/\s+/g, " ").trim();
        if (text.length < 20) return null;

        return { title, text };
    } catch {
        clearTimeout(timeoutId);
        return null;
    }
}
