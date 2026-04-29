import { getAdminDb } from "@/lib/firebase-admin";

export interface DailyStat {
    date: string;
    conversations: number;
    messages: number;
}

export interface SentimentStats {
    positive: number;
    neutral: number;
    negative: number;
}

export interface TopTopic {
    topic: string;
    count: number;
}

export interface VisitorStat {
    country: string;
    count: number;
    flag: string;
}

export interface ChannelStat {
    channel: string;
    count: number;
}

export interface ResponseTimeStats {
    averageSeconds: number;
    medianSeconds: number;
    p95Seconds: number;
    sampleSize: number;
}

export interface HandoffQualityStats {
    handoffCount: number;
    handoffRate: number;
    pausedCount: number;
    pausedRate: number;
}

export interface DispositionStat {
    disposition: string;
    count: number;
}

export interface SessionQualityStats {
    hiddenCount: number;
    favoriteCount: number;
    dispositionBreakdown: DispositionStat[];
}

export interface CallbackQualityStats {
    openCount: number;
    resolvedCount: number;
    resolutionRate: number;
}

export interface FeedbackQualityStats {
    positiveCount: number;
    negativeCount: number;
    score: number | null;
}

export type ConversationQualityEventType =
    | "session_resolved"
    | "handoff_requested"
    | "handoff_resolved"
    | "fallback_triggered"
    | "feedback_submitted";

export interface ConversationQualityEvent {
    chatbotId: string;
    sessionId: string;
    type: ConversationQualityEventType;
    createdAt: string | Date;
    channel?: string;
    metadata?: Record<string, unknown>;
}

export type ConversationQualityEventInput = Omit<ConversationQualityEvent, "createdAt"> & {
    createdAt?: string | Date;
};

export interface AnalyticsSummary {
    totalConversations: number;
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    averageMessagesPerConversation: number;
    averageFirstResponseSeconds: number;
    handoffCount: number;
    handoffRate: number;
    leadsCount: number;
    appointmentsCount: number;
    conversionRate: number;
    appointmentConversionRate: number;
    sentiment: SentimentStats;
    dailyStats: DailyStat[];
    automationRate: { automated: number; handoff: number };
    topTopics: TopTopic[];
    visitorsByCountry: VisitorStat[];
    channelBreakdown: ChannelStat[];
    responseTime: ResponseTimeStats;
    handoffQuality: HandoffQualityStats;
    sessionQuality: SessionQualityStats;
    callbackQuality: CallbackQualityStats;
    feedbackQuality: FeedbackQualityStats;
    savedTimeHours: number;
    missedOpportunities: number;
}

const STOP_WORDS = new Set([
    "ve", "ile", "bir", "bu", "şu", "o", "ben", "sen", "biz", "siz", "onlar",
    "da", "de", "mı", "mi", "mu", "mü", "için", "gibi", "kadar", "olan", "var", "yok",
    "ne", "nasıl", "neden", "niye", "kim", "hangi", "şey", "daha", "en", "çok",
    "the", "and", "is", "are", "was", "were", "to", "in", "on", "at", "of", "for",
    "it", "this", "that", "my", "your", "we", "you", "they", "a", "an", "i", "me",
    "hello", "hi", "merhaba", "selam", "tşk", "teşekkür", "ederim", "thanks", "thank",
    "lütfen", "please", "yardım", "help", "bot", "chat", "sohbet", "istiyorum", "ediyorum"
]);

const POSITIVE_WORDS = new Set(['teşekkür', 'harika', 'süper', 'muhteşem', 'iyi', 'güzel', 'thanks', 'great', 'good', 'amazing', 'perfect', 'love']);
const NEGATIVE_WORDS = new Set(['kötü', 'berbat', 'iğrenç', 'rezalet', 'sorun', 'hata', 'bad', 'terrible', 'awful', 'hate', 'error', 'bug', 'fail']);

function normalizeToDate(value: any): Date | null {
    if (!value) return null;

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    if (typeof value?.toDate === 'function') {
        const parsed = value.toDate();
        if (parsed instanceof Date && !Number.isNaN(parsed.getTime())) {
            return parsed;
        }
    }

    return null;
}

function toMillis(value: any): number {
    const date = normalizeToDate(value);
    return date ? date.getTime() : 0;
}

function isWithinRange(value: any, startDate: Date, endDate: Date): boolean {
    const date = normalizeToDate(value);
    if (!date) return false;
    return date >= startDate && date <= endDate;
}

function normalizeRole(role: unknown) {
    return String(role || "").trim().toLowerCase();
}

function normalizeChannel(channel: unknown) {
    const value = String(channel || "web").trim().toLowerCase();
    return value || "web";
}

function roundToSingleDecimal(value: number) {
    return Math.round(value * 10) / 10;
}

function average(values: number[]) {
    if (!values.length) return 0;
    return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function median(values: number[]) {
    if (!values.length) return 0;
    const sorted = [...values].sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2) return sorted[middle];
    return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function percentile(values: number[], percentileValue: number) {
    if (!values.length) return 0;
    const sorted = [...values].sort((left, right) => left - right);
    const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

function incrementFrequency(map: Map<string, number>, key: string) {
    map.set(key, (map.get(key) || 0) + 1);
}

function normalizeStatus(status: unknown) {
    return String(status || "").trim().toLowerCase();
}

function readFeedbackScore(metadata: Record<string, unknown> | undefined) {
    const rawValue = metadata?.score ?? metadata?.value ?? metadata?.rating;
    const score = typeof rawValue === "number" ? rawValue : Number(rawValue);
    return Number.isFinite(score) ? score : null;
}

export async function recordConversationQualityEvent(event: ConversationQualityEventInput) {
    const adminDb = getAdminDb();
    if (!adminDb) {
        throw new Error("Firebase Admin not initialized");
    }

    return adminDb.collection("conversation_quality_events").add({
        chatbotId: event.chatbotId,
        sessionId: event.sessionId,
        type: event.type,
        createdAt: event.createdAt || new Date().toISOString(),
        channel: event.channel || "web",
        metadata: event.metadata || {},
    });
}

export async function getAnalyticsData(
    chatbotId: string,
    startDate: Date,
    endDate: Date
): Promise<AnalyticsSummary> {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            throw new Error("Firebase Admin not initialized");
        }

        const sessionsRef = adminDb.collection("chat_sessions");
        const querySnapshot = await sessionsRef
            .where("chatbotId", "==", chatbotId)
            .get();
        const [leadsSnapshot, appointmentsSnapshot, callbacksSnapshot, qualityEventsSnapshot] = await Promise.all([
            adminDb.collection("leads")
                .where("chatbotId", "==", chatbotId)
                .get(),
            adminDb.collection("appointments")
                .where("chatbotId", "==", chatbotId)
                .get(),
            adminDb.collection("callback_requests")
                .where("chatbotId", "==", chatbotId)
                .get(),
            adminDb.collection("conversation_quality_events")
                .where("chatbotId", "==", chatbotId)
                .get()
        ]);

        let totalConversations = 0;
        let totalMessages = 0;
        let userMessages = 0;
        let assistantMessages = 0;
        const firstResponseDurations: number[] = [];
        const sentiment: SentimentStats = { positive: 0, neutral: 0, negative: 0 };
        const dailyMap = new Map<string, DailyStat>();

        let automatedCount = 0;
        let handoffCount = 0;
        let pausedCount = 0;
        let hiddenCount = 0;
        let favoriteCount = 0;
        const topicFrequency = new Map<string, number>();
        const countryFrequency = new Map<string, number>();
        const channelFrequency = new Map<string, number>();
        const dispositionFrequency = new Map<string, number>();

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (!isWithinRange(data.createdAt, startDate, endDate)) {
                return;
            }

            totalConversations++;

            const messages = Array.isArray(data.messages) ? data.messages : [];
            const messageCount = messages.length;
            totalMessages += messageCount;
            const channel = normalizeChannel(data.channel);
            incrementFrequency(channelFrequency, channel);
            if (data.isPaused === true) pausedCount++;
            if (data.isHidden === true) hiddenCount++;
            if (data.isFavorite === true) favoriteCount++;

            const lastDisposition = String(data.lastDisposition || "unknown").trim() || "unknown";
            incrementFrequency(dispositionFrequency, lastDisposition);

            // 1. Automation Rate Logic
            // If any message has role 'agent' (human support), it is a handoff.
            // Otherwise, it is automated.
            const hasAgent = messages.some((m: any) => normalizeRole(m.role) === 'agent' || String(m.type || "").toLowerCase() === 'human');
            const dispositionText = normalizeStatus(data.lastDisposition);
            const handoffStatusText = normalizeStatus(data.handoffStatus);
            const hasHandoffSignal = hasAgent || Boolean(handoffStatusText) || dispositionText.includes("handoff") || dispositionText.includes("callback");
            if (hasHandoffSignal) {
                handoffCount++;
            } else {
                automatedCount++;
            }

            // 2. Sentiment & Topic Logic (Process User Messages)
            let sessionSentiment = 0; // >0 positive, <0 negative

            let firstUserAwaitingResponseMs = 0;
            let firstAssistantResponseMs = 0;

            messages.forEach((msg: any) => {
                const role = normalizeRole(msg.role);
                const messageTime = toMillis(msg.createdAt);

                if (role === 'user') {
                    userMessages++;
                    if (messageTime && !firstUserAwaitingResponseMs && !firstAssistantResponseMs) {
                        firstUserAwaitingResponseMs = messageTime;
                    }
                }

                if ((role === 'assistant' || role === 'ai' || role === 'bot') && firstUserAwaitingResponseMs && !firstAssistantResponseMs) {
                    assistantMessages++;
                    firstAssistantResponseMs = messageTime;
                } else if (role === 'assistant' || role === 'ai' || role === 'bot') {
                    assistantMessages++;
                }

                // Only analyze user messages for topics and sentiment
                if (role === 'user') {
                    const content = (msg.content || "").toLowerCase();

                    // Simple Sentiment
                    const words = content.split(/\s+/);
                    words.forEach((w: string) => {
                        const cleanWord = w.replace(/[^a-zıüöçşğA-ZİÜÖÇŞĞ]/g, '');
                        if (!cleanWord) return;

                        if (POSITIVE_WORDS.has(cleanWord)) sessionSentiment++;
                        if (NEGATIVE_WORDS.has(cleanWord)) sessionSentiment--;

                        // Topic Extraction
                        if (!STOP_WORDS.has(cleanWord) && cleanWord.length > 3) {
                            incrementFrequency(topicFrequency, cleanWord);
                        }
                    });
                }
            });

            if (firstUserAwaitingResponseMs && firstAssistantResponseMs && firstAssistantResponseMs >= firstUserAwaitingResponseMs) {
                firstResponseDurations.push(Math.round((firstAssistantResponseMs - firstUserAwaitingResponseMs) / 1000));
            }

            if (sessionSentiment > 0) sentiment.positive++;
            else if (sessionSentiment < 0) sentiment.negative++;
            else sentiment.neutral++;


            // 3. Visitor Geo Logic (Mock check - if we had metadata.country)
            if (data.metadata?.country) {
                const c = data.metadata.country;
                incrementFrequency(countryFrequency, c);
            }

            // 4. Daily Stats
            const createdAt = normalizeToDate(data.createdAt);
            const date = (createdAt || new Date()).toLocaleDateString("en-CA"); // YYYY-MM-DD
            if (!dailyMap.has(date)) {
                dailyMap.set(date, { date, conversations: 0, messages: 0 });
            }
            const stat = dailyMap.get(date)!;
            stat.conversations++;
            stat.messages += messageCount;
        });

        // Fill in missing days with 0
        const stats: DailyStat[] = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toLocaleDateString("en-CA");
            if (dailyMap.has(dateStr)) {
                stats.push(dailyMap.get(dateStr)!);
            } else {
                stats.push({ date: dateStr, conversations: 0, messages: 0 });
            }
        }

        // Process Topics - Top 5
        const topTopics: TopTopic[] = Array.from(topicFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([topic, count]) => ({ topic: topic.charAt(0).toUpperCase() + topic.slice(1), count }));

        // Process Countries - Top 5
        const visitorsByCountry: VisitorStat[] = Array.from(countryFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([country, count]) => ({ country, count, flag: "🌍" })); // Flags logic would need a map
        const channelBreakdown: ChannelStat[] = Array.from(channelFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([channel, count]) => ({ channel, count }));
        const dispositionBreakdown: DispositionStat[] = Array.from(dispositionFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([disposition, count]) => ({ disposition, count }));

        // Calculate Saved Time (Est. 2 mins (0.033 hrs) saved per assistant response)
        const savedTimeHours = Math.round(assistantMessages * (2 / 60));
        const leadsCount = leadsSnapshot.docs.filter((doc) => {
            const data = doc.data();
            return isWithinRange(data.createdAt, startDate, endDate);
        }).length;
        const appointmentsCount = appointmentsSnapshot.docs.filter((doc) => {
            const data = doc.data();
            if (String(data.status || "").toLowerCase() === "cancelled") {
                return false;
            }
            return isWithinRange(data.createdAt, startDate, endDate);
        }).length;
        const conversionRate = totalConversations > 0
            ? Math.round((leadsCount / totalConversations) * 1000) / 10
            : 0;
        const appointmentConversionRate = totalConversations > 0
            ? Math.round((appointmentsCount / totalConversations) * 1000) / 10
            : 0;
        const handoffRate = totalConversations > 0
            ? roundToSingleDecimal((handoffCount / totalConversations) * 100)
            : 0;
        const pausedRate = totalConversations > 0
            ? roundToSingleDecimal((pausedCount / totalConversations) * 100)
            : 0;
        const responseTime: ResponseTimeStats = {
            averageSeconds: average(firstResponseDurations),
            medianSeconds: median(firstResponseDurations),
            p95Seconds: percentile(firstResponseDurations, 95),
            sampleSize: firstResponseDurations.length
        };
        let openCallbacks = 0;
        let resolvedCallbacks = 0;
        callbacksSnapshot.docs.forEach((doc: any) => {
            const data = doc.data();
            if (!isWithinRange(data.createdAt, startDate, endDate)) {
                return;
            }

            const resolutionStatus = normalizeStatus(data.resolutionStatus);
            const status = normalizeStatus(data.status);
            if (["completed", "resolved", "closed"].includes(resolutionStatus) || ["completed", "resolved", "closed"].includes(status)) {
                resolvedCallbacks++;
            } else {
                openCallbacks++;
            }
        });

        const callbackTotal = openCallbacks + resolvedCallbacks;
        const callbackQuality: CallbackQualityStats = {
            openCount: openCallbacks,
            resolvedCount: resolvedCallbacks,
            resolutionRate: callbackTotal > 0 ? roundToSingleDecimal((resolvedCallbacks / callbackTotal) * 100) : 0
        };

        let positiveFeedback = 0;
        let negativeFeedback = 0;
        const feedbackScores: number[] = [];
        qualityEventsSnapshot.docs.forEach((doc: any) => {
            const data = doc.data();
            if (data.type !== "feedback_submitted" || !isWithinRange(data.createdAt, startDate, endDate)) {
                return;
            }

            const score = readFeedbackScore(data.metadata);
            if (score === null) return;
            feedbackScores.push(score);
            if (score > 0) positiveFeedback++;
            if (score < 0) negativeFeedback++;
        });
        const feedbackQuality: FeedbackQualityStats = {
            positiveCount: positiveFeedback,
            negativeCount: negativeFeedback,
            score: feedbackScores.length ? roundToSingleDecimal(feedbackScores.reduce((total, score) => total + score, 0) / feedbackScores.length) : null
        };

        return {
            totalConversations,
            totalMessages,
            userMessages,
            assistantMessages,
            averageMessagesPerConversation: totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0,
            averageFirstResponseSeconds: responseTime.averageSeconds,
            handoffCount,
            handoffRate,
            leadsCount,
            appointmentsCount,
            conversionRate,
            appointmentConversionRate,
            sentiment,
            dailyStats: stats,
            automationRate: { automated: automatedCount, handoff: handoffCount },
            topTopics,
            visitorsByCountry,
            channelBreakdown,
            responseTime,
            handoffQuality: {
                handoffCount,
                handoffRate,
                pausedCount,
                pausedRate
            },
            sessionQuality: {
                hiddenCount,
                favoriteCount,
                dispositionBreakdown
            },
            callbackQuality,
            feedbackQuality,
            savedTimeHours,
            missedOpportunities: Math.round(totalConversations * 12) // Estimated 8% engagement rate
        };

    } catch (error) {
        console.error("Error fetching analytics:", error);
        throw error;
    }
}
