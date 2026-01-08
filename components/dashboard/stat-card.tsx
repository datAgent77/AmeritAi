"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight, LucideIcon } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"

interface StatCardProps {
    title: string
    value: string | number
    change: number
    icon: LucideIcon
    colorClass: string
    subtitle?: string
}

export function StatCard({ title, value, change, icon: Icon, colorClass, subtitle }: StatCardProps) {
    const { t } = useLanguage()

    return (
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-200 py-0">
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
                        <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
                    </div>
                    <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
                        <Icon className={`w-5 h-5 ${colorClass.replace('bg-', 'text-')}`} />
                    </div>
                </div>
                <div className="mt-3 flex items-center text-xs">
                    <span className={`flex items-center font-medium ${change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {change >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                        {Math.abs(change)}%
                    </span>
                    <span className="text-muted-foreground ml-1.5">{subtitle || t('vsLastWeek')}</span>
                </div>
            </CardContent>
        </Card>
    )
}
