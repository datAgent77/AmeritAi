import type { LucideIcon } from "lucide-react"
import {
    Building2,
    BarChart3,
    BookOpen,
    Bot,
    Calendar,
    FileQuestion,
    FileText,
    Globe,
    GraduationCap,
    Inbox,
    Instagram,
    LayoutDashboard,
    LayoutPanelTop,
    Megaphone,
    MessageCircle,
    PhoneCall,
    Settings,
    ShieldCheck,
    Sparkles,
    TriangleAlert,
    UserRound,
    Users,
    Workflow,
} from "lucide-react"
import type { OmniTranslate } from "@/lib/omni/i18n"
import { hasOmniPermission, type OmniPermission } from "@/lib/omni/permissions"

export interface OmniSidebarItem {
    title: string
    href: string
    icon: LucideIcon
    description?: string
}

export type OmniSidebarSectionId = "ai-core" | "channels" | "operations" | "settings" | "directory" | "content"

export interface OmniSidebarSection {
    id: OmniSidebarSectionId
    title: string
    items: OmniSidebarItem[]
}

export interface OmniPageMetric {
    label: string
    value: string
    note: string
}

export interface OmniPageSection {
    title: string
    description: string
    bullets: string[]
}

export interface OmniPageLink {
    label: string
    href: string
}

export interface OmniPageDefinition {
    path: string
    title: string
    description: string
    badge?: string
    metrics?: OmniPageMetric[]
    sections?: OmniPageSection[]
    ctaLinks?: OmniPageLink[]
    specialView?:
        | "dashboard"
        | "web-widget"
        | "knowledge-governance"
        | "capabilities"
        | "channel-policies"
        | "actions"
        | "brand-voice"
        | "channels-overview"
        | "voice-calls"
        | "whatsapp-channel"
        | "instagram-channel"
        | "unified-inbox"
        | "callback-queue"
        | "contacts"
        | "appointments"
        | "leads"
        | "delivery-monitor"
        | "accounts"
        | "agencies"
        | "content-blog"
        | "content-faq"
        | "content-education"
        | "content-announcements"
        | "account-center"
        | "settings"
        | "analytics"
}

const OMNI_PAGE_PATHS = new Set<string>([
    "/omni",
    "/omni/channels",
    "/omni/ai-core/knowledge-base",
    "/omni/ai-core/capabilities",
    "/omni/ai-core/channel-policies",
    "/omni/ai-core/actions",
    "/omni/ai-core/brand-voice",
    "/omni/channels/web-widget",
    "/omni/channels/whatsapp",
    "/omni/channels/instagram-dm",
    "/omni/channels/voice-calls",
    "/omni/operations/unified-inbox",
    "/omni/operations/callback-queue",
    "/omni/operations/contacts",
    "/omni/operations/appointments",
    "/omni/operations/leads",
    "/omni/operations/delivery-monitor",
    "/omni/directory/accounts",
    "/omni/directory/agencies",
    "/omni/content/blog",
    "/omni/content/faq",
    "/omni/content/education",
    "/omni/content/announcements",
    "/omni/analytics",
    "/omni/settings",
    "/omni/settings/account-center",
])

function buildPageDefinitions(t: OmniTranslate): OmniPageDefinition[] {
    return [
        {
            path: "/omni",
            title: t("omni.page.dashboard.title"),
            description: t("omni.page.dashboard.description"),
            badge: t("omni.page.dashboard.badge"),
            specialView: "dashboard",
            metrics: [
                {
                    label: t("omni.page.dashboard.metric.core.label"),
                    value: t("omni.page.dashboard.metric.core.value"),
                    note: t("omni.page.dashboard.metric.core.note"),
                },
                {
                    label: t("omni.page.dashboard.metric.channels.label"),
                    value: t("omni.page.dashboard.metric.channels.value"),
                    note: t("omni.page.dashboard.metric.channels.note"),
                },
                {
                    label: t("omni.page.dashboard.metric.operations.label"),
                    value: t("omni.page.dashboard.metric.operations.value"),
                    note: t("omni.page.dashboard.metric.operations.note"),
                },
            ],
            sections: [
                {
                    title: t("omni.page.dashboard.section.surface.title"),
                    description: t("omni.page.dashboard.section.surface.description"),
                    bullets: [
                        t("omni.page.dashboard.section.surface.b1"),
                        t("omni.page.dashboard.section.surface.b2"),
                        t("omni.page.dashboard.section.surface.b3"),
                    ],
                },
                {
                    title: t("omni.page.dashboard.section.core.title"),
                    description: t("omni.page.dashboard.section.core.description"),
                    bullets: [
                        t("omni.page.dashboard.section.core.b1"),
                        t("omni.page.dashboard.section.core.b2"),
                        t("omni.page.dashboard.section.core.b3"),
                    ],
                },
            ],
        },
        {
            path: "/omni/channels",
            title: t("omni.page.channels.title"),
            description: t("omni.page.channels.description"),
            badge: t("omni.page.channels.badge"),
            specialView: "channels-overview",
        },
        {
            path: "/omni/ai-core/knowledge-base",
            title: t("omni.page.knowledge.title"),
            description: t("omni.page.knowledge.description"),
            specialView: "knowledge-governance",
            sections: [
                {
                    title: t("omni.page.knowledge.section.title"),
                    description: t("omni.page.knowledge.section.description"),
                    bullets: [
                        t("omni.page.knowledge.section.b1"),
                        t("omni.page.knowledge.section.b2"),
                        t("omni.page.knowledge.section.b3"),
                    ],
                },
            ],
            ctaLinks: [{ label: t("omni.page.knowledge.cta"), href: "/console/knowledge" }],
        },
        {
            path: "/omni/ai-core/capabilities",
            title: t("omni.page.capabilities.title"),
            description: t("omni.page.capabilities.description"),
            specialView: "capabilities",
        },
        {
            path: "/omni/ai-core/channel-policies",
            title: t("omni.page.channelPolicies.title"),
            description: t("omni.page.channelPolicies.description"),
            specialView: "channel-policies",
        },
        {
            path: "/omni/ai-core/actions",
            title: t("omni.page.actions.title"),
            description: t("omni.page.actions.description"),
            specialView: "actions",
            sections: [
                {
                    title: t("omni.page.actions.section.title"),
                    description: t("omni.page.actions.section.description"),
                    bullets: [
                        t("omni.page.actions.section.b1"),
                        t("omni.page.actions.section.b2"),
                        t("omni.page.actions.section.b3"),
                        t("omni.page.actions.section.b4"),
                        t("omni.page.actions.section.b5"),
                    ],
                },
            ],
        },
        {
            path: "/omni/ai-core/brand-voice",
            title: t("omni.page.brandVoice.title"),
            description: t("omni.page.brandVoice.description"),
            specialView: "brand-voice",
            sections: [
                {
                    title: t("omni.page.brandVoice.section.title"),
                    description: t("omni.page.brandVoice.section.description"),
                    bullets: [
                        t("omni.page.brandVoice.section.b1"),
                        t("omni.page.brandVoice.section.b2"),
                        t("omni.page.brandVoice.section.b3"),
                    ],
                },
            ],
        },
        {
            path: "/omni/channels/web-widget",
            title: t("omni.page.webWidget.title"),
            description: t("omni.page.webWidget.description"),
            specialView: "web-widget",
        },
        {
            path: "/omni/channels/whatsapp",
            title: t("omni.page.whatsapp.title"),
            description: t("omni.page.whatsapp.description"),
            specialView: "whatsapp-channel",
            sections: [
                {
                    title: t("omni.page.whatsapp.section.title"),
                    description: t("omni.page.whatsapp.section.description"),
                    bullets: [
                        t("omni.page.whatsapp.section.b1"),
                        t("omni.page.whatsapp.section.b2"),
                        t("omni.page.whatsapp.section.b3"),
                    ],
                },
            ],
        },
        {
            path: "/omni/channels/instagram-dm",
            title: t("omni.page.instagram.title"),
            description: t("omni.page.instagram.description"),
            specialView: "instagram-channel",
            sections: [
                {
                    title: t("omni.page.instagram.section.title"),
                    description: t("omni.page.instagram.section.description"),
                    bullets: [
                        t("omni.page.instagram.section.b1"),
                        t("omni.page.instagram.section.b2"),
                        t("omni.page.instagram.section.b3"),
                    ],
                },
            ],
        },
        {
            path: "/omni/channels/voice-calls",
            title: t("omni.page.voice.title"),
            description: t("omni.page.voice.description"),
            badge: t("omni.page.voice.badge"),
            metrics: [
                {
                    label: t("omni.page.voice.metric.provisioning.label"),
                    value: t("omni.page.voice.metric.provisioning.value"),
                    note: t("omni.page.voice.metric.provisioning.note"),
                },
                {
                    label: t("omni.page.voice.metric.retention.label"),
                    value: t("omni.page.voice.metric.retention.value"),
                    note: t("omni.page.voice.metric.retention.note"),
                },
                {
                    label: t("omni.page.voice.metric.fallback.label"),
                    value: t("omni.page.voice.metric.fallback.value"),
                    note: t("omni.page.voice.metric.fallback.note"),
                },
            ],
            specialView: "voice-calls",
        },
        {
            path: "/omni/operations/unified-inbox",
            title: t("omni.page.unifiedInbox.title"),
            description: t("omni.page.unifiedInbox.description"),
            specialView: "unified-inbox",
        },
        {
            path: "/omni/operations/callback-queue",
            title: t("omni.page.callbackQueue.title"),
            description: t("omni.page.callbackQueue.description"),
            specialView: "callback-queue",
        },
        {
            path: "/omni/operations/contacts",
            title: t("omni.page.contacts.title"),
            description: t("omni.page.contacts.description"),
            specialView: "contacts",
        },
        {
            path: "/omni/operations/appointments",
            title: t("omni.page.appointments.title"),
            description: t("omni.page.appointments.description"),
            specialView: "appointments",
            sections: [
                {
                    title: t("omni.page.appointments.section.title"),
                    description: t("omni.page.appointments.section.description"),
                    bullets: [
                        t("omni.page.appointments.section.b1"),
                        t("omni.page.appointments.section.b2"),
                        t("omni.page.appointments.section.b3"),
                    ],
                },
            ],
        },
        {
            path: "/omni/operations/leads",
            title: t("omni.page.leads.title"),
            description: t("omni.page.leads.description"),
            specialView: "leads",
            sections: [
                {
                    title: t("omni.page.leads.section.title"),
                    description: t("omni.page.leads.section.description"),
                    bullets: [
                        t("omni.page.leads.section.b1"),
                        t("omni.page.leads.section.b2"),
                        t("omni.page.leads.section.b3"),
                    ],
                },
            ],
        },
        {
            path: "/omni/operations/delivery-monitor",
            title: t("omni.page.delivery.title"),
            description: t("omni.page.delivery.description"),
            specialView: "delivery-monitor",
            sections: [
                {
                    title: t("omni.page.delivery.section.title"),
                    description: t("omni.page.delivery.section.description"),
                    bullets: [
                        t("omni.page.delivery.section.b1"),
                        t("omni.page.delivery.section.b2"),
                        t("omni.page.delivery.section.b3"),
                    ],
                },
            ],
        },
        {
            path: "/omni/analytics",
            title: t("omni.page.analytics.title"),
            description: t("omni.page.analytics.description"),
            specialView: "analytics",
            sections: [
                {
                    title: t("omni.page.analytics.section.title"),
                    description: t("omni.page.analytics.section.description"),
                    bullets: [
                        t("omni.page.analytics.section.b1"),
                        t("omni.page.analytics.section.b2"),
                        t("omni.page.analytics.section.b3"),
                    ],
                },
            ],
        },
        {
            path: "/omni/directory/accounts",
            title: t("omni.page.accounts.title"),
            description: t("omni.page.accounts.description"),
            specialView: "accounts",
        },
        {
            path: "/omni/directory/agencies",
            title: t("omni.page.agencies.title"),
            description: t("omni.page.agencies.description"),
            specialView: "agencies",
        },
        {
            path: "/omni/content/blog",
            title: t("omni.page.content.blog.title"),
            description: t("omni.page.content.blog.description"),
            specialView: "content-blog",
        },
        {
            path: "/omni/content/faq",
            title: t("omni.page.content.faq.title"),
            description: t("omni.page.content.faq.description"),
            specialView: "content-faq",
        },
        {
            path: "/omni/content/education",
            title: t("omni.page.content.education.title"),
            description: t("omni.page.content.education.description"),
            specialView: "content-education",
        },
        {
            path: "/omni/content/announcements",
            title: t("omni.page.content.announcements.title"),
            description: t("omni.page.content.announcements.description"),
            specialView: "content-announcements",
        },
        {
            path: "/omni/settings",
            title: t("omni.page.settings.title"),
            description: t("omni.page.settings.description"),
            specialView: "settings",
            sections: [
                {
                    title: t("omni.page.settings.section.title"),
                    description: t("omni.page.settings.section.description"),
                    bullets: [
                        t("omni.page.settings.section.b1"),
                        t("omni.page.settings.section.b2"),
                        t("omni.page.settings.section.b3"),
                    ],
                },
            ],
            ctaLinks: [{ label: t("omni.page.settings.cta.accountCenter"), href: "/omni/settings/account-center" }],
        },
        {
            path: "/omni/settings/account-center",
            title: t("omni.page.accountCenter.title"),
            description: t("omni.page.accountCenter.description"),
            specialView: "account-center",
        },
    ]
}

export function getOmniTopLevelItems(t: OmniTranslate, permissions: OmniPermission[] = []): OmniSidebarItem[] {
    return [
        {
            title: t("omni.nav.dashboard"),
            href: "/omni",
            icon: LayoutDashboard,
            description: t("omni.nav.desc.dashboard"),
        },
        {
            title: t("omni.nav.analytics"),
            href: "/omni/analytics",
            icon: BarChart3,
            description: t("omni.nav.desc.analytics"),
        },
    ].filter((item) => {
        if (item.href === "/omni") return hasOmniPermission(permissions, "dashboard.view")
        if (item.href === "/omni/analytics") return hasOmniPermission(permissions, "analytics.view")
        return true
    })
}

export function getOmniNavGroups(t: OmniTranslate, permissions: OmniPermission[] = []): OmniSidebarSection[] {
    const groups: OmniSidebarSection[] = [
        {
            id: "ai-core",
            title: t("omni.nav.aiCore"),
            items: [
                { title: t("omni.nav.knowledgeBase"), href: "/omni/ai-core/knowledge-base", icon: BookOpen },
                { title: t("omni.nav.capabilities"), href: "/omni/ai-core/capabilities", icon: Bot },
                { title: t("omni.nav.channelPolicies"), href: "/omni/ai-core/channel-policies", icon: ShieldCheck },
                { title: t("omni.nav.actions"), href: "/omni/ai-core/actions", icon: Workflow },
                { title: t("omni.nav.brandVoice"), href: "/omni/ai-core/brand-voice", icon: Sparkles },
            ],
        },
        {
            id: "channels",
            title: t("omni.nav.channels"),
            items: [
                { title: t("omni.nav.channelsOverview"), href: "/omni/channels", icon: LayoutPanelTop },
                { title: t("omni.nav.webWidget"), href: "/omni/channels/web-widget", icon: Globe },
                { title: t("omni.nav.whatsapp"), href: "/omni/channels/whatsapp", icon: MessageCircle },
                { title: t("omni.nav.instagramDm"), href: "/omni/channels/instagram-dm", icon: Instagram },
                { title: t("omni.nav.voiceCalls"), href: "/omni/channels/voice-calls", icon: PhoneCall },
            ],
        },
        {
            id: "operations",
            title: t("omni.nav.operations"),
            items: [
                { title: t("omni.nav.unifiedInbox"), href: "/omni/operations/unified-inbox", icon: Inbox },
                { title: t("omni.nav.callbackQueue"), href: "/omni/operations/callback-queue", icon: PhoneCall },
                { title: t("omni.nav.contacts"), href: "/omni/operations/contacts", icon: Users },
                { title: t("omni.nav.appointments"), href: "/omni/operations/appointments", icon: Calendar },
                { title: t("omni.nav.leads"), href: "/omni/operations/leads", icon: Users },
                { title: t("omni.nav.deliveryMonitor"), href: "/omni/operations/delivery-monitor", icon: TriangleAlert },
            ],
        },
        {
            id: "settings",
            title: t("omni.nav.settings"),
            items: [
                { title: t("omni.nav.settingsOverview"), href: "/omni/settings", icon: Settings },
                { title: t("omni.nav.accountCenter"), href: "/omni/settings/account-center", icon: UserRound },
            ],
        },
    ]

    groups[0].items = groups[0].items.filter(() => hasOmniPermission(permissions, "aiCore.view"))
    groups[1].items = groups[1].items.filter(() => hasOmniPermission(permissions, "channels.view"))
    groups[2].items = groups[2].items.filter(() => hasOmniPermission(permissions, "operations.view"))
    groups[3].items = groups[3].items.filter((item) =>
        item.href === "/omni/settings/account-center"
            ? hasOmniPermission(permissions, "accountCenter.view")
            : hasOmniPermission(permissions, "settings.view")
    )

    if (hasOmniPermission(permissions, "directory.accounts.view") || hasOmniPermission(permissions, "directory.agencies.view")) {
        groups.push({
            id: "directory",
            title: t("omni.nav.directory"),
            items: [
                ...(hasOmniPermission(permissions, "directory.accounts.view")
                    ? [{ title: t("omni.nav.accounts"), href: "/omni/directory/accounts", icon: Building2 }]
                    : []),
                ...(hasOmniPermission(permissions, "directory.agencies.view")
                    ? [{ title: t("omni.nav.agencies"), href: "/omni/directory/agencies", icon: Users }]
                    : []),
            ],
        })
    }

    if (hasOmniPermission(permissions, "content.view")) {
        groups.push({
            id: "content",
            title: t("omni.nav.content"),
            items: [
                { title: t("omni.nav.blog"), href: "/omni/content/blog", icon: FileText },
                { title: t("omni.nav.faq"), href: "/omni/content/faq", icon: FileQuestion },
                { title: t("omni.nav.education"), href: "/omni/content/education", icon: GraduationCap },
                { title: t("omni.nav.announcements"), href: "/omni/content/announcements", icon: Megaphone },
            ],
        })
    }

    return groups.filter((group) => group.items.length > 0)
}

export function getOmniPageDefinition(pathname: string, t: OmniTranslate) {
    const normalizedPath = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname
    return buildPageDefinitions(t).find((page) => page.path === normalizedPath)
}

export function isKnownOmniPage(pathname: string) {
    const normalizedPath = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname
    return OMNI_PAGE_PATHS.has(normalizedPath)
}
