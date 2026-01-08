"use client"

import { useLanguage } from "@/context/LanguageContext"
import { MessageCircle, Instagram, ShoppingBag, Zap, Calendar as CalendarIcon } from "lucide-react"

export function IntegrationCloud() {
    const { language } = useLanguage()

    return (
        <section className="py-24 border-t border-white/5 relative overflow-hidden">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        {language === 'tr' ? 'Ekosisteminize Bağlanın' : 'Connect Your Ecosystem'}
                    </h2>
                    <p className="text-zinc-400 max-w-2xl mx-auto">
                        {language === 'tr'
                            ? 'Vion, mevcut araçlarınızla kusursuz bir şekilde entegre olur.'
                            : 'Vion integrates seamlessly with the tools you already use.'}
                    </p>
                </div>

                <div className="flex flex-wrap justify-center gap-6 md:gap-12">
                    {[
                        { name: 'WhatsApp', icon: MessageCircle, color: 'text-green-500' },
                        { name: 'Instagram', icon: Instagram, color: 'text-pink-500' },
                        { name: 'Shopify', icon: ShoppingBag, color: 'text-lime-500' },
                        { name: 'Zapier', icon: Zap, color: 'text-orange-500' },
                        { name: 'Google Calendar', icon: CalendarIcon, color: 'text-blue-400' }
                    ].map((item, i) => (
                        <div key={i} className="flex flex-col items-center gap-3 grayscale hover:grayscale-0 transition-all cursor-default">
                            <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center hover:bg-zinc-800 hover:border-white/10 transition-all">
                                <item.icon className={`w-10 h-10 ${item.color}`} />
                            </div>
                            <span className="text-zinc-500 text-sm font-medium">{item.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
