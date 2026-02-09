"use client"

import { useLanguage } from "@/context/LanguageContext"
import { ORDERED_MODULES } from "@/lib/modules-registry"
import { 
    MessageSquare, ShoppingBag, UserPlus, Mic, Calendar, 
    TrendingUp, Zap, Gamepad2, Scan, Utensils, 
    MessageCircle, Database, FileText, Box
} from "lucide-react"

export function SkillsTicker() {
    const { language } = useLanguage()
    const lang = language === 'tr' ? 'tr' : 'en'

    const activeModules = ORDERED_MODULES.filter(m => m.status === 'ready' || m.status === 'beta')

    const iconMap: Record<string, React.ElementType> = {
        generalChatbot: MessageSquare,
        productCatalog: ShoppingBag,
        leadCollection: UserPlus,
        voiceAssistant: Mic,
        appointments: Calendar,
        salesOptimization: TrendingUp,
        campaignManager: Zap,
        gamification: Gamepad2,
        visualDiagnosis: Scan,
        digitalWaiter: Utensils,
        proactiveMessaging: MessageCircle,
        dynamicContext: Database,
        knowledgeBase: FileText
    }

    const renderItems = () =>
        activeModules.map((mod) => {
            const IconComponent = iconMap[mod.id] || Box
            return (
                <div key={mod.id} className="flex items-center gap-3 flex-shrink-0 px-4 py-2 rounded-full border border-border bg-secondary/30 hover:bg-secondary/60 transition-colors">
                    <div className={`p-1.5 rounded-full ${mod.isCore ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-foreground/80 whitespace-nowrap">
                        {mod.name[lang]}
                    </span>
                </div>
            )
        })

    return (
        <div 
            className="w-full overflow-hidden py-5 border-y border-border/50 bg-background/80 backdrop-blur-md"
            style={{
                maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
                WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)'
            }}
        >
            <div className="flex gap-6 ticker-track">
                <div className="flex gap-6 flex-shrink-0 ticker-content">
                    {renderItems()}
                </div>
                <div className="flex gap-6 flex-shrink-0 ticker-content" aria-hidden="true">
                    {renderItems()}
                </div>
            </div>

            <style jsx>{`
                .ticker-track {
                    width: max-content;
                    animation: ticker-scroll 60s linear infinite;
                }
                @keyframes ticker-scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .ticker-track:hover {
                    animation-play-state: paused;
                }
            `}</style>
        </div>
    )
}
