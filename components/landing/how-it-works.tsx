"use client"

import { useLanguage } from "@/context/LanguageContext"
import { UserPlus, FileText, Settings, Code, Rocket } from "lucide-react"
import { motion } from "framer-motion"

export function HowItWorks() {
    const { t } = useLanguage()

    const steps = [
        { 
            icon: UserPlus, 
            title: 'step1Title', 
            desc: 'step1Desc'
        },
        { 
            icon: FileText, 
            title: 'step2Title', 
            desc: 'step2Desc'
        },
        { 
            icon: Settings, 
            title: 'step3Title', 
            desc: 'step3Desc'
        },
        { 
            icon: Code, 
            title: 'step4Title', 
            desc: 'step4Desc'
        },
        { 
            icon: Rocket, 
            title: 'step5Title', 
            desc: 'step5Desc'
        },
    ]

    return (
        <section className="py-32 bg-black border-t border-white/5 relative overflow-hidden">
            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center mb-20">
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                        {t('landingHowItWorks')}
                    </h2>
                    <p className="text-zinc-400 text-lg max-w-2xl mx-auto font-light">
                        {t('landingHowItWorksDesc')}
                    </p>
                </div>

                <div className="relative">
                    {/* Minimal Connecting Line (Desktop) */}
                    <div className="hidden lg:block absolute top-16 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-6 relative z-10">
                        {steps.map((step, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                className="flex flex-col items-center text-center group"
                            >
                                <div className="w-24 h-24 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center mb-6 relative transition-all duration-300 group-hover:scale-105 group-hover:border-white/20 group-hover:bg-zinc-800">
                                    {/* Number Badge */}
                                    <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white border-2 border-black flex items-center justify-center text-sm font-bold text-black shadow-lg z-10">
                                        {i + 1}
                                    </div>
                                    
                                    {/* Icon - White */}
                                    <step.icon className="w-10 h-10 text-white transition-transform duration-300 group-hover:scale-110" />
                                </div>
                                
                                <h3 className="text-xl font-bold text-white mb-3 transition-colors group-hover:text-zinc-300">
                                    {t(step.title)}
                                </h3>
                                
                                <p className="text-zinc-500 text-sm leading-relaxed max-w-[220px] group-hover:text-zinc-400 transition-colors">
                                    {t(step.desc)}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
