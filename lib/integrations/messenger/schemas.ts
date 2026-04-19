import { z } from "zod"

export const MessengerDMConnectSchema = z.object({
    chatbotId: z.string().min(1),
    returnPath: z.string().optional(),
    appId: z.string().optional(),
    appSecret: z.string().optional(),
})

export const MessengerDMSaveChannelSchema = z.object({
    chatbotId: z.string().min(1),
    pageId: z.string().min(1),
    pageName: z.string().min(1),
})

export const MessengerDMTestMessageSchema = z.object({
    chatbotId: z.string().min(1),
    recipientId: z.string().min(1),
    text: z.string().min(1).max(1000).optional(),
})
