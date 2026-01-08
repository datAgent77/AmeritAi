"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Zap } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"

interface AutomationRateChartProps {
    automationData: { name: string; value: number; color: string }[]
    automationPercentage: number
    hasAutomation: boolean
}

export function AutomationRateChart({ automationData, automationPercentage, hasAutomation }: AutomationRateChartProps) {
    const { t } = useLanguage()

    return (
        <Card className="col-span-3 lg:col-span-2 border-border/50 shadow-sm flex flex-col">
            <CardHeader>
                <CardTitle className="text-base font-semibold">{t('automationRate')}</CardTitle>
                <CardDescription>{t('last7Days')}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-[250px] relative p-0">
                {hasAutomation ? (
                    <>
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-0 pointer-events-none pb-10">
                            <span className="text-4xl font-bold text-foreground">{automationPercentage}%</span>
                            <span className="text-sm text-muted-foreground font-medium mt-1">{t('automated')}</span>
                        </div>
                        <div className="w-full h-full min-h-[250px]">
                            <ResponsiveContainer width="100%" height={250} minWidth={150}>
                                <PieChart>
                                    <Pie
                                        data={automationData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={90}
                                        outerRadius={110}
                                        paddingAngle={2}
                                        dataKey="value"
                                        startAngle={90}
                                        endAngle={-270}
                                        stroke="none"
                                    >
                                        {automationData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        cursor={false}
                                        contentStyle={{
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f0',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                            padding: '8px 12px',
                                            fontSize: '12px',
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)'
                                        }}
                                        itemStyle={{ color: '#0f172a', fontWeight: 500 }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full text-center p-6 text-muted-foreground/50">
                        <Zap className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-sm font-medium">{t('noDataAvailable')}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
