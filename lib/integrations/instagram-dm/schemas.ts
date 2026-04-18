import { z } from "zod"

export const InstagramDMConnectSchema = z.object({
    chatbotId: z.string().min(1),
    returnPath: z.string().optional(),
})

export const InstagramDMSaveChannelSchema = z.object({
    chatbotId: z.string().min(1),
    pageId: z.string().min(1),
    pageName: z.string().min(1),
    instagramAccountId: z.string().min(1),
    instagramUsername: z.string().optional(),
})

export const InstagramDMTestMessageSchema = z.object({
    chatbotId: z.string().min(1),
    recipientId: z.string().min(1),
    text: z.string().min(1).max(1000).optional(),
})
