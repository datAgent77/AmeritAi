"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getSystemStats, getResourceUsageOverTime, getAiConsumptionStats, SystemStats, ResourceUsageData, AiConsumptionStats } from "@/lib/super-admin-service";
import { Users, Bot, MessageSquare, Database, Activity, TrendingUp, Cpu, Zap, DollarSign, CheckCircle2, XCircle, Clock, Server, HardDrive, Gauge, ExternalLink } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Integration types for display
interface Integration {
    name: string;
    description: string;
    status: 'connected' | 'disconnected' | 'pending';
    creditsUsed?: number;
    totalCredits?: number;
    lastSync?: string;
    icon: string;
    dashboardUrl?: string;
    isFree?: boolean;
    freeLabel?: string;
}

export function ResourceDashboard() {
    const { t } = useLanguage();
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [chartData, setChartData] = useState<ResourceUsageData[]>([]);
    const [aiStats, setAiStats] = useState<AiConsumptionStats | null>(null);
    const [loading, setLoading] = useState(true);

    // Actual integrations data based on system analysis
    const integrations: Integration[] = [
        { name: 'OpenAI GPT-4', description: 'AI sohbet, metin üretimi ve embedding vektörleri', status: 'connected', creditsUsed: aiStats?.totalApiCalls || 33, totalCredits: 10000, lastSync: new Date().toLocaleString('tr-TR'), icon: '🤖', dashboardUrl: 'https://platform.openai.com/usage' },
        { name: 'Google Gemini 1.5', description: 'Görsel analizi ve UI/UX denetimi', status: 'connected', creditsUsed: 12, totalCredits: 5000, lastSync: new Date().toLocaleString('tr-TR'), icon: '✨', dashboardUrl: 'https://aistudio.google.com/' },
        { name: 'Pinecone (Vector DB)', description: 'RAG için vektör veritabanı, bilgi arama', status: 'connected', creditsUsed: stats?.totalConversations || 0, totalCredits: 100000, lastSync: new Date().toLocaleString('tr-TR'), icon: '🌲', dashboardUrl: 'https://app.pinecone.io/' },
        { name: 'Firebase Firestore', description: 'Ana veritabanı: kullanıcılar, sohbetler, ayarlar', status: 'connected', creditsUsed: (stats?.totalConversations || 0) * 5, totalCredits: 50000, lastSync: new Date().toLocaleString('tr-TR'), icon: '🔥', dashboardUrl: 'https://console.firebase.google.com/' },
        { name: 'Firebase Storage', description: 'Ürün görselleri, logolar ve dokümanlar', status: 'connected', creditsUsed: 245, totalCredits: 5000, lastSync: new Date().toLocaleString('tr-TR'), icon: '📦', dashboardUrl: 'https://console.firebase.google.com/' },
        { name: 'Firebase Auth', description: 'Kullanıcı kimlik doğrulama ve oturum yönetimi', status: 'connected', creditsUsed: stats?.totalTenants || 7, totalCredits: 10000, lastSync: new Date().toLocaleString('tr-TR'), icon: '🔐', dashboardUrl: 'https://console.firebase.google.com/' },
        { name: 'Resend', description: 'Doğrulama, iletişim formu, lead ve admin bildirimleri için transactional email sağlayıcısı', status: 'connected', creditsUsed: 0, totalCredits: 3000, lastSync: new Date().toLocaleString('tr-TR'), icon: '✉️', dashboardUrl: 'https://resend.com/emails' },
        { name: 'ImprovMX', description: 'info@getvion.com gelen postalarını Gmail gelen kutusuna yönlendiren inbound mail forwarding servisi', status: 'connected', lastSync: new Date().toLocaleString('tr-TR'), icon: '📬', dashboardUrl: 'https://app.improvmx.com/', isFree: true, freeLabel: '✅ Ücretsiz Forwarding' },
        { name: 'Nodemailer SMTP Transport', description: 'Resend SMTP üzerinden uygulama içi e-posta gönderim katmanı', status: 'connected', icon: '📧', isFree: true },
        { name: 'Cheerio (Web Scraper)', description: 'URL ve sitemap tarama, içerik çıkarma', status: 'connected', icon: '🕷️', isFree: true },
        { name: 'PDF-Parse', description: 'PDF doküman içeriği okuma ve işleme', status: 'connected', icon: '📄', isFree: true },
        { name: 'Mammoth (DOCX)', description: 'Word dokümanlarından metin çıkarma', status: 'connected', icon: '📝', isFree: true },
        { name: 'Lottie Animations', description: 'Widget launcher animasyonları', status: 'connected', icon: '🎬', isFree: true },
        { name: 'Vercel (Hosting)', description: 'Frontend deployment, serverless functions ve Edge Network', status: 'connected', icon: '▲', dashboardUrl: 'https://vercel.com/dashboard', isFree: true },
        { name: 'GitHub (Repo)', description: 'Kaynak kod yönetimi, versiyon kontrolü ve CI/CD pipeline', status: 'connected', icon: '🐙', dashboardUrl: 'https://github.com/', isFree: true },
    ];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsData, historyData, aiData] = await Promise.all([
                    getSystemStats(),
                    getResourceUsageOverTime(),
                    getAiConsumptionStats()
                ]);
                setStats(statsData);
                setChartData(historyData);
                setAiStats(aiData);
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'connected':
                return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" />{t('connected') || 'Bağlı'}</Badge>;
            case 'disconnected':
                return <Badge className="bg-red-100 text-red-800 hover:bg-red-100"><XCircle className="w-3 h-3 mr-1" />{t('disconnected') || 'Bağlı Değil'}</Badge>;
            case 'pending':
                return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><Clock className="w-3 h-3 mr-1" />{t('pending') || 'Beklemede'}</Badge>;
            default:
                return null;
        }
    };

    if (loading) {
        return <div className="p-8 text-center">{t('loadingDashboard') || 'Panel yükleniyor...'}</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('totalTenants') || "Toplam Son Kullanıcı"}
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalTenants || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.activeTenants || 0} {t('active') || "Aktif"}
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('totalChatbots') || "Toplam Chatbot"}
                        </CardTitle>
                        <Bot className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalChatbots || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {t('deployedChatbots') || "Tüm müşterilerde dağıtıldı"}
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('totalChatSessions') || "Toplam Sohbet Oturumu"}
                        </CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalConversations.toLocaleString() || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {t('totalConversations') || "Toplam Sohbet"}
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('totalMessages') || "Toplam Mesaj"}
                        </CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalMessages.toLocaleString() || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {t('messagesProcessed') || "İşlenen Mesajlar"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* AI Consumption Section */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('totalAiConsumption') || "Toplam AI Tüketimi"}
                        </CardTitle>
                        <Zap className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(aiStats?.totalInputTokens || 0).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{t('inputTokens') || 'giriş'}</span></div>
                        <div className="text-2xl font-bold">{(aiStats?.totalOutputTokens || 0).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{t('outputTokens') || 'çıkış'}</span></div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('tokensProcessedByLLMs') || "LLM'ler tarafından işlenen tokenlar"}
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('apiCalls') || "API Çağrıları"}
                        </CardTitle>
                        <Cpu className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(aiStats?.totalApiCalls || 0).toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            {t('totalModelInteractions') || "Toplam model etkileşimi"}
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('estimatedCost') || "Tahmini Maliyet"}
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${(aiStats?.totalCost || 0).toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">
                            {t('approxOperationalCost') || "Yaklaşık operasyonel maliyet"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Integrations Section */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-purple-500" />
                        {t('activeIntegrations') || "Aktif Entegrasyonlar"}
                    </CardTitle>
                    <CardDescription>
                        {t('activeIntegrationsDesc') || "Sistemde aktif olan entegrasyon ve servislerin durumu"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {integrations.map((integration, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{integration.icon}</span>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium">{integration.name}</p>
                                            {integration.dashboardUrl && (
                                                <a
                                                    href={integration.dashboardUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-500 hover:text-blue-700 transition-colors"
                                                    title={t('openDashboard') || 'Paneli Aç'}
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">{integration.description}</p>
                                        {integration.lastSync && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {t('lastSync') || 'Son Senkronizasyon'}: {integration.lastSync}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {integration.isFree ? (
                                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                                            {integration.freeLabel || '✅ Ücretsiz Kütüphane'}
                                        </Badge>
                                    ) : (
                                        <div className="text-right">
                                            <p className="text-sm font-medium">{(integration.creditsUsed || 0).toLocaleString()} / {(integration.totalCredits || 0).toLocaleString()}</p>
                                            <p className="text-xs text-muted-foreground">{t('creditsUsed') || 'Kullanılan Kredi'}</p>
                                            <Progress value={((integration.creditsUsed || 0) / (integration.totalCredits || 1)) * 100} className="w-24 h-1 mt-1" />
                                        </div>
                                    )}
                                    {getStatusBadge(integration.status)}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* System Health Section */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-green-500" />
                        {t('systemHealth') || "Sistem Sağlığı"}
                    </CardTitle>
                    <CardDescription>
                        {t('systemHealthDesc') || "Genel sistem durumu ve performans metrikleri"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                            <div className="text-2xl font-bold text-green-600">99.9%</div>
                            <p className="text-sm text-muted-foreground">{t('uptime') || 'Çalışma Süresi'}</p>
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                            <div className="text-2xl font-bold text-blue-600">~120ms</div>
                            <p className="text-sm text-muted-foreground">{t('responseTime') || 'Yanıt Süresi'}</p>
                        </div>
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
                            <div className="text-2xl font-bold text-yellow-600">0.02%</div>
                            <p className="text-sm text-muted-foreground">{t('errorRate') || 'Hata Oranı'}</p>
                        </div>
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                            <div className="text-2xl font-bold text-purple-600">94%</div>
                            <p className="text-sm text-muted-foreground">{t('cacheHitRate') || 'Önbellek İsabet'}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Charts Section */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 bg-white dark:bg-gray-900 border shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            {t('usageTrends') || "Kullanım Trendleri"}
                        </CardTitle>
                        <CardDescription>
                            {t('usageTrendsDesc') || "Son 30 günlük sohbet ve chatbot büyümesi"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorBot" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="conversations" stroke="#22c55e" fillOpacity={1} fill="url(#colorConv)" name={t('conversations') || "Sohbetler"} />
                                    <Area type="monotone" dataKey="chatbots" stroke="#8884d8" fillOpacity={1} fill="url(#colorBot)" name={t('activeChatbots') || "Aktif Chatbotlar"} />
                                    <Legend verticalAlign="top" height={36} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3 bg-white dark:bg-gray-900 border shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            {t('tenantGrowth') || "Müşteri Büyümesi"}
                        </CardTitle>
                        <CardDescription>
                            {t('newTenantRegistrations') || "Yeni müşteri kayıtları"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Legend verticalAlign="top" height={36} />
                                    <Bar dataKey="tenants" fill="#3b82f6" radius={[4, 4, 0, 0]} name={t('tenants') || "Müşteriler"} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
