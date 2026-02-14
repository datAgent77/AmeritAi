"use client"

import { useLanguage } from "@/context/LanguageContext"
import { Code2, Link2, MessageSquare } from "lucide-react"
import Image from "next/image"

export function IntegrationCloud() {
    const { language } = useLanguage()

    // Landing section mirrors currently active integrations in console.
    const integrations = [
        {
            name: "WhatsApp Business",
            logo: "/integrations/whatsapp.svg",
            bgColor: "bg-[#25D366]",
            isSvg: true,
        },
        {
            name: "Telegram",
            logo: "/integrations/telegram.svg",
            bgColor: "bg-[#0088cc]",
            isSvg: true,
        },
        {
            name: "Google Calendar",
            logo: "/integrations/google-calendar.svg",
            bgColor: "bg-[#4285F4]",
            isSvg: true,
        },
        {
            name: language === "tr" ? "Outlook Takvim" : "Outlook Calendar",
            logo: "/integrations/outlook.svg",
            bgColor: "bg-[#0072C6]",
            isSvg: true,
        },
        {
            name: "Shopify",
            logo: "/integrations/shopify.svg",
            bgColor: "bg-[#7AB55C]",
            isSvg: true,
        },
        {
            name: "WordPress",
            logo: "/integrations/wordpress.svg",
            bgColor: "bg-[#21759B]",
            isSvg: true,
        },
        {
            name: language === "tr" ? "Web Sitesi" : "Web Widget",
            icon: MessageSquare,
            bgColor: "bg-indigo-600",
            isSvg: false,
        },
        {
            name: language === "tr" ? "Iframe Gömme" : "Iframe Embed",
            icon: Code2,
            bgColor: "bg-violet-600",
            isSvg: false,
        },
        {
            name: language === "tr" ? "Doğrudan Bağlantı" : "Direct Link",
            icon: Link2,
            bgColor: "bg-emerald-600",
            isSvg: false,
        },
    ]

    return (
        <section className="py-24 border-t border-border relative overflow-hidden bg-background">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                        {language === 'tr' ? 'Ekosisteminize Bağlanın' : 'Connect Your Ecosystem'}
                    </h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        {language === 'tr'
                            ? 'Vion, mevcut araçlarınızla kusursuz bir şekilde entegre olur.'
                            : 'Vion integrates seamlessly with the tools you already use.'}
                    </p>
                </div>

                <div className="flex flex-wrap justify-center gap-6 md:gap-12">
                    {integrations.map((item, i) => {
                        const IconComponent = item.icon
                        return (
                            <div key={i} className="flex flex-col items-center gap-3 hover:scale-110 transition-all cursor-default group">
                                <div className={`w-20 h-20 rounded-2xl ${item.bgColor} flex items-center justify-center hover:shadow-2xl transition-all border border-white/10 group-hover:border-white/20`}>
                                    {item.isSvg ? (
                                        <Image
                                            src={item.logo}
                                            alt={item.name}
                                            width={48}
                                            height={48}
                                            className="w-12 h-12 object-contain"
                                            style={{ filter: "brightness(0) invert(1)" }}
                                        />
                                    ) : (
                                        IconComponent && <IconComponent className="w-10 h-10 text-white" />
                                    )}
                                </div>
                                <span className="text-muted-foreground text-sm font-medium group-hover:text-foreground transition-colors">{item.name}</span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
