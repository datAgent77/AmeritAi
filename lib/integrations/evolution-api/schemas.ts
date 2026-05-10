import { z } from "zod"

export const EvolutionApiConnectSchema = z.object({
    chatbotId: z.string().min(1),
    baseUrl: z.string().url(),
    apiKey: z.string().optional(),
    instanceName: z.string().min(1).max(80),
    phoneNumber: z.string().max(32).optional(),
    createInstance: z.boolean().optional(),
})

export const EvolutionApiActionSchema = z.object({
    chatbotId: z.string().min(1),
})

export const EvolutionApiTestMessageSchema = z.object({
    chatbotId: z.string().min(1),
    to: z.string().min(1),
    text: z.string().min(1).max(1000).optional(),
})
