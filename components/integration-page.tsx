"use client"

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Copy, ExternalLink, Check, MessageCircle, Send, Loader2, ArrowLeft, Search, Plus, BookOpen, MessageSquare, Hash, Link2, Globe, Code2, Calendar, ShoppingCart, Mail, Building2, Lock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { getPlan } from "@/lib/pricing-config"
import { hasIntegrationAccess, getIntegrationMinPlan, INTEGRATION_ACCESS } from "@/lib/integration-access-config"
import { PricingModal } from "@/components/pricing-modal"
import { InstagramDMWizard } from "@/components/integrations/instagram-dm/InstagramDMWizard"
import { WhatsAppBizWizard } from "@/components/integrations/whatsapp-business/WhatsAppBizWizard"
import { MessengerWizard } from "@/components/integrations/messenger/MessengerWizard"
import { EvolutionApiIntegrationPanel } from "@/components/integrations/evolution-api/EvolutionApiIntegrationPanel"
import { EcommerceConnectionForm } from "@/components/integrations/ecommerce/EcommerceConnectionForm"
import { EcommercePlatformCard } from "@/components/integrations/ecommerce/EcommercePlatformCard"
import { MobileSupportIntegrationPanel } from "@/components/integrations/mobile-support/MobileSupportIntegrationPanel"
import { PLATFORM_META } from "@/lib/integrations/ecommerce/platform-registry"
import type { EcomConnection, EcomPlatform } from "@/lib/integrations/ecommerce/types"
import { ZOHO_REGIONS, ZOHO_DEFAULT_REGION, type ZohoRegion } from "@/lib/integrations/zoho/config"

interface IntegrationPageProps {
    userId: string
}

interface Integration {
    id: string
    name: string
    description: string
    icon?: React.ReactNode
    logo?: string
    iconBg: string
    features?: string[]
    connected?: boolean
    connectedInfo?: string
    category?: "embed" | "messaging" | "ecommerce" | "crm" | "calendar" | "email" | "api" | "all"
}

const HIDDEN_INTEGRATION_IDS = new Set([
    // legacy / not part of the US launch surface
    "slack",
    "salesforce",
    "mailchimp",
    "sendgrid",
    "constant-contact",
    "meta-channels",
    // hidden for US launch (keep only the curated set below)
    "iframe",
    "direct-link",
    "mobile-app-api",
    "ticket-webhook",
    "telegram",
    "evolution-api",
    "zoho-crm",
    // Turkey-only e-commerce platforms
    "ikas",
    "ideasoft",
    "ticimax",
    "tsoft",
    "woocommerce",
])
// Visible after filtering: website, wordpress, messenger, instagram,
// whatsapp, google-calendar, outlook-calendar, shopify

export default function IntegrationPage({ userId }: IntegrationPageProps) {
    const { toast } = useToast()
    const { t, language } = useLanguage()
    const { user, planId, role } = useAuth()
    const [origin, setOrigin] = useState("")
    const [brandColor, setBrandColor] = useState("#000000")
    const [copied, setCopied] = useState<string | null>(null)
    const [settings, setSettings] = useState<any>(null)
    const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [metaWizardStatus, setMetaWizardStatus] = useState<any>(null)
    const [evolutionApiStatus, setEvolutionApiStatus] = useState<any>(null)
    const [directShortCode, setDirectShortCode] = useState("")
    const [isDirectShortLinkLoading, setIsDirectShortLinkLoading] = useState(false)
    
    // Plan access state
    const [showUpgradeModal, setShowUpgradeModal] = useState(false)
    const [upgradeTargetIntegration, setUpgradeTargetIntegration] = useState<string | null>(null)
    
    // Get current plan sortOrder
    const currentPlanConfig = getPlan(planId)
    const currentPlanSortOrder = currentPlanConfig?.sortOrder ?? 1

    // Telegram State
    const [telegramToken, setTelegramToken] = useState("")
    const [isConnectingTelegram, setIsConnectingTelegram] = useState(false)
    const [telegramConnected, setTelegramConnected] = useState(false)
    const [telegramBotName, setTelegramBotName] = useState("")
    const [isTelegramDialogOpen, setIsTelegramDialogOpen] = useState(false)

    // Slack State
    const [isSlackOpen, setIsSlackOpen] = useState(false)
    const [slackBotToken, setSlackBotToken] = useState("")
    const [slackSigningSecret, setSlackSigningSecret] = useState("")
    const [isConnectingSlack, setIsConnectingSlack] = useState(false)
    const [slackConnected, setSlackConnected] = useState(false)
    const [slackTeamName, setSlackTeamName] = useState("")

    // Salesforce State
    const [salesforceClientId, setSalesforceClientId] = useState("")
    const [salesforceClientSecret, setSalesforceClientSecret] = useState("")
    const [salesforceUsername, setSalesforceUsername] = useState("")
    const [salesforcePassword, setSalesforcePassword] = useState("")
    const [salesforceSecurityToken, setSalesforceSecurityToken] = useState("")
    const [isConnectingSalesforce, setIsConnectingSalesforce] = useState(false)
    const [salesforceConnected, setSalesforceConnected] = useState(false)

    // Zoho CRM State
    const [zohoRegion, setZohoRegion] = useState<ZohoRegion>(ZOHO_DEFAULT_REGION)
    const [isConnectingZoho, setIsConnectingZoho] = useState(false)
    const [zohoConnected, setZohoConnected] = useState(false)
    const [zohoConnectedRegion, setZohoConnectedRegion] = useState<ZohoRegion | null>(null)

    // Google Calendar State
    const [isConnectingGoogleCalendar, setIsConnectingGoogleCalendar] = useState(false)
    const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false)

    // Outlook Calendar State
    const [isConnectingOutlookCalendar, setIsConnectingOutlookCalendar] = useState(false)
    const [outlookCalendarConnected, setOutlookCalendarConnected] = useState(false)

    // Shopify State
    const [shopifyShopDomain, setShopifyShopDomain] = useState("")
    const [shopifyApiKey, setShopifyApiKey] = useState("")
    const [shopifyApiSecret, setShopifyApiSecret] = useState("")
    const [isConnectingShopify, setIsConnectingShopify] = useState(false)
    const [shopifyConnected, setShopifyConnected] = useState(false)

    // Mailchimp State
    const [mailchimpApiKey, setMailchimpApiKey] = useState("")
    const [mailchimpServerPrefix, setMailchimpServerPrefix] = useState("")
    const [mailchimpListId, setMailchimpListId] = useState("")
    const [isConnectingMailchimp, setIsConnectingMailchimp] = useState(false)
    const [mailchimpConnected, setMailchimpConnected] = useState(false)

    // SendGrid State
    const [sendgridApiKey, setSendgridApiKey] = useState("")
    const [sendgridFromEmail, setSendgridFromEmail] = useState("")
    const [isConnectingSendgrid, setIsConnectingSendgrid] = useState(false)
    const [sendgridConnected, setSendgridConnected] = useState(false)

    // Constant Contact State
    const [constantContactApiKey, setConstantContactApiKey] = useState("")
    const [constantContactApiSecret, setConstantContactApiSecret] = useState("")
    const [isConnectingConstantContact, setIsConnectingConstantContact] = useState(false)
    const [constantContactConnected, setConstantContactConnected] = useState(false)

    const [ecomConnections, setEcomConnections] = useState<EcomConnection[]>([])
    const [ecomConnectingPlatform, setEcomConnectingPlatform] = useState<EcomPlatform | null>(null)

    const whatsAppConnected = settings?.integrations?.whatsapp?.connected
    const waWebhookSecret = settings?.integrations?.whatsapp?.webhookSecret
    const instagramConnected = settings?.integrations?.instagram?.connected
    const igWebhookSecret = settings?.integrations?.instagram?.webhookSecret

    const getAuthHeaders = async () => {
        if (!user) {
            throw new Error(t('unauthorized') || "Unauthorized")
        }

        const token = await user.getIdToken()
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        }
    }


    // Only our actual integrations
    const integrations: Integration[] = [
        {
            id: "meta-channels",
            name: "Meta Channels",
            description: "Manage the Instagram DM, WhatsApp Business, and Facebook Messenger channels with separate setup wizards.",
            icon: <MessageCircle className="h-6 w-6 text-gray-900" />,
            iconBg: "bg-gray-100",
            connected: Boolean(
                metaWizardStatus?.instagramDM?.config?.state === "connected" ||
                metaWizardStatus?.whatsappBusiness?.config?.state === "connected" ||
                (metaWizardStatus as any)?.messengerDM?.config?.state === "connected"
            ),
            features: [
                "Separate guided steps for Instagram DM",
                "Dedicated popup flow for WhatsApp Business",
                "Facebook Messenger DM integration",
                "Independent error handling for each channel",
            ],
        },
        {
            id: "website",
            name: t('websiteWidget'),
            description: t('widgetScriptDescription'),
            icon: <MessageSquare className="h-6 w-6 text-gray-900" />,
            iconBg: "bg-gray-100",
            features: [
                t('widgetAppear'),
                t('copyCode'),
                t('pasteCode')
            ]
        },
        {
            id: "iframe",
            name: t('iframeEmbed'),
            description: t('iframeEmbedDescription'),
            icon: <Code2 className="h-6 w-6 text-gray-900" />,
            iconBg: "bg-gray-100",
            features: [
                t('copyIframeCode'),
                t('pasteIframeCode'),
                t('adjustAttributes')
            ]
        },
        {
            id: "direct-link",
            name: t('directLink'),
            description: t('directLinkDescription'),
            icon: <Link2 className="h-6 w-6 text-gray-900" />,
            iconBg: "bg-gray-100",
            features: [
                t('shareLink')
            ]
        },
        {
            id: "mobile-app-api",
            name: language === "tr" ? "Mobile App / API" : "Mobile App / API",
            description: language === "tr"
                ? "Native mobil uygulamanızdan AmeritAI destek asistanına güvenli mesaj ve context gönderin."
                : "Send secure messages and context from your native mobile app to the AmeritAI support assistant.",
            icon: <Code2 className="h-6 w-6 text-gray-900" />,
            iconBg: "bg-gray-100",
            connected: settings?.integrations?.mobileApp?.enabled === true,
            connectedInfo: settings?.integrations?.mobileApp?.environment,
            category: "api",
            features: [
                language === "tr" ? "API-first mobil destek asistanı" : "API-first mobile support assistant",
                language === "tr" ? "Client token ve allowed app id kontrolü" : "Client token and allowed app id controls",
                language === "tr" ? "Sipariş, sepet ve müşteri context payload örneği" : "Order, cart, and customer context payload sample",
            ],
        },
        {
            id: "ticket-webhook",
            name: language === "tr" ? "Ticket Webhook" : "Ticket Webhook",
            description: language === "tr"
                ? "Çözülemeyen mobil destek konuşmalarını müşterinin kendi ticket sistemine gönderin."
                : "Send unresolved mobile support conversations to the customer's ticket system.",
            icon: <Send className="h-6 w-6 text-gray-900" />,
            iconBg: "bg-gray-100",
            connected: settings?.integrations?.ticketWebhook?.enabled === true,
            connectedInfo: settings?.integrations?.ticketWebhook?.connected ? "Tested" : undefined,
            category: "api",
            features: [
                language === "tr" ? "Generic support_ticket.create webhook event'i" : "Generic support_ticket.create webhook event",
                language === "tr" ? "Bearer veya API key header desteği" : "Bearer or API key header support",
                language === "tr" ? "Test ticket gönderimi ve retry için pending kayıt" : "Test ticket sending and pending records for retry",
            ],
        },
        {
            id: "wordpress",
            name: t('wordpress'),
            description: t('wordpressDescription'),
            logo: "/integrations/wordpress.svg",
            iconBg: "bg-gray-100",
            features: [
                t('wordpressInstructions')?.split('\n')[0] || t('installPlugin'),
            ]
        },
        {
            id: "telegram",
            name: t('telegramName') || "Telegram",
            description: t('telegramDescription'),
            logo: "/integrations/telegram.svg",
            iconBg: "bg-gray-100",
            connected: telegramConnected,
            connectedInfo: telegramBotName,
            features: [
                t('botTokenHelp')
            ]
        },
        {
            id: "whatsapp",
            name: "WhatsApp Business",
            description: "Connect your WhatsApp Business account with a dedicated setup wizard and manage the message flow.",
            logo: "/integrations/whatsapp.svg",
            iconBg: "bg-gray-100",
            connected: metaWizardStatus?.whatsappBusiness?.config?.state === "connected",
            connectedInfo: metaWizardStatus?.whatsappBusiness?.config?.displayNumber || undefined,
            features: [
                "Guided setup with embedded signup",
                "Phone number and webhook status check",
                "Test message and reconnection flow",
            ]
        },
        {
            id: "evolution-api",
            name: "Evolution API WhatsApp",
            description: "Set up a fast QR-based connection while keeping the WhatsApp Business app on your phone.",
            logo: "/integrations/whatsapp.svg",
            iconBg: "bg-gray-100",
            connected: evolutionApiStatus?.config?.enabled === true,
            connectedInfo: evolutionApiStatus?.config?.connectionState === "open" ? "QR bağlı" : evolutionApiStatus?.config?.instanceName || undefined,
            features: [
                "QR-linked device experience",
                "Evolution instance and webhook setup",
                "Inbound message flow to the AmeritAI chat screen",
                "Unofficial quick-connect mode",
            ],
        },
        {
            id: "messenger",
            name: "Facebook Messenger",
            description: "Automatically reply to Messenger messages sent to your Facebook page.",
            icon: <MessageCircle className="h-6 w-6 text-blue-600" />,
            iconBg: "bg-blue-50",
            connected: (metaWizardStatus as any)?.messengerDM?.config?.state === "connected",
            connectedInfo: (metaWizardStatus as any)?.messengerDM?.config?.pageName || undefined,
            features: [
                "Messenger DM flow from your Facebook page",
                "Secure authorization via OAuth",
                "Test message and webhook status check",
            ]
        },
        {
            id: "slack",
            name: t('slackName') || "Slack",
            description: t('slackDescription'),
            logo: "/integrations/slack.svg",
            iconBg: "bg-gray-100",
            connected: slackConnected,
            connectedInfo: slackTeamName,
        },
        {
            id: "salesforce",
            name: t('salesforce') || "Salesforce",
            description: t('salesforceDescription'),
            logo: "/integrations/salesforce.svg",
            iconBg: "bg-gray-100",
            connected: salesforceConnected,
        },
        {
            id: "zoho-crm",
            name: t('zohoCRM') || "Zoho CRM",
            description: t('zohoCRMDescription') || "Push leads captured by your chatbot into your Zoho CRM account.",
            logo: "/integrations/zoho-crm.svg",
            iconBg: "bg-gray-100",
            connected: zohoConnected,
            connectedInfo: zohoConnectedRegion ? `.${zohoConnectedRegion}` : undefined,
        },
        {
            id: "google-calendar",
            name: t('googleCalendar') || "Google Calendar",
            description: t('googleCalendarDescription'),
            logo: "/integrations/google-calendar.svg",
            iconBg: "bg-gray-100",
            connected: googleCalendarConnected,
        },
        {
            id: "outlook-calendar",
            name: t('outlookCalendar') || "Outlook Calendar",
            description: t('outlookCalendarDescription'),
            logo: "/integrations/outlook.svg",
            iconBg: "bg-gray-100",
            connected: outlookCalendarConnected,
        },
        {
            id: "mailchimp",
            name: t('mailchimp') || "Mailchimp",
            description: t('mailchimpDescription'),
            logo: "/integrations/mailchimp.svg",
            iconBg: "bg-gray-100",
            connected: mailchimpConnected,
        },
        {
            id: "sendgrid",
            name: t('sendgrid') || "SendGrid",
            description: t('sendgridDescription'),
            logo: "/integrations/sendgrid.svg",
            iconBg: "bg-gray-100",
            connected: sendgridConnected,
        },
        {
            id: "constant-contact",
            name: t('constantContact') || "Constant Contact",
            description: t('constantContactDescription'),
            logo: "/integrations/constant-contact.svg",
            iconBg: "bg-gray-100",
            connected: constantContactConnected,
        },
        {
            id: "instagram",
            name: "Instagram DM (Resmi Meta)",
            description: "Connect your Instagram Professional account to AmeritAI via official Meta OAuth, Page selection, and webhook flow.",
            logo: "/integrations/instagram.svg",
            iconBg: "bg-gray-100",
            connected: metaWizardStatus?.instagramDM?.config?.state === "connected",
            connectedInfo:
                metaWizardStatus?.instagramDM?.config?.instagramUsername ||
                metaWizardStatus?.instagramDM?.config?.pageName ||
                undefined,
            features: [
                "Professional account and Facebook Page pre-check",
                "Permission and Page selection via Meta OAuth",
                "Instagram Messaging API webhook flow",
                "Incoming DM logging to the Omni Inbox",
                "Reply via the official API from the panel",
            ],
        },
    ]

    const ecomIntegrations: Integration[] = Object.values(PLATFORM_META).map(meta => {
        const connection = ecomConnections.find(c => c.platform === meta.id)
        return {
            id: meta.id,
            name: meta.name,
            description: `Connect your ${meta.name} store. Products and orders sync automatically.`,
            logo: meta.logoUrl,
            iconBg: "bg-gray-100",
            connected: !!connection,
            connectedInfo: connection?.storeName,
            category: "ecommerce"
        }
    })

    const allIntegrations = [...integrations, ...ecomIntegrations].map(i => {
        if (!i.category) {
            if (["meta-channels", "telegram", "whatsapp", "evolution-api", "instagram"].includes(i.id)) i.category = "messaging"
            else if (["website", "iframe", "direct-link", "wordpress"].includes(i.id)) i.category = "embed"
            else if (["mobile-app-api", "ticket-webhook"].includes(i.id)) i.category = "api"
            else if (["slack", "salesforce", "zoho-crm"].includes(i.id)) i.category = "crm"
            else if (["google-calendar", "outlook-calendar"].includes(i.id)) i.category = "calendar"
            else if (["mailchimp", "sendgrid", "constant-contact"].includes(i.id)) i.category = "email"
            else i.category = "all"
        }
        return i
    })

    const handleConnectSlack = async () => {
        if (!slackBotToken || !slackSigningSecret) {
            toast({ title: t('error'), description: t('fillAllFields'), variant: "destructive" })
            return
        }
        setIsConnectingSlack(true)
        try {
            const response = await fetch("/api/integrations/slack/connect", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({ userId, botToken: slackBotToken, signingSecret: slackSigningSecret })
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || t('failedToConnectSlack') || "Failed to connect Slack")
            setSlackConnected(true)
            setSlackTeamName(data.team)
            toast({ title: t('success'), description: t('connected') })
            setIsSlackOpen(false)
            setSlackBotToken("")
            setSlackSigningSecret("")
            const res = await fetch(`/api/console/settings?chatbotId=${userId}`, { headers: await getAuthHeaders() })
            if (res.ok) {
                const data = await res.json()
                setSettings(data)
            }
        } catch (error: any) {
            toast({ title: t('error'), description: error.message, variant: "destructive" })
        } finally {
            setIsConnectingSlack(false)
        }
    }

    const handleConnectTelegram = async () => {
        if (!telegramToken) return
        setIsConnectingTelegram(true)
        try {
            const response = await fetch("/api/integrations/telegram/connect", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({ userId, botToken: telegramToken })
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || t('failedToConnectTelegram') || "Failed to connect Telegram")
            setTelegramConnected(true)
            setTelegramBotName(data.botName)
            toast({ title: t('success'), description: t('connected') })
            setTelegramToken("")
            setIsTelegramDialogOpen(false)
        } catch (error: any) {
            toast({ title: t('error'), description: error.message, variant: "destructive" })
        } finally {
            setIsConnectingTelegram(false)
        }
    }

    const handleConnectSalesforce = async () => {
        if (!salesforceClientId || !salesforceClientSecret || !salesforceUsername || !salesforcePassword) {
            toast({ title: t('error'), description: t('fillAllFields'), variant: "destructive" })
            return
        }
        setIsConnectingSalesforce(true)
        try {
            const response = await fetch("/api/integrations/salesforce/connect", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({
                    userId,
                    clientId: salesforceClientId,
                    clientSecret: salesforceClientSecret,
                    username: salesforceUsername,
                    password: salesforcePassword,
                    securityToken: salesforceSecurityToken
                })
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || t('failedToConnect') || "Failed to connect")
            setSalesforceConnected(true)
            toast({ title: t('success'), description: t('salesforceConnected') })
            setSalesforceClientId("")
            setSalesforceClientSecret("")
            setSalesforceUsername("")
            setSalesforcePassword("")
            setSalesforceSecurityToken("")
            const res = await fetch(`/api/console/settings?chatbotId=${userId}`, { headers: await getAuthHeaders() })
            if (res.ok) {
                const settingsData = await res.json()
                setSettings(settingsData)
            }
        } catch (error: any) {
            toast({ title: t('error'), description: error.message, variant: "destructive" })
        } finally {
            setIsConnectingSalesforce(false)
        }
    }

    const handleConnectZoho = async () => {
        if (!user) return
        setIsConnectingZoho(true)
        let popup: Window | null = null
        let messageHandler: ((event: MessageEvent) => void) | null = null
        let pollTimer: ReturnType<typeof setInterval> | null = null

        const cleanup = () => {
            if (messageHandler) window.removeEventListener("message", messageHandler)
            if (pollTimer) clearInterval(pollTimer)
            setIsConnectingZoho(false)
        }

        try {
            const response = await fetch("/api/integrations/zoho-crm/connect", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({ chatbotId: userId, region: zohoRegion }),
            })
            const data = await response.json()
            if (!response.ok || !data.url) {
                throw new Error(data.error || t('failedToConnect') || "Failed to connect")
            }

            const w = 600, h = 720
            const left = window.screenX + (window.outerWidth - w) / 2
            const top = window.screenY + (window.outerHeight - h) / 2
            popup = window.open(data.url, "vion-zoho-oauth", `width=${w},height=${h},left=${left},top=${top}`)
            if (!popup) {
                throw new Error("Popup blocked. Please allow popups for this site.")
            }

            await new Promise<void>((resolve, reject) => {
                messageHandler = (event: MessageEvent) => {
                    if (!event.data || event.data.type !== "vion-zoho-crm-oauth") return
                    const result = event.data.payload
                    if (result?.success) resolve()
                    else reject(new Error(result?.error || "Authorization failed"))
                }
                window.addEventListener("message", messageHandler)

                pollTimer = setInterval(() => {
                    if (popup && popup.closed) reject(new Error("Window closed before authorization"))
                }, 500)
            })

            setZohoConnected(true)
            setZohoConnectedRegion(zohoRegion)
            toast({ title: t('success'), description: t('zohoCRMConnected') || "Zoho CRM connected." })

            const res = await fetch(`/api/console/settings?chatbotId=${userId}`, { headers: await getAuthHeaders() })
            if (res.ok) {
                const settingsData = await res.json()
                setSettings(settingsData)
            }
        } catch (error: any) {
            toast({ title: t('error'), description: error.message, variant: "destructive" })
        } finally {
            try { popup?.close() } catch { /* ignore */ }
            cleanup()
        }
    }

    const handleDisconnectZoho = async () => {
        setIsConnectingZoho(true)
        try {
            const response = await fetch("/api/integrations/zoho-crm/disconnect", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({ chatbotId: userId }),
            })
            const data = await response.json().catch(() => ({}))
            if (!response.ok) throw new Error(data.error || "Failed to disconnect")
            setZohoConnected(false)
            setZohoConnectedRegion(null)
            toast({ title: t('success'), description: t('zohoCRMDisconnected') || "Zoho CRM disconnected." })
        } catch (error: any) {
            toast({ title: t('error'), description: error.message, variant: "destructive" })
        } finally {
            setIsConnectingZoho(false)
        }
    }

    const handleConnectGoogleCalendar = async () => {
        setIsConnectingGoogleCalendar(true)
        try {
            const response = await fetch("/api/integrations/google-calendar/connect", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({ userId })
            })
            const data = await response.json()
            if (!response.ok) {
                const errorMsg = data.message || data.error || t('failedToConnect') || "Failed to connect"
                throw new Error(errorMsg)
            }
            if (data.authUrl) {
                window.location.href = data.authUrl
                return
            }
            setGoogleCalendarConnected(true)
            toast({ title: t('success'), description: t('googleCalendarConnected') })
            const res = await fetch(`/api/console/settings?chatbotId=${userId}`, { headers: await getAuthHeaders() })
            if (res.ok) {
                const settingsData = await res.json()
                setSettings(settingsData)
            }
        } catch (error: any) {
            toast({ 
                title: t('error'), 
                description: error.message, 
                variant: "destructive",
                duration: 10000 // Show longer for configuration errors
            })
        } finally {
            setIsConnectingGoogleCalendar(false)
        }
    }

    const handleConnectOutlookCalendar = async () => {
        setIsConnectingOutlookCalendar(true)
        try {
            const response = await fetch("/api/integrations/outlook-calendar/connect", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({ userId })
            })
            const data = await response.json()
            if (!response.ok) {
                const errorMsg = data.message || data.error || t('failedToConnect') || "Failed to connect"
                throw new Error(errorMsg)
            }
            if (data.authUrl) {
                window.location.href = data.authUrl
                return
            }
            setOutlookCalendarConnected(true)
            toast({ title: t('success'), description: t('outlookCalendarConnected') })
            const res = await fetch(`/api/console/settings?chatbotId=${userId}`, { headers: await getAuthHeaders() })
            if (res.ok) {
                const settingsData = await res.json()
                setSettings(settingsData)
            }
        } catch (error: any) {
            toast({ 
                title: t('error'), 
                description: error.message, 
                variant: "destructive",
                duration: 10000 // Show longer for configuration errors
            })
        } finally {
            setIsConnectingOutlookCalendar(false)
        }
    }

    const handleConnectShopify = async () => {
        if (!shopifyShopDomain || !shopifyApiKey || !shopifyApiSecret) {
            toast({ title: t('error'), description: t('fillAllFields'), variant: "destructive" })
            return
        }
        setIsConnectingShopify(true)
        try {
            const response = await fetch("/api/integrations/shopify/connect", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({
                    userId,
                    shopDomain: shopifyShopDomain,
                    apiKey: shopifyApiKey,
                    apiSecret: shopifyApiSecret
                })
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || t('failedToConnect') || "Failed to connect")
            if (data.authUrl) {
                window.location.href = data.authUrl
                return
            }
            setShopifyConnected(true)
            toast({ title: t('success'), description: t('shopifyConnected') })
            setShopifyShopDomain("")
            setShopifyApiKey("")
            setShopifyApiSecret("")
            const res = await fetch(`/api/console/settings?chatbotId=${userId}`, { headers: await getAuthHeaders() })
            if (res.ok) {
                const settingsData = await res.json()
                setSettings(settingsData)
            }
        } catch (error: any) {
            toast({ title: t('error'), description: error.message, variant: "destructive" })
        } finally {
            setIsConnectingShopify(false)
        }
    }

    const handleConnectMailchimp = async () => {
        if (!mailchimpApiKey || !mailchimpServerPrefix) {
            toast({ title: t('error'), description: t('fillAllFields'), variant: "destructive" })
            return
        }
        setIsConnectingMailchimp(true)
        try {
            const response = await fetch("/api/integrations/mailchimp/connect", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({
                    userId,
                    apiKey: mailchimpApiKey,
                    serverPrefix: mailchimpServerPrefix,
                    listId: mailchimpListId
                })
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || t('failedToConnect') || "Failed to connect")
            setMailchimpConnected(true)
            toast({ title: t('success'), description: t('mailchimpConnected') })
            setMailchimpApiKey("")
            setMailchimpServerPrefix("")
            setMailchimpListId("")
            const res = await fetch(`/api/console/settings?chatbotId=${userId}`, { headers: await getAuthHeaders() })
            if (res.ok) {
                const settingsData = await res.json()
                setSettings(settingsData)
            }
        } catch (error: any) {
            toast({ title: t('error'), description: error.message, variant: "destructive" })
        } finally {
            setIsConnectingMailchimp(false)
        }
    }

    const handleConnectSendgrid = async () => {
        if (!sendgridApiKey || !sendgridFromEmail) {
            toast({ title: t('error'), description: t('fillAllFields'), variant: "destructive" })
            return
        }
        setIsConnectingSendgrid(true)
        try {
            const response = await fetch("/api/integrations/sendgrid/connect", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({
                    userId,
                    apiKey: sendgridApiKey,
                    fromEmail: sendgridFromEmail
                })
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || t('failedToConnect') || "Failed to connect")
            setSendgridConnected(true)
            toast({ title: t('success'), description: t('sendgridConnected') })
            setSendgridApiKey("")
            setSendgridFromEmail("")
            const res = await fetch(`/api/console/settings?chatbotId=${userId}`, { headers: await getAuthHeaders() })
            if (res.ok) {
                const settingsData = await res.json()
                setSettings(settingsData)
            }
        } catch (error: any) {
            toast({ title: t('error'), description: error.message, variant: "destructive" })
        } finally {
            setIsConnectingSendgrid(false)
        }
    }

    const handleConnectConstantContact = async () => {
        if (!constantContactApiKey || !constantContactApiSecret) {
            toast({ title: t('error'), description: t('fillAllFields'), variant: "destructive" })
            return
        }
        setIsConnectingConstantContact(true)
        try {
            const response = await fetch("/api/integrations/constant-contact/connect", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({
                    userId,
                    apiKey: constantContactApiKey,
                    apiSecret: constantContactApiSecret
                })
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || t('failedToConnect') || "Failed to connect")
            if (data.authUrl) {
                window.location.href = data.authUrl
                return
            }
            setConstantContactConnected(true)
            toast({ title: t('success'), description: t('constantContactConnected') })
            setConstantContactApiKey("")
            setConstantContactApiSecret("")
            const res = await fetch(`/api/console/settings?chatbotId=${userId}`, { headers: await getAuthHeaders() })
            if (res.ok) {
                const settingsData = await res.json()
                setSettings(settingsData)
            }
        } catch (error: any) {
            toast({ title: t('error'), description: error.message, variant: "destructive" })
        } finally {
            setIsConnectingConstantContact(false)
        }
    }

    async function handleDisconnectEcom(platform: EcomPlatform) {
        const res = await fetch(`/api/ecommerce/connect?chatbotId=${userId}&platform=${platform}`, {
            method: "DELETE",
        })
        if (res.ok) {
            setEcomConnections(prev => prev.filter(c => c.platform !== platform))
            toast({ title: t('success'), description: `${PLATFORM_META[platform].name} bağlantısı kaldırıldı.` })
        } else {
            toast({ title: t('error'), description: "Bağlantı kaldırılamadı.", variant: "destructive" })
        }
    }

    async function handleSyncEcom(platform: EcomPlatform) {
        const res = await fetch("/api/ecommerce/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chatbotId: userId, platform, type: "all" }),
        })
        const data = await res.json()
        if (res.ok) {
            toast({ title: t('success'), description: `Senkronizasyon tamamlandı. ${data.syncedProducts} ürün, ${data.syncedOrders} sipariş.` })
            await loadEcomConnections()
        } else {
            toast({ title: t('error'), description: data.error || "Senkronizasyon başarısız.", variant: "destructive" })
        }
    }

    function handleConnectEcomSuccess(platform: EcomPlatform, result: { connectionId: string; storeName?: string }) {
        setEcomConnectingPlatform(null)
        toast({ title: t('success'), description: `${PLATFORM_META[platform].name} başarıyla bağlandı! ${result.storeName ? `"${result.storeName}"` : ""}` })
        loadEcomConnections()
    }

    const loadEcomConnections = useCallback(async () => {
        if (!user) return
        try {
            const token = await user.getIdToken()
            const res = await fetch(`/api/ecommerce/status?chatbotId=${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setEcomConnections(data.connections || [])
            }
        } catch {
            // ignore
        }
    }, [userId, user])

    useEffect(() => {
        setOrigin(window.location.origin)
        const fetchSettings = async () => {
            if (!user) return
            try {
                const token = await user.getIdToken()
                const res = await fetch(`/api/console/settings?chatbotId=${userId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })
                if (res.ok) {
                    const data = await res.json()
                    setSettings(data)
                    setBrandColor(data.brandColor || "#000000")
                    if (data.integrations?.telegram?.connected) {
                        setTelegramConnected(true)
                        setTelegramBotName(data.integrations.telegram.botName || "")
                    }
                    if (data.integrations?.slack?.connected) {
                        setSlackConnected(true)
                        setSlackTeamName(data.integrations.slack.teamName || "")
                    }
                    if (data.integrations?.salesforce?.connected) {
                        setSalesforceConnected(true)
                    }
                    if (data.integrations?.zoho?.connected) {
                        setZohoConnected(true)
                        const region = data.integrations.zoho.region
                        if (region && ZOHO_REGIONS.some((r) => r.value === region)) {
                            setZohoConnectedRegion(region as ZohoRegion)
                            setZohoRegion(region as ZohoRegion)
                        }
                    }
                    if (data.integrations?.googleCalendar?.connected) {
                        setGoogleCalendarConnected(true)
                    }
                    if (data.integrations?.outlookCalendar?.connected) {
                        setOutlookCalendarConnected(true)
                    }
                    if (data.integrations?.shopify?.connected) {
                        setShopifyConnected(true)
                    }
                    if (data.integrations?.mailchimp?.connected) {
                        setMailchimpConnected(true)
                    }
                    if (data.integrations?.sendgrid?.connected) {
                        setSendgridConnected(true)
                    }
                    if (data.integrations?.constantContact?.connected) {
                        setConstantContactConnected(true)
                    }
                }

                const [instagramStatusRes, whatsappStatusRes, messengerStatusRes, evolutionStatusRes] = await Promise.all([
                    fetch(`/api/integrations/instagram-dm/status?chatbotId=${userId}`, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }),
                    fetch(`/api/integrations/whatsapp-business/status?chatbotId=${userId}`, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }),
                    fetch(`/api/integrations/messenger/status?chatbotId=${userId}`, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }),
                    fetch(`/api/integrations/evolution-api/status?chatbotId=${userId}`, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    })
                ])

                const nextMetaWizardStatus: Record<string, unknown> = {}
                if (instagramStatusRes.ok) {
                    nextMetaWizardStatus.instagramDM = await instagramStatusRes.json()
                }
                if (whatsappStatusRes.ok) {
                    nextMetaWizardStatus.whatsappBusiness = await whatsappStatusRes.json()
                }
                if (messengerStatusRes.ok) {
                    nextMetaWizardStatus.messengerDM = await messengerStatusRes.json()
                }
                setMetaWizardStatus(nextMetaWizardStatus)
                if (evolutionStatusRes.ok) {
                    setEvolutionApiStatus(await evolutionStatusRes.json())
                }
            } catch (error) {
                console.error("Error fetching settings:", error)
            }
        }
        fetchSettings()
        loadEcomConnections()
    }, [userId, user, loadEcomConnections])

    useEffect(() => {
        if (!user || !userId) return

        let cancelled = false
        const loadShortLink = async () => {
            setIsDirectShortLinkLoading(true)
            try {
                const token = await user.getIdToken()
                const res = await fetch("/api/short-links/direct-chat", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ chatbotId: userId }),
                })
                if (!res.ok) return
                const data = await res.json()
                if (!cancelled && typeof data.code === "string") {
                    setDirectShortCode(data.code)
                }
            } catch (error) {
                console.error("Error loading short link:", error)
            } finally {
                if (!cancelled) setIsDirectShortLinkLoading(false)
            }
        }

        loadShortLink()
        return () => {
            cancelled = true
        }
    }, [user, userId])

    const copyToClipboard = (text: string, key: string) => {
        navigator.clipboard.writeText(text)
        setCopied(key)
        toast({ title: t('copied'), description: t('codeCopied') })
        setTimeout(() => setCopied(null), 2000)
    }

    const scriptCode = `<script src="${origin}/widget.js?v=2.0" data-chatbot-id="${userId}" data-color="${brandColor}"></script>`
    const encodedUserId = encodeURIComponent(userId)
    const iframeCode = `<iframe src="${origin}/chatbot-view?id=${encodedUserId}" width="100%" height="600" frameborder="0" allowtransparency="true" style="background-color: transparent; border: none;"></iframe>`
    const directLink = `${origin}/chatbot-view?id=${encodedUserId}`
    const shortDirectLink = directShortCode ? `${origin}/c/${directShortCode}` : `${origin}/c/${encodedUserId}`
    const whatsappWebhookUrl = waWebhookSecret
        ? `${origin}/api/integrations/whatsapp/webhook?chatbotId=${userId}&secret=${encodeURIComponent(waWebhookSecret)}`
        : `${origin}/api/integrations/whatsapp/webhook?chatbotId=${userId}`
    const instagramWebhookUrl = igWebhookSecret
        ? `${origin}/api/integrations/instagram/webhook?chatbotId=${userId}&secret=${encodeURIComponent(igWebhookSecret)}`
        : `${origin}/api/integrations/instagram/webhook?chatbotId=${userId}`

    // Hide deprecated integrations and apply search filter
    const visibleIntegrations = allIntegrations.filter(
        (integration) => !HIDDEN_INTEGRATION_IDS.has(integration.id)
    )
    const [selectedCategory, setSelectedCategory] = useState<string>("all")
    const filteredIntegrations = visibleIntegrations.filter(integration => {
        const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            integration.description.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = selectedCategory === "all" || integration.category === selectedCategory
        return matchesSearch && matchesCategory
    })

    const currentIntegration = selectedIntegration
        ? visibleIntegrations.find(i => i.id === selectedIntegration)
        : null

    useEffect(() => {
        if (selectedIntegration && !currentIntegration) {
            setSelectedIntegration(null)
        }
    }, [selectedIntegration, currentIntegration])

    // Render Detail View
    const renderDetailView = () => {
        if (!currentIntegration) return null

        if (currentIntegration.id === "instagram") {
            return (
                <div className="flex-1 p-8">
                    <div className="mb-6 flex items-center justify-between">
                        <button
                            onClick={() => setSelectedIntegration(null)}
                            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {t('backToIntegrations')}
                        </button>
                    </div>

                    <InstagramDMWizard chatbotId={userId} />
                </div>
            )
        }

        if (currentIntegration.id === "whatsapp") {
            return (
                <div className="flex-1 p-8">
                    <div className="mb-6 flex items-center justify-between">
                        <button
                            onClick={() => setSelectedIntegration(null)}
                            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {t('backToIntegrations')}
                        </button>
                    </div>

                    <WhatsAppBizWizard chatbotId={userId} />
                </div>
            )
        }

        if (currentIntegration.id === "messenger") {
            return (
                <div className="flex-1 p-8">
                    <div className="mb-6 flex items-center justify-between">
                        <button
                            onClick={() => setSelectedIntegration(null)}
                            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {t('backToIntegrations')}
                        </button>
                    </div>

                    <MessengerWizard chatbotId={userId} />
                </div>
            )
        }

        if (currentIntegration.id === "evolution-api") {
            return (
                <div className="flex-1 p-8">
                    <div className="mb-6 flex items-center justify-between">
                        <button
                            onClick={() => setSelectedIntegration(null)}
                            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {t('backToIntegrations')}
                        </button>
                    </div>

                    <EvolutionApiIntegrationPanel chatbotId={userId} />
                </div>
            )
        }

        if (currentIntegration.id === "mobile-app-api" || currentIntegration.id === "ticket-webhook") {
            return (
                <div className="flex-1 p-8">
                    <div className="mb-6 flex items-center justify-between">
                        <button
                            onClick={() => setSelectedIntegration(null)}
                            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {t('backToIntegrations')}
                        </button>
                    </div>

                    <MobileSupportIntegrationPanel
                        chatbotId={userId}
                        mode={currentIntegration.id === "mobile-app-api" ? "mobile" : "ticket"}
                    />
                </div>
            )
        }

        return (
            <div className="flex-1 p-8">
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => setSelectedIntegration(null)}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t('backToIntegrations')}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Integration Info */}
                    <Card className="border-0 shadow-none bg-muted/30">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className={cn("p-3 rounded-xl flex items-center justify-center w-12 h-12", currentIntegration.iconBg)}>
                                    {currentIntegration.logo ? (
                                        <img 
                                            src={currentIntegration.logo} 
                                            alt={currentIntegration.name}
                                            className="w-6 h-6 object-contain"
                                        />
                                    ) : currentIntegration.icon ? (
                                        currentIntegration.icon
                                    ) : null}
                                </div>
                                {currentIntegration.connected && (
                                    <div className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                        <Check className="h-3 w-3" />
                                        {t('connected')}
                                    </div>
                                )}
                            </div>
                            <h2 className="text-xl font-semibold mb-2">{currentIntegration.name}</h2>
                            <p className="text-muted-foreground text-sm mb-6">{currentIntegration.description}</p>

                            {currentIntegration.features && currentIntegration.features.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="font-medium mb-3">{t('features')}:</h3>
                                    <ul className="space-y-2">
                                        {currentIntegration.features.map((feature, index) => (
                                            <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground flex-shrink-0" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Installation Code for Website Widget */}
                            {currentIntegration.id === "website" && (
                                <div className="space-y-4">
                                    <h3 className="font-medium">{t('installationCode')}</h3>
                                    <div className="bg-muted p-4 rounded-md relative group border">
                                        <pre className="text-xs font-mono whitespace-pre-wrap break-all pr-10 text-foreground">
                                            {scriptCode}
                                        </pre>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="absolute top-2 right-2 h-8 w-8 hover:bg-background"
                                            onClick={() => copyToClipboard(scriptCode, "script")}
                                        >
                                            {copied === "script" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* iFrame Code */}
                            {currentIntegration.id === "iframe" && (
                                <div className="space-y-4">
                                    <h3 className="font-medium">{t('iframeEmbed')}</h3>
                                    <div className="bg-muted p-4 rounded-md relative group border">
                                        <pre className="text-xs font-mono whitespace-pre-wrap break-all pr-10 text-foreground">
                                            {iframeCode}
                                        </pre>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="absolute top-2 right-2 h-8 w-8 hover:bg-background"
                                            onClick={() => copyToClipboard(iframeCode, "iframe")}
                                        >
                                            {copied === "iframe" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Direct Link */}
                            {currentIntegration.id === "direct-link" && (
                                <div className="space-y-4">
                                    <h3 className="font-medium">{t('directLink')}</h3>
                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <Label className="text-sm text-muted-foreground">Tam bağlantı</Label>
                                            <div className="flex gap-2">
                                                <Input value={directLink} readOnly className="font-mono text-sm" />
                                                <Button variant="outline" size="icon" onClick={() => copyToClipboard(directLink, "link")}>
                                                    {copied === "link" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                                </Button>
                                                <Button variant="outline" size="icon" onClick={() => window.open(directLink, "_blank")}>
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm text-muted-foreground">Kısa bağlantı (alternatif)</Label>
                                            <div className="flex gap-2">
                                                <Input value={isDirectShortLinkLoading && !directShortCode ? "Kısa bağlantı oluşturuluyor..." : shortDirectLink} readOnly className="font-mono text-sm" />
                                                <Button variant="outline" size="icon" disabled={isDirectShortLinkLoading && !directShortCode} onClick={() => copyToClipboard(shortDirectLink, "short-link")}>
                                                    {copied === "short-link" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                                </Button>
                                                <Button variant="outline" size="icon" disabled={isDirectShortLinkLoading && !directShortCode} onClick={() => window.open(shortDirectLink, "_blank")}>
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* WordPress Code */}
                            {currentIntegration.id === "wordpress" && (
                                <div className="space-y-4">
                                    <h3 className="font-medium">{t('wordpress')}</h3>
                                    <div className="bg-muted p-4 rounded-md relative group border">
                                        <pre className="text-xs font-mono whitespace-pre-wrap break-all pr-10 text-foreground">
                                            {scriptCode}
                                        </pre>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="absolute top-2 right-2 h-8 w-8 hover:bg-background"
                                            onClick={() => copyToClipboard(scriptCode, "wordpress")}
                                        >
                                            {copied === "wordpress" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-medium">{t('instructions')}:</h4>
                                        <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 ml-2">
                                            {(t('wordpressInstructions') || "").split('\n').map((instruction, index) => (
                                                <li key={index}>{instruction.replace(/^\d+\.\s*/, '')}</li>
                                            ))}
                                        </ol>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Right: Connection Dialog for messaging platforms */}
                    <div>
                        {/* Ecommerce Dialog */}
                        {currentIntegration.category === "ecommerce" && currentIntegration.id in PLATFORM_META && (
                            <EcommercePlatformCard
                                meta={PLATFORM_META[currentIntegration.id as EcomPlatform]}
                                connection={ecomConnections.find(c => c.platform === currentIntegration.id)}
                                chatbotId={userId}
                                onConnect={() => setEcomConnectingPlatform(currentIntegration.id as EcomPlatform)}
                                onDisconnect={() => handleDisconnectEcom(currentIntegration.id as EcomPlatform)}
                                onSync={() => handleSyncEcom(currentIntegration.id as EcomPlatform)}
                            />
                        )}

                        {/* Telegram Dialog */}
                        {currentIntegration.id === "telegram" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('telegramConnection')}</CardTitle>
                                    <CardDescription>
                                        {telegramConnected
                                            ? `${t('connected')}: @${telegramBotName}`
                                            : t('telegramDescription')
                                        }
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {!telegramConnected && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>{t('botToken')}</Label>
                                                <Input
                                                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                                                    value={telegramToken}
                                                    onChange={(e) => setTelegramToken(e.target.value)}
                                                />
                                                <p className="text-xs text-muted-foreground">{t('botTokenHelp')}</p>
                                            </div>
                                            <div className="bg-muted p-3 rounded-md text-xs text-muted-foreground">
                                                <p className="font-medium mb-1">{t('webhookUrl') || 'Webhook URL'}:</p>
                                                <code className="break-all">{origin}/api/integrations/telegram/webhook?chatbotId={userId}</code>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    <Button
                                        onClick={handleConnectTelegram}
                                        disabled={isConnectingTelegram || (!telegramToken && !telegramConnected)}
                                        className="w-full"
                                        variant={telegramConnected ? "outline" : "default"}
                                    >
                                        {isConnectingTelegram && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {telegramConnected ? t('manageSettings') : t('connect')}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}

                        {/* Meta Channels Wizards */}
                        {currentIntegration.id === "meta-channels" && (
                            <div className="grid gap-6 xl:grid-cols-2">
                                <InstagramDMWizard chatbotId={userId} />
                                <WhatsAppBizWizard chatbotId={userId} />
                                <MessengerWizard chatbotId={userId} />
                            </div>
                        )}

                        {/* WhatsApp Wizard */}
                        {currentIntegration.id === "whatsapp" && (
                            <WhatsAppBizWizard chatbotId={userId} />
                        )}

                        {/* Instagram DM Wizard */}
                        {currentIntegration.id === "instagram" && (
                            <InstagramDMWizard chatbotId={userId} />
                        )}

                        {/* Slack Dialog */}

                        {currentIntegration.id === "slack" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('slackConnection')}</CardTitle>
                                    <CardDescription>
                                        {slackConnected
                                            ? `${t('connected')}: ${slackTeamName}`
                                            : t('slackDescription')
                                        }
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {!slackConnected && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>{t('slackBotToken') || 'Bot User OAuth Token'}</Label>
                                                <Input
                                                    type="password"
                                                    placeholder="xoxb-..."
                                                    value={slackBotToken}
                                                    onChange={(e) => setSlackBotToken(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('slackSigningSecret') || 'Signing Secret'}</Label>
                                                <Input
                                                    type="password"
                                                    placeholder="e.g. 8f7d..."
                                                    value={slackSigningSecret}
                                                    onChange={(e) => setSlackSigningSecret(e.target.value)}
                                                />
                                            </div>
                                            <div className="bg-muted p-3 rounded-md text-xs text-muted-foreground">
                                                <p className="font-medium mb-1">{t('requestUrl') || 'Request URL'}:</p>
                                                <code className="break-all">{origin}/api/integrations/slack/webhook?chatbotId={userId}</code>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    <Button
                                        onClick={handleConnectSlack}
                                        disabled={isConnectingSlack || (!slackBotToken || !slackSigningSecret) && !slackConnected}
                                        className="w-full"
                                        variant={slackConnected ? "outline" : "default"}
                                    >
                                        {isConnectingSlack && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {slackConnected ? t('manageSettings') : t('connect')}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}

                        {/* Salesforce Dialog */}
                        {currentIntegration.id === "salesforce" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('salesforceConnection')}</CardTitle>
                                    <CardDescription>
                                        {salesforceConnected
                                            ? t('connected')
                                            : t('salesforceDescription')
                                        }
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {!salesforceConnected && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>{t('salesforceClientId')}</Label>
                                                <Input
                                                    placeholder="e.g. 3MVG9..."
                                                    value={salesforceClientId}
                                                    onChange={(e) => setSalesforceClientId(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('salesforceClientSecret')}</Label>
                                                <Input
                                                    type="password"
                                                    placeholder="e.g. ABC123..."
                                                    value={salesforceClientSecret}
                                                    onChange={(e) => setSalesforceClientSecret(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('salesforceUsername')}</Label>
                                                <Input
                                                    placeholder="your-email@example.com"
                                                    value={salesforceUsername}
                                                    onChange={(e) => setSalesforceUsername(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('salesforcePassword')}</Label>
                                                <Input
                                                    type="password"
                                                    placeholder="Your password"
                                                    value={salesforcePassword}
                                                    onChange={(e) => setSalesforcePassword(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('salesforceSecurityToken')} (Optional)</Label>
                                                <Input
                                                    type="password"
                                                    placeholder="Security token if required"
                                                    value={salesforceSecurityToken}
                                                    onChange={(e) => setSalesforceSecurityToken(e.target.value)}
                                                />
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    <Button
                                        onClick={handleConnectSalesforce}
                                        disabled={isConnectingSalesforce || (!salesforceClientId || !salesforceClientSecret || !salesforceUsername || !salesforcePassword) && !salesforceConnected}
                                        className="w-full"
                                        variant={salesforceConnected ? "outline" : "default"}
                                    >
                                        {isConnectingSalesforce && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {salesforceConnected ? t('manageSettings') : t('connectSalesforce')}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}

                        {/* Zoho CRM Dialog */}
                        {currentIntegration.id === "zoho-crm" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('zohoCRMConnection') || "Zoho CRM Connection"}</CardTitle>
                                    <CardDescription>
                                        {zohoConnected
                                            ? `${t('connected')}${zohoConnectedRegion ? ` — .${zohoConnectedRegion}` : ""}`
                                            : (t('zohoCRMDescription') || "Push leads captured by your chatbot into your Zoho CRM account.")}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {!zohoConnected && (
                                        <div className="space-y-2">
                                            <Label>{t('zohoDataCenter') || "Data Center"}</Label>
                                            <Select value={zohoRegion} onValueChange={(v) => setZohoRegion(v as ZohoRegion)}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ZOHO_REGIONS.map((r) => (
                                                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-xs text-muted-foreground">
                                                {t('zohoDataCenterHint') || "Pick the region where your Zoho account lives. Wrong region will fail to authorize."}
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    <Button
                                        onClick={zohoConnected ? handleDisconnectZoho : handleConnectZoho}
                                        disabled={isConnectingZoho}
                                        className="w-full"
                                        variant={zohoConnected ? "outline" : "default"}
                                    >
                                        {isConnectingZoho && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {zohoConnected ? (t('disconnect') || "Disconnect") : (t('connectZohoCRM') || "Connect Zoho CRM")}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}

                        {/* Google Calendar Dialog */}
                        {currentIntegration.id === "google-calendar" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('googleCalendarConnection')}</CardTitle>
                                    <CardDescription>
                                        {googleCalendarConnected
                                            ? t('connected')
                                            : t('googleCalendarDescription')
                                        }
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {!googleCalendarConnected && (
                                        <div className="space-y-3">
                                            <div className="bg-muted p-3 rounded-md text-xs text-muted-foreground">
                                                <p className="mb-2">You will be redirected to Google to authorize access to your calendar.</p>
                                                <p className="text-xs mt-2">Note: Google Calendar requires OAuth2 authentication for security. This is the standard and most secure method.</p>
                                            </div>
                                            <div className="bg-blue-50 border border-blue-200 p-3 rounded-md text-xs">
                                                <p className="font-medium text-blue-900 mb-1">Setup Required:</p>
                                                <p className="text-blue-800">To use Google Calendar integration, you need to:</p>
                                                <ol className="list-decimal list-inside mt-2 space-y-1 text-blue-800">
                                                    <li>Create OAuth credentials at <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
                                                    <li>Add <code className="bg-blue-100 px-1 rounded">GOOGLE_CLIENT_ID</code> and <code className="bg-blue-100 px-1 rounded">GOOGLE_CLIENT_SECRET</code> to your environment variables</li>
                                                    <li>Set redirect URI: <code className="bg-blue-100 px-1 rounded">{origin}/api/integrations/google-calendar/callback</code></li>
                                                </ol>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    <Button
                                        onClick={handleConnectGoogleCalendar}
                                        disabled={isConnectingGoogleCalendar || googleCalendarConnected}
                                        className="w-full"
                                        variant={googleCalendarConnected ? "outline" : "default"}
                                    >
                                        {isConnectingGoogleCalendar && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {googleCalendarConnected ? t('manageSettings') : t('connectGoogleCalendar')}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}

                        {/* Outlook Calendar Dialog */}
                        {currentIntegration.id === "outlook-calendar" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('outlookCalendarConnection')}</CardTitle>
                                    <CardDescription>
                                        {outlookCalendarConnected
                                            ? t('connected')
                                            : t('outlookCalendarDescription')
                                        }
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {!outlookCalendarConnected && (
                                        <div className="space-y-3">
                                            <div className="bg-muted p-3 rounded-md text-xs text-muted-foreground">
                                                <p className="mb-2">You will be redirected to Microsoft to authorize access to your Outlook calendar.</p>
                                            </div>
                                            <div className="bg-blue-50 border border-blue-200 p-3 rounded-md text-xs">
                                                <p className="font-medium text-blue-900 mb-1">Setup Required:</p>
                                                <p className="text-blue-800">To use Outlook Calendar integration, you need to:</p>
                                                <ol className="list-decimal list-inside mt-2 space-y-1 text-blue-800">
                                                    <li>Register your app at <a href="https://portal.azure.com/" target="_blank" rel="noopener noreferrer" className="underline">Azure Portal</a></li>
                                                    <li>Add <code className="bg-blue-100 px-1 rounded">MICROSOFT_CLIENT_ID</code> and <code className="bg-blue-100 px-1 rounded">MICROSOFT_CLIENT_SECRET</code> to your environment variables</li>
                                                    <li>Set redirect URI: <code className="bg-blue-100 px-1 rounded">{origin}/api/integrations/outlook-calendar/callback</code></li>
                                                </ol>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    <Button
                                        onClick={handleConnectOutlookCalendar}
                                        disabled={isConnectingOutlookCalendar || outlookCalendarConnected}
                                        className="w-full"
                                        variant={outlookCalendarConnected ? "outline" : "default"}
                                    >
                                        {isConnectingOutlookCalendar && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {outlookCalendarConnected ? t('manageSettings') : t('connectOutlookCalendar')}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}

                        {/* Shopify Dialog */}
                        {currentIntegration.id === "shopify" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('shopifyConnection')}</CardTitle>
                                    <CardDescription>
                                        {shopifyConnected
                                            ? t('connected')
                                            : t('shopifyDescription')
                                        }
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {!shopifyConnected && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>{t('shopifyShopDomain')}</Label>
                                                <Input
                                                    placeholder="your-shop.myshopify.com"
                                                    value={shopifyShopDomain}
                                                    onChange={(e) => setShopifyShopDomain(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('shopifyApiKey')}</Label>
                                                <Input
                                                    placeholder="API Key"
                                                    value={shopifyApiKey}
                                                    onChange={(e) => setShopifyApiKey(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('shopifyApiSecret')}</Label>
                                                <Input
                                                    type="password"
                                                    placeholder="API Secret"
                                                    value={shopifyApiSecret}
                                                    onChange={(e) => setShopifyApiSecret(e.target.value)}
                                                />
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    <Button
                                        onClick={handleConnectShopify}
                                        disabled={isConnectingShopify || (!shopifyShopDomain || !shopifyApiKey || !shopifyApiSecret) && !shopifyConnected}
                                        className="w-full"
                                        variant={shopifyConnected ? "outline" : "default"}
                                    >
                                        {isConnectingShopify && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {shopifyConnected ? t('manageSettings') : t('connectShopify')}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}

                        {/* Mailchimp Dialog */}
                        {currentIntegration.id === "mailchimp" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('mailchimpConnection')}</CardTitle>
                                    <CardDescription>
                                        {mailchimpConnected
                                            ? t('connected')
                                            : t('mailchimpDescription')
                                        }
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {!mailchimpConnected && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>{t('mailchimpApiKey')}</Label>
                                                <Input
                                                    type="password"
                                                    placeholder="e.g. abc123def456..."
                                                    value={mailchimpApiKey}
                                                    onChange={(e) => setMailchimpApiKey(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('mailchimpServerPrefix')}</Label>
                                                <Input
                                                    placeholder="e.g. us1, us2, us3..."
                                                    value={mailchimpServerPrefix}
                                                    onChange={(e) => setMailchimpServerPrefix(e.target.value)}
                                                />
                                                <p className="text-xs text-muted-foreground">Found in your Mailchimp API key (e.g., us1 in abc123def456-us1)</p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('mailchimpListId')} (Optional)</Label>
                                                <Input
                                                    placeholder="Default list ID"
                                                    value={mailchimpListId}
                                                    onChange={(e) => setMailchimpListId(e.target.value)}
                                                />
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    <Button
                                        onClick={handleConnectMailchimp}
                                        disabled={isConnectingMailchimp || (!mailchimpApiKey || !mailchimpServerPrefix) && !mailchimpConnected}
                                        className="w-full"
                                        variant={mailchimpConnected ? "outline" : "default"}
                                    >
                                        {isConnectingMailchimp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {mailchimpConnected ? t('manageSettings') : t('connectMailchimp')}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}

                        {/* SendGrid Dialog */}
                        {currentIntegration.id === "sendgrid" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('sendgridConnection')}</CardTitle>
                                    <CardDescription>
                                        {sendgridConnected
                                            ? t('connected')
                                            : t('sendgridDescription')
                                        }
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {!sendgridConnected && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>{t('sendgridApiKey')}</Label>
                                                <Input
                                                    type="password"
                                                    placeholder="SG.abc123..."
                                                    value={sendgridApiKey}
                                                    onChange={(e) => setSendgridApiKey(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('sendgridFromEmail')}</Label>
                                                <Input
                                                    type="email"
                                                    placeholder="noreply@yourdomain.com"
                                                    value={sendgridFromEmail}
                                                    onChange={(e) => setSendgridFromEmail(e.target.value)}
                                                />
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    <Button
                                        onClick={handleConnectSendgrid}
                                        disabled={isConnectingSendgrid || (!sendgridApiKey || !sendgridFromEmail) && !sendgridConnected}
                                        className="w-full"
                                        variant={sendgridConnected ? "outline" : "default"}
                                    >
                                        {isConnectingSendgrid && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {sendgridConnected ? t('manageSettings') : t('connectSendgrid')}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}

                        {/* Constant Contact Dialog */}
                        {currentIntegration.id === "constant-contact" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('constantContactConnection')}</CardTitle>
                                    <CardDescription>
                                        {constantContactConnected
                                            ? t('connected')
                                            : t('constantContactDescription')
                                        }
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {!constantContactConnected && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>{t('constantContactApiKey')}</Label>
                                                <Input
                                                    placeholder="API Key"
                                                    value={constantContactApiKey}
                                                    onChange={(e) => setConstantContactApiKey(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('constantContactApiSecret')}</Label>
                                                <Input
                                                    type="password"
                                                    placeholder="API Secret"
                                                    value={constantContactApiSecret}
                                                    onChange={(e) => setConstantContactApiSecret(e.target.value)}
                                                />
                                            </div>
                                            <div className="bg-muted p-3 rounded-md text-xs text-muted-foreground">
                                                <p className="mb-2">You will be redirected to Constant Contact to authorize access.</p>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    <Button
                                        onClick={handleConnectConstantContact}
                                        disabled={isConnectingConstantContact || (!constantContactApiKey || !constantContactApiSecret) && !constantContactConnected}
                                        className="w-full"
                                        variant={constantContactConnected ? "outline" : "default"}
                                    >
                                        {isConnectingConstantContact && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {constantContactConnected ? t('manageSettings') : t('connectConstantContact')}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // Render Grid View
    const renderGridView = () => (
        <div className="flex-1 p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('integration') || (language === 'tr' ? 'Entegrasyonlar' : 'Integrations')}</h1>
                    <p className="text-muted-foreground mt-1">
                        {language === 'tr' 
                            ? 'Chatbotunuzu farklı platformlara bağlayarak yeteneklerini genişletin.'
                            : 'Expand your chatbot\'s capabilities by connecting to different platforms.'}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-full sm:w-[160px]">
                            <SelectValue placeholder={t('allCategories') || (language === 'tr' ? 'Tüm Kategoriler' : 'All Categories')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('allCategories') || (language === 'tr' ? 'Tüm Kategoriler' : 'All Categories')}</SelectItem>
                            <SelectItem value="embed">{language === 'tr' ? 'Web Sitesi' : 'Website'}</SelectItem>
                            <SelectItem value="messaging">{language === 'tr' ? 'Mesajlaşma' : 'Messaging'}</SelectItem>
                            <SelectItem value="ecommerce">{language === 'tr' ? 'E-Ticaret' : 'E-commerce'}</SelectItem>
                            <SelectItem value="crm">{language === 'tr' ? 'CRM' : 'CRM'}</SelectItem>
                            <SelectItem value="calendar">{language === 'tr' ? 'Takvim' : 'Calendar'}</SelectItem>
                            <SelectItem value="email">{language === 'tr' ? 'E-Posta' : 'Email'}</SelectItem>
                            <SelectItem value="api">API</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t('search')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 w-full"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredIntegrations.map((integration) => {
                    // Check if user has access to this integration
                    const hasAccess = role === 'SUPER_ADMIN' || hasIntegrationAccess(integration.id, currentPlanSortOrder)
                    const minPlan = getIntegrationMinPlan(integration.id)
                    
                    return (
                        <Card
                            key={integration.id}
                            className={cn(
                                "cursor-pointer hover:shadow-md transition-shadow border py-0",
                                !hasAccess && "opacity-60"
                            )}
                            onClick={() => {
                                if (hasAccess) {
                                    setSelectedIntegration(integration.id)
                                } else {
                                    // Show upgrade modal
                                    setUpgradeTargetIntegration(integration.id)
                                    setShowUpgradeModal(true)
                                }
                            }}
                        >
                            <CardContent className="p-5 relative">
                                {/* Lock badge for restricted integrations */}
                                {!hasAccess && (
                                    <div className="absolute top-3 right-3 flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                                        <Lock className="h-3 w-3" />
                                        {minPlan?.charAt(0).toUpperCase()}{minPlan?.slice(1)}+
                                    </div>
                                )}
                                
                                <div className={cn("p-3 rounded-xl mb-4 flex items-center justify-center w-12 h-12", integration.iconBg)}>
                                    {integration.logo ? (
                                        <img 
                                            src={integration.logo} 
                                            alt={integration.name}
                                            className="w-6 h-6 object-contain"
                                            style={{ filter: !hasAccess ? 'grayscale(1) opacity(0.55)' : 'none' }}
                                        />
                                    ) : integration.icon ? (
                                        integration.icon
                                    ) : null}
                                </div>
                                <h3 className="font-semibold mb-1">{integration.name}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                    {integration.description}
                                </p>
                                {integration.connected && hasAccess && (
                                    <div className="mt-3 flex items-center gap-1 text-xs font-medium text-green-600">
                                        <Check className="h-3 w-3" />
                                        {t('connected')}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )

    // Get feature name for upgrade modal
    const getIntegrationName = (id: string) => {
        const config = INTEGRATION_ACCESS[id]
        if (!config) return id
        return config.displayName[language as 'en' | 'tr'] || id
    }

    return (
        <>
            <div className="flex h-full bg-white rounded-xl overflow-hidden">
                {/* Main Content */}
                {selectedIntegration ? renderDetailView() : renderGridView()}
            </div>
            
            {/* Pricing Modal for Upgrade */}
            <PricingModal
                isOpen={showUpgradeModal}
                onClose={() => {
                    setShowUpgradeModal(false)
                    setUpgradeTargetIntegration(null)
                }}
                currentPlanId={planId}
            />

            {/* Ecommerce Connection Modal */}
            {ecomConnectingPlatform && PLATFORM_META[ecomConnectingPlatform] && (
                <EcommerceConnectionForm
                    open={!!ecomConnectingPlatform}
                    meta={PLATFORM_META[ecomConnectingPlatform]}
                    chatbotId={userId}
                    onClose={() => setEcomConnectingPlatform(null)}
                    onSuccess={result => handleConnectEcomSuccess(ecomConnectingPlatform, result)}
                />
            )}
        </>
    )
}
