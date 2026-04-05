"use client"

import Link from "next/link"
import { ArrowRight, CircleHelp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { useLanguage } from "@/context/LanguageContext"
import { useOmniAccount } from "@/context/OmniAccountContext"
import { getOmniPageDefinition, type OmniPageDefinition } from "@/lib/omni/navigation"
import {
    OmniActionsPanel,
    OmniKnowledgeGovernancePanel,
} from "@/components/omni/omni-ai-core-panels"
import { OmniAnalyticsPanel } from "@/components/omni/omni-analytics-panel"
import { OmniAnnouncementsPanel } from "@/components/omni/omni-announcements-panel"
import { OmniAccountsPanel } from "@/components/omni/omni-accounts-panel"
import { OmniAgentDetailPanel } from "@/components/omni/omni-agent-detail-panel"
import { OmniAgentsPanel } from "@/components/omni/omni-agents-panel"
import { OmniAgenciesPanel } from "@/components/omni/omni-agencies-panel"
import { OmniAppointmentsPanel } from "@/components/omni/omni-appointments-panel"
import { OmniChannelsOverviewPanel } from "@/components/omni/omni-channels-overview-panel"
import { OmniContentPanel } from "@/components/omni/omni-content-panel"
import { OmniContactsPanel } from "@/components/omni/omni-contacts-panel"
import { OmniDeliveryMonitorPanel } from "@/components/omni/omni-delivery-monitor-panel"
import { OmniInstagramPanel } from "@/components/omni/omni-instagram-panel"
import { OmniLeadsPanel } from "@/components/omni/omni-leads-panel"
import { OmniAccountCenterPanel } from "@/components/omni/omni-account-center-panel"
import { OmniSettingsPanel } from "@/components/omni/omni-settings-panel"
import { OmniTestsPanel } from "@/components/omni/omni-tests-panel"
import { OmniUnifiedInboxPanel } from "@/components/omni/omni-unified-inbox-panel"
import { OmniVoiceCallsPanel } from "@/components/omni/omni-voice-calls-panel"
import { OmniWhatsAppPanel } from "@/components/omni/omni-whatsapp-panel"
import { OmniWebWidgetPanel } from "@/components/omni/omni-web-widget-panel"
import { OmniWorkspaceOverviewPanel } from "@/components/omni/omni-workspace-overview-panel"

function renderSpecialView(page: OmniPageDefinition) {
    const view = page.specialView

    switch (view) {
        case "workspace-overview":
            return <OmniWorkspaceOverviewPanel />
        case "agents":
            return <OmniAgentsPanel />
        case "agent-detail":
            return <OmniAgentDetailPanel agentId={page.context?.agentId || "omni-default"} tab={(page.context?.tab as any) || "general"} />
        case "web-widget":
            return <OmniWebWidgetPanel />
        case "knowledge-governance":
            return <OmniKnowledgeGovernancePanel />
        case "actions":
            return <OmniActionsPanel />
        case "channels-overview":
            return <OmniChannelsOverviewPanel />
        case "voice-calls":
            return <OmniVoiceCallsPanel />
        case "whatsapp-channel":
            return <OmniWhatsAppPanel />
        case "instagram-channel":
            return <OmniInstagramPanel />
        case "unified-inbox":
            return <OmniUnifiedInboxPanel />
        case "contacts":
            return <OmniContactsPanel />
        case "appointments":
            return <OmniAppointmentsPanel />
        case "leads":
            return <OmniLeadsPanel />
        case "delivery-monitor":
            return <OmniDeliveryMonitorPanel />
        case "analytics":
            return <OmniAnalyticsPanel />
        case "accounts":
            return <OmniAccountsPanel />
        case "agencies":
            return <OmniAgenciesPanel />
        case "content-blog":
            return <OmniContentPanel kind="blog" />
        case "content-faq":
            return <OmniContentPanel kind="faq" />
        case "content-education":
            return <OmniContentPanel kind="education" />
        case "content-announcements":
            return <OmniAnnouncementsPanel />
        case "account-center":
            return <OmniAccountCenterPanel />
        case "settings":
            return <OmniSettingsPanel />
        case "tests":
            return <OmniTestsPanel />
        default:
            return null
    }
}

export function OmniPageContent({ path }: { path: string }) {
    const { t } = useLanguage()
    const { activeAccount, activeAccountId, canSwitchAccounts, isLoading, refreshAccounts } = useOmniAccount()
    const page = getOmniPageDefinition(path, t)

    if (!page) {
        return null
    }

    const renderStaticContent = page.specialView !== "workspace-overview" && page.specialView !== "agent-detail"
    const hasInfoDrawer = renderStaticContent && Boolean(page.sections?.length)
    const isGlobalPage = ["accounts", "agencies", "content-blog", "content-faq", "content-education", "content-announcements"].includes(
        page.specialView || ""
    )

    if (!isGlobalPage && canSwitchAccounts && isLoading) {
        return (
            <div className="space-y-6 px-20 py-9">
                <div className="space-y-3">
                    {page.badge ? <Badge variant="outline">{page.badge}</Badge> : null}
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
                        <p className="mt-2 text-sm text-muted-foreground">{page.description}</p>
                    </div>
                </div>
                <Card>
                    <CardContent className="p-10 text-sm text-muted-foreground">{t("omni.accountScope.loading")}</CardContent>
                </Card>
            </div>
        )
    }

    if (!isGlobalPage && !activeAccountId && canSwitchAccounts && !isLoading) {
        return (
            <div className="space-y-6 px-20 py-9">
                <div className="space-y-3">
                    {page.badge ? <Badge variant="outline">{page.badge}</Badge> : null}
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
                        <p className="mt-2 text-sm text-muted-foreground">{page.description}</p>
                    </div>
                </div>
                <Card className="border-amber-200 bg-amber-50/60">
                    <CardContent className="p-10">
                        <div className="space-y-4">
                            <div className="text-sm text-amber-900">{t("omni.accountScope.empty")}</div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Button asChild variant="outline" className="border-amber-300 bg-white/80 text-amber-950 hover:bg-white">
                                    <Link href="/omni/directory/accounts">{t("omni.accountSwitcher.manageAccounts")}</Link>
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="text-amber-950 hover:bg-amber-100"
                                    onClick={() => {
                                        void refreshAccounts()
                                    }}
                                >
                                    {t("omni.common.retry")}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6 px-20 py-9">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="space-y-3">
                    {page.badge ? <Badge variant="outline">{page.badge}</Badge> : null}
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
                        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{page.description}</p>
                        {!isGlobalPage && activeAccount ? (
                            <p className="mt-3 text-xs text-muted-foreground">
                                {t("omni.common.account")}: {activeAccount.companyName || activeAccount.email || activeAccount.id}
                            </p>
                        ) : null}
                    </div>
                </div>
                {hasInfoDrawer || page.ctaLinks?.length ? (
                    <div className="flex flex-wrap items-center gap-2">
                        {hasInfoDrawer ? (
                            <Drawer direction="right">
                                <DrawerTrigger asChild>
                                    <Button variant="outline" className="gap-2">
                                        <CircleHelp className="h-4 w-4" />
                                        {t("omni.pageInfo.button")}
                                    </Button>
                                </DrawerTrigger>
                                <DrawerContent className="w-full sm:max-w-xl">
                                    <DrawerHeader className="border-b pb-4">
                                        <DrawerTitle>{page.title}</DrawerTitle>
                                        <DrawerDescription>{page.description}</DrawerDescription>
                                    </DrawerHeader>
                                    <div className="flex-1 overflow-y-auto px-4 pb-6">
                                        <div className="space-y-4">
                                            {page.sections?.map((section) => (
                                                <Card key={section.title} className="rounded-lg shadow-none">
                                                    <CardHeader className="pb-4">
                                                        <CardTitle className="text-lg">{section.title}</CardTitle>
                                                        <CardDescription>{section.description}</CardDescription>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <ul className="space-y-3 text-sm text-muted-foreground">
                                                            {section.bullets.map((bullet) => (
                                                                <li key={bullet}>• {bullet}</li>
                                                            ))}
                                                        </ul>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                    <DrawerFooter className="border-t pt-4">
                                        <DrawerClose asChild>
                                            <Button variant="outline">{t("omni.pageInfo.close")}</Button>
                                        </DrawerClose>
                                    </DrawerFooter>
                                </DrawerContent>
                            </Drawer>
                        ) : null}
                        {page.ctaLinks?.map((link) => (
                            <Button key={link.href} asChild variant="outline">
                                <Link href={link.href}>
                                    {link.label}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        ))}
                    </div>
                ) : null}
            </div>

            {renderStaticContent && page.metrics?.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {page.metrics.map((metric) => (
                        <Card key={metric.label}>
                            <CardHeader className="pb-2">
                                <CardDescription>{metric.label}</CardDescription>
                                <CardTitle className="text-2xl">{metric.value}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">{metric.note}</CardContent>
                        </Card>
                    ))}
                </div>
            ) : null}

            {renderSpecialView(page)}
        </div>
    )
}
