"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, ShieldCheck, TestTube2, TriangleAlert } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { useOmniAccount } from "@/context/OmniAccountContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { formatOmniDateTime } from "@/lib/omni/i18n"
import { OmniStateShell } from "@/components/omni/omni-ui"

interface SmokeRunsPayload {
    runs: Array<{
        id?: string
        channel: string
        action: string
        result: string
        createdAt?: string | null
        message?: string | null
    }>
    summary: {
        total: number
        success: number
        blocked: number
        error: number
        byChannel: Record<string, number>
        byAction: Record<string, number>
    }
}

interface SmokeReportPayload {
    readinessScore: number
    overallReady: boolean
    attentionRequired: boolean
    deliverySummary: {
        exhaustedRetries: number
        failed: number
    }
    auditSummary: {
        error: number
        denied: number
    }
}

export function OmniTestsPanel() {
    const { user } = useAuth()
    const { activeAccountId: chatbotId } = useOmniAccount()
    const { language, t } = useLanguage()
    const { toast } = useToast()
    const [runsPayload, setRunsPayload] = useState<SmokeRunsPayload | null>(null)
    const [reportPayload, setReportPayload] = useState<SmokeReportPayload | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const load = useCallback(async () => {
        if (!user || !chatbotId) return

        setIsLoading(true)
        try {
            const token = await user.getIdToken()
            const headers = {
                Authorization: `Bearer ${token}`,
            }

            const [runsResponse, reportResponse] = await Promise.all([
                fetch(`/api/omni/smoke-runs?chatbotId=${chatbotId}`, { headers }),
                fetch(`/api/omni/smoke-report?chatbotId=${chatbotId}`, { headers }),
            ])

            if (!runsResponse.ok || !reportResponse.ok) {
                throw new Error("Failed to load test surfaces")
            }

            setRunsPayload(await runsResponse.json())
            setReportPayload(await reportResponse.json())
        } catch (error) {
            console.error("Failed to load Omni tests panel", error)
            setRunsPayload(null)
            setReportPayload(null)
            toast({
                title: t("omni.tests.toast.loadFailed.title"),
                description: t("omni.tests.toast.loadFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }, [chatbotId, t, toast, user])

    useEffect(() => {
        void load()
    }, [load])

    if (isLoading) {
        return <OmniStateShell title={t("omni.tests.state.loading.title")} description={t("omni.tests.state.loading.description")} />
    }

    if (!runsPayload || !reportPayload) {
        return <OmniStateShell title={t("omni.tests.state.unavailable.title")} description={t("omni.tests.state.unavailable.description")} tone="warning" />
    }

    const boolLabel = (value: boolean) => (value ? t("omni.common.yes") : t("omni.common.no"))

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card>
                    <CardHeader>
                        <CardDescription>{t("omni.tests.metric.readiness.label")}</CardDescription>
                        <CardTitle className="text-2xl">{reportPayload.readinessScore}%</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        {t("omni.tests.metric.readiness.note")}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>{t("omni.tests.metric.success.label")}</CardDescription>
                        <CardTitle className="text-2xl">{runsPayload.summary.success}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        {t("omni.tests.metric.success.note")}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>{t("omni.tests.metric.blocked.label")}</CardDescription>
                        <CardTitle className="text-2xl">{runsPayload.summary.blocked}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        {t("omni.tests.metric.blocked.note")}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>{t("omni.tests.metric.failures.label")}</CardDescription>
                        <CardTitle className="text-2xl">{reportPayload.deliverySummary.failed}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        {t("omni.tests.metric.failures.note")}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>{t("omni.tests.posture.title")}</CardTitle>
                        <CardDescription>{t("omni.tests.posture.description")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                {t("omni.tests.posture.overallReady")}
                            </div>
                            <div className="font-medium">{boolLabel(reportPayload.overallReady)}</div>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                            <div className="flex items-center gap-2">
                                <TriangleAlert className="h-4 w-4 text-amber-500" />
                                {t("omni.tests.posture.attentionRequired")}
                            </div>
                            <div className="font-medium">{boolLabel(reportPayload.attentionRequired)}</div>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                            <div className="flex items-center gap-2">
                                <TestTube2 className="h-4 w-4 text-black" />
                                {t("omni.tests.posture.auditIssues")}
                            </div>
                            <div className="font-medium">{reportPayload.auditSummary.error + reportPayload.auditSummary.denied}</div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t("omni.tests.runs.title")}</CardTitle>
                        <CardDescription>{t("omni.tests.runs.description")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {runsPayload.runs.length === 0 ? (
                            <div className="rounded-lg border border-dashed px-4 py-5 text-sm text-muted-foreground">
                                {t("omni.tests.runs.empty")}
                            </div>
                        ) : (
                            runsPayload.runs.map((run) => (
                                <div key={run.id || `${run.channel}-${run.action}-${run.createdAt}`} className="rounded-lg border px-4 py-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="font-medium">{run.action}</div>
                                            <div className="mt-1 text-xs text-muted-foreground">
                                                {run.channel} · {run.createdAt ? formatOmniDateTime(run.createdAt, language) : t("omni.common.notAvailable")}
                                            </div>
                                        </div>
                                        <div className="text-sm font-medium">{run.result}</div>
                                    </div>
                                    {run.message ? <div className="mt-2 text-sm text-muted-foreground">{run.message}</div> : null}
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
