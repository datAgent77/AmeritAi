"use client"

import { useLanguage } from "@/context/LanguageContext"
import { Activity, TrendingUp, Zap, PieChart } from "lucide-react"
import { motion } from "framer-motion"

export function AnalyticsPreview() {
    const { t, language } = useLanguage()

    return (
        <section className="py-32 bg-black border-t border-white/5 relative overflow-hidden">
            <div className="container mx-auto px-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="text-center mb-16 space-y-4"
                >
                    <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                        {t('bentoAnalyticsTitle')}
                    </h2>
                    <p className="text-zinc-400 max-w-2xl mx-auto text-lg font-light">
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
                        className="md:col-span-2 p-8 rounded-2xl bg-zinc-900 border border-white/5 hover:border-white/10 transition-all duration-300 flex flex-col justify-between overflow-hidden relative group"
                    >
                        <div className="relative z-10">
                            <h3 className="text-zinc-400 font-medium mb-2 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-white" />
                                {t('analyticsConversations')}
                            </h3>
                            <div className="text-5xl font-bold text-white tracking-tighter">12,482</div>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white text-xs mt-4 font-semibold uppercase tracking-wider">
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
                                    className="flex-1 bg-white/20 rounded-t-[4px] hover:bg-white/30 transition-all cursor-pointer relative group/bar border border-white/10"
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
                        className="p-8 rounded-2xl bg-zinc-900 border border-white/5 hover:border-white/10 transition-all duration-300 flex flex-col items-center justify-center text-center group"
                    >
                        <div className="relative w-36 h-36 mb-6">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
                                <motion.circle
                                    cx="50" cy="50" r="42" fill="none"
                                    stroke="#ffffff" strokeWidth="10"
                                    strokeDasharray="263.89"
                                    initial={{ strokeDashoffset: 263.89 }}
                                    whileInView={{ strokeDashoffset: 263.89 * (1 - 0.82) }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
                                    strokeLinecap="round"
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
                                <span className="text-[10px] uppercase text-zinc-400 font-bold tracking-widest">{language === 'tr' ? 'POZİTİF' : 'POSITIVE'}</span>
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
                        className="p-8 rounded-2xl bg-zinc-900 border border-white/5 hover:border-white/10 transition-all duration-300 flex flex-col items-center justify-center text-center group"
                    >
                        <motion.div
                            whileHover={{ rotate: 12, scale: 1.1 }}
                            className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:bg-white/10 transition-colors"
                        >
                            <Zap className="w-8 h-8 text-white" />
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
                        className="md:col-span-2 p-8 rounded-2xl bg-zinc-900 border border-white/5 hover:border-white/10 transition-all duration-300 relative overflow-hidden group"
                    >
                        <h3 className="text-white font-semibold mb-8 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                                <PieChart className="w-5 h-5 text-white" />
                            </div>
                            {t('analyticsTopTopics')}
                        </h3>
                        <div className="space-y-6">
                            {[
                                { label: language === 'tr' ? 'Ürün Bilgisi' : 'Product Info', value: '45%' },
                                { label: language === 'tr' ? 'Fiyatlandırma' : 'Pricing', value: '28%' },
                                { label: language === 'tr' ? 'Kargo Durumu' : 'Shipping Status', value: '17%' },
                                { label: language === 'tr' ? 'İadeler' : 'Returns', value: '10%' }
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
                                            className="h-full bg-white/30 rounded-full"
                                        />
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
                        className="md:col-span-2 p-10 rounded-2xl bg-zinc-900 border border-white/5 hover:border-white/10 transition-all duration-300 group relative"
                    >
                        <div>
                            {/* Badge - Red Glass Effect */}
                            <div className="mb-4">
                                <motion.span
                                    animate={{
                                        opacity: [0.9, 1, 0.9],
                                        scale: [1, 1.02, 1]
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                    className="inline-block text-[10px] px-4 py-1.5 rounded-full uppercase tracking-widest font-bold relative overflow-hidden backdrop-blur-md bg-red-500/20 border border-red-400/30 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                                >
                                    {/* Shimmer effect */}
                                    <motion.div
                                        animate={{
                                            x: ['-100%', '200%']
                                        }}
                                        transition={{
                                            duration: 3,
                                            repeat: Infinity,
                                            ease: "linear"
                                        }}
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-red-400/30 to-transparent"
                                    />
                                    {/* Glass reflection */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent rounded-full" />
                                    <span className="relative z-10">{language === 'tr' ? 'CANLI' : 'LIVE'}</span>
                                </motion.span>
                            </div>

                            {/* Title */}
                            <h3 className="text-white font-bold text-2xl mb-3">
                                {language === 'tr' ? 'Canlı Karar Mekanizması' : 'Live Decision Engine'}
                            </h3>

                            {/* Description */}
                            <p className="text-zinc-400 leading-relaxed text-sm mb-8 max-w-lg">
                                {language === 'tr'
                                    ? 'Yapay zekanız her görüşmede stratejinizi gerçek zamanlı optimize eder ve en yüksek dönüşümü sağlar.'
                                    : 'Our AI engine orchestrates every interaction to maximize conversion through real-time strategic shifts.'}
                            </p>

                            {/* Metrics - Vertical List */}
                            <div className="space-y-4">
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.6 }}
                                    className="flex items-center justify-between py-3 border-b border-white/5"
                                >
                                    <div className="flex items-center gap-3">
                                        <TrendingUp className="w-5 h-5 text-white" />
                                        <span className="text-zinc-400 text-sm">{language === 'tr' ? 'Dönüşüm Artışı' : 'Conversion Increase'}</span>
                                    </div>
                                    <span className="text-white font-bold text-lg">+34%</span>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.7 }}
                                    className="flex items-center justify-between py-3 border-b border-white/5"
                                >
                                    <div className="flex items-center gap-3">
                                        <Zap className="w-5 h-5 text-white" />
                                        <span className="text-zinc-400 text-sm">{language === 'tr' ? 'Ortalama Yanıt' : 'Avg Response'}</span>
                                    </div>
                                    <span className="text-white font-bold text-lg">0.8s</span>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.8 }}
                                    className="flex items-center justify-between py-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <PieChart className="w-5 h-5 text-white" />
                                        <span className="text-zinc-400 text-sm">{language === 'tr' ? 'Doğruluk Oranı' : 'Accuracy Rate'}</span>
                                    </div>
                                    <span className="text-white font-bold text-lg">98%</span>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
