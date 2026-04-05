import { beforeEach, describe, expect, test, vi } from "vitest"
import { DELETE, GET, POST } from "./route"
import { authorizeTargetAccess } from "@/lib/api-auth"
import { getAdminDb } from "@/lib/firebase-admin"

vi.mock("@/lib/api-auth", () => ({
    authorizeTargetAccess: vi.fn(),
}))

vi.mock("@/lib/firebase-admin", () => ({
    getAdminDb: vi.fn(),
}))

function createAdminDb(initialSkills?: Array<Record<string, unknown>>) {
    const store = new Map<string, Record<string, unknown>>(
        (initialSkills || []).map((skill) => [String(skill.id), skill])
    )

    return {
        collection: vi.fn().mockImplementation((name: string) => {
            if (name !== "guided_skills") {
                throw new Error(`Unexpected collection: ${name}`)
            }

            return {
                where: vi.fn().mockImplementation((field: string, _op: string, value: unknown) => ({
                    get: vi.fn().mockResolvedValue({
                        docs: Array.from(store.entries())
                            .filter(([, doc]) => doc[field] === value)
                            .map(([id, doc]) => ({
                                id,
                                data: () => doc,
                            })),
                    }),
                })),
                doc: vi.fn().mockImplementation((id: string) => ({
                    get: vi.fn().mockResolvedValue({
                        exists: store.has(id),
                        data: () => store.get(id),
                    }),
                    set: vi.fn().mockImplementation(async (value: Record<string, unknown>) => {
                        store.set(id, value)
                    }),
                    delete: vi.fn().mockImplementation(async () => {
                        store.delete(id)
                    }),
                })),
            }
        }),
    }
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authorizeTargetAccess).mockResolvedValue({
        ok: true,
        actorUid: "tenant-1",
        isAgencyAdmin: false,
        isSuperAdmin: false,
    } as any)
})

describe("/api/guided-skills", () => {
    test("lists tenant guided skills", async () => {
        vi.mocked(getAdminDb).mockReturnValue(
            createAdminDb([
                {
                    id: "skill-1",
                    chatbotId: "tenant-1",
                    title: "Flight operations",
                    enabled: true,
                    channels: ["web"],
                    startStepId: "step-1",
                    startAliases: ["flight"],
                    steps: [
                        {
                            id: "step-1",
                            prompt: "Hello",
                            presentation: "chips",
                            options: [{ id: "option-1", label: "Start", aliases: [] }],
                        },
                    ],
                },
            ]) as any
        )

        const response = await GET(new Request("http://localhost/api/guided-skills?chatbotId=tenant-1"))

        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.skills).toHaveLength(1)
        expect(payload.skills[0]).toEqual(
            expect.objectContaining({
                id: "skill-1",
                title: "Flight operations",
            })
        )
    })

    test("upserts a guided skill", async () => {
        vi.mocked(getAdminDb).mockReturnValue(createAdminDb() as any)

        const response = await POST(
            new Request("http://localhost/api/guided-skills", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    chatbotId: "tenant-1",
                    skill: {
                        id: "skill-1",
                        title: "Flight operations",
                        enabled: true,
                        channels: ["web", "whatsapp"],
                        startStepId: "step-1",
                        startAliases: ["flight"],
                        steps: [
                            {
                                id: "step-1",
                                prompt: "What do you need?",
                                presentation: "chips",
                                options: [
                                    {
                                        id: "option-1",
                                        label: "Check-in",
                                        aliases: ["checkin"],
                                    },
                                ],
                            },
                        ],
                    },
                }),
            })
        )

        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.skill).toEqual(
            expect.objectContaining({
                id: "skill-1",
                chatbotId: "tenant-1",
                title: "Flight operations",
                channels: ["web", "whatsapp"],
            })
        )
    })

    test("deletes a guided skill", async () => {
        vi.mocked(getAdminDb).mockReturnValue(
            createAdminDb([
                {
                    id: "skill-1",
                    chatbotId: "tenant-1",
                    title: "Delete me",
                    enabled: true,
                    channels: ["web"],
                    startStepId: "step-1",
                    startAliases: [],
                    steps: [
                        {
                            id: "step-1",
                            prompt: "Hello",
                            presentation: "chips",
                            options: [{ id: "option-1", label: "Start", aliases: [] }],
                        },
                    ],
                },
            ]) as any
        )

        const response = await DELETE(
            new Request("http://localhost/api/guided-skills", {
                method: "DELETE",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    chatbotId: "tenant-1",
                    id: "skill-1",
                }),
            })
        )

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({ ok: true })
    })
})
