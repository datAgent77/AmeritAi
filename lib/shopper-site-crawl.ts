import crypto from 'crypto';
import { XMLParser } from 'fast-xml-parser';
import * as cheerio from 'cheerio';
import { isSafeUrl } from '@/lib/security';

const FETCH_TIMEOUT_MS = 12000;
const BASE_MAX_SITEMAP_FETCHES = 14;
const ABSOLUTE_MAX_SITEMAP_FETCHES = 80;
const BATCH_SIZE = 450;
export const DEFAULT_SITE_CRAWL_DISCOVERY_LIMIT = 2000;
export const MAX_SITE_CRAWL_DISCOVERY_LIMIT = 12000;
export const SITE_CRAWL_DISCOVERY_STEP = 2000;
const DISCOVERY_MULTIPLIER = 40;

export const DEFAULT_SITE_CRAWL_LIMIT = 40;
export const MAX_SITE_CRAWL_LIMIT = 120;

const PRODUCT_HINTS = ['product', 'products', 'urun', 'shop', 'item', 'catalog'];
const NON_PRODUCT_HINTS = [
    '/collections',
    '/collection',
    '/blog',
    '/blogs',
    '/page',
    '/pages',
    '/search',
    '/account',
    '/cart',
    '/checkout',
    '/category',
    '/categories',
    '/kategori',
    '/sitemap'
];

const USER_AGENT = 'Mozilla/5.0 (compatible; VionShopperCrawler/1.0; +https://getvion.com)';

const xmlParser = new XMLParser({
    ignoreAttributes: true,
    removeNSPrefix: true,
    trimValues: true
});

interface ExtractedProduct {
    name: string;
    description: string;
    price: number;
    currency: string;
    imageUrl: string;
    sku: string;
    inStock: boolean;
    stockQuantity: number | null;
    sourceUrl: string;
}

export interface SiteCrawlImportInput {
    chatbotId: string;
    siteUrl: string;
    limit?: number;
    offset?: number;
    discoveryLimit?: number;
}

export interface SiteCrawlImportResult {
    normalizedSiteUrl: string;
    discovered: number;
    discoveryLimitUsed: number;
    usedOffset: number;
    nextOffset: number;
    hasMore: boolean;
    cycleCompleted: boolean;
    scanned: number;
    count: number;
    skipped: number;
    failed: number;
    failedSamples: string[];
}

function toArray<T>(value: T | T[] | null | undefined): T[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

export function normalizeSiteUrl(rawUrl: string): string | null {
    if (!rawUrl) return null;
    const trimmed = rawUrl.trim();
    if (!trimmed) return null;

    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
        const parsed = new URL(withProtocol);
        parsed.hash = '';
        return parsed.toString();
    } catch {
        return null;
    }
}

export function normalizeSiteHost(rawUrl: string): string {
    const normalized = normalizeSiteUrl(rawUrl);
    if (!normalized) return '';

    try {
        return new URL(normalized).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
        return '';
    }
}

export function clampSiteCrawlLimit(value: unknown): number {
    const rawLimit = Number(value);
    if (!Number.isFinite(rawLimit)) return DEFAULT_SITE_CRAWL_LIMIT;
    return Math.min(MAX_SITE_CRAWL_LIMIT, Math.max(5, Math.floor(rawLimit)));
}

export function clampSiteCrawlOffset(value: unknown): number {
    const rawOffset = Number(value);
    if (!Number.isFinite(rawOffset)) return 0;
    return Math.max(0, Math.floor(rawOffset));
}

function clampDiscoveryLimit(value: unknown): number {
    return clampSiteCrawlDiscoveryLimit(value);
}

export function clampSiteCrawlDiscoveryLimit(value: unknown): number {
    const rawLimit = Number(value);
    if (!Number.isFinite(rawLimit)) return DEFAULT_SITE_CRAWL_DISCOVERY_LIMIT;
    return Math.min(MAX_SITE_CRAWL_DISCOVERY_LIMIT, Math.max(200, Math.floor(rawLimit)));
}

function normalizeUrlForSet(rawUrl: string): string {
    try {
        const parsed = new URL(rawUrl);
        parsed.hash = '';
        parsed.search = '';
        return parsed.toString().replace(/\/$/, '');
    } catch {
        return rawUrl;
    }
}

function sameHost(urlA: string, urlB: string): boolean {
    try {
        return new URL(urlA).hostname.replace(/^www\./, '') === new URL(urlB).hostname.replace(/^www\./, '');
    } catch {
        return false;
    }
}

function hasProductHint(text: string): boolean {
    const lowered = text.toLowerCase();
    return PRODUCT_HINTS.some((hint) => lowered.includes(hint));
}

function hasNonProductHint(pathname: string): boolean {
    const lowered = pathname.toLowerCase();
    return NON_PRODUCT_HINTS.some((hint) => lowered.includes(hint));
}

function isLikelyProductUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        const pathname = parsed.pathname.toLowerCase();

        if (!pathname || pathname === '/') return false;
        if (/\.(jpg|jpeg|png|gif|svg|webp|pdf|zip|gz|mp4|mp3|css|js|ico)$/i.test(pathname)) return false;
        if (hasNonProductHint(pathname)) return false;

        if (hasProductHint(pathname)) return true;
        if (/\/p\//.test(pathname)) return true;

        const segments = pathname.split('/').filter(Boolean);
        if (segments.length >= 2 && segments[segments.length - 1].length >= 8) {
            return true;
        }

        return false;
    } catch {
        return false;
    }
}

function parsePrice(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return 0;

    const cleaned = value.replace(/\s/g, '').replace(/[^\d.,]/g, '');

    const hasComma = cleaned.includes(',');
    const hasDot = cleaned.includes('.');

    let normalizedNumber = cleaned;

    if (hasComma && hasDot) {
        const lastCommaIndex = cleaned.lastIndexOf(',');
        const lastDotIndex = cleaned.lastIndexOf('.');

        if (lastCommaIndex > lastDotIndex) {
            normalizedNumber = cleaned.replace(/\./g, '').replace(',', '.');
        } else {
            normalizedNumber = cleaned.replace(/,/g, '');
        }
    } else if (hasComma) {
        normalizedNumber = cleaned.replace(',', '.');
    }

    const normalized = normalizedNumber.replace(/[^\d.]/g, '');
    const parsed = parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}

function parseCurrency(value: unknown): string {
    if (typeof value === 'string' && value.trim()) {
        return value.trim().toUpperCase().slice(0, 6);
    }
    return 'TRY';
}

function safeDocIdSegment(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-_]+|[-_]+$/g, '')
        .slice(0, 80);
}

function hashValue(input: string): string {
    return crypto.createHash('sha1').update(input).digest('hex').slice(0, 12);
}

function textValue(value: unknown): string {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return String(value);
    return '';
}

function firstNonEmpty(values: unknown[]): string {
    for (const value of values) {
        const maybeText = textValue(value);
        if (maybeText) return maybeText;
    }
    return '';
}

function toAbsoluteUrl(rawUrl: string, baseUrl: string): string {
    if (!rawUrl) return '';
    try {
        return new URL(rawUrl, baseUrl).toString();
    } catch {
        return '';
    }
}

async function fetchText(url: string): Promise<string | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            redirect: 'follow',
            headers: {
                'User-Agent': USER_AGENT,
                Accept: 'text/html,application/xml,text/xml,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });

        if (!response.ok) {
            return null;
        }

        return await response.text();
    } catch {
        return null;
    } finally {
        clearTimeout(timeoutId);
    }
}

async function discoverInitialSitemaps(siteUrl: string): Promise<string[]> {
    const origin = new URL(siteUrl).origin;
    const urls: string[] = [
        `${origin}/sitemap.xml`,
        `${origin}/sitemap_index.xml`,
        `${origin}/sitemap-index.xml`
    ];

    const robotsText = await fetchText(`${origin}/robots.txt`);
    if (robotsText) {
        const matches = robotsText.matchAll(/^\s*Sitemap:\s*(https?:\/\/\S+)\s*$/gim);
        for (const match of matches) {
            if (match[1]) {
                urls.push(match[1].trim());
            }
        }
    }

    const unique = new Set<string>();
    for (const url of urls) {
        const normalized = normalizeSiteUrl(url);
        if (!normalized) continue;
        if (!isSafeUrl(normalized)) continue;
        if (!sameHost(normalized, siteUrl)) continue;
        unique.add(normalized);
    }

    return Array.from(unique).sort((a, b) => Number(hasProductHint(b)) - Number(hasProductHint(a)));
}

function getLocValue(entry: any): string {
    if (!entry) return '';
    if (typeof entry === 'string') return entry.trim();
    if (typeof entry.loc === 'string') return entry.loc.trim();
    if (entry.loc && typeof entry.loc['#text'] === 'string') return entry.loc['#text'].trim();
    return '';
}

function extractSitemapData(xmlText: string, baseUrl: string): { sitemaps: string[]; urls: string[] } {
    const result = { sitemaps: [] as string[], urls: [] as string[] };

    try {
        const parsed = xmlParser.parse(xmlText);

        const sitemapEntries = toArray(parsed?.sitemapindex?.sitemap);
        for (const entry of sitemapEntries) {
            const loc = getLocValue(entry);
            if (!loc) continue;
            try {
                result.sitemaps.push(new URL(loc, baseUrl).toString());
            } catch {
                // ignore malformed URL
            }
        }

        const urlEntries = toArray(parsed?.urlset?.url);
        for (const entry of urlEntries) {
            const loc = getLocValue(entry);
            if (!loc) continue;
            try {
                result.urls.push(new URL(loc, baseUrl).toString());
            } catch {
                // ignore malformed URL
            }
        }
    } catch {
        // XML parse failed
    }

    return result;
}

async function discoverProductUrlsFromHomepage(siteUrl: string, limit: number): Promise<string[]> {
    const html = await fetchText(siteUrl);
    if (!html) return [];

    const $ = cheerio.load(html);
    const candidates = new Set<string>();

    $('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        if (!href) return;
        if (href.startsWith('#') || href.startsWith('javascript:')) return;

        try {
            const absoluteUrl = new URL(href, siteUrl).toString();
            if (!sameHost(absoluteUrl, siteUrl)) return;

            const normalized = normalizeUrlForSet(absoluteUrl);
            if (isLikelyProductUrl(normalized)) {
                candidates.add(normalized);
            }
        } catch {
            // ignore malformed URL
        }
    });

    return Array.from(candidates).slice(0, limit);
}

async function discoverProductUrls(siteUrl: string, limit: number): Promise<string[]> {
    const targetCount = clampDiscoveryLimit(limit);
    const maxSitemapFetches = Math.min(
        ABSOLUTE_MAX_SITEMAP_FETCHES,
        Math.max(BASE_MAX_SITEMAP_FETCHES, Math.ceil(targetCount / 250))
    );
    const queue = await discoverInitialSitemaps(siteUrl);
    const visitedSitemaps = new Set<string>();

    const productCandidates = new Set<string>();
    const fallbackCandidates = new Set<string>();

    while (queue.length > 0 && visitedSitemaps.size < maxSitemapFetches && productCandidates.size < targetCount) {
        const current = queue.shift();
        if (!current || visitedSitemaps.has(current)) continue;
        visitedSitemaps.add(current);

        const xmlText = await fetchText(current);
        if (!xmlText || (!xmlText.includes('<urlset') && !xmlText.includes('<sitemapindex'))) continue;

        const { sitemaps, urls } = extractSitemapData(xmlText, current);

        const childSitemaps = sitemaps
            .map((url) => normalizeSiteUrl(url))
            .filter((url): url is string => Boolean(url && isSafeUrl(url) && sameHost(url, siteUrl)))
            .sort((a, b) => Number(hasProductHint(b)) - Number(hasProductHint(a)));

        for (const child of childSitemaps) {
            if (!visitedSitemaps.has(child) && !queue.includes(child)) {
                queue.push(child);
            }
        }

        const parentHasProductHint = hasProductHint(current);

        for (const rawUrl of urls) {
            const normalized = normalizeSiteUrl(rawUrl);
            if (!normalized) continue;
            if (!isSafeUrl(normalized)) continue;
            if (!sameHost(normalized, siteUrl)) continue;

            const clean = normalizeUrlForSet(normalized);
            if (parentHasProductHint || isLikelyProductUrl(clean)) {
                productCandidates.add(clean);
            } else if (!hasNonProductHint(new URL(clean).pathname)) {
                fallbackCandidates.add(clean);
            }
        }
    }

    const mergedCandidates = [
        ...Array.from(productCandidates),
        ...Array.from(fallbackCandidates)
    ]
        .slice(0, targetCount)
        .sort((a, b) => a.localeCompare(b));

    if (mergedCandidates.length >= Math.min(8, targetCount)) {
        return mergedCandidates;
    }

    const homepageFallback = await discoverProductUrlsFromHomepage(siteUrl, targetCount);
    const mergedWithFallback = Array.from(new Set([...mergedCandidates, ...homepageFallback]))
        .sort((a, b) => a.localeCompare(b));
    return mergedWithFallback.slice(0, targetCount);
}

function collectProductObjects(node: any, out: any[]) {
    if (!node) return;

    if (Array.isArray(node)) {
        for (const item of node) {
            collectProductObjects(item, out);
        }
        return;
    }

    if (typeof node !== 'object') return;

    const rawType = node['@type'];
    const types = Array.isArray(rawType) ? rawType : [rawType];
    const isProduct = types.some((type) => String(type || '').toLowerCase() === 'product');

    if (isProduct) {
        out.push(node);
    }

    if (node['@graph']) {
        collectProductObjects(node['@graph'], out);
    }

    for (const value of Object.values(node)) {
        if (typeof value === 'object' && value !== null) {
            collectProductObjects(value, out);
        }
    }
}

function parseJsonLdProducts($: cheerio.CheerioAPI): any[] {
    const products: any[] = [];

    $('script[type="application/ld+json"]').each((_, element) => {
        const raw = $(element).contents().text().trim();
        if (!raw) return;

        const cleaned = raw
            .replace(/^<!--/, '')
            .replace(/-->$/, '')
            .trim();

        try {
            const data = JSON.parse(cleaned);
            collectProductObjects(data, products);
        } catch {
            // ignore invalid JSON-LD blocks
        }
    });

    return products;
}

function firstOfferObject(offers: any): any {
    if (!offers) return null;
    if (Array.isArray(offers)) return offers[0] || null;
    if (typeof offers === 'object') return offers;
    return null;
}

function getImageUrl(imageValue: any): string {
    if (!imageValue) return '';
    if (typeof imageValue === 'string') return imageValue;
    if (Array.isArray(imageValue) && imageValue.length > 0) {
        return getImageUrl(imageValue[0]);
    }
    if (typeof imageValue === 'object') {
        if (typeof imageValue.url === 'string') return imageValue.url;
        if (typeof imageValue['@id'] === 'string') return imageValue['@id'];
    }
    return '';
}

function extractProductFromHtml(pageUrl: string, html: string): ExtractedProduct | null {
    const $ = cheerio.load(html);

    const jsonLdProducts = parseJsonLdProducts($);
    const product = jsonLdProducts[0] || {};
    const offer = firstOfferObject(product.offers);

    const metaPrice = firstNonEmpty([
        $('meta[property="product:price:amount"]').attr('content'),
        $('meta[itemprop="price"]').attr('content')
    ]);

    const metaCurrency = firstNonEmpty([
        $('meta[property="product:price:currency"]').attr('content'),
        $('meta[itemprop="priceCurrency"]').attr('content')
    ]);

    const name = firstNonEmpty([
        product.name,
        $('meta[property="og:title"]').attr('content'),
        $('h1').first().text()
    ]);

    if (!name) return null;

    const price = parsePrice(firstNonEmpty([
        offer?.price,
        product.price,
        metaPrice
    ]));

    const currency = parseCurrency(firstNonEmpty([
        offer?.priceCurrency,
        product.priceCurrency,
        metaCurrency
    ]));

    const description = firstNonEmpty([
        product.description,
        $('meta[name="description"]').attr('content'),
        $('meta[property="og:description"]').attr('content')
    ]).slice(0, 1500);

    const imageCandidate = firstNonEmpty([
        getImageUrl(product.image),
        $('meta[property="og:image"]').attr('content'),
        $('img').first().attr('src')
    ]);
    const imageUrl = toAbsoluteUrl(imageCandidate, pageUrl);

    const availabilityRaw = firstNonEmpty([
        offer?.availability,
        product.availability,
        $('link[itemprop="availability"]').attr('href')
    ]).toLowerCase();

    let inStock = true;
    if (availabilityRaw.includes('outofstock') || availabilityRaw.includes('stokta-yok') || availabilityRaw.includes('soldout')) {
        inStock = false;
    } else if (availabilityRaw.includes('instock') || availabilityRaw.includes('stokta')) {
        inStock = true;
    }

    const stockQuantityRaw = firstNonEmpty([
        offer?.inventoryLevel,
        offer?.inventory,
        product.inventoryLevel,
        product.quantity
    ]);

    const parsedStock = parseInt(stockQuantityRaw, 10);
    const stockQuantity = Number.isFinite(parsedStock) ? parsedStock : null;

    let sku = firstNonEmpty([
        product.sku,
        product.productID,
        product.mpn,
        $('meta[property="product:retailer_item_id"]').attr('content')
    ]);

    if (!sku) {
        try {
            const parsed = new URL(pageUrl);
            const parts = parsed.pathname.split('/').filter(Boolean);
            sku = parts[parts.length - 1] || '';
        } catch {
            sku = '';
        }
    }

    sku = sku || `sku-${hashValue(pageUrl)}`;

    return {
        name,
        description,
        price,
        currency,
        imageUrl,
        sku,
        inStock,
        stockQuantity,
        sourceUrl: pageUrl
    };
}

export function buildSiteCrawlConfigId(chatbotId: string, siteUrl: string): string {
    const host = normalizeSiteHost(siteUrl);
    const hostSlug = host
        .replace(/[^a-z0-9.-]+/g, '-')
        .replace(/\./g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');

    const suffix = hostSlug || hashValue(siteUrl);
    return `${chatbotId}_${suffix}`;
}

export async function runSiteCrawlImport(
    adminDb: FirebaseFirestore.Firestore,
    input: SiteCrawlImportInput
): Promise<SiteCrawlImportResult> {
    const chatbotId = textValue(input.chatbotId);
    const normalizedUrl = normalizeSiteUrl(input.siteUrl);

    if (!chatbotId || !normalizedUrl) {
        throw new Error('Chatbot ID and site URL are required');
    }

    if (!isSafeUrl(normalizedUrl)) {
        throw new Error('URL is not allowed for crawling');
    }

    const limit = clampSiteCrawlLimit(input.limit);
    const requestedOffset = clampSiteCrawlOffset(input.offset);
    const baseDiscoveryLimit = clampSiteCrawlDiscoveryLimit(input.discoveryLimit);
    const discoveryLimit = clampDiscoveryLimit(Math.max(
        baseDiscoveryLimit,
        limit * DISCOVERY_MULTIPLIER,
        requestedOffset + limit * 4
    ));
    const candidateUrls = await discoverProductUrls(normalizedUrl, discoveryLimit);

    if (candidateUrls.length === 0) {
        throw new Error('Ürün URL bulunamadı. XML feed ile senkronizasyonu deneyin.');
    }

    const usedOffset = requestedOffset >= candidateUrls.length ? 0 : requestedOffset;
    const candidateSlice = candidateUrls.slice(usedOffset);

    let batch = adminDb.batch();
    let batchCount = 0;

    let processedCount = 0;
    let scannedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const failedSamples: string[] = [];
    const usedDocIds = new Set<string>();

    for (const productUrl of candidateSlice) {
        scannedCount++;
        const html = await fetchText(productUrl);
        if (!html) {
            failedCount++;
            if (failedSamples.length < 5) failedSamples.push(productUrl);
            continue;
        }

        const product = extractProductFromHtml(productUrl, html);
        if (!product || !product.name) {
            skippedCount++;
            continue;
        }

        const skuSegment = safeDocIdSegment(product.sku) || hashValue(productUrl);
        const docId = `${chatbotId}_${skuSegment}`;

        if (usedDocIds.has(docId)) {
            continue;
        }
        usedDocIds.add(docId);

        const docRef = adminDb.collection('products').doc(docId);
        batch.set(docRef, {
            chatbotId,
            name: product.name,
            price: product.price,
            currency: product.currency,
            description: product.description,
            imageUrl: product.imageUrl,
            sku: product.sku,
            stockQuantity: product.stockQuantity,
            inStock: product.inStock,
            source: 'site-crawl',
            sourceUrl: product.sourceUrl,
            crawlBaseUrl: normalizedUrl,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        batchCount++;
        processedCount++;

        if (batchCount >= BATCH_SIZE) {
            await batch.commit();
            batch = adminDb.batch();
            batchCount = 0;
        }

        if (processedCount >= limit) {
            break;
        }
    }

    if (batchCount > 0) {
        await batch.commit();
    }

    const absoluteNextOffset = usedOffset + scannedCount;
    const cycleCompleted = absoluteNextOffset >= candidateUrls.length;
    const nextOffset = cycleCompleted ? 0 : absoluteNextOffset;

    return {
        normalizedSiteUrl: normalizedUrl,
        discovered: candidateUrls.length,
        discoveryLimitUsed: discoveryLimit,
        usedOffset,
        nextOffset,
        hasMore: !cycleCompleted,
        cycleCompleted,
        scanned: scannedCount,
        count: processedCount,
        skipped: skippedCount,
        failed: failedCount,
        failedSamples
    };
}
