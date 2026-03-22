import { formatDistanceToNowStrict } from "date-fns"
import { enUS, tr } from "date-fns/locale"
import type { ModuleId } from "@/lib/modules-registry"
import type {
  V2CapabilityGroup,
  V2ConversationSummary,
  V2PersonRecord,
  V2UsageSnapshot,
} from "@/lib/v2/types"

export function getV2CapabilityGroups(isTr: boolean): V2CapabilityGroup[] {
  return [
    {
      id: "commerce",
      title: isTr ? "Commerce" : "Commerce",
      description: isTr ? "Satış ve servis odaklı yetenekler" : "Sales and service oriented capabilities",
      moduleIds: ["productCatalog", "salesOptimization", "digitalWaiter"],
    },
    {
      id: "automation",
      title: isTr ? "Automation" : "Automation",
      description: isTr ? "Etkileşim, kampanya ve oyunlaştırma" : "Engagement, campaign, and gamification tools",
      moduleIds: ["proactiveMessaging", "campaignManager", "gamification"],
    },
    {
      id: "context",
      title: isTr ? "Context" : "Context",
      description: isTr ? "Veri ve görsel zeka katmanı" : "Data and visual intelligence layer",
      moduleIds: ["dynamicContext", "visualDiagnosis"],
    },
  ]
}

export function toV2ConversationSummaries(
  sessions: Array<{
    id: string
    lastMessage?: string
    lastMessageTime?: string | number | Date | null
    isPaused?: boolean
  }>,
  language: "tr" | "en"
): V2ConversationSummary[] {
  const locale = language === "tr" ? tr : enUS
  return sessions.map((session) => {
    const ts = session.lastMessageTime ? new Date(session.lastMessageTime) : null
    const channel = session.id.startsWith("telegram-")
      ? "Telegram"
      : session.id.startsWith("whatsapp-")
        ? "WhatsApp"
        : "Web Widget"

    return {
      id: session.id,
      title: session.id.startsWith("telegram-")
        ? "Telegram User"
        : session.id.startsWith("whatsapp-")
          ? `+${session.id.split("-")[2] || ""}`
          : "Web Visitor",
      preview: session.lastMessage || (language === "tr" ? "Henüz mesaj yok" : "No messages yet"),
      channel,
      timestampLabel: ts && !Number.isNaN(ts.getTime())
        ? formatDistanceToNowStrict(ts, { addSuffix: true, locale })
        : "",
      paused: Boolean(session.isPaused),
    }
  })
}

export function toV2PersonRecords(
  leads: Array<{
    id: string
    name?: string
    email?: string
    phone?: string
    source?: string
    createdAt?: string
    customFields?: Record<string, string>
  }>
): V2PersonRecord[] {
  return leads.map((lead) => ({
    id: lead.id,
    name: lead.name || "Unknown",
    email: lead.email,
    phone: lead.phone,
    source: lead.source,
    createdAtLabel: lead.createdAt ? new Date(lead.createdAt).toLocaleString() : undefined,
    fields: lead.customFields,
  }))
}

export function toV2UsageSnapshot(input: {
  totalConversations?: number
  totalMessages?: number
  leadsCount?: number
  conversionRate?: number
} | null | undefined, language: "tr" | "en"): V2UsageSnapshot {
  const totalConversations = input?.totalConversations || 0
  const totalMessages = input?.totalMessages || 0
  const leadsCount = input?.leadsCount || 0
  const conversionRate = input?.conversionRate || 0

  return {
    headline: language === "tr" ? "Kullanım özeti" : "Usage snapshot",
    subline: language === "tr" ? "Son dönem performansı" : "Recent performance",
    items: [
      {
        label: language === "tr" ? "Sohbetler" : "Conversations",
        value: totalConversations.toLocaleString(),
      },
      {
        label: language === "tr" ? "Mesajlar" : "Messages",
        value: totalMessages.toLocaleString(),
      },
      {
        label: language === "tr" ? "Lead" : "Leads",
        value: leadsCount.toLocaleString(),
      },
      {
        label: language === "tr" ? "Dönüşüm" : "Conversion",
        value: `${conversionRate}%`,
      },
    ],
  }
}

export function getStructuredSourceModules(): Record<string, ModuleId> {
  return {
    dynamicContext: "dynamicContext",
    catalog: "productCatalog",
    menu: "digitalWaiter",
  }
}
