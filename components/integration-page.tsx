"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Copy, ExternalLink, Check, MessageCircle, Send, Loader2, ArrowLeft, Search, Plus, BookOpen, MessageSquare, Hash, Link2, Globe, Code2, Calendar, ShoppingCart, Mail, Building2, Lock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { getPlan } from "@/lib/pricing-config"
import { hasIntegrationAccess, getIntegrationMinPlan, INTEGRATION_ACCESS } from "@/lib/integration-access-config"
import { PricingModal } from "@/components/pricing-modal"

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
}

const HIDDEN_INTEGRATION_IDS = new Set([
    "slack",
    "salesforce",
    "mailchimp",
    "sendgrid",
    "constant-contact",
])

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

    // WhatsApp State
    const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false)
    const [waPhoneNumberId, setWaPhoneNumberId] = useState("")
    const [waAccessToken, setWaAccessToken] = useState("")
    const [waVerifyToken, setWaVerifyToken] = useState(() =>
        Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10)
    )
    const [isConnectingWhatsApp, setIsConnectingWhatsApp] = useState(false)
    const [waStep, setWaStep] = useState(1)

    // Instagram State
    const [igPageId, setIgPageId] = useState("")
    const [igAccessToken, setIgAccessToken] = useState("")
    const [igVerifyToken, setIgVerifyToken] = useState(() =>
        Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10)
    )
    const [isConnectingInstagram, setIsConnectingInstagram] = useState(false)
    const [igStep, setIgStep] = useState(1)

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
            name: t('whatsappName') || "WhatsApp Business",
            description: t('whatsappDescription'),
            logo: "/integrations/whatsapp.svg",
            iconBg: "bg-gray-100",
            connected: whatsAppConnected,
            features: [
                t('whatsappInstructions')
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
            id: "shopify",
            name: t('shopify') || "Shopify",
            description: t('shopifyDescription'),
            logo: "/integrations/shopify.svg",
            iconBg: "bg-gray-100",
            connected: shopifyConnected,
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
            name: "Instagram DM",
            description: t('instagramDescription') || "Instagram Direct mesajlarını chatbot ile otomatik yanıtlayın",
            logo: "/integrations/instagram.svg",
            iconBg: "bg-gray-100",
            connected: instagramConnected,
        },
    ]

    // Connection handlers
    const handleConnectInstagram = async () => {
        if (!igPageId || !igAccessToken || !igVerifyToken) {
            toast({ title: t('error'), description: t('fillAllFields'), variant: "destructive" })
            return
        }
        setIsConnectingInstagram(true)
        try {
            const response = await fetch("/api/integrations/instagram/connect", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({ chatbotId: userId, pageId: igPageId, accessToken: igAccessToken, verifyToken: igVerifyToken })
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || "Instagram bağlantısı kurulamadı")
            toast({ title: t('success'), description: "Instagram DM entegrasyonu aktif!" })
            const res = await fetch(`/api/console/settings?chatbotId=${userId}`, { headers: await getAuthHeaders() })
            if (res.ok) {
                const d = await res.json()
                setSettings(d)
            }
        } catch (error: any) {
            toast({ title: t('error'), description: error.message, variant: "destructive" })
        } finally {
            setIsConnectingInstagram(false)
        }
    }
    const handleConnectWhatsApp = async () => {
        if (!waPhoneNumberId || !waAccessToken || !waVerifyToken) {
            toast({ title: t('error'), description: t('fillAllFields'), variant: "destructive" })
            return
        }
        setIsConnectingWhatsApp(true)
        try {
            const response = await fetch("/api/integrations/whatsapp/connect", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({ chatbotId: userId, phoneNumberId: waPhoneNumberId, accessToken: waAccessToken, verifyToken: waVerifyToken })
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || t('failedToConnect') || "Failed to connect")
            toast({ title: t('success'), description: t('whatsappConnected') })
            setIsWhatsAppOpen(false)
            const res = await fetch(`/api/console/settings?chatbotId=${userId}`, { headers: await getAuthHeaders() })
            if (res.ok) {
                const data = await res.json()
                setSettings(data)
            }
        } catch (error) {
            toast({ title: t('error'), description: t('connectionFailed'), variant: "destructive" })
        } finally {
            setIsConnectingWhatsApp(false)
        }
    }

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
            } catch (error) {
                console.error("Error fetching settings:", error)
            }
        }
        fetchSettings()
    }, [userId, user])

    const copyToClipboard = (text: string, key: string) => {
        navigator.clipboard.writeText(text)
        setCopied(key)
        toast({ title: t('copied'), description: t('codeCopied') })
        setTimeout(() => setCopied(null), 2000)
    }

    const scriptCode = `<script src="${origin}/widget.js?v=2.0" data-chatbot-id="${userId}" data-color="${brandColor}"></script>`
    const iframeCode = `<iframe src="${origin}/chatbot-view?id=${userId}" width="100%" height="600" frameborder="0" allowtransparency="true" style="background-color: transparent; border: none;"></iframe>`
    const directLink = `${origin}/chatbot-view?id=${userId}`
    const whatsappWebhookUrl = waWebhookSecret
        ? `${origin}/api/integrations/whatsapp/webhook?chatbotId=${userId}&secret=${encodeURIComponent(waWebhookSecret)}`
        : `${origin}/api/integrations/whatsapp/webhook?chatbotId=${userId}`
    const instagramWebhookUrl = igWebhookSecret
        ? `${origin}/api/integrations/instagram/webhook?chatbotId=${userId}&secret=${encodeURIComponent(igWebhookSecret)}`
        : `${origin}/api/integrations/instagram/webhook?chatbotId=${userId}`

    // Hide deprecated integrations and apply search filter
    const visibleIntegrations = integrations.filter(
        (integration) => !HIDDEN_INTEGRATION_IDS.has(integration.id)
    )
    const filteredIntegrations = visibleIntegrations.filter(integration => {
        const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            integration.description.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesSearch
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

                        {/* WhatsApp Wizard */}
                        {currentIntegration.id === "whatsapp" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        {whatsAppConnected ? (
                                            <><Check className="h-4 w-4 text-green-500" /> {t('connected')}</>
                                        ) : (
                                            t('whatsappBusinessApi')
                                        )}
                                    </CardTitle>
                                    <CardDescription>
                                        {whatsAppConnected ? t('whatsappConnectedDesc') || "WhatsApp Business API başarıyla bağlandı" : t('connectWhatsApp')}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    {whatsAppConnected ? (
                                        <div className="space-y-3">
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                                                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                                                <div className="text-sm">
                                                    <p className="font-medium text-green-800">WhatsApp Business API Aktif</p>
                                                    <p className="text-green-700 mt-1">Müşterileriniz artık WhatsApp üzerinden sizinle konuşabilir.</p>
                                                </div>
                                            </div>
                                            <div className="bg-muted p-3 rounded-md text-xs text-muted-foreground">
                                                <p className="font-medium mb-1">Webhook URL:</p>
                                                <div className="flex items-center gap-2">
                                                    <code className="break-all flex-1">{whatsappWebhookUrl}</code>
                                                    <Button size="icon" variant="ghost" className="h-6 w-6 flex-shrink-0"
                                                        onClick={() => copyToClipboard(whatsappWebhookUrl, "wa-webhook")}>
                                                        {copied === "wa-webhook" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Step progress bar */}
                                            <div className="flex items-center gap-1">
                                                {[1,2,3,4].map((s) => (
                                                    <div key={s} className="flex items-center gap-1 flex-1">
                                                        <div className={cn(
                                                            "h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 transition-colors",
                                                            waStep > s ? "bg-green-500 text-white" :
                                                            waStep === s ? "bg-black text-white" :
                                                            "bg-muted text-muted-foreground"
                                                        )}>
                                                            {waStep > s ? <Check className="h-3 w-3" /> : s}
                                                        </div>
                                                        {s < 4 && <div className={cn("flex-1 h-0.5 rounded", waStep > s ? "bg-green-500" : "bg-muted")} />}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Step 1: Create Meta App */}
                                            {waStep === 1 && (
                                                <div className="space-y-3">
                                                    <div>
                                                        <h4 className="font-semibold text-sm">Adım 1: Meta Business Hesabı Oluştur</h4>
                                                        <p className="text-xs text-muted-foreground mt-1">WhatsApp Business API kullanmak için bir Meta Developer hesabına ve uygulamasına ihtiyacınız var.</p>
                                                    </div>
                                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-2 text-xs">
                                                        <p className="font-medium text-blue-800">Yapmanız gerekenler:</p>
                                                        <ol className="list-decimal list-inside space-y-1.5 text-blue-700 ml-1">
                                                            <li>Meta for Developers sitesine gidin</li>
                                                            <li>"My Apps" → "Create App" butonuna tıklayın</li>
                                                            <li>App türü olarak <strong>"Business"</strong> seçin</li>
                                                            <li>Uygulamanıza bir isim verin ve oluşturun</li>
                                                            <li>Uygulamanıza <strong>"WhatsApp"</strong> ürününü ekleyin</li>
                                                        </ol>
                                                    </div>
                                                    <Button variant="outline" size="sm" className="w-full gap-2"
                                                        onClick={() => window.open("https://developers.facebook.com/apps/", "_blank")}>
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                        Meta Developer Panelini Aç
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Step 2: Phone Number ID */}
                                            {waStep === 2 && (
                                                <div className="space-y-3">
                                                    <div>
                                                        <h4 className="font-semibold text-sm">Adım 2: Phone Number ID'yi Girin</h4>
                                                        <p className="text-xs text-muted-foreground mt-1">Meta Developer panelinde WhatsApp → Getting Started sayfasından bulabilirsiniz.</p>
                                                    </div>
                                                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800">
                                                        <p className="font-medium mb-1">Nerede bulunur?</p>
                                                        <p>WhatsApp → <strong>Getting Started</strong> → <strong>"Phone number ID"</strong> alanı (14-16 haneli sayı)</p>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs">{t('phoneNumberId')}</Label>
                                                        <Input
                                                            placeholder="Örnek: 100609346333333"
                                                            value={waPhoneNumberId}
                                                            onChange={(e) => setWaPhoneNumberId(e.target.value)}
                                                        />
                                                    </div>
                                                    <Button variant="outline" size="sm" className="w-full gap-2"
                                                        onClick={() => window.open("https://developers.facebook.com/apps/", "_blank")}>
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                        Getting Started Sayfasını Aç
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Step 3: Access Token */}
                                            {waStep === 3 && (
                                                <div className="space-y-3">
                                                    <div>
                                                        <h4 className="font-semibold text-sm">Adım 3: Access Token'ı Girin</h4>
                                                        <p className="text-xs text-muted-foreground mt-1">Kalıcı (System User) token önerilir. Geçici test token'ı 24 saatte sona erer.</p>
                                                    </div>
                                                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800">
                                                        <p className="font-medium mb-1">Nerede bulunur?</p>
                                                        <p>WhatsApp → <strong>Getting Started</strong> → <strong>"Temporary access token"</strong> alanı</p>
                                                        <p className="mt-1 text-amber-700">💡 Üretim ortamı için: Business Manager → System Users → <strong>Kalıcı Token Oluştur</strong></p>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs">{t('accessToken')}</Label>
                                                        <Input
                                                            type="password"
                                                            placeholder="EAAG... ile başlar"
                                                            value={waAccessToken}
                                                            onChange={(e) => setWaAccessToken(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Step 4: Webhook Setup */}
                                            {waStep === 4 && (
                                                <div className="space-y-3">
                                                    <div>
                                                        <h4 className="font-semibold text-sm">Adım 4: Webhook Kurulumu</h4>
                                                        <p className="text-xs text-muted-foreground mt-1">Meta panelinde bu URL ve token'ı webhook olarak kaydedin, sonra bağlantıyı tamamlayın.</p>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div>
                                                            <p className="text-xs font-medium mb-1">Webhook URL (Meta'ya girin):</p>
                                                            <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
                                                                <code className="text-xs break-all flex-1">{whatsappWebhookUrl}</code>
                                                                <Button size="icon" variant="ghost" className="h-6 w-6 flex-shrink-0"
                                                                    onClick={() => copyToClipboard(whatsappWebhookUrl, "wa-webhook")}>
                                                                    {copied === "wa-webhook" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-medium mb-1">Verify Token (Meta'ya girin):</p>
                                                            <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
                                                                <code className="text-xs break-all flex-1">{waVerifyToken}</code>
                                                                <Button size="icon" variant="ghost" className="h-6 w-6 flex-shrink-0"
                                                                    onClick={() => copyToClipboard(waVerifyToken, "wa-verify")}>
                                                                    {copied === "wa-verify" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
                                                        <p className="font-medium mb-1">Meta panelinde yapmanız gerekenler:</p>
                                                        <ol className="list-decimal list-inside space-y-1 text-blue-700 ml-1">
                                                            <li>WhatsApp → <strong>Configuration</strong> sekmesine gidin</li>
                                                            <li><strong>"Edit"</strong> butonuna tıklayın</li>
                                                            <li>Yukarıdaki URL ve Token'ı girin</li>
                                                            <li><strong>"Verify and Save"</strong> butonuna basın</li>
                                                            <li><strong>messages</strong> webhook alanını subscribe edin</li>
                                                        </ol>
                                                    </div>
                                                    <Button variant="outline" size="sm" className="w-full gap-2"
                                                        onClick={() => window.open("https://developers.facebook.com/apps/", "_blank")}>
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                        Webhook Configuration'ı Aç
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="flex gap-2">
                                    {!whatsAppConnected && (
                                        <>
                                            {waStep > 1 && (
                                                <Button variant="outline" className="flex-1"
                                                    onClick={() => setWaStep(s => s - 1)}>
                                                    Geri
                                                </Button>
                                            )}
                                            {waStep < 4 ? (
                                                <Button className="flex-1"
                                                    disabled={
                                                        (waStep === 2 && !waPhoneNumberId) ||
                                                        (waStep === 3 && !waAccessToken)
                                                    }
                                                    onClick={() => setWaStep(s => s + 1)}>
                                                    İleri
                                                </Button>
                                            ) : (
                                                <Button
                                                    onClick={handleConnectWhatsApp}
                                                    disabled={isConnectingWhatsApp}
                                                    className="flex-1">
                                                    {isConnectingWhatsApp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    Bağlantıyı Tamamla
                                                </Button>
                                            )}
                                        </>
                                    )}
                                    {whatsAppConnected && (
                                        <Button variant="outline" className="w-full" onClick={() => setWaStep(1)}>
                                            {t('manageSettings')}
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        )}

                        {/* Instagram DM Wizard */}
                        {currentIntegration.id === "instagram" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        {instagramConnected ? (
                                            <><Check className="h-4 w-4 text-green-500" /> {t('connected')}</>
                                        ) : "Instagram DM"}
                                    </CardTitle>
                                    <CardDescription>
                                        {instagramConnected
                                            ? "Instagram Direct mesajlar chatbot ile otomatik yanıtlanıyor"
                                            : "Instagram Business hesabınızı bağlayarak DM mesajlarını otomatikleştirin"}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    {instagramConnected ? (
                                        <div className="space-y-3">
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                                                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                                                <div className="text-sm">
                                                    <p className="font-medium text-green-800">Instagram DM Entegrasyonu Aktif</p>
                                                    <p className="text-green-700 mt-1">Instagram DM mesajları artık chatbot tarafından yanıtlanıyor.</p>
                                                </div>
                                            </div>
                                            <div className="bg-muted p-3 rounded-md text-xs text-muted-foreground">
                                                <p className="font-medium mb-1">Webhook URL:</p>
                                                <div className="flex items-center gap-2">
                                                    <code className="break-all flex-1">{instagramWebhookUrl}</code>
                                                    <Button size="icon" variant="ghost" className="h-6 w-6 flex-shrink-0"
                                                        onClick={() => copyToClipboard(instagramWebhookUrl, "ig-webhook")}>
                                                        {copied === "ig-webhook" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Step progress bar */}
                                            <div className="flex items-center gap-1">
                                                {[1,2,3,4].map((s) => (
                                                    <div key={s} className="flex items-center gap-1 flex-1">
                                                        <div className={cn(
                                                            "h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 transition-colors",
                                                            igStep > s ? "bg-green-500 text-white" :
                                                            igStep === s ? "bg-black text-white" :
                                                            "bg-muted text-muted-foreground"
                                                        )}>
                                                            {igStep > s ? <Check className="h-3 w-3" /> : s}
                                                        </div>
                                                        {s < 4 && <div className={cn("flex-1 h-0.5 rounded", igStep > s ? "bg-green-500" : "bg-muted")} />}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Step 1: Meta Business App */}
                                            {igStep === 1 && (
                                                <div className="space-y-3">
                                                    <div>
                                                        <h4 className="font-semibold text-sm">Adım 1: Meta Business Hesabı ve Uygulama</h4>
                                                        <p className="text-xs text-muted-foreground mt-1">Instagram API kullanmak için Meta Developer hesabı ve Instagram Basic Display veya Messenger API kurulumu gerekli.</p>
                                                    </div>
                                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-2 text-xs">
                                                        <p className="font-medium text-blue-800">Yapmanız gerekenler:</p>
                                                        <ol className="list-decimal list-inside space-y-1.5 text-blue-700 ml-1">
                                                            <li>Meta Developer paneline gidin</li>
                                                            <li>Bir Business tipi uygulama oluşturun</li>
                                                            <li>Uygulamaya <strong>Instagram</strong> veya <strong>Messenger</strong> ürününü ekleyin</li>
                                                            <li>Instagram Business hesabınızı Facebook sayfanıza bağlayın</li>
                                                        </ol>
                                                    </div>
                                                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800">
                                                        <p className="font-medium mb-1">Gereksinim:</p>
                                                        <p>Instagram hesabınız <strong>Business</strong> veya <strong>Creator</strong> hesabı olmalı ve bir Facebook Sayfasına bağlı olmalıdır.</p>
                                                    </div>
                                                    <Button variant="outline" size="sm" className="w-full gap-2"
                                                        onClick={() => window.open("https://developers.facebook.com/apps/", "_blank")}>
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                        Meta Developer Panelini Aç
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Step 2: Page ID */}
                                            {igStep === 2 && (
                                                <div className="space-y-3">
                                                    <div>
                                                        <h4 className="font-semibold text-sm">Adım 2: Facebook Page ID</h4>
                                                        <p className="text-xs text-muted-foreground mt-1">Instagram hesabınıza bağlı Facebook Sayfasının ID numarası gereklidir.</p>
                                                    </div>
                                                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800">
                                                        <p className="font-medium mb-1">Nerede bulunur?</p>
                                                        <p>Facebook Sayfanız → <strong>Hakkında</strong> bölümü → <strong>Sayfa ID</strong></p>
                                                        <p className="mt-1">veya: Meta Business Suite → Settings → Page ID</p>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs">Facebook Page ID</Label>
                                                        <Input
                                                            placeholder="Örnek: 259873456789012"
                                                            value={igPageId}
                                                            onChange={(e) => setIgPageId(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Step 3: Access Token */}
                                            {igStep === 3 && (
                                                <div className="space-y-3">
                                                    <div>
                                                        <h4 className="font-semibold text-sm">Adım 3: Page Access Token</h4>
                                                        <p className="text-xs text-muted-foreground mt-1">Uzun ömürlü (Long-lived) Page Access Token kullanmanız önerilir.</p>
                                                    </div>
                                                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800">
                                                        <p className="font-medium mb-1">Token nasıl alınır?</p>
                                                        <ol className="list-decimal list-inside space-y-1 ml-1">
                                                            <li>Meta Developer → Tools → <strong>Graph API Explorer</strong></li>
                                                            <li>Uygulamanızı seçin</li>
                                                            <li>Generate Token ile <strong>Page Access Token</strong> oluşturun</li>
                                                            <li><strong>instagram_manage_messages</strong> iznini ekleyin</li>
                                                        </ol>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs">Page Access Token</Label>
                                                        <Input
                                                            type="password"
                                                            placeholder="EAAb... ile başlar"
                                                            value={igAccessToken}
                                                            onChange={(e) => setIgAccessToken(e.target.value)}
                                                        />
                                                    </div>
                                                    <Button variant="outline" size="sm" className="w-full gap-2"
                                                        onClick={() => window.open("https://developers.facebook.com/tools/explorer/", "_blank")}>
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                        Graph API Explorer
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Step 4: Webhook */}
                                            {igStep === 4 && (
                                                <div className="space-y-3">
                                                    <div>
                                                        <h4 className="font-semibold text-sm">Adım 4: Webhook Kurulumu</h4>
                                                        <p className="text-xs text-muted-foreground mt-1">Meta Developer panelinde bu webhook bilgilerini girerek doğrulayın.</p>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div>
                                                            <p className="text-xs font-medium mb-1">Webhook URL:</p>
                                                            <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
                                                                <code className="text-xs break-all flex-1">{instagramWebhookUrl}</code>
                                                                <Button size="icon" variant="ghost" className="h-6 w-6 flex-shrink-0"
                                                                    onClick={() => copyToClipboard(instagramWebhookUrl, "ig-webhook")}>
                                                                    {copied === "ig-webhook" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-medium mb-1">Verify Token:</p>
                                                            <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
                                                                <code className="text-xs break-all flex-1">{igVerifyToken}</code>
                                                                <Button size="icon" variant="ghost" className="h-6 w-6 flex-shrink-0"
                                                                    onClick={() => copyToClipboard(igVerifyToken, "ig-verify")}>
                                                                    {copied === "ig-verify" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
                                                        <p className="font-medium mb-1">Meta panelinde yapmanız gerekenler:</p>
                                                        <ol className="list-decimal list-inside space-y-1 text-blue-700 ml-1">
                                                            <li>Meta Developer App → <strong>Webhooks</strong> sekmesi</li>
                                                            <li>Instagram veya Messenger webhook ekleyin</li>
                                                            <li>Yukarıdaki URL ve Token bilgilerini girin</li>
                                                            <li><strong>Verify and Save</strong> butonuna basın</li>
                                                            <li><strong>messages</strong> alanını subscribe edin</li>
                                                        </ol>
                                                    </div>
                                                    <Button variant="outline" size="sm" className="w-full gap-2"
                                                        onClick={() => window.open("https://developers.facebook.com/apps/", "_blank")}>
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                        Webhook Ayarlarını Aç
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="flex gap-2">
                                    {!instagramConnected && (
                                        <>
                                            {igStep > 1 && (
                                                <Button variant="outline" className="flex-1"
                                                    onClick={() => setIgStep(s => s - 1)}>
                                                    Geri
                                                </Button>
                                            )}
                                            {igStep < 4 ? (
                                                <Button className="flex-1"
                                                    disabled={
                                                        (igStep === 2 && !igPageId) ||
                                                        (igStep === 3 && !igAccessToken)
                                                    }
                                                    onClick={() => setIgStep(s => s + 1)}>
                                                    İleri
                                                </Button>
                                            ) : (
                                                <Button
                                                    onClick={handleConnectInstagram}
                                                    disabled={isConnectingInstagram}
                                                    className="flex-1">
                                                    {isConnectingInstagram && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    Bağlantıyı Tamamla
                                                </Button>
                                            )}
                                        </>
                                    )}
                                    {instagramConnected && (
                                        <Button variant="outline" className="w-full" onClick={() => setIgStep(1)}>
                                            {t('manageSettings')}
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
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
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-semibold">
                    {t('allIntegrations')} ({filteredIntegrations.length})
                </h1>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('search')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-64"
                    />
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
        </>
    )
}
