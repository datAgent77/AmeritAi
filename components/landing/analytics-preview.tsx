"use client"

import { useLanguage } from "@/context/LanguageContext"
import { Activity, TrendingUp, Zap, PieChart } from "lucide-react"
import { motion } from "framer-motion"

export function AnalyticsPreview() {
    const { t, language } = useLanguage()

    return (
        <section className="py-32 bg-zinc-950/50 border-t border-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="text-center mb-16 space-y-4"
                >
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-100 tracking-tight">
                        {t('bentoAnalyticsTitle')}
                    </h2>
                    <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                        {t('bentoAnalyticsSubtitle')}
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
                    {/* Conversations Stat */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        whileHover={{ scale: 1.01 }}
                        className="md:col-span-2 p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 flex flex-col justify-between overflow-hidden relative group"
                    >
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl transition-opacity group-hover:bg-blue-500/20" />

                        <div className="relative z-10">
                            <h3 className="text-zinc-400 font-medium mb-2 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-blue-400" />
                                {t('analyticsConversations')}
                            </h3>
                            <div className="text-5xl font-bold text-white tracking-tighter">12,482</div>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs mt-4 font-semibold uppercase tracking-wider">
                                <TrendingUp className="w-3.5 h-3.5" /> +24% {language === 'tr' ? 'geçen ay' : 'vs last month'}
                            </div>
                        </div>

                        <div className="mt-12 h-24 flex items-end gap-1.5">
                            {[40, 65, 45, 85, 50, 95, 65, 120, 85, 110, 75, 100].map((h, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ height: 0 }}
                                    whileInView={{ height: `${h}%` }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 1, delay: 0.5 + (i * 0.05) }}
                                    className="flex-1 bg-gradient-to-t from-blue-600/40 to-blue-400/20 rounded-t-[4px] hover:from-blue-500 hover:to-blue-300 transition-all cursor-pointer relative group/bar"
                                >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black px-1.5 py-0.5 rounded text-[10px] font-bold opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">
                                        {h}k
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Sentiment */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        whileHover={{ scale: 1.02 }}
                        className="p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center text-center group"
                    >
                        <div className="relative w-36 h-36 mb-6">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                                <motion.circle
                                    cx="50" cy="50" r="42" fill="none"
                                    stroke="#22c55e" strokeWidth="10"
                                    strokeDasharray="263.89"
                                    initial={{ strokeDashoffset: 263.89 }}
                                    whileInView={{ strokeDashoffset: 263.89 * (1 - 0.82) }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
                                    strokeLinecap="round"
                                    className="drop-shadow-[0_0_12px_rgba(34,197,94,0.4)]"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    whileInView={{ opacity: 1 }}
                                    transition={{ delay: 1.5 }}
                                    className="text-3xl font-bold text-white tracking-tighter"
                                >
                                    82%
                                </motion.span>
                                <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">{language === 'tr' ? 'POZİTİF' : 'POSITIVE'}</span>
                            </div>
                        </div>
                        <h3 className="text-zinc-400 font-medium tracking-tight">{t('analyticsSentiment')}</h3>
                    </motion.div>

                    {/* Efficiency */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        whileHover={{ scale: 1.02 }}
                        className="p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center text-center group"
                    >
                        <motion.div
                            whileHover={{ rotate: 12, scale: 1.1 }}
                            className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6"
                        >
                            <Zap className="w-8 h-8 text-purple-400 fill-purple-400/20 shadow-[0_0_20px_rgba(168,85,247,0.4)]" />
                        </motion.div>
                        <div className="text-4xl font-bold text-white tracking-tighter mb-1">99.4%</div>
                        <h3 className="text-zinc-400 font-medium tracking-tight">{t('analyticsEfficiency')}</h3>
                    </motion.div>

                    {/* Top Topics */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        whileHover={{ scale: 1.01 }}
                        className="md:col-span-2 p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 relative overflow-hidden group"
                    >
                        <h3 className="text-white font-semibold mb-8 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-zinc-800/50">
                                <PieChart className="w-5 h-5 text-blue-400" />
                            </div>
                            {t('analyticsTopTopics')}
                        </h3>
                        <div className="space-y-6">
                            {[
                                { label: language === 'tr' ? 'Ürün Bilgisi' : 'Product Info', value: '45%', color: 'bg-blue-500' },
                                { label: language === 'tr' ? 'Fiyatlandırma' : 'Pricing', value: '28%', color: 'bg-emerald-500' },
                                { label: language === 'tr' ? 'Kargo Durumu' : 'Shipping Status', value: '17%', color: 'bg-amber-500' },
                                { label: language === 'tr' ? 'İadeler' : 'Returns', value: '10%', color: 'bg-rose-500' }
                            ].map((topic, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-sm items-center">
                                        <span className="text-zinc-300 font-medium">{topic.label}</span>
                                        <span className="text-white font-bold">{topic.value}</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            whileInView={{ width: topic.value }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 1.2, delay: 0.8 + (i * 0.1), ease: "circOut" }}
                                            className={`h-full ${topic.color} rounded-full relative shadow-[0_0_10px_rgba(255,255,255,0.1)]`}
                                        >
                                            <div className="absolute inset-0 bg-white/20 blur-[2px]" />
                                        </motion.div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Real-time indicator Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        whileHover={{ scale: 1.01 }}
                        className="md:col-span-2 p-8 rounded-3xl bg-gradient-to-br from-blue-600/10 to-transparent backdrop-blur-xl border border-blue-500/20 flex items-center gap-8 group"
                    >
                        <div className="relative flex-shrink-0">
                            <motion.div
                                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-8 h-8 bg-blue-500/40 rounded-full absolute -inset-2.5"
                            />
                            <div className="w-3 h-3 bg-blue-400 rounded-full relative shadow-[0_0_15px_rgba(96,165,250,0.8)]" />
                        </div>
                        <div>
                            <div className="text-white font-bold text-xl mb-1 flex items-center gap-2">
                                {language === 'tr' ? 'Canlı Karar Mekanizması' : 'Live Decision Engine'}
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-widest">{language === 'tr' ? 'AKTİF' : 'ACTIVE'}</span>
                            </div>
                            <p className="text-zinc-400 leading-relaxed">
                                {language === 'tr'
                                    ? 'Yapay zekanız her görüşmede stratejinizi gerçek zamanlı optimize eder ve en yüksek dönüşümü sağlar.'
                                    : 'Our AI engine orchestrates every interaction to maximize conversion through real-time strategic shifts.'}
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
