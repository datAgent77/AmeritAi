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
        <section className="py-32 bg-background border-t border-border">
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
                            <div className="h-full p-6 rounded-xl bg-card border border-border hover:border-foreground/20 hover:bg-accent hover:shadow-lg transition-all duration-300">
                                
                                <h3 className="text-lg font-bold mb-3 text-foreground group-hover:text-primary transition-colors">
                                    {t(feature.titleKey)}
                                </h3>
                                
                                <p className="text-muted-foreground leading-relaxed font-light text-sm group-hover:text-foreground transition-colors">
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
                    <p className="text-muted-foreground text-sm font-light max-w-2xl mx-auto">
                        {language === 'tr' 
                            ? 'Ve daha fazlası... Vion, işletmenizin ihtiyaçlarına göre özelleştirilebilir onlarca özellik sunar. Tüm özellikleri keşfetmek için modüller sayfasını ziyaret edin.'
                            : 'And much more... Vion offers dozens of customizable features tailored to your business needs. Visit the modules page to explore all features.'}
                    </p>
                </motion.div>
            </div>
        </section>
    )
}
