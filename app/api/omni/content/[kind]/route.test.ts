import { beforeEach, describe, expect, test, vi } from "vitest"
import { GET, POST } from "./route"
import { authorizeOmniContentAdminRequest, createCmsContent, listCmsContent } from "@/lib/omni/content-admin"

vi.mock("@/lib/omni/content-admin", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/content-admin")>("@/lib/omni/content-admin")
    return {
        ...actual,
        authorizeOmniContentAdminRequest: vi.fn(),
        listCmsContent: vi.fn(),
        createCmsContent: vi.fn(),
    }
})

describe("/api/omni/content/[kind]", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test("GET returns content items for supported kind", async () => {
        vi.mocked(authorizeOmniContentAdminRequest).mockResolvedValue({ ok: true } as any)
        vi.mocked(listCmsContent).mockResolvedValue([
            {
                id: "blog-1",
                slug: "hello-world",
                title: { en: "Hello", tr: "Merhaba" },
                excerpt: { en: "Excerpt", tr: "Özet" },
                content: { en: "Body", tr: "Gövde" },
                category: "AI",
                date: "2026-03-28",
                readTime: "5 min",
                published: true,
            },
        ] as any)

        const response = await GET(new Request("https://example.com/api/omni/content/blog"), {
            params: Promise.resolve({ kind: "blog" }),
        })

        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.items).toHaveLength(1)
        expect(listCmsContent).toHaveBeenCalledWith("blog")
    })

    test("POST creates a content item", async () => {
        vi.mocked(authorizeOmniContentAdminRequest).mockResolvedValue({ ok: true } as any)
        vi.mocked(createCmsContent).mockResolvedValue({
            id: "faq-1",
            question: { en: "How?", tr: "Nasıl?" },
            answer: { en: "Like this", tr: "Böyle" },
            category: "General",
            order: 1,
        } as any)

        const response = await POST(
            new Request("https://example.com/api/omni/content/faq", {
                method: "POST",
                body: JSON.stringify({
                    question: { en: "How?", tr: "Nasıl?" },
                    answer: { en: "Like this", tr: "Böyle" },
                    category: "General",
                    order: 1,
                }),
            }),
            { params: Promise.resolve({ kind: "faq" }) }
        )

        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.item.id).toBe("faq-1")
        expect(createCmsContent).toHaveBeenCalledWith("faq", expect.any(Object))
    })

    test("returns 400 for unsupported content kind", async () => {
        const response = await GET(new Request("https://example.com/api/omni/content/unknown"), {
            params: Promise.resolve({ kind: "unknown" }),
        })

        expect(response.status).toBe(400)
    })
})
