import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import {
    buildSiteCrawlConfigId,
    clampSiteCrawlDiscoveryLimit,
    clampSiteCrawlOffset,
    clampSiteCrawlLimit,
    normalizeSiteHost,
    normalizeSiteUrl,
    SITE_CRAWL_DISCOVERY_STEP,
    runSiteCrawlImport
} from '@/lib/shopper-site-crawl';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

function textValue(value: unknown): string {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return String(value);
    return '';
}

export async function POST(request: Request) {
    const adminDb = getAdminDb();

    try {
        if (!adminDb) {
            return NextResponse.json({ success: false, error: 'Server configuration error - Admin SDK not available' }, { status: 500 });
        }

        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const chatbotId = textValue(body?.chatbotId);
        const requestedUrl = textValue(body?.siteUrl);

        if (!chatbotId || !requestedUrl) {
            return NextResponse.json({ success: false, error: 'Chatbot ID and site URL are required' }, { status: 400 });
        }

        const normalizedUrl = normalizeSiteUrl(requestedUrl);
        if (!normalizedUrl) {
            return NextResponse.json({ success: false, error: 'Invalid site URL' }, { status: 400 });
        }

        const limit = clampSiteCrawlLimit(body?.limit);
        const configId = buildSiteCrawlConfigId(chatbotId, normalizedUrl);
        const existingConfigSnap = await adminDb.collection('shopperSiteCrawlConfigs').doc(configId).get();
        const existingConfig = existingConfigSnap.exists ? (existingConfigSnap.data() || {}) : {};
        const previousOffset = clampSiteCrawlOffset(existingConfig.nextOffset);
        const previousDiscoveryLimit = clampSiteCrawlDiscoveryLimit(existingConfig.discoveryLimit);

        const crawlResult = await runSiteCrawlImport(adminDb, {
            chatbotId,
            siteUrl: normalizedUrl,
            limit,
            offset: previousOffset,
            discoveryLimit: previousDiscoveryLimit
        });

        const nextDiscoveryLimit =
            crawlResult.cycleCompleted && crawlResult.discovered >= previousDiscoveryLimit
                ? clampSiteCrawlDiscoveryLimit(previousDiscoveryLimit + SITE_CRAWL_DISCOVERY_STEP)
                : previousDiscoveryLimit;

        const nowIso = new Date().toISOString();

        await adminDb.collection('shopperSiteCrawlConfigs').doc(configId).set({
            chatbotId,
            siteUrl: crawlResult.normalizedSiteUrl,
            siteHost: normalizeSiteHost(crawlResult.normalizedSiteUrl),
            limit,
            discoveryLimit: nextDiscoveryLimit,
            enabled: true,
            source: 'manual',
            nextOffset: crawlResult.nextOffset,
            updatedAt: nowIso,
            lastManualRunAt: nowIso,
            lastRunAt: nowIso,
            lastRunStatus: 'success',
            lastRunDiscoveryLimitUsed: crawlResult.discoveryLimitUsed,
            lastRunUsedOffset: crawlResult.usedOffset,
            lastRunCycleCompleted: crawlResult.cycleCompleted,
            lastRunCount: crawlResult.count,
            lastRunScanned: crawlResult.scanned,
            lastRunDiscovered: crawlResult.discovered,
            lastRunFailed: crawlResult.failed,
            lastError: null
        }, { merge: true });

        return NextResponse.json({
            success: true,
            count: crawlResult.count,
            scanned: crawlResult.scanned,
            discovered: crawlResult.discovered,
            discoveryLimitUsed: crawlResult.discoveryLimitUsed,
            nextDiscoveryLimit,
            usedOffset: crawlResult.usedOffset,
            nextOffset: crawlResult.nextOffset,
            hasMore: crawlResult.hasMore,
            cycleCompleted: crawlResult.cycleCompleted,
            skipped: crawlResult.skipped,
            failed: crawlResult.failed,
            failedSamples: crawlResult.failedSamples,
            autoSyncEnabled: true
        });
    } catch (error: any) {
        console.error('[SiteCrawl] Error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Site crawl failed' }, { status: 500 });
    }
}
