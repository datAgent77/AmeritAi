"use client"

import { useLanguage } from "@/context/LanguageContext"
import { motion } from "framer-motion"

export function FeaturesGrid() {
    const { t, language } = useLanguage()

    // Sadece mevcut ve gerçekten implement edilmiş özellikler
    const features = [
        {
            titleKey: 'landingGlobalReach',
            descKey: 'landingGlobalReachDesc'
        },
        {
            titleKey: 'landingEnterpriseSecurity',
            descKey: 'landingEnterpriseSecurityDesc'
        },
        {
            titleKey: 'landingDeepAnalytics',
            descKey: 'landingDeepAnalyticsDesc'
        },
        {
            titleKey: 'landingInstantSetup',
            descKey: 'landingInstantSetupDesc'
        },
        {
            titleKey: 'landingCustomBranding',
            descKey: 'landingCustomBrandingDesc'
        },
        {
            titleKey: 'landingAdminTitle',
            descKey: 'landingAdminDesc'
        },
        {
            titleKey: 'landingEverythingYouNeed',
            descKey: 'landingEverythingYouNeedDesc'
        },
        {
            titleKey: 'landingPersonalShopper',
            descKey: 'landingPersonalShopperDesc'
        },
        {
            titleKey: 'landingModKnowledge',
            descKey: 'landingModKnowledgeDesc'
        }
    ]

    return (
        <section className="py-32 bg-zinc-950 border-t border-white/5">
            <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: i * 0.05 }}
                            className="group relative"
                        >
                            <div className="h-full p-6 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-white/10 hover:bg-zinc-900 transition-all duration-300">
                                {/* Top accent line */}
                                <div className="w-12 h-px bg-white/20 mb-6 group-hover:bg-white/40 group-hover:w-16 transition-all duration-300" />
                                
                                <h3 className="text-lg font-bold mb-3 text-white group-hover:text-zinc-300 transition-colors">
                                    {t(feature.titleKey)}
                                </h3>
                                
                                <p className="text-zinc-500 leading-relaxed font-light text-sm group-hover:text-zinc-400 transition-colors">
                                    {t(feature.descKey)}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* More Features Text */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="text-center mt-12 pt-8"
                >
                    <p className="text-zinc-500 text-sm font-light max-w-2xl mx-auto">
                        {language === 'tr' 
                            ? 'Ve daha fazlası... Vion, işletmenizin ihtiyaçlarına göre özelleştirilebilir onlarca özellik sunar. Tüm özellikleri keşfetmek için modüller sayfasını ziyaret edin.'
                            : 'And much more... Vion offers dozens of customizable features tailored to your business needs. Visit the modules page to explore all features.'}
                    </p>
                </motion.div>
            </div>
        </section>
    )
}
