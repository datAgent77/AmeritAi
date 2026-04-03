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
    OmniBrandVoicePanel,
    OmniCapabilitiesPanel,
    OmniChannelPoliciesPanel,
    OmniKnowledgeGovernancePanel,
} from "@/components/omni/omni-ai-core-panels"
import { OmniAnalyticsPanel } from "@/components/omni/omni-analytics-panel"
import { OmniAnnouncementsPanel } from "@/components/omni/omni-announcements-panel"
import { OmniAccountsPanel } from "@/components/omni/omni-accounts-panel"
import { OmniAgenciesPanel } from "@/components/omni/omni-agencies-panel"
import { OmniAppointmentsPanel } from "@/components/omni/omni-appointments-panel"
import { OmniCallbackQueuePanel } from "@/components/omni/omni-callback-queue-panel"
import { OmniChannelsOverviewPanel } from "@/components/omni/omni-channels-overview-panel"
import { OmniContentPanel } from "@/components/omni/omni-content-panel"
import { OmniContactsPanel } from "@/components/omni/omni-contacts-panel"
import { OmniDashboardPanel } from "@/components/omni/omni-dashboard-panel"
import { OmniDeliveryMonitorPanel } from "@/components/omni/omni-delivery-monitor-panel"
import { OmniInstagramPanel } from "@/components/omni/omni-instagram-panel"
import { OmniLeadsPanel } from "@/components/omni/omni-leads-panel"
import { OmniAccountCenterPanel } from "@/components/omni/omni-account-center-panel"
import { OmniSettingsPanel } from "@/components/omni/omni-settings-panel"
import { OmniUnifiedInboxPanel } from "@/components/omni/omni-unified-inbox-panel"
import { OmniVoiceCallsPanel } from "@/components/omni/omni-voice-calls-panel"
import { OmniWhatsAppPanel } from "@/components/omni/omni-whatsapp-panel"
import { OmniWebWidgetPanel } from "@/components/omni/omni-web-widget-panel"

function renderSpecialView(view?: OmniPageDefinition["specialView"]) {
    switch (view) {
        case "dashboard":
            return <OmniDashboardPanel />
        case "web-widget":
            return <OmniWebWidgetPanel />
        case "knowledge-governance":
            return <OmniKnowledgeGovernancePanel />
        case "capabilities":
            return <OmniCapabilitiesPanel />
        case "channel-policies":
            return <OmniChannelPoliciesPanel />
        case "actions":
            return <OmniActionsPanel />
        case "brand-voice":
            return <OmniBrandVoicePanel />
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
        case "callback-queue":
            return <OmniCallbackQueuePanel />
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
        default:
            return null
    }
}

export function OmniPageContent({ path }: { path: string }) {
    const { t } = useLanguage()
    const { activeAccount, activeAccountId, canSwitchAccounts, isLoading } = useOmniAccount()
    const page = getOmniPageDefinition(path, t)

    if (!page) {
        return null
    }

    const renderStaticContent = page.specialView !== "dashboard"
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
                    <CardContent className="p-10 text-sm text-amber-900">{t("omni.accountScope.empty")}</CardContent>
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
                                Account: {activeAccount.companyName || activeAccount.email || activeAccount.id}
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

            {renderSpecialView(page.specialView)}
        </div>
    )
}
