import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { authorizeTargetAccess } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

type SourceBreakdown = Record<string, number>;
type HealthStatus = "weak" | "needs_attention" | "good" | "excellent";
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TREND_DAYS = 14;
const MIN_TREND_DAYS = 1;
const MAX_TREND_DAYS = 90;

interface CrawlConfigSummary {
    siteUrl: string;
    limit: number;
    discoveryLimit: number;
    nextOffset: number;
    lastRunAt: string | null;
    lastRunStatus: string | null;
    lastRunCount: number;
    lastRunScanned: number;
    lastRunDiscovered: number;
    lastRunCycleCompleted: boolean;
    enabled: boolean;
}

interface DailyTrendPoint {
    date: string;
    added: number;
    updated: number;
    cumulativeTotal: number;
    inStockAdded: number;
    withDescriptionAdded: number;
    withImageAdded: number;
    withPriceAdded: number;
    sourceBreakdown: SourceBreakdown;
}

interface ProductTrendSnapshot {
    createdMs: number;
    updatedMs: number;
    inStock: boolean;
    hasDescription: boolean;
    hasImage: boolean;
    hasPrice: boolean;
    source: string;
}

function toMillis(value: unknown): number {
    if (!value) return 0;
    if (typeof value === "string" || typeof value === "number" || value instanceof Date) {
        const ms = new Date(value).getTime();
        return Number.isFinite(ms) ? ms : 0;
    }
    if (typeof (value as { toDate?: () => Date })?.toDate === "function") {
        const ms = (value as { toDate: () => Date }).toDate().getTime();
        return Number.isFinite(ms) ? ms : 0;
    }
    if (typeof (value as { _seconds?: number })?._seconds === "number") {
        const sec = (value as { _seconds: number })._seconds;
        const nano = (value as { _nanoseconds?: number })._nanoseconds || 0;
        return sec * 1000 + Math.floor(nano / 1_000_000);
    }
    if (typeof (value as { seconds?: number })?.seconds === "number") {
        const sec = (value as { seconds: number }).seconds;
        const nano = (value as { nanoseconds?: number }).nanoseconds || 0;
        return sec * 1000 + Math.floor(nano / 1_000_000);
    }
    return 0;
}

function toIso(value: unknown): string | null {
    const ms = toMillis(value);
    if (!ms) return null;
    return new Date(ms).toISOString();
}

function clampTrendDays(value: unknown): number {
    const raw = Number(value);
    if (!Number.isFinite(raw)) return DEFAULT_TREND_DAYS;
    const integer = Math.floor(raw);
    if (integer < MIN_TREND_DAYS) return MIN_TREND_DAYS;
    if (integer > MAX_TREND_DAYS) return MAX_TREND_DAYS;
    return integer;
}

function toUtcDayStart(ms: number): number {
    const date = new Date(ms);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function toDayKey(dayStartMs: number): string {
    return new Date(dayStartMs).toISOString().slice(0, 10);
}

function ratio(part: number, total: number): number {
    if (!total) return 0;
    return Number(((part / total) * 100).toFixed(1));
}

function healthStatus(score: number, totalProducts: number): HealthStatus {
    if (totalProducts < 20) return "weak";
    if (score < 60) return "needs_attention";
    if (score < 80) return "good";
    return "excellent";
}

export async function GET(req: Request) {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 });
        }

        const { searchParams } = new URL(req.url);
        const chatbotId = searchParams.get("chatbotId");
        const trendDays = clampTrendDays(searchParams.get("days"));
        if (!chatbotId) {
            return NextResponse.json({ error: "Missing chatbotId" }, { status: 400 });
        }

        const authz = await authorizeTargetAccess(req, chatbotId);
        if (!authz.ok) {
            return authz.response;
        }

        const productSnapshot = await adminDb.collection("products").where("chatbotId", "==", chatbotId).get();
        const products = productSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, unknown>));

        const totalProducts = products.length;
        let inStock = 0;
        let withDescription = 0;
        let withImage = 0;
        let withPrice = 0;
        let lastUpdatedMs = 0;
        const sourceBreakdown: SourceBreakdown = {};
        const nowMs = Date.now();
        const todayStart = toUtcDayStart(nowMs);
        const rangeStart = todayStart - (trendDays - 1) * DAY_MS;
        const rangeEnd = todayStart + DAY_MS - 1;
        const trendByDay: Record<string, Omit<DailyTrendPoint, "date" | "cumulativeTotal">> = {};
        const trendProducts: ProductTrendSnapshot[] = [];

        for (let dayStart = rangeStart; dayStart <= todayStart; dayStart += DAY_MS) {
            const date = toDayKey(dayStart);
            trendByDay[date] = {
                added: 0,
                updated: 0,
                inStockAdded: 0,
                withDescriptionAdded: 0,
                withImageAdded: 0,
                withPriceAdded: 0,
                sourceBreakdown: {}
            };
        }

        for (const product of products) {
            const isInStock = product.inStock === true;
            if (isInStock) inStock++;

            const description = typeof product.description === "string" ? product.description.trim() : "";
            const hasDescription = description.length >= 30;
            if (hasDescription) withDescription++;

            const imageUrl = typeof product.imageUrl === "string" ? product.imageUrl.trim() : "";
            const hasImage = Boolean(imageUrl);
            if (hasImage) withImage++;

            const numericPrice = Number(product.price);
            const hasPrice = Number.isFinite(numericPrice) && numericPrice > 0;
            if (hasPrice) withPrice++;

            const source = typeof product.source === "string" && product.source.trim() ? product.source.trim() : "manual";
            sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;

            const rawUpdatedMs = Math.max(toMillis(product.updatedAt), toMillis(product.createdAt));
            const rawCreatedMs = toMillis(product.createdAt) || toMillis(product.updatedAt);
            const updatedMs = rawUpdatedMs ? Math.min(rawUpdatedMs, rangeEnd) : 0;
            const createdMs = rawCreatedMs ? Math.min(rawCreatedMs, rangeEnd) : 0;

            if (updatedMs > lastUpdatedMs) lastUpdatedMs = updatedMs;

            trendProducts.push({
                createdMs,
                updatedMs,
                inStock: isInStock,
                hasDescription,
                hasImage,
                hasPrice,
                source
            });
        }

        let baselineCount = 0;
        for (const product of trendProducts) {
            if (product.updatedMs >= rangeStart) {
                const updatedDay = toDayKey(toUtcDayStart(product.updatedMs));
                const updatedPoint = trendByDay[updatedDay];
                if (updatedPoint) {
                    updatedPoint.updated += 1;
                }
            }

            if (!product.createdMs || product.createdMs < rangeStart) {
                baselineCount++;
                continue;
            }

            const createdDay = toDayKey(toUtcDayStart(product.createdMs));
            const createdPoint = trendByDay[createdDay];
            if (createdPoint) {
                createdPoint.added += 1;
                createdPoint.sourceBreakdown[product.source] = (createdPoint.sourceBreakdown[product.source] || 0) + 1;
                if (product.inStock) createdPoint.inStockAdded += 1;
                if (product.hasDescription) createdPoint.withDescriptionAdded += 1;
                if (product.hasImage) createdPoint.withImageAdded += 1;
                if (product.hasPrice) createdPoint.withPriceAdded += 1;
            }
        }

        const trend: DailyTrendPoint[] = [];
        let cumulativeTotal = baselineCount;
        for (let dayStart = rangeStart; dayStart <= todayStart; dayStart += DAY_MS) {
            const date = toDayKey(dayStart);
            const point = trendByDay[date];
            cumulativeTotal += point?.added || 0;
            trend.push({
                date,
                added: point?.added || 0,
                updated: point?.updated || 0,
                cumulativeTotal,
                inStockAdded: point?.inStockAdded || 0,
                withDescriptionAdded: point?.withDescriptionAdded || 0,
                withImageAdded: point?.withImageAdded || 0,
                withPriceAdded: point?.withPriceAdded || 0,
                sourceBreakdown: point?.sourceBreakdown || {}
            });
        }

        const descriptionCoverage = ratio(withDescription, totalProducts);
        const imageCoverage = ratio(withImage, totalProducts);
        const priceCoverage = ratio(withPrice, totalProducts);
        const inStockCoverage = ratio(inStock, totalProducts);
        const qualityScore = Math.round(
            descriptionCoverage * 0.35 +
            imageCoverage * 0.25 +
            priceCoverage * 0.2 +
            inStockCoverage * 0.2
        );
        const status = healthStatus(qualityScore, totalProducts);

        const crawlConfigSnapshot = await adminDb
            .collection("shopperSiteCrawlConfigs")
            .where("chatbotId", "==", chatbotId)
            .get();

        const crawlConfigs: CrawlConfigSummary[] = crawlConfigSnapshot.docs.map((doc) => {
            const data = doc.data() as Record<string, unknown>;
            return {
                siteUrl: typeof data.siteUrl === "string" ? data.siteUrl : "",
                limit: Number(data.limit) || 0,
                discoveryLimit: Number(data.discoveryLimit) || 0,
                nextOffset: Number(data.nextOffset) || 0,
                lastRunAt: toIso(data.lastRunAt),
                lastRunStatus: typeof data.lastRunStatus === "string" ? data.lastRunStatus : null,
                lastRunCount: Number(data.lastRunCount) || 0,
                lastRunScanned: Number(data.lastRunScanned) || 0,
                lastRunDiscovered: Number(data.lastRunDiscovered) || 0,
                lastRunCycleCompleted: Boolean(data.lastRunCycleCompleted),
                enabled: data.enabled !== false
            };
        });

        crawlConfigs.sort((a, b) => toMillis(b.lastRunAt) - toMillis(a.lastRunAt));
        const crawlConfig = crawlConfigs[0] || null;

        const recommendations: string[] = [];
        if (totalProducts < 50) {
            recommendations.push("Katalog kapsamı düşük. Site crawl veya XML feed ile ürün havuzunu büyütün.");
        }
        if (descriptionCoverage < 70) {
            recommendations.push("Ürün açıklama kalitesi düşük. Daha detaylı açıklamalar dönüşüm oranını artırır.");
        }
        if (imageCoverage < 75) {
            recommendations.push("Görsel kapsama oranı düşük. Görselsiz ürünler öneri performansını düşürür.");
        }
        if (inStockCoverage < 65) {
            recommendations.push("Stokta olmayan ürün oranı yüksek. Öneri motorunda stok önceliği artırılmalı.");
        }
        if (!crawlConfig) {
            recommendations.push("Sürekli veri akışı için en az bir site crawl konfigürasyonu aktif edin.");
        }

        return NextResponse.json({
            stats: {
                totalProducts,
                inStock,
                outOfStock: Math.max(totalProducts - inStock, 0),
                withDescription,
                withImage,
                withPrice
            },
            quality: {
                score: qualityScore,
                status,
                descriptionCoverage,
                imageCoverage,
                priceCoverage,
                inStockCoverage
            },
            ingestion: {
                sourceBreakdown,
                lastCatalogUpdateAt: lastUpdatedMs ? new Date(lastUpdatedMs).toISOString() : null,
                crawlConfig,
                trend: {
                    days: trendDays,
                    timezone: "UTC",
                    rangeStart: new Date(rangeStart).toISOString(),
                    rangeEnd: new Date(rangeEnd).toISOString(),
                    series: trend
                }
            },
            recommendations
        });
    } catch (error) {
        console.error("[ShopperHealth] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
