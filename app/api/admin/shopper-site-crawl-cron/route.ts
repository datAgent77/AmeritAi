import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import {
    clampSiteCrawlDiscoveryLimit,
    clampSiteCrawlLimit,
    clampSiteCrawlOffset,
    normalizeSiteHost,
    runSiteCrawlImport,
    SITE_CRAWL_DISCOVERY_STEP
} from '@/lib/shopper-site-crawl';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

function getCronSecret(request: Request): string | null {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.slice(7).trim();
    }

    return request.headers.get('x-cron-secret') || new URL(request.url).searchParams.get('secret');
}

function textValue(value: unknown): string {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return String(value);
    return '';
}

export async function GET(request: Request) {
    try {
        const cronSecret = getCronSecret(request);
        if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
        }

        const requestUrl = new URL(request.url);
        const rawJobs = Number(requestUrl.searchParams.get('jobs'));
        const maxJobs = Number.isFinite(rawJobs) ? Math.min(25, Math.max(1, Math.floor(rawJobs))) : 8;

        const configsSnapshot = await adminDb
            .collection('shopperSiteCrawlConfigs')
            .where('enabled', '==', true)
            .limit(maxJobs)
            .get();

        if (configsSnapshot.empty) {
            return NextResponse.json({
                success: true,
                timestamp: new Date().toISOString(),
                processed: 0,
                message: 'No enabled crawl configuration found.'
            });
        }

        let successJobs = 0;
        let failedJobs = 0;
        let totalProducts = 0;
        const results: Array<Record<string, unknown>> = [];

        for (const configDoc of configsSnapshot.docs) {
            const configData = configDoc.data() || {};
            const chatbotId = textValue(configData.chatbotId);
            const siteUrl = textValue(configData.siteUrl);
            const limit = clampSiteCrawlLimit(configData.limit);
            const previousOffset = clampSiteCrawlOffset(configData.nextOffset);
            const previousDiscoveryLimit = clampSiteCrawlDiscoveryLimit(configData.discoveryLimit);
            const nowIso = new Date().toISOString();

            if (!chatbotId || !siteUrl) {
                failedJobs++;
                await configDoc.ref.set({
                    updatedAt: nowIso,
                    lastRunAt: nowIso,
                    lastRunStatus: 'failed',
                    lastError: 'Invalid config: chatbotId or siteUrl missing'
                }, { merge: true });

                results.push({
                    configId: configDoc.id,
                    status: 'failed',
                    error: 'Invalid config: chatbotId or siteUrl missing'
                });
                continue;
            }

            try {
                const crawlResult = await runSiteCrawlImport(adminDb, {
                    chatbotId,
                    siteUrl,
                    limit,
                    offset: previousOffset,
                    discoveryLimit: previousDiscoveryLimit
                });

                const nextDiscoveryLimit =
                    crawlResult.cycleCompleted && crawlResult.discovered >= previousDiscoveryLimit
                        ? clampSiteCrawlDiscoveryLimit(previousDiscoveryLimit + SITE_CRAWL_DISCOVERY_STEP)
                        : previousDiscoveryLimit;

                successJobs++;
                totalProducts += crawlResult.count;

                await configDoc.ref.set({
                    chatbotId,
                    siteUrl: crawlResult.normalizedSiteUrl,
                    siteHost: normalizeSiteHost(crawlResult.normalizedSiteUrl),
                    limit,
                    discoveryLimit: nextDiscoveryLimit,
                    enabled: true,
                    source: 'cron',
                    nextOffset: crawlResult.nextOffset,
                    updatedAt: nowIso,
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

                results.push({
                    configId: configDoc.id,
                    status: 'success',
                    chatbotId,
                    siteUrl: crawlResult.normalizedSiteUrl,
                    count: crawlResult.count,
                    scanned: crawlResult.scanned,
                    discovered: crawlResult.discovered,
                    discoveryLimitUsed: crawlResult.discoveryLimitUsed,
                    nextDiscoveryLimit,
                    usedOffset: crawlResult.usedOffset,
                    nextOffset: crawlResult.nextOffset,
                    hasMore: crawlResult.hasMore,
                    cycleCompleted: crawlResult.cycleCompleted
                });
            } catch (error: any) {
                failedJobs++;
                const errorMessage = error?.message || 'Site crawl failed';

                await configDoc.ref.set({
                    updatedAt: nowIso,
                    lastRunAt: nowIso,
                    lastRunStatus: 'failed',
                    lastError: errorMessage
                }, { merge: true });

                results.push({
                    configId: configDoc.id,
                    status: 'failed',
                    chatbotId,
                    siteUrl,
                    error: errorMessage
                });
            }
        }

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            processed: configsSnapshot.size,
            successJobs,
            failedJobs,
            totalProducts,
            results
        });
    } catch (error: any) {
        console.error('[ShopperSiteCrawlCron] Error:', error);
        return NextResponse.json({ error: error?.message || 'Shopper crawl cron failed' }, { status: 500 });
    }
}
