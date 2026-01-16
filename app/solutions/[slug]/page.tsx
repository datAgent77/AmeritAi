
"use client"

import { SolutionLayout } from "@/components/solutions/solution-layout"
import { useLanguage } from "@/context/LanguageContext"
import { notFound } from "next/navigation"
import { INDUSTRY_MARKETING_CONTENT } from "@/lib/industry-marketing-content"
import {
    ShoppingBag, Plane, Home, Code2, Briefcase, HeartPulse, GraduationCap,
    School, Banknote, ChefHat, Sprout, TrendingUp, RefreshCw, MessageSquare,
    Calendar, Star, Languages, Users, Clock, Image, Terminal, Video, Rocket,
    Info, DollarSign, MessageCircle, CheckCircle, Book, BarChart, PenTool,
    Car, Shield, Truck, Sparkles, Scale, Dumbbell, Anchor, Ship, MapPin, Bell, Zap, Megaphone, Factory
} from "lucide-react"

// Simple icon mapper for string -> Component
const iconMap: Record<string, any> = {
    ShoppingBag, Plane, Home, Code2, Briefcase, HeartPulse, GraduationCap,
    School, Banknote, ChefHat, Sprout, TrendingUp, RefreshCw, MessageSquare,
    Calendar, Star, Languages, Users, Clock, Images: Image, Terminal, Video, Rocket,
    Info, DollarSign, MessageCircle, CheckCircle, Book, BarChart, PenTool,
    Car, Shield, Truck, Sparkles, Scale, Dumbbell, Anchor, Ship, MapPin, Bell, Zap, Megaphone, Factory
}

export default function SolutionPage({ params }: { params: { slug: string } }) {
    const { language } = useLanguage()

    const content = INDUSTRY_MARKETING_CONTENT[params.slug]

    if (!content) {
        return notFound()
    }

    const MainIcon = iconMap[content.iconName] || Briefcase

    return (
        <SolutionLayout
            title={language === 'tr' ? content.title.tr : content.title.en}
            subtitle={language === 'tr' ? content.subtitle.tr : content.subtitle.en}
            icon={<MainIcon className={`w-5 h-5 ${params.slug === 'ecommerce' ? 'text-blue-400' :
                params.slug === 'booking' ? 'text-sky-400' :
                    params.slug === 'real-estate' ? 'text-indigo-400' :
                        'text-white'
                }`} />}
            features={content.features.map(f => {
                const FIcon = iconMap[f.iconName] || Star
                return {
                    title: language === 'tr' ? f.title.tr : f.title.en,
                    description: language === 'tr' ? f.description.tr : f.description.en,
                    icon: <FIcon className="w-6 h-6 text-white" />
                }
            })}
            promptExample={{
                user: language === 'tr' ? content.promptExample.user.tr : content.promptExample.user.en,
                ai: language === 'tr' ? content.promptExample.ai.tr : content.promptExample.ai.en
            }}
            conversation={content.conversation}
        />
    )
}
