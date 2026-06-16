"use client"

import { CheckCircle2, RefreshCw, Unplug } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { InstagramDMStatusPayload } from "@/lib/integrations/instagram-dm/types"
import { useLanguage } from "@/context/LanguageContext"

export function InstagramDMConnectedState(props: {
    status: InstagramDMStatusPayload
    refreshing?: boolean
    disconnecting?: boolean
    onRefresh: () => void
    onDisconnect: () => void
}) {
    const { t } = useLanguage()
    return (
        <Card className="border-emerald-200 bg-emerald-50/60 shadow-sm">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base text-emerald-900 font-semibold">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    {t('igConnectionActive')}
                </CardTitle>
                <CardDescription className="text-emerald-800 text-xs">
                    {t('igConnectedDesc').split('{page}')[0]}<strong className="font-semibold">{props.status.config.pageName || t('selectedPage')}</strong>{t('igConnectedDesc').split('{page}')[1]}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 text-sm text-emerald-900 bg-white/60 p-4 rounded-lg border border-emerald-100">
                    <div>
                        <p className="text-emerald-600 text-xs font-medium mb-1">{t('connectedFacebookPage')}</p>
                        <p className="font-semibold">{props.status.config.pageName || "-"}</p>
                    </div>
                    <div>
                        <p className="text-emerald-600 text-xs font-medium mb-1">{t('instagramUsernameLabel')}</p>
                        <p className="font-semibold">{props.status.config.instagramUsername ? `@${props.status.config.instagramUsername}` : "-"}</p>
                    </div>
                    <div className="sm:col-span-2">
                        <p className="text-emerald-600 text-xs font-medium mb-1">{t('lastSystemCheck')}</p>
                        <p className="font-medium text-xs">{props.status.config.preflightResult?.checkedAt ? new Date(props.status.config.preflightResult.checkedAt).toLocaleString() : t('notYet')}</p>
                    </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row pt-2">
                    <Button 
                        type="button" 
                        variant="outline" 
                        className="border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50 hover:text-emerald-900 w-full sm:w-auto" 
                        onClick={props.onRefresh} 
                        disabled={props.refreshing}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {t('refreshSystem')}
                    </Button>
                    <Button 
                        type="button" 
                        variant="outline" 
                        className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800 w-full sm:w-auto" 
                        onClick={props.onDisconnect} 
                        disabled={props.disconnecting}
                    >
                        <Unplug className="mr-2 h-4 w-4" />
                        {t('removeConnection')}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
