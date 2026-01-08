"use client"

import { useLanguage } from "@/context/LanguageContext"
import { UserPlus, FileText, Settings, Code, Rocket } from "lucide-react"

export function HowItWorks() {
    const { t } = useLanguage()

    return (
        <section className="py-32 bg-black border-t border-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent opacity-50"></div>
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
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden lg:block absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-zinc-800 to-transparent"></div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative z-10">
                        {[
                            { icon: UserPlus, title: 'step1Title', desc: 'step1Desc', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                            { icon: FileText, title: 'step2Title', desc: 'step2Desc', color: 'text-purple-400', bg: 'bg-purple-500/10' },
                            { icon: Settings, title: 'step3Title', desc: 'step3Desc', color: 'text-pink-400', bg: 'bg-pink-500/10' },
                            { icon: Code, title: 'step4Title', desc: 'step4Desc', color: 'text-orange-400', bg: 'bg-orange-500/10' },
                            { icon: Rocket, title: 'step5Title', desc: 'step5Desc', color: 'text-green-400', bg: 'bg-green-500/10' },
                        ].map((step, i) => (
                            <div key={i} className="flex flex-col items-center text-center group">
                                <div className={`w-24 h-24 rounded-2xl ${step.bg} border border-white/5 flex items-center justify-center mb-8 relative transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]`}>
                                    <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-sm font-bold text-white">
                                        {i + 1}
                                    </div>
                                    <step.icon className={`w-10 h-10 ${step.color}`} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">{t(step.title)}</h3>
                                <p className="text-zinc-500 text-sm leading-relaxed max-w-[200px]">
                                    {t(step.desc)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
