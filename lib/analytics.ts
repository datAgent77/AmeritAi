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

export interface AnalyticsSummary {
    totalConversations: number;
    totalMessages: number;
    averageMessagesPerConversation: number;
    sentiment: SentimentStats;
    dailyStats: DailyStat[];
    automationRate: { automated: number; handoff: number };
    topTopics: TopTopic[];
    visitorsByCountry: VisitorStat[];
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
            .where("createdAt", ">=", startDate.toISOString())
            .where("createdAt", "<=", endDate.toISOString())
            .orderBy("createdAt", "asc")
            .get();

        let totalConversations = 0;
        let totalMessages = 0;
        const sentiment: SentimentStats = { positive: 0, neutral: 0, negative: 0 };
        const dailyMap = new Map<string, DailyStat>();

        let automatedCount = 0;
        let handoffCount = 0;
        const topicFrequency = new Map<string, number>();
        const countryFrequency = new Map<string, number>();

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            totalConversations++;

            const messages = data.messages || [];
            const messageCount = messages.length;
            totalMessages += messageCount;

            // 1. Automation Rate Logic
            // If any message has role 'agent' (human support), it is a handoff.
            // Otherwise, it is automated.
            const hasAgent = messages.some((m: any) => m.role === 'agent' || m.type === 'human');
            if (hasAgent) {
                handoffCount++;
            } else {
                automatedCount++;
            }

            // 2. Sentiment & Topic Logic (Process User Messages)
            let sessionSentiment = 0; // >0 positive, <0 negative

            messages.forEach((msg: any) => {
                // Only analyze user messages for topics and sentiment
                if (msg.role === 'user') {
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
                            topicFrequency.set(cleanWord, (topicFrequency.get(cleanWord) || 0) + 1);
                        }
                    });
                }
            });

            if (sessionSentiment > 0) sentiment.positive++;
            else if (sessionSentiment < 0) sentiment.negative++;
            else sentiment.neutral++;


            // 3. Visitor Geo Logic (Mock check - if we had metadata.country)
            if (data.metadata?.country) {
                const c = data.metadata.country;
                countryFrequency.set(c, (countryFrequency.get(c) || 0) + 1);
            }

            // 4. Daily Stats
            const date = new Date(data.createdAt).toLocaleDateString("en-CA"); // YYYY-MM-DD
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

        // Calculate Saved Time (Est. 2 mins (0.033 hrs) saved per bot message)
        // Assume half of total messages are bot responses.
        const botMessages = Math.floor(totalMessages / 2);
        const savedTimeHours = Math.round(botMessages * (2 / 60));

        return {
            totalConversations,
            totalMessages,
            averageMessagesPerConversation: totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0,
            sentiment,
            dailyStats: stats,
            automationRate: { automated: automatedCount, handoff: handoffCount },
            topTopics,
            visitorsByCountry,
            savedTimeHours,
            missedOpportunities: Math.round(totalConversations * 12) // Estimated 8% engagement rate
        };

    } catch (error) {
        console.error("Error fetching analytics:", error);
        throw error;
    }
}
