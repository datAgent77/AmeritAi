export type CmsLocalizedText = {
    en: string
    tr: string
}

export type CmsContentKind = "blog" | "faq" | "education"

export interface CmsBlogPost {
    id?: string
    slug: string
    title: CmsLocalizedText
    excerpt: CmsLocalizedText
    content: CmsLocalizedText
    category: string
    date: string
    readTime: string
    published?: boolean
    image?: string | null
    author?: {
        name: string
        avatar?: string | null
    } | null
    createdAt?: string | null
    updatedAt?: string | null
}

export interface CmsFaqItem {
    id?: string
    question: CmsLocalizedText
    answer: CmsLocalizedText
    category: string
    order: number
    published?: boolean
    createdAt?: string | null
    updatedAt?: string | null
}

export interface CmsEducationItem {
    id?: string
    title: CmsLocalizedText
    description: CmsLocalizedText
    type: "video" | "article" | "guide"
    url?: string | null
    published?: boolean
    createdAt?: string | null
    updatedAt?: string | null
}

export type CmsContentItem = CmsBlogPost | CmsFaqItem | CmsEducationItem

export const CMS_COLLECTIONS: Record<CmsContentKind, string> = {
    blog: "cms_blog",
    faq: "cms_faq",
    education: "cms_education",
}

export const DEFAULT_EDUCATION_ITEMS: CmsEducationItem[] = [
    {
        title: {
            en: "Omni-Channel rollout checklist",
            tr: "Omni-Channel yayına alma checklist'i",
        },
        description: {
            en: "Step-by-step checklist for public URL, webhook wiring, smoke tests, and operator readiness.",
            tr: "Public URL, webhook bağlantıları, smoke test ve operasyon hazırlığı için adım adım checklist.",
        },
        type: "guide",
        url: "https://docs.vion.ai/omni-rollout",
    },
    {
        title: {
            en: "Voice operations quick training",
            tr: "Voice operasyonları hızlı eğitim",
        },
        description: {
            en: "Short operator guide for callback queue, test calls, and voice dispositions.",
            tr: "Callback queue, test call ve voice disposition yönetimi için kısa operatör eğitimi.",
        },
        type: "video",
        url: "https://docs.vion.ai/voice-ops-training",
    },
    {
        title: {
            en: "Messaging support playbook",
            tr: "Messaging support playbook",
        },
        description: {
            en: "Internal playbook for WhatsApp and Instagram DM reply standards, escalation, and lead capture.",
            tr: "WhatsApp ve Instagram DM cevap standartları, escalation ve lead capture için iç playbook.",
        },
        type: "article",
        url: "https://docs.vion.ai/messaging-playbook",
    },
]

function ensureLocalizedText(value: any): CmsLocalizedText {
    if (value && typeof value === "object") {
        return {
            en: typeof value.en === "string" ? value.en : "",
            tr: typeof value.tr === "string" ? value.tr : "",
        }
    }

    const fallback = typeof value === "string" ? value : ""
    return { en: fallback, tr: fallback }
}

function toIsoDateTime(value: unknown) {
    if (!value) return null

    if (value instanceof Date) {
        return value.toISOString()
    }

    if (typeof value === "string" || typeof value === "number") {
        const date = new Date(value)
        return Number.isNaN(date.getTime()) ? null : date.toISOString()
    }

    if (typeof (value as any)?.toDate === "function") {
        return (value as any).toDate().toISOString()
    }

    if (typeof (value as any)?._seconds === "number") {
        return new Date((value as any)._seconds * 1000).toISOString()
    }

    if (typeof (value as any)?.seconds === "number") {
        return new Date((value as any).seconds * 1000).toISOString()
    }

    return null
}

function toIsoDate(value: unknown) {
    const date = value ? new Date(value as string) : null
    if (!date || Number.isNaN(date.getTime())) {
        return new Date().toISOString().slice(0, 10)
    }
    return date.toISOString().slice(0, 10)
}

export function normalizeCmsItem(kind: CmsContentKind, item: any): CmsContentItem {
    const base = {
        id: item?.id ? String(item.id) : undefined,
        createdAt: toIsoDateTime(item?.createdAt),
        updatedAt: toIsoDateTime(item?.updatedAt),
    }

    if (kind === "blog") {
        return {
            ...base,
            slug: String(item?.slug || ""),
            title: ensureLocalizedText(item?.title),
            excerpt: ensureLocalizedText(item?.excerpt),
            content: ensureLocalizedText(item?.content),
            category: String(item?.category || ""),
            date: toIsoDate(item?.date),
            readTime: String(item?.readTime || ""),
            published: item?.published !== false,
            image: item?.image ? String(item.image) : null,
            author: item?.author
                ? {
                      name: String(item.author.name || "Vion AI Team"),
                      avatar: item.author.avatar ? String(item.author.avatar) : null,
                  }
                : { name: "Vion AI Team", avatar: "VA" },
        }
    }

    if (kind === "faq") {
        return {
            ...base,
            question: ensureLocalizedText(item?.question),
            answer: ensureLocalizedText(item?.answer),
            category: String(item?.category || ""),
            order: Number.isFinite(Number(item?.order)) ? Number(item.order) : 0,
            published: item?.published !== false,
        }
    }

    return {
        ...base,
        title: ensureLocalizedText(item?.title),
        description: ensureLocalizedText(item?.description),
        type: item?.type === "video" || item?.type === "article" || item?.type === "guide" ? item.type : "guide",
        url: item?.url ? String(item.url) : null,
        published: item?.published !== false,
    }
}

export function sortCmsItems(kind: CmsContentKind, items: CmsContentItem[]) {
    return items.slice().sort((left, right) => {
        if (kind === "blog") {
            return String((right as CmsBlogPost).date || "").localeCompare(String((left as CmsBlogPost).date || ""))
        }
        if (kind === "faq") {
            return Number((left as CmsFaqItem).order || 0) - Number((right as CmsFaqItem).order || 0)
        }
        return String((left as CmsEducationItem).title?.en || "").localeCompare(String((right as CmsEducationItem).title?.en || ""))
    })
}

export function getDefaultCmsSeed(kind: CmsContentKind) {
    if (kind === "education") {
        return DEFAULT_EDUCATION_ITEMS
    }
    return []
}
