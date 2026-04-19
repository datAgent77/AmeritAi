import type { LucideIcon } from "lucide-react"
import {
    Activity,
    AudioLines,
    BarChart3,
    BookOpen,
    Bot,
    Braces,
    FlaskConical,
    Globe2,
    LayoutDashboard,
    MessageSquareText,
    Settings2,
    Sparkles,
    TestTube2,
    Users,
    Wrench,
} from "lucide-react"
import type { OmniAppNavGroup, OmniAppPageDefinition } from "@/lib/omni-app/types"

const AGENT_TABS = new Set(["general", "evaluation", "data-collection", "audio", "tools", "llms", "knowledge", "advanced"])

const APP_ALIAS_REDIRECTS: Record<string, string> = {
    "/omni/app/knowledge-base": "/omni/app/knowledge",
    "/omni/app/integrations": "/omni/app/channels",
    "/omni/app/contacts": "/omni/app/users",
    "/omni/app/tests": "/omni/app/testing",
    "/omni/app/leads": "/omni/app/users",
    "/omni/app/appointments": "/omni/app/conversations",
    "/omni/app/settings/account-center": "/omni/app/settings",
    "/omni/app/deploy/web-widget": "/omni/app/channels/web-widget",
    "/omni/app/deploy/whatsapp": "/omni/app/channels/whatsapp",
    "/omni/app/deploy/instagram": "/omni/app/channels/instagram",
    "/omni/app/deploy/voice": "/omni/app/channels/voice",
    "/omni/app/deploy/delivery": "/omni/app/channels/delivery",
    "/omni/app/channels/instagram-dm": "/omni/app/channels/instagram",
    "/omni/app/channels/voice-calls": "/omni/app/channels/voice",
}

const LEGACY_REDIRECTS: Record<string, string> = {
    "/omni/agents": "/omni/app/agents",
    "/omni/knowledge-base": "/omni/app/knowledge",
    "/omni/tools": "/omni/app/tools",
    "/omni/integrations": "/omni/app/channels",
    "/omni/voices": "/omni/app/channels/voice",
    "/omni/conversations": "/omni/app/conversations",
    "/omni/contacts": "/omni/app/users",
    "/omni/leads": "/omni/app/users",
    "/omni/appointments": "/omni/app/conversations",
    "/omni/analytics": "/omni/app/analytics",
    "/omni/tests": "/omni/app/testing",
    "/omni/settings": "/omni/app/settings",
    "/omni/settings/account-center": "/omni/app/settings",
    "/omni/channels": "/omni/app/channels",
    "/omni/ai-core/knowledge-base": "/omni/app/knowledge",
    "/omni/ai-core/capabilities": "/omni/app/agents",
    "/omni/ai-core/channel-policies": "/omni/app/agents",
    "/omni/ai-core/actions": "/omni/app/tools",
    "/omni/ai-core/brand-voice": "/omni/app/agents",
    "/omni/channels/web-widget": "/omni/app/channels/web-widget",
    "/omni/channels/whatsapp": "/omni/app/channels/whatsapp",
    "/omni/channels/instagram-dm": "/omni/app/channels/instagram",
    "/omni/channels/voice-calls": "/omni/app/channels/voice",
    "/omni/operations/unified-inbox": "/omni/app/conversations",
    "/omni/operations/callback-queue": "/omni/app/conversations",
    "/omni/operations/contacts": "/omni/app/users",
    "/omni/operations/appointments": "/omni/app/conversations",
    "/omni/operations/leads": "/omni/app/users",
    "/omni/operations/delivery-monitor": "/omni/app/channels/delivery",
    "/omni/directory/accounts": "/omni/app/console/accounts",
    "/omni/directory/agencies": "/omni/app/console/agencies",
    "/omni/content/blog": "/omni/app/console/content-blog",
    "/omni/content/faq": "/omni/app/console/content-faq",
    "/omni/content/education": "/omni/app/console/content-education",
    "/omni/content/announcements": "/omni/app/console/content-announcements",
}

const PAGE_DEFINITIONS: Record<string, Omit<OmniAppPageDefinition, "path">> = {
    "/omni/app": {
        title: "Overview",
        description: "Workspace health, recent outcomes, channel posture, and deployment readiness in one operating surface.",
        eyebrow: "Workspace Overview",
        view: "overview",
        icon: LayoutDashboard,
    },
    "/omni/app/agents": {
        title: "Agents",
        description: "Configure agent behavior, ownership, deployment state, and evaluation posture with an ElevenLabs-style workspace rhythm.",
        eyebrow: "Agent Studio",
        view: "agents",
        icon: Bot,
    },
    "/omni/app/knowledge": {
        title: "Knowledge",
        description: "Shared knowledge sources, governance rules, and freshness controls used across every Omni agent.",
        eyebrow: "Knowledge Layer",
        view: "knowledge",
        icon: BookOpen,
    },
    "/omni/app/tools": {
        title: "Tools",
        description: "Workspace tool permissions, execution surfaces, and operator actions available to Omni agents.",
        eyebrow: "Tooling",
        view: "tools",
        icon: Wrench,
    },
    "/omni/app/channels": {
        title: "Channels",
        description: "Deploy web, WhatsApp, Instagram, voice, and delivery surfaces from a single product-first control plane.",
        eyebrow: "Deploy Anywhere",
        view: "channels",
        icon: Globe2,
    },
    "/omni/app/channels/web-widget": {
        title: "Web Widget",
        description: "Install, brand, and validate the public web surface with the same deployment rigor as the core agent app.",
        eyebrow: "Channel Detail",
        view: "channel-web-widget",
        icon: Braces,
    },
    "/omni/app/channels/whatsapp": {
        title: "WhatsApp",
        description: "Webhook readiness, provider configuration, routing posture, and live delivery health for WhatsApp deployments.",
        eyebrow: "Channel Detail",
        view: "channel-whatsapp",
        icon: MessageSquareText,
    },
    "/omni/app/channels/instagram": {
        title: "Instagram",
        description: "Meta configuration, inbound verification, and DM routing posture for Instagram conversations.",
        eyebrow: "Channel Detail",
        view: "channel-instagram",
        icon: Sparkles,
    },
    "/omni/app/channels/voice": {
        title: "Voice",
        description: "Carrier routing, voice rendering, number readiness, and live-call operational posture.",
        eyebrow: "Channel Detail",
        view: "channel-voice",
        icon: AudioLines,
    },
    "/omni/app/channels/delivery": {
        title: "Delivery",
        description: "Retry queues, provider failures, and outbound delivery posture across every enabled Omni channel.",
        eyebrow: "Channel Detail",
        view: "channel-delivery",
        icon: Activity,
    },
    "/omni/app/conversations": {
        title: "Conversations",
        description: "Monitor live sessions, callback pressure, and channel activity with a unified operator-first inbox surface.",
        eyebrow: "Operate",
        view: "conversations",
        icon: MessageSquareText,
    },
    "/omni/app/users": {
        title: "Users",
        description: "Merged identities, lead and appointment signals, and cross-channel relationship state inside the Omni workspace.",
        eyebrow: "Operate",
        view: "users",
        icon: Users,
    },
    "/omni/app/testing": {
        title: "Testing",
        description: "Smoke runs, posture checks, and operational readiness designed to feel closer to a product deployment console than an admin screen.",
        eyebrow: "Validation",
        view: "testing",
        icon: TestTube2,
    },
    "/omni/app/experiments": {
        title: "Experiments",
        description: "Compare control and candidate branches, traffic splits, and success deltas before pushing a deployment wider.",
        eyebrow: "Optimization",
        view: "experiments",
        icon: FlaskConical,
    },
    "/omni/app/versioning": {
        title: "Versioning",
        description: "Track live, candidate, and draft agent versions with immutable snapshots and traffic-aware deployment state.",
        eyebrow: "Release Control",
        view: "versioning",
        icon: Sparkles,
    },
    "/omni/app/analytics": {
        title: "Analytics",
        description: "Outcome, readiness, contact quality, and channel breakdowns with the dense visual rhythm of a modern AI product workspace.",
        eyebrow: "Insights",
        view: "analytics",
        icon: BarChart3,
    },
    "/omni/app/settings": {
        title: "Settings",
        description: "Workspace operating defaults, provisioning tasks, team routing, and structured links back to Console-owned administration.",
        eyebrow: "Workspace Settings",
        view: "settings",
        icon: Settings2,
    },
    "/omni/app/console/accounts": {
        title: "Accounts Stay In Console",
        description: "Account, tenant, and partner administration remains owned by Console. Omni links back out without changing Console ownership.",
        eyebrow: "Console Bridge",
        view: "console-bridge",
        icon: Settings2,
        consoleHref: "/admin/end-users",
    },
    "/omni/app/console/agencies": {
        title: "Agency Management Stays In Console",
        description: "Agency-level management is intentionally not duplicated inside Omni. Use Console for the canonical management flow.",
        eyebrow: "Console Bridge",
        view: "console-bridge",
        icon: Settings2,
        consoleHref: "/admin/agencies",
    },
    "/omni/app/console/content-blog": {
        title: "Blog Content Stays In Console",
        description: "Site content ownership remains in Console. Omni only exposes a bridge back to the management surface.",
        eyebrow: "Console Bridge",
        view: "console-bridge",
        icon: Settings2,
        consoleHref: "/admin/content/blog",
    },
    "/omni/app/console/content-faq": {
        title: "FAQ Content Stays In Console",
        description: "FAQ content remains managed inside Console so the Omni app can stay product-focused and operational.",
        eyebrow: "Console Bridge",
        view: "console-bridge",
        icon: Settings2,
        consoleHref: "/admin/content/faq",
    },
    "/omni/app/console/content-education": {
        title: "Education Content Stays In Console",
        description: "Education and help content continues to live in Console. Omni links there without taking ownership.",
        eyebrow: "Console Bridge",
        view: "console-bridge",
        icon: Settings2,
        consoleHref: "/admin/content/education",
    },
    "/omni/app/console/content-announcements": {
        title: "Announcements Stay In Console",
        description: "Announcements are Console-owned. Use the bridge below to move into the admin surface without changing Console behavior.",
        eyebrow: "Console Bridge",
        view: "console-bridge",
        icon: Settings2,
        consoleHref: "/console/settings",
    },
}

function normalizePath(pathname: string) {
    if (!pathname) return "/omni/app"
    if (pathname.length > 1 && pathname.endsWith("/")) {
        return pathname.slice(0, -1)
    }
    return pathname
}

export function getOmniAppNavGroups(): OmniAppNavGroup[] {
    return [
        {
            id: "build",
            label: "Build",
            items: [
                { id: "overview", label: "Overview", href: "/omni/app", icon: LayoutDashboard, match: ["/omni/app"] },
                { id: "agents", label: "Agents", href: "/omni/app/agents", icon: Bot, match: ["/omni/app/agents"] },
                { id: "knowledge", label: "Knowledge", href: "/omni/app/knowledge", icon: BookOpen, match: ["/omni/app/knowledge"] },
                { id: "tools", label: "Tools", href: "/omni/app/tools", icon: Wrench, match: ["/omni/app/tools"] },
                { id: "channels", label: "Channels", href: "/omni/app/channels", icon: Globe2, match: ["/omni/app/channels"] },
            ],
        },
        {
            id: "operate",
            label: "Operate",
            items: [
                { id: "conversations", label: "Conversations", href: "/omni/app/conversations", icon: MessageSquareText, match: ["/omni/app/conversations"] },
                { id: "users", label: "Users", href: "/omni/app/users", icon: Users, match: ["/omni/app/users"] },
                { id: "testing", label: "Testing", href: "/omni/app/testing", icon: TestTube2, match: ["/omni/app/testing"] },
            ],
        },
        {
            id: "govern",
            label: "Scale",
            items: [
                { id: "experiments", label: "Experiments", href: "/omni/app/experiments", icon: FlaskConical, match: ["/omni/app/experiments"] },
                { id: "versioning", label: "Versioning", href: "/omni/app/versioning", icon: Sparkles, match: ["/omni/app/versioning"] },
                { id: "analytics", label: "Analytics", href: "/omni/app/analytics", icon: BarChart3, match: ["/omni/app/analytics"] },
            ],
        },
        {
            id: "manage",
            label: "Manage",
            items: [{ id: "settings", label: "Settings", href: "/omni/app/settings", icon: Settings2, match: ["/omni/app/settings", "/omni/app/console"] }],
        },
    ]
}

function buildAgentDetailPage(path: string) {
    const matches = path.match(/^\/omni\/app\/agents\/([^/]+)\/([^/]+)$/)
    if (!matches) return null
    const agentId = decodeURIComponent(matches[1])
    const tab = decodeURIComponent(matches[2])
    if (!AGENT_TABS.has(tab)) return null

    return {
        path,
        title: "Agent Detail",
        description: "Detailed agent behavior, evaluation, knowledge, and deployment tabs inside the Omni workspace.",
        eyebrow: "Agent Studio",
        view: "agent-detail",
        icon: Bot,
        context: {
            agentId,
            tab,
        },
    } satisfies OmniAppPageDefinition
}

export function getOmniAppRedirect(pathname: string) {
    const normalized = normalizePath(pathname)
    return APP_ALIAS_REDIRECTS[normalized] || null
}

export function getOmniLegacyRedirect(pathname: string) {
    const normalized = normalizePath(pathname)
    const directRedirect = LEGACY_REDIRECTS[normalized]
    if (directRedirect) return directRedirect

    const legacyAgentMatches = normalized.match(/^\/omni\/agents\/([^/]+)\/([^/]+)$/)
    if (legacyAgentMatches && AGENT_TABS.has(legacyAgentMatches[2])) {
        return `/omni/app/agents/${legacyAgentMatches[1]}/${legacyAgentMatches[2]}`
    }

    return null
}

export function resolveOmniAppPage(pathname: string) {
    const normalized = normalizePath(pathname)
    const direct = PAGE_DEFINITIONS[normalized]
    if (direct) {
        return { path: normalized, ...direct } satisfies OmniAppPageDefinition
    }

    return buildAgentDetailPage(normalized)
}

export function isKnownOmniAppPage(pathname: string) {
    return Boolean(resolveOmniAppPage(pathname))
}

export function getOmniAppPageIcon(pathname: string): LucideIcon {
    return resolveOmniAppPage(pathname)?.icon || LayoutDashboard
}
