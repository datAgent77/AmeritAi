import { z } from "zod"

export const WhatsAppBizConnectSchema = z.object({
    chatbotId: z.string().min(1),
    returnPath: z.string().optional(),
    appId: z.string().optional(),
    appSecret: z.string().optional(),
})

export const WhatsAppBizSaveChannelSchema = z.object({
    chatbotId: z.string().min(1),
    wabaId: z.string().min(1),
    phoneNumberId: z.string().min(1),
    displayNumber: z.string().optional(),
})

export const WhatsAppBizTestMessageSchema = z.object({
    chatbotId: z.string().min(1),
    to: z.string().min(1),
    text: z.string().min(1).max(1000).optional(),
})
