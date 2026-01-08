"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Zap, Search, Settings } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"

interface QuickActionsProps {
    effectiveUserId: string
}

export function QuickActions({ effectiveUserId }: QuickActionsProps) {
    const { t } = useLanguage()

    return (
        <Card className="border-border/50 shadow-sm">
            <CardHeader>
                <CardTitle className="text-base font-semibold">{t('quickActions')}</CardTitle>
                <CardDescription>Sık kullanılan işlemler</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <a href={`/widget-test?id=${effectiveUserId}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" className="w-full justify-start h-auto py-4 px-4 rounded-xl border-dashed border-2 hover:border-solid hover:border-primary/50 hover:bg-primary/5 group">
                            <div className="bg-primary/10 p-2.5 rounded-md mr-3 group-hover:bg-primary/20 transition-colors">
                                <Zap className="w-5 h-5 text-primary" />
                            </div>
                            <div className="text-left">
                                <div className="font-medium text-sm">{t('testWidget')}</div>
                                <div className="text-xs text-muted-foreground">{t('testWidgetDesc')}</div>
                            </div>
                        </Button>
                    </a>

                    <Link href={`/admin/tenant/${effectiveUserId}/knowledge/url`}>
                        <Button variant="outline" className="w-full justify-start h-auto py-4 px-4 rounded-xl hover:bg-muted/50 group">
                            <div className="bg-blue-100 p-2.5 rounded-md mr-3 group-hover:bg-blue-200 transition-colors">
                                <Search className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="text-left">
                                <div className="font-medium text-sm">{t('updateKnowledge')}</div>
                                <div className="text-xs text-muted-foreground">{t('updateKnowledgeDesc')}</div>
                            </div>
                        </Button>
                    </Link>

                    <Link href={`/admin/tenant/${effectiveUserId}/settings/ai`}>
                        <Button variant="outline" className="w-full justify-start h-auto py-4 px-4 rounded-xl hover:bg-muted/50 group">
                            <div className="bg-purple-100 p-2.5 rounded-md mr-3 group-hover:bg-purple-200 transition-colors">
                                <Settings className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="text-left">
                                <div className="font-medium text-sm">{t('botSettings')}</div>
                                <div className="text-xs text-muted-foreground">{t('botSettingsDesc')}</div>
                            </div>
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    )
}
