"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircle } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"

interface TopTopicsProps {
    topTopics: { topic: string; count: number }[]
    hasTopics: boolean
}

export function TopTopics({ topTopics, hasTopics }: TopTopicsProps) {
    const { t } = useLanguage()

    return (
        <Card className="border-border/50 shadow-sm">
            <CardHeader>
                <CardTitle className="text-base font-semibold">{t('topTopics')}</CardTitle>
                <CardDescription>{t('topicsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
                {hasTopics ? (
                    <div className="space-y-4">
                        {topTopics.map((topic, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                        {i + 1}
                                    </div>
                                    <span className="text-sm font-medium">{topic.topic}</span>
                                </div>
                                <div className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded text-xs">
                                    {topic.count}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-[200px] flex items-center justify-center">
                        <div className="flex flex-col items-center justify-center w-full h-full text-center p-6 text-muted-foreground/50">
                            <MessageCircle className="w-12 h-12 mb-3 opacity-20" />
                            <p className="text-sm font-medium">{t('noDataAvailable')}</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
