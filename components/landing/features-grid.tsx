"use client"

import { useLanguage } from "@/context/LanguageContext"
import { Globe, Shield, CheckCircle2 } from "lucide-react"

export function FeaturesGrid() {
    const { t } = useLanguage()

    return (
        <section className="py-24 bg-zinc-950">
            <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-3 gap-12">
                    {[
                        {
                            icon: Globe,
                            titleKey: 'landingGlobalReach',
                            descKey: 'landingGlobalReachDesc'
                        },
                        {
                            icon: Shield,
                            titleKey: 'landingEnterpriseSecurity',
                            descKey: 'landingEnterpriseSecurityDesc'
                        },
                        {
                            icon: CheckCircle2,
                            titleKey: 'landingTeamCollab',
                            descKey: 'landingTeamCollabDesc'
                        }
                    ].map((feature, i) => (
                        <div key={i} className="group">
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-6 text-white group-hover:bg-white group-hover:text-black transition-colors duration-300">
                                <feature.icon className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-semibold mb-3 text-white">{t(feature.titleKey)}</h3>
                            <p className="text-zinc-500 leading-relaxed font-light">{t(feature.descKey)}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
