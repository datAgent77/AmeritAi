import type { LucideIcon } from "lucide-react"
import {
    AudioLines,
    BarChart3,
    BookOpen,
    Bot,
    Building2,
    ContactRound,
    Globe,
    GraduationCap,
    House,
    Inbox,
    Instagram,
    LayoutPanelTop,
    Megaphone,
    MessageCircle,
    PhoneCall,
    Settings,
    ShieldCheck,
    TestTube2,
    UserRound,
    Users,
    Wrench,
} from "lucide-react"
import { getOmniCopy, type OmniTranslate } from "@/lib/omni/i18n"
import { hasOmniPermission, type OmniPermission } from "@/lib/omni/permissions"

export interface OmniSidebarItem {
    title: string
    href: string
    icon: LucideIcon
    description?: string
}

export type OmniSidebarSectionId = "configure" | "monitor" | "deploy" | "admin" | "directory" | "content"

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
        | "workspace-overview"
        | "agents"
        | "agent-detail"
        | "web-widget"
        | "knowledge-governance"
        | "actions"
        | "voice-calls"
        | "channels-overview"
        | "whatsapp-channel"
        | "instagram-channel"
        | "unified-inbox"
        | "contacts"
        | "appointments"
        | "leads"
        | "delivery-monitor"
        | "account-center"
        | "settings"
        | "analytics"
        | "tests"
        | "accounts"
        | "agencies"
        | "content-blog"
        | "content-faq"
        | "content-education"
        | "content-announcements"
    context?: Record<string, string>
}

const STATIC_PAGE_PATHS = new Set<string>([
    "/omni",
    "/omni/agents",
    "/omni/knowledge-base",
    "/omni/tools",
    "/omni/integrations",
    "/omni/voices",
    "/omni/conversations",
    "/omni/contacts",
    "/omni/leads",
    "/omni/appointments",
    "/omni/analytics",
    "/omni/tests",
    "/omni/deploy/web-widget",
    "/omni/deploy/whatsapp",
    "/omni/deploy/instagram",
    "/omni/deploy/voice",
    "/omni/deploy/delivery",
    "/omni/settings",
    "/omni/settings/account-center",
    "/omni/directory/accounts",
    "/omni/directory/agencies",
    "/omni/content/blog",
    "/omni/content/faq",
    "/omni/content/education",
    "/omni/content/announcements",
])

const AGENT_TAB_IDS = new Set(["general", "evaluation", "data-collection", "audio", "tools", "llms", "knowledge", "advanced"])

const LEGACY_OMNI_REDIRECTS: Record<string, string> = {
    "/omni/channels": "/omni/integrations",
    "/omni/ai-core/knowledge-base": "/omni/knowledge-base",
    "/omni/ai-core/capabilities": "/omni/agents",
    "/omni/ai-core/channel-policies": "/omni/agents",
    "/omni/ai-core/actions": "/omni/tools",
    "/omni/ai-core/brand-voice": "/omni/agents",
    "/omni/channels/web-widget": "/omni/deploy/web-widget",
    "/omni/channels/whatsapp": "/omni/deploy/whatsapp",
    "/omni/channels/instagram-dm": "/omni/deploy/instagram",
    "/omni/channels/voice-calls": "/omni/deploy/voice",
    "/omni/operations/unified-inbox": "/omni/conversations",
    "/omni/operations/callback-queue": "/omni/conversations",
    "/omni/operations/contacts": "/omni/contacts",
    "/omni/operations/appointments": "/omni/appointments",
    "/omni/operations/leads": "/omni/leads",
    "/omni/operations/delivery-monitor": "/omni/deploy/delivery",
}

function normalizePath(pathname: string) {
    return pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname
}

function buildStaticPageDefinitions(t: OmniTranslate): OmniPageDefinition[] {
    return [
        {
            path: "/omni",
            title: getOmniCopy(t, "omni.page.workspace.title", "Workspace Overview"),
            description: getOmniCopy(t, "omni.page.workspace.description", "Workspace overview for Omni conversations, outcomes, and channel health."),
            badge: getOmniCopy(t, "omni.page.workspace.badge", "Workspace"),
            specialView: "workspace-overview",
        },
        {
            path: "/omni/agents",
            title: getOmniCopy(t, "omni.page.agents.title", "Agents"),
            description: getOmniCopy(t, "omni.page.agents.description", "Manage the assistant profiles that power Omni channels and operations."),
            specialView: "agents",
        },
        {
            path: "/omni/knowledge-base",
            title: getOmniCopy(t, "omni.page.knowledge.title", "Knowledge Base"),
            description: getOmniCopy(t, "omni.page.knowledge.description", "Shared knowledge governance reused by every Omni agent and channel."),
            specialView: "knowledge-governance",
        },
        {
            path: "/omni/tools",
            title: getOmniCopy(t, "omni.page.actions.title", "Tools"),
            description: getOmniCopy(t, "omni.page.actions.description", "Workspace-level actions and integrations currently available to Omni agents."),
            specialView: "actions",
        },
        {
            path: "/omni/integrations",
            title: getOmniCopy(t, "omni.page.channels.title", "Integrations"),
            description: getOmniCopy(t, "omni.page.channels.description", "Review workspace integrations and deployment readiness across channels."),
            specialView: "channels-overview",
        },
        {
            path: "/omni/voices",
            title: getOmniCopy(t, "omni.page.voice.title", "Voices"),
            description: getOmniCopy(t, "omni.page.voice.description", "Voice routing, numbers, and rendering setup for the Omni workspace."),
            specialView: "voice-calls",
        },
        {
            path: "/omni/conversations",
            title: getOmniCopy(t, "omni.page.unifiedInbox.title", "Conversations"),
            description: getOmniCopy(t, "omni.page.unifiedInbox.description", "Unified conversation surface across web, messaging, and voice transcripts."),
            specialView: "unified-inbox",
        },
        {
            path: "/omni/contacts",
            title: getOmniCopy(t, "omni.page.contacts.title", "Contacts"),
            description: getOmniCopy(t, "omni.page.contacts.description", "Cross-channel contact graph and merge review."),
            specialView: "contacts",
        },
        {
            path: "/omni/leads",
            title: getOmniCopy(t, "omni.page.leads.title", "Leads"),
            description: getOmniCopy(t, "omni.page.leads.description", "Lead pipeline owned by the Omni workspace."),
            specialView: "leads",
        },
        {
            path: "/omni/appointments",
            title: getOmniCopy(t, "omni.page.appointments.title", "Appointments"),
            description: getOmniCopy(t, "omni.page.appointments.description", "Appointments created from shared Omni channels and actions."),
            specialView: "appointments",
        },
        {
            path: "/omni/analytics",
            title: getOmniCopy(t, "omni.page.analytics.title", "Analytics"),
            description: getOmniCopy(t, "omni.page.analytics.description", "Workspace analytics across channels, contacts, and delivery outcomes."),
            specialView: "analytics",
        },
        {
            path: "/omni/tests",
            title: getOmniCopy(t, "omni.page.tests.title", "Tests"),
            description: getOmniCopy(t, "omni.page.tests.description", "Smoke runs, readiness checks, and rollout posture for the Omni workspace."),
            specialView: "tests",
        },
        {
            path: "/omni/deploy/web-widget",
            title: getOmniCopy(t, "omni.page.webWidget.title", "Web Widget"),
            description: getOmniCopy(t, "omni.page.webWidget.description", "Deploy and verify the Omni web surface."),
            specialView: "web-widget",
        },
        {
            path: "/omni/deploy/whatsapp",
            title: getOmniCopy(t, "omni.page.whatsapp.title", "WhatsApp"),
            description: getOmniCopy(t, "omni.page.whatsapp.description", "WhatsApp deployment and provider readiness."),
            specialView: "whatsapp-channel",
        },
        {
            path: "/omni/deploy/instagram",
            title: getOmniCopy(t, "omni.page.instagram.title", "Instagram"),
            description: getOmniCopy(t, "omni.page.instagram.description", "Instagram DM deployment and provider readiness."),
            specialView: "instagram-channel",
        },
        {
            path: "/omni/deploy/voice",
            title: getOmniCopy(t, "omni.page.voice.title", "Voice Calls"),
            description: getOmniCopy(t, "omni.page.voice.description", "Voice deployment, routing, and number readiness."),
            specialView: "voice-calls",
        },
        {
            path: "/omni/deploy/delivery",
            title: getOmniCopy(t, "omni.page.delivery.title", "Delivery"),
            description: getOmniCopy(t, "omni.page.delivery.description", "Delivery monitoring, retries, and provider error posture."),
            specialView: "delivery-monitor",
        },
        {
            path: "/omni/settings",
            title: getOmniCopy(t, "omni.page.settings.title", "Settings"),
            description: getOmniCopy(t, "omni.page.settings.description", "Workspace settings and operator defaults."),
            specialView: "settings",
        },
        {
            path: "/omni/settings/account-center",
            title: getOmniCopy(t, "omni.page.accountCenter.title", "Account Center"),
            description: getOmniCopy(t, "omni.page.accountCenter.description", "Account profile, subscription, and operator metadata."),
            specialView: "account-center",
        },
        {
            path: "/omni/directory/accounts",
            title: getOmniCopy(t, "omni.page.accounts.title", "Accounts"),
            description: getOmniCopy(t, "omni.page.accounts.description", "Directory of Omni-enabled accounts."),
            specialView: "accounts",
        },
        {
            path: "/omni/directory/agencies",
            title: getOmniCopy(t, "omni.page.agencies.title", "Partners"),
            description: getOmniCopy(t, "omni.page.agencies.description", "Directory of agency and partner relationships."),
            specialView: "agencies",
        },
        {
            path: "/omni/content/blog",
            title: getOmniCopy(t, "omni.page.content.blog.title", "Blog Content"),
            description: getOmniCopy(t, "omni.page.content.blog.description", "Workspace content surface for blog operations."),
            specialView: "content-blog",
        },
        {
            path: "/omni/content/faq",
            title: getOmniCopy(t, "omni.page.content.faq.title", "FAQ Content"),
            description: getOmniCopy(t, "omni.page.content.faq.description", "Workspace content surface for FAQ operations."),
            specialView: "content-faq",
        },
        {
            path: "/omni/content/education",
            title: getOmniCopy(t, "omni.page.content.education.title", "Education Content"),
            description: getOmniCopy(t, "omni.page.content.education.description", "Workspace content surface for education operations."),
            specialView: "content-education",
        },
        {
            path: "/omni/content/announcements",
            title: getOmniCopy(t, "omni.page.content.announcements.title", "Announcements"),
            description: getOmniCopy(t, "omni.page.content.announcements.description", "Workspace content surface for announcements."),
            specialView: "content-announcements",
        },
    ]
}

function buildAgentDetailDefinition(pathname: string, t: OmniTranslate): OmniPageDefinition | null {
    const match = pathname.match(/^\/omni\/agents\/([^/]+)\/([^/]+)$/)
    if (!match) return null

    const [, agentId, tab] = match
    if (!AGENT_TAB_IDS.has(tab)) return null

    const title = `${getOmniCopy(t, "omni.nav.agent", "Agent")} · ${decodeURIComponent(agentId)}`
    const tabLabel = getOmniCopy(t, `omni.agentTab.${tab}`, tab)

    return {
        path: pathname,
        title,
        description: getOmniCopy(t, "omni.page.agentDetail.description", "{tabLabel} control plane for the selected workspace agent.", { tabLabel }),
        badge: getOmniCopy(t, "omni.page.agentDetail.badge", "Agent"),
        specialView: "agent-detail",
        context: {
            agentId,
            tab,
        },
    }
}

export function getOmniLegacyRedirect(pathname: string) {
    return LEGACY_OMNI_REDIRECTS[normalizePath(pathname)] || null
}

export function getOmniTopLevelItems(t: OmniTranslate, permissions: OmniPermission[] = []): OmniSidebarItem[] {
    return [
        {
            title: getOmniCopy(t, "omni.nav.home", "Home"),
            href: "/omni",
            icon: House,
            description: getOmniCopy(t, "omni.nav.desc.home", "Workspace overview and quick filters."),
        },
    ].filter((item) => {
        if (item.href === "/omni") return hasOmniPermission(permissions, "dashboard.view")
        return true
    })
}

export function getOmniNavGroups(t: OmniTranslate, permissions: OmniPermission[] = []): OmniSidebarSection[] {
    const groups: OmniSidebarSection[] = [
        {
            id: "configure",
            title: getOmniCopy(t, "omni.nav.configure", "Configure"),
            items: [
                { title: getOmniCopy(t, "omni.nav.agents", "Agents"), href: "/omni/agents", icon: Bot },
                { title: getOmniCopy(t, "omni.nav.knowledgeBase", "Knowledge Base"), href: "/omni/knowledge-base", icon: BookOpen },
                { title: getOmniCopy(t, "omni.nav.tools", "Tools"), href: "/omni/tools", icon: Wrench },
                { title: getOmniCopy(t, "omni.nav.integrations", "Integrations"), href: "/omni/integrations", icon: LayoutPanelTop },
                { title: getOmniCopy(t, "omni.nav.voices", "Voices"), href: "/omni/voices", icon: AudioLines },
            ],
        },
        {
            id: "monitor",
            title: getOmniCopy(t, "omni.nav.monitor", "Monitor"),
            items: [
                { title: getOmniCopy(t, "omni.nav.conversations", "Conversations"), href: "/omni/conversations", icon: Inbox },
                { title: getOmniCopy(t, "omni.nav.contacts", "Contacts"), href: "/omni/contacts", icon: ContactRound },
                { title: getOmniCopy(t, "omni.nav.leads", "Leads"), href: "/omni/leads", icon: Users },
                { title: getOmniCopy(t, "omni.nav.appointments", "Appointments"), href: "/omni/appointments", icon: UserRound },
                { title: getOmniCopy(t, "omni.nav.analytics", "Analytics"), href: "/omni/analytics", icon: BarChart3 },
                { title: getOmniCopy(t, "omni.nav.tests", "Tests"), href: "/omni/tests", icon: TestTube2 },
            ],
        },
        {
            id: "deploy",
            title: getOmniCopy(t, "omni.nav.deploy", "Deploy"),
            items: [
                { title: getOmniCopy(t, "omni.nav.webWidget", "Web Widget"), href: "/omni/deploy/web-widget", icon: Globe },
                { title: getOmniCopy(t, "omni.nav.whatsapp", "WhatsApp"), href: "/omni/deploy/whatsapp", icon: MessageCircle },
                { title: getOmniCopy(t, "omni.nav.instagramDm", "Instagram"), href: "/omni/deploy/instagram", icon: Instagram },
                { title: getOmniCopy(t, "omni.nav.voiceCalls", "Voice"), href: "/omni/deploy/voice", icon: PhoneCall },
                { title: getOmniCopy(t, "omni.nav.delivery", "Delivery"), href: "/omni/deploy/delivery", icon: ShieldCheck },
            ],
        },
        {
            id: "admin",
            title: getOmniCopy(t, "omni.nav.admin", "Admin"),
            items: [
                { title: getOmniCopy(t, "omni.nav.settings", "Settings"), href: "/omni/settings", icon: Settings },
                { title: getOmniCopy(t, "omni.nav.accountCenter", "Account Center"), href: "/omni/settings/account-center", icon: UserRound },
            ],
        },
    ]

    groups[0].items = groups[0].items.filter((item) => {
        if (item.href === "/omni/voices" || item.href === "/omni/integrations") {
            return hasOmniPermission(permissions, "channels.view")
        }
        return hasOmniPermission(permissions, "aiCore.view")
    })

    groups[1].items = groups[1].items.filter((item) => {
        if (item.href === "/omni/analytics") return hasOmniPermission(permissions, "analytics.view")
        if (item.href === "/omni/tests") return hasOmniPermission(permissions, "settings.view")
        return hasOmniPermission(permissions, "operations.view")
    })

    groups[2].items = groups[2].items.filter(() => hasOmniPermission(permissions, "channels.view"))
    groups[3].items = groups[3].items.filter((item) =>
        item.href === "/omni/settings/account-center"
            ? hasOmniPermission(permissions, "accountCenter.view")
            : hasOmniPermission(permissions, "settings.view")
    )

    if (hasOmniPermission(permissions, "directory.accounts.view") || hasOmniPermission(permissions, "directory.agencies.view")) {
        groups.push({
            id: "directory",
            title: getOmniCopy(t, "omni.nav.directory", "Directory"),
            items: [
                ...(hasOmniPermission(permissions, "directory.accounts.view")
                    ? [{ title: getOmniCopy(t, "omni.nav.accounts", "Accounts"), href: "/omni/directory/accounts", icon: Building2 }]
                    : []),
                ...(hasOmniPermission(permissions, "directory.agencies.view")
                    ? [{ title: getOmniCopy(t, "omni.nav.agencies", "Partners"), href: "/omni/directory/agencies", icon: Users }]
                    : []),
            ],
        })
    }

    if (hasOmniPermission(permissions, "content.view")) {
        groups.push({
            id: "content",
            title: getOmniCopy(t, "omni.nav.content", "Content"),
            items: [
                { title: getOmniCopy(t, "omni.nav.blog", "Blog"), href: "/omni/content/blog", icon: Globe },
                { title: getOmniCopy(t, "omni.nav.faq", "FAQ"), href: "/omni/content/faq", icon: BookOpen },
                { title: getOmniCopy(t, "omni.nav.education", "Education"), href: "/omni/content/education", icon: GraduationCap },
                { title: getOmniCopy(t, "omni.nav.announcements", "Announcements"), href: "/omni/content/announcements", icon: Megaphone },
            ],
        })
    }

    return groups.filter((group) => group.items.length > 0)
}

export function getOmniPageDefinition(pathname: string, t: OmniTranslate) {
    const normalizedPath = normalizePath(pathname)
    return buildStaticPageDefinitions(t).find((page) => page.path === normalizedPath) || buildAgentDetailDefinition(normalizedPath, t)
}

export function isKnownOmniPage(pathname: string) {
    const normalizedPath = normalizePath(pathname)
    return STATIC_PAGE_PATHS.has(normalizedPath) || Boolean(buildAgentDetailDefinition(normalizedPath, (key) => key))
}
