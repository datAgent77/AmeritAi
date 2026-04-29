"use client"

import { useEffect, useState } from "react"
import { Info, Loader2, Plus, Save, Send, Trash2, UserCheck, UserX, Users } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DEFAULT_HUMAN_HANDOFF_BUSINESS_DAYS, type HumanHandoffBusinessDayCode } from "@/lib/human-handoff"
import type { OmniOperationsSettings, OmniTeamMember } from "@/lib/omni/types"

interface HumanHandoffSettingsFormProps {
    targetUserId: string
    mode?: "combined" | "agents" | "settings"
}

type HandoffState = {
    enabled: boolean
    notificationEmail: string
    notifyEmail: boolean
    notifyInApp: boolean
    triggerOnUserRequest: boolean
    triggerOnAssistantHandoff: boolean
    customWaitMessage: string
    notifyWhatsApp: boolean
    whatsappNumber: string
    notifyInstagram: boolean
    instagramAccountId: string
    businessHoursEnabled: boolean
    businessHoursStart: string
    businessHoursEnd: string
    businessHoursTimezone: string
    businessDays: HumanHandoffBusinessDayCode[]
}

type AgentDraft = {
    name: string
    email: string
    role: OmniTeamMember["role"]
}

const DAY_OPTIONS: Array<{ code: HumanHandoffBusinessDayCode; label: string }> = [
    { code: "Mon", label: "Pazartesi" },
    { code: "Tue", label: "Salı" },
    { code: "Wed", label: "Çarşamba" },
    { code: "Thu", label: "Perşembe" },
    { code: "Fri", label: "Cuma" },
    { code: "Sat", label: "Cumartesi" },
    { code: "Sun", label: "Pazar" },
]

const DEFAULT_STATE: HandoffState = {
    enabled: false,
    notificationEmail: "",
    notifyEmail: true,
    notifyInApp: true,
    triggerOnUserRequest: true,
    triggerOnAssistantHandoff: true,
    customWaitMessage: "",
    notifyWhatsApp: false,
    whatsappNumber: "",
    notifyInstagram: false,
    instagramAccountId: "",
    businessHoursEnabled: false,
    businessHoursStart: "09:00",
    businessHoursEnd: "18:00",
    businessHoursTimezone: "UTC",
    businessDays: DEFAULT_HUMAN_HANDOFF_BUSINESS_DAYS,
}

const DEFAULT_OPERATIONS_STATE: OmniOperationsSettings = {
    workspaceLabel: "",
    defaultAssignee: "",
    callbackAssignee: "",
    appointmentAssignee: "",
    leadAssignee: "",
    escalationEmail: "",
    escalationPhone: "",
    callbackSlaHours: 4,
    reviewMode: "assistant",
    notes: "",
    teamMembers: [],
}

const DEFAULT_AGENT_DRAFT: AgentDraft = {
    name: "",
    email: "",
    role: "operations",
}

function normalizeTeamMemberValue(values: { name?: string; email?: string; fallback?: string }) {
    return String(values.email || values.name || values.fallback || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
}

function hasMeaningfulTeamMemberInput(member: OmniTeamMember) {
    const name = String(member?.name || "").trim()
    const email = String(member?.email || "").trim()
    return Boolean(name || email)
}

function sanitizeTeamMembers(members: OmniTeamMember[]): OmniTeamMember[] {
    return members
        .filter(hasMeaningfulTeamMemberInput)
        .map((member, index) => {
            const name = String(member.name || "").trim()
            const email = String(member.email || "").trim().toLowerCase()
            const fallbackId = normalizeTeamMemberValue({
                name,
                email,
                fallback: `member-${index + 1}`,
            })
            return {
                ...member,
                id: String(member.id || fallbackId).trim() || fallbackId,
                name,
                email: email || null,
                active: member.active !== false,
                role: member.role === "support" || member.role === "sales" || member.role === "manager"
                    ? member.role
                    : "operations",
            }
        })
}

function isTeamMemberRole(value: string): value is NonNullable<OmniTeamMember["role"]> {
    return value === "operations" || value === "support" || value === "sales" || value === "manager"
}

export function HumanHandoffSettingsForm({ targetUserId, mode = "combined" }: HumanHandoffSettingsFormProps) {
    const { user, role } = useAuth()
    const { language } = useLanguage()
    const isSuperAdmin = role === 'SUPER_ADMIN' || role === 'AGENCY_ADMIN';
    const isAgentUser = role === "AGENT"
    const canManage = !isAgentUser
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [state, setState] = useState<HandoffState>(DEFAULT_STATE)
    const [operations, setOperations] = useState<OmniOperationsSettings>(DEFAULT_OPERATIONS_STATE)
    const [isRosterLoading, setIsRosterLoading] = useState(true)
    const [isRosterSaving, setIsRosterSaving] = useState(false)
    const [isAddAgentOpen, setIsAddAgentOpen] = useState(false)
    const [agentDraft, setAgentDraft] = useState<AgentDraft>(DEFAULT_AGENT_DRAFT)
    const [activeTab, setActiveTab] = useState<"agents" | "settings">(mode === "agents" ? "agents" : "settings")
    const i18n = language === "tr"
        ? {
            pageTitle: "Agent ve Aktarma Yonetimi",
            pageDescription: "Bu sayfada Agent hesaplarini yonetebilir, temsilciye aktarma kurallarini ve bildirim ayarlarini tek yerden duzenleyebilirsiniz.",
            pageDescriptionAgents: "Bu sayfada yalnızca eklenen Agent hesaplarını yönetirsiniz.",
            pageDescriptionSettings: "Bu sayfada müşteri temsilcisine aktarma modülünün tüm ayarlarını yönetirsiniz.",
            tabAgents: "Agentlar",
            tabSettings: "Ayarlar",
            agentAccountsTitle: "Agent Hesaplari",
            agentAccountsDescription: "Bu liste tenant hesabiniza ozeldir. Agent ekleme ve davet gonderme islemi Agent Ekle modalindan tamamlanir.",
            agentFlowTitle: "Agentlar nasil calisir?",
            agentFlowDescription: "Agent hesaplari davetle olusturulur ve yalnizca bagli olduklari tenant calisma alanina erisir.",
            agentFlowSteps: [
                "Agent satiri eklenir, ad/e-posta/rol bilgisi girilir ve hesaplar kaydedilir.",
                "Sistem agent icin Firebase Auth hesabi olusturur veya mevcut hesabi AGENT rolune baglar.",
                "Yeni ve aktif agentlara sifre belirleme linki iceren davet e-postasi gonderilir.",
                "Agent linkten sifresini belirler, /login uzerinden giris yapar ve dogrudan tenant sohbet alanina yonlenir.",
                "Agent yalnizca kendi tenant verisine erisebilir; egitim, skills, widget, entegrasyon ve agent yonetimi yapamaz.",
            ],
            agentFlowCloseNote: "Bu akista agent e-postasi davetle guvenilir kabul edilir; ayrica e-posta dogrulama adimina takilmaz.",
            loadingAgents: "Agent hesaplari yukleniyor...",
            emptyAgents: "Henuz Agent hesabi yok. \"Agent Ekle\" ile yeni hesap tanimlayin.",
            fullNamePlaceholder: "Ad Soyad",
            activeLabel: "Aktif",
            inactiveLabel: "Pasif",
            addAgent: "Agent Ekle",
            sendInvite: "Davet gonder",
            inviteSentTitle: "Davet gonderildi",
            inviteSentDescription: "Agent hesabi kaydedildi ve davet e-postasi gonderildi.",
            inviteFailedTitle: "Davet gonderilemedi",
            inviteFailedDescription: "Agent hesabi kaydedildi ancak davet e-postasi gonderilemedi.",
            invalidAgentEmail: "Gecerli bir agent e-postasi girin.",
            agentUpdatedTitle: "Agent guncellendi",
            agentUpdatedDescription: "Agent durumu guncellendi.",
            agentDeletedTitle: "Agent silindi",
            agentDeletedDescription: "Agent roster'dan kaldirildi ve tenant erisimi kapatildi.",
            agentUpdateFailedTitle: "Agent guncellenemedi",
            deleteAgentConfirm: "Bu agent roster'dan kaldirilacak ve tenant erisimi kapatilacak. Devam edilsin mi?",
            activateAgent: "Aktif yap",
            deactivateAgent: "Pasif yap",
            deleteAgent: "Sil",
            agentRole: "Rol",
            agentStatus: "Durum",
            agentEmail: "E-posta",
            existingAgents: "Mevcut Agentlar",
            save: "Kaydet",
        }
        : {
            pageTitle: "Agent and Handoff Management",
            pageDescription: "Manage agent accounts, human handoff rules, and notification settings from a single page.",
            pageDescriptionAgents: "Manage only the added agent accounts on this page.",
            pageDescriptionSettings: "Manage all human handoff module settings on this page.",
            tabAgents: "Agents",
            tabSettings: "Settings",
            agentAccountsTitle: "Agent Accounts",
            agentAccountsDescription: "This list is tenant-specific. Add and invite agents from the Add Agent modal.",
            agentFlowTitle: "How do agents work?",
            agentFlowDescription: "Agent accounts are invitation-based and can access only their assigned tenant workspace.",
            agentFlowSteps: [
                "Add an agent row, enter name/email/role, and save the accounts.",
                "The system creates a Firebase Auth account or binds the existing account to the AGENT role.",
                "New active agents receive an invitation email with a password setup link.",
                "The agent sets a password from the link, signs in from /login, and lands directly in the tenant chat workspace.",
                "The agent can access only the assigned tenant data and cannot manage training, skills, widget, integrations, or agent accounts.",
            ],
            agentFlowCloseNote: "In this flow the invited agent email is treated as trusted, so the login is not blocked by a separate email verification step.",
            loadingAgents: "Loading agent accounts...",
            emptyAgents: "No agent account yet. Add a new one with \"Add Agent\".",
            fullNamePlaceholder: "Full Name",
            activeLabel: "Active",
            inactiveLabel: "Passive",
            addAgent: "Add Agent",
            sendInvite: "Send invitation",
            inviteSentTitle: "Invitation sent",
            inviteSentDescription: "Agent account was saved and the invitation email was sent.",
            inviteFailedTitle: "Invitation failed",
            inviteFailedDescription: "Agent account was saved but the invitation email could not be sent.",
            invalidAgentEmail: "Enter a valid agent email.",
            agentUpdatedTitle: "Agent updated",
            agentUpdatedDescription: "Agent status was updated.",
            agentDeletedTitle: "Agent deleted",
            agentDeletedDescription: "Agent was removed from the roster and tenant access was revoked.",
            agentUpdateFailedTitle: "Agent update failed",
            deleteAgentConfirm: "This agent will be removed from the roster and tenant access will be revoked. Continue?",
            activateAgent: "Activate",
            deactivateAgent: "Deactivate",
            deleteAgent: "Delete",
            agentRole: "Role",
            agentStatus: "Status",
            agentEmail: "Email",
            existingAgents: "Current Agents",
            save: "Save",
        }

    useEffect(() => {
        const load = async () => {
            if (!user?.uid) return
            setIsLoading(true)
            try {
                const token = await user.getIdToken()
                const response = await fetch(`/api/console/settings?chatbotId=${targetUserId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                const data = response.ok ? await response.json() : {}

                setState({
                    enabled: data.enableHumanHandoff === true,
                    notificationEmail: typeof data.humanHandoffSettings?.notificationEmail === "string" ? data.humanHandoffSettings.notificationEmail : "",
                    notifyEmail: data.humanHandoffSettings?.notifyEmail !== false,
                    notifyInApp: data.humanHandoffSettings?.notifyInApp !== false,
                    triggerOnUserRequest: data.humanHandoffSettings?.triggerOnUserRequest !== false,
                    triggerOnAssistantHandoff: data.humanHandoffSettings?.triggerOnAssistantHandoff !== false,
                    customWaitMessage: typeof data.humanHandoffSettings?.customWaitMessage === "string" ? data.humanHandoffSettings.customWaitMessage : "",
                    notifyWhatsApp: data.humanHandoffSettings?.notifyWhatsApp === true,
                    whatsappNumber: typeof data.humanHandoffSettings?.whatsappNumber === "string" ? data.humanHandoffSettings.whatsappNumber : "",
                    notifyInstagram: data.humanHandoffSettings?.notifyInstagram === true,
                    instagramAccountId: typeof data.humanHandoffSettings?.instagramAccountId === "string" ? data.humanHandoffSettings.instagramAccountId : "",
                    businessHoursEnabled: data.humanHandoffSettings?.businessHoursEnabled === true || data.enableBusinessHours === true,
                    businessHoursStart: typeof data.humanHandoffSettings?.businessHoursStart === "string" && data.humanHandoffSettings.businessHoursStart
                        ? data.humanHandoffSettings.businessHoursStart
                        : (typeof data.businessHoursStart === "string" && data.businessHoursStart ? data.businessHoursStart : "09:00"),
                    businessHoursEnd: typeof data.humanHandoffSettings?.businessHoursEnd === "string" && data.humanHandoffSettings.businessHoursEnd
                        ? data.humanHandoffSettings.businessHoursEnd
                        : (typeof data.businessHoursEnd === "string" && data.businessHoursEnd ? data.businessHoursEnd : "18:00"),
                    businessHoursTimezone: typeof data.humanHandoffSettings?.businessHoursTimezone === "string" && data.humanHandoffSettings.businessHoursTimezone
                        ? data.humanHandoffSettings.businessHoursTimezone
                        : (typeof data.timezone === "string" && data.timezone ? data.timezone : "UTC"),
                    businessDays: Array.isArray(data.humanHandoffSettings?.businessDays) && data.humanHandoffSettings.businessDays.length > 0
                        ? data.humanHandoffSettings.businessDays.filter((value: unknown): value is HumanHandoffBusinessDayCode => DAY_OPTIONS.some((day) => day.code === value))
                        : DEFAULT_HUMAN_HANDOFF_BUSINESS_DAYS,
                })
            } catch (error) {
                console.error("Failed to load handoff settings:", error)
                toast({
                    title: "Hata",
                    description: "Musteri temsilcisi ayarlari yuklenemedi.",
                    variant: "destructive",
                })
            } finally {
                setIsLoading(false)
            }
        }

        load()
    }, [targetUserId, toast, user])

    useEffect(() => {
        const loadRoster = async () => {
            if (!user?.uid) return
            setIsRosterLoading(true)
            try {
                const token = await user.getIdToken()
                const response = await fetch(`/api/omni/settings?chatbotId=${targetUserId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })

                if (!response.ok) {
                    if (response.status === 403) {
                        setOperations(DEFAULT_OPERATIONS_STATE)
                        return
                    }
                    throw new Error("Roster load failed")
                }

                const data = await response.json()
                const nextOperations = data?.operations || {}
                setOperations({
                    ...DEFAULT_OPERATIONS_STATE,
                    ...nextOperations,
                    teamMembers: sanitizeTeamMembers(Array.isArray(nextOperations.teamMembers) ? nextOperations.teamMembers : []),
                })
            } catch (error) {
                console.error("Failed to load agent accounts:", error)
                toast({
                    title: "Hata",
                    description: "Agent hesaplari yuklenemedi.",
                    variant: "destructive",
                })
            } finally {
                setIsRosterLoading(false)
            }
        }

        loadRoster()
    }, [targetUserId, toast, user])

    useEffect(() => {
        if (mode !== "combined") return
        if (typeof window === "undefined") return
        const currentHash = window.location.hash
        if (currentHash === "#agent-accounts") {
            setActiveTab("agents")
            return
        }
        setActiveTab("settings")
    }, [mode])

    useEffect(() => {
        if (mode === "agents") {
            setActiveTab("agents")
            return
        }
        if (mode === "settings") {
            setActiveTab("settings")
        }
    }, [mode])

    const sendAgentInvite = async () => {
        if (!user?.uid) return
        if (!canManage) return
        const name = agentDraft.name.trim()
        const email = agentDraft.email.trim().toLowerCase()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast({
                title: language === "tr" ? "Hata" : "Error",
                description: i18n.invalidAgentEmail,
                variant: "destructive",
            })
            return
        }

        setIsRosterSaving(true)
        try {
            const token = await user.getIdToken()
            const existingMembers = sanitizeTeamMembers(operations.teamMembers || [])
            const nextMembers = sanitizeTeamMembers([
                ...existingMembers.filter((member) => String(member.email || "").trim().toLowerCase() !== email),
                {
                    id: normalizeTeamMemberValue({ name, email, fallback: `member-${existingMembers.length + 1}` }),
                    name,
                    email,
                    role: agentDraft.role,
                    active: true,
                },
            ])
            const response = await fetch("/api/omni/settings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    chatbotId: targetUserId,
                    operations: {
                        ...operations,
                        teamMembers: nextMembers,
                    },
                    agentInvitationEmails: [email],
                }),
            })

            if (!response.ok) {
                throw new Error("Roster save failed")
            }

            const data = await response.json()
            const nextOperations = data?.operations || {}
            setOperations({
                ...DEFAULT_OPERATIONS_STATE,
                ...nextOperations,
                teamMembers: sanitizeTeamMembers(Array.isArray(nextOperations.teamMembers) ? nextOperations.teamMembers : []),
            })
            const invitedCount = Number(data?.agentProvisioning?.invited || 0)
            const failedCount = Number(data?.agentProvisioning?.failed || 0)
            const provisioningErrors = Array.isArray(data?.agentProvisioning?.errors)
                ? data.agentProvisioning.errors.filter(Boolean).join(" ")
                : ""
            if (failedCount > 0 || invitedCount === 0) {
                throw new Error(provisioningErrors || i18n.inviteFailedDescription)
            }

            setAgentDraft(DEFAULT_AGENT_DRAFT)
            setIsAddAgentOpen(false)
            toast({
                title: i18n.inviteSentTitle,
                description: i18n.inviteSentDescription,
            })
        } catch (error) {
            console.error("Failed to save agent accounts:", error)
            toast({
                title: i18n.inviteFailedTitle,
                description: error instanceof Error && error.message ? error.message : i18n.inviteFailedDescription,
                variant: "destructive",
            })
        } finally {
            setIsRosterSaving(false)
        }
    }

    const persistAgentRoster = async (nextMembers: OmniTeamMember[], successMessage: { title: string; description: string }) => {
        if (!user?.uid) return
        if (!canManage) return
        setIsRosterSaving(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/omni/settings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    chatbotId: targetUserId,
                    operations: {
                        ...operations,
                        teamMembers: sanitizeTeamMembers(nextMembers),
                    },
                }),
            })

            if (!response.ok) {
                throw new Error("Roster update failed")
            }

            const data = await response.json()
            const nextOperations = data?.operations || {}
            const provisioningErrors = Array.isArray(data?.agentProvisioning?.errors)
                ? data.agentProvisioning.errors.filter(Boolean).join(" ")
                : ""
            if (Number(data?.agentProvisioning?.failed || 0) > 0) {
                throw new Error(provisioningErrors || i18n.agentUpdateFailedTitle)
            }

            setOperations({
                ...DEFAULT_OPERATIONS_STATE,
                ...nextOperations,
                teamMembers: sanitizeTeamMembers(Array.isArray(nextOperations.teamMembers) ? nextOperations.teamMembers : []),
            })
            toast(successMessage)
        } catch (error) {
            console.error("Failed to update agent roster:", error)
            toast({
                title: i18n.agentUpdateFailedTitle,
                description: error instanceof Error && error.message ? error.message : i18n.agentUpdateFailedTitle,
                variant: "destructive",
            })
        } finally {
            setIsRosterSaving(false)
        }
    }

    const toggleAgentActive = (index: number, active: boolean) => {
        const nextMembers = (operations.teamMembers || []).map((member, memberIndex) =>
            memberIndex === index ? { ...member, active } : member
        )
        persistAgentRoster(nextMembers, {
            title: i18n.agentUpdatedTitle,
            description: i18n.agentUpdatedDescription,
        })
    }

    const deleteAgent = (index: number) => {
        if (typeof window !== "undefined" && !window.confirm(i18n.deleteAgentConfirm)) return
        const nextMembers = (operations.teamMembers || []).filter((_, memberIndex) => memberIndex !== index)
        persistAgentRoster(nextMembers, {
            title: i18n.agentDeletedTitle,
            description: i18n.agentDeletedDescription,
        })
    }

    const saveSettings = async () => {
        if (!user?.uid) return
        if (!canManage) return
        setIsSaving(true)
        try {
            const notifyEmail = state.enabled ? true : state.notifyEmail
            const notifyInApp = state.enabled ? true : state.notifyInApp
            const token = await user.getIdToken()
            const response = await fetch("/api/console/settings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    chatbotId: targetUserId,
                    userSettings: {
                        enableHumanHandoff: state.enabled,
                        humanHandoffSettings: {
                            notificationEmail: state.notificationEmail,
                            notifyEmail,
                            notifyInApp,
                            triggerOnUserRequest: state.triggerOnUserRequest,
                            triggerOnAssistantHandoff: state.triggerOnAssistantHandoff,
                            customWaitMessage: state.customWaitMessage,
                            notifyWhatsApp: state.notifyWhatsApp,
                            whatsappNumber: state.whatsappNumber,
                            notifyInstagram: state.notifyInstagram,
                            instagramAccountId: state.instagramAccountId,
                            businessHoursEnabled: state.businessHoursEnabled,
                            businessHoursStart: state.businessHoursStart,
                            businessHoursEnd: state.businessHoursEnd,
                            businessHoursTimezone: state.businessHoursTimezone,
                            businessDays: state.businessDays,
                        },
                    },
                    chatbotSettings: {
                        enableHumanHandoff: state.enabled,
                        humanHandoffSettings: {
                            notificationEmail: state.notificationEmail,
                            notifyEmail,
                            notifyInApp,
                            triggerOnUserRequest: state.triggerOnUserRequest,
                            triggerOnAssistantHandoff: state.triggerOnAssistantHandoff,
                            customWaitMessage: state.customWaitMessage,
                            notifyWhatsApp: state.notifyWhatsApp,
                            whatsappNumber: state.whatsappNumber,
                            notifyInstagram: state.notifyInstagram,
                            instagramAccountId: state.instagramAccountId,
                            businessHoursEnabled: state.businessHoursEnabled,
                            businessHoursStart: state.businessHoursStart,
                            businessHoursEnd: state.businessHoursEnd,
                            businessHoursTimezone: state.businessHoursTimezone,
                            businessDays: state.businessDays,
                        },
                    },
                }),
            })

            if (!response.ok) throw new Error("Save failed")

            toast({
                title: "Kaydedildi",
                description: "Musteri temsilcisine aktarma ayarlari guncellendi.",
            })
            setState((prev) => ({ ...prev, notifyEmail, notifyInApp }))
        } catch (error) {
            console.error("Failed to save handoff settings:", error)
            toast({
                title: "Hata",
                description: "Ayarlar kaydedilemedi.",
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex min-h-[300px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const pageTitle = mode === "agents"
        ? i18n.tabAgents
        : mode === "settings"
            ? (language === "tr" ? "Müşteri Temsilcisine Aktarma" : "Human Handoff")
            : i18n.pageTitle
    const pageDescription = mode === "agents"
        ? i18n.pageDescriptionAgents
        : mode === "settings"
            ? i18n.pageDescriptionSettings
            : i18n.pageDescription

    return (
        <div className="flex w-full flex-col gap-6 px-8 py-8">
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
                </div>
                <p className="max-w-3xl text-sm text-muted-foreground">
                    {pageDescription}
                </p>
            </div>

            <Tabs
                value={activeTab}
                onValueChange={(value) => {
                    if (mode !== "combined") return
                    const nextTab = value === "settings" ? "settings" : "agents"
                    setActiveTab(nextTab)
                    if (typeof window !== "undefined") {
                        const nextHash = nextTab === "agents" ? "#agent-accounts" : "#agent-settings"
                        window.history.replaceState(null, "", `${window.location.pathname}${nextHash}`)
                    }
                }}
                className="space-y-4"
            >
                {mode === "combined" && (
                    <TabsList>
                        <TabsTrigger value="agents">{i18n.tabAgents}</TabsTrigger>
                        <TabsTrigger value="settings">{i18n.tabSettings}</TabsTrigger>
                    </TabsList>
                )}

                <TabsContent value="agents" className="space-y-4">
                    <div id="agent-accounts" className="scroll-mt-24" />
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                {i18n.agentAccountsTitle}
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                            aria-label={i18n.agentFlowTitle}
                                        >
                                            <Info className="h-4 w-4" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-xl">
                                        <DialogHeader>
                                            <DialogTitle>{i18n.agentFlowTitle}</DialogTitle>
                                            <DialogDescription>
                                                {i18n.agentFlowDescription}
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 text-sm text-muted-foreground">
                                            <ol className="space-y-3 pl-5 list-decimal">
                                                {i18n.agentFlowSteps.map((step) => (
                                                    <li key={step} className="leading-relaxed">
                                                        {step}
                                                    </li>
                                                ))}
                                            </ol>
                                            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-foreground">
                                                {i18n.agentFlowCloseNote}
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </CardTitle>
                            <CardDescription>
                                {i18n.agentAccountsDescription}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isRosterLoading ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {i18n.loadingAgents}
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <h3 className="text-sm font-medium text-muted-foreground">{i18n.existingAgents}</h3>
                                        <Dialog open={isAddAgentOpen} onOpenChange={setIsAddAgentOpen}>
                                            <DialogTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    disabled={!canManage}
                                                    onClick={() => setAgentDraft(DEFAULT_AGENT_DRAFT)}
                                                >
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    {i18n.addAgent}
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-lg">
                                                <DialogHeader>
                                                    <DialogTitle>{i18n.addAgent}</DialogTitle>
                                                    <DialogDescription className="pb-3">
                                                        {i18n.agentAccountsDescription}
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="agent-draft-name">{i18n.fullNamePlaceholder}</Label>
                                                        <Input
                                                            id="agent-draft-name"
                                                            value={agentDraft.name}
                                                            onChange={(event) => setAgentDraft((current) => ({ ...current, name: event.target.value }))}
                                                            placeholder={i18n.fullNamePlaceholder}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="agent-draft-email">{i18n.agentEmail}</Label>
                                                        <Input
                                                            id="agent-draft-email"
                                                            value={agentDraft.email}
                                                            onChange={(event) => setAgentDraft((current) => ({ ...current, email: event.target.value }))}
                                                            placeholder="agent@firma.com"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="agent-draft-role">{i18n.agentRole}</Label>
                                                        <select
                                                            id="agent-draft-role"
                                                            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                            value={agentDraft.role}
                                                            onChange={(event) => setAgentDraft((current) => ({
                                                                ...current,
                                                                role: isTeamMemberRole(event.target.value) ? event.target.value : "operations",
                                                            }))}
                                                        >
                                                            <option value="operations">operations</option>
                                                            <option value="support">support</option>
                                                            <option value="sales">sales</option>
                                                            <option value="manager">manager</option>
                                                        </select>
                                                    </div>
                                                    <Button type="button" className="w-full" onClick={sendAgentInvite} disabled={isRosterSaving || !canManage}>
                                                        {isRosterSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                                        {i18n.sendInvite}
                                                    </Button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>

                                    {(operations.teamMembers || []).length === 0 ? (
                                        <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                            {i18n.emptyAgents}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {(operations.teamMembers || []).map((member, index) => (
                                                <div key={member.id || index} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1.2fr_1.5fr_0.7fr_0.7fr_auto]">
                                                    <div>
                                                        <div className="font-medium">{member.name || "-"}</div>
                                                        <div className="text-xs text-muted-foreground">{member.id}</div>
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">{member.email || "-"}</div>
                                                    <Badge variant="outline" className="w-fit">{member.role || "operations"}</Badge>
                                                    <Badge variant={member.active !== false ? "default" : "secondary"} className="w-fit">
                                                        {member.active !== false ? i18n.activeLabel : i18n.inactiveLabel}
                                                    </Badge>
                                                    <div className="flex items-center gap-2 justify-end">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            disabled={!canManage || isRosterSaving}
                                                            onClick={() => toggleAgentActive(index, member.active === false)}
                                                            aria-label={member.active === false ? i18n.activateAgent : i18n.deactivateAgent}
                                                            title={member.active === false ? i18n.activateAgent : i18n.deactivateAgent}
                                                        >
                                                            {member.active === false ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            disabled={!canManage || isRosterSaving}
                                                            onClick={() => deleteAgent(index)}
                                                            aria-label={i18n.deleteAgent}
                                                            title={i18n.deleteAgent}
                                                            className="text-destructive hover:text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="settings" className="space-y-6">
                    <div id="agent-settings" className="scroll-mt-24" />
                    {isSuperAdmin && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Modul durumu</CardTitle>
                                <CardDescription>Varsayilan olarak kapali gelir, tum paketlerde acilabilir.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex items-center justify-between gap-4">
                                <div>
                                    <Label htmlFor="handoff-enabled" className="text-base font-medium">Musteri temsilcisine aktarmayi aktif et</Label>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Aktif oldugunda callback kaydi, e-posta ve uygulama ici bildirim uretebilir.
                                    </p>
                                </div>
                                <Switch
                                    id="handoff-enabled"
                                    checked={state.enabled}
                                    onCheckedChange={(checked) =>
                                        setState((prev) => ({
                                            ...prev,
                                            enabled: checked,
                                            notifyEmail: checked ? true : prev.notifyEmail,
                                            notifyInApp: checked ? true : prev.notifyInApp,
                                        }))
                                    }
                                />
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>Bekleme Mesajı</CardTitle>
                            <CardDescription>
                                Kullanıcı canlı desteğe aktarıldığında chat ekranında görünecek olan bilgilendirme mesajı.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Label htmlFor="custom-wait-message">Özel Bekleme Mesajı</Label>
                                <Textarea
                                    id="custom-wait-message"
                                    value={state.customWaitMessage}
                                    onChange={(event) => setState((prev) => ({ ...prev, customWaitMessage: event.target.value }))}
                                    placeholder="Örn: Talebinizi aldık, ekibimiz birazdan sizinle iletişime geçecek."
                                    className="min-h-[100px]"
                                />
                                <p className="text-sm text-muted-foreground">Boş bırakılırsa sistemin varsayılan standart mesajı gösterilir.</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Mesai Saatleri</CardTitle>
                            <CardDescription>
                                Temsilciye aktarma talebi geldiğinde mesai saati dışında olup olmadığını kontrol et.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="flex items-center justify-between rounded-xl border p-4">
                                <div>
                                    <Label htmlFor="handoff-business-hours" className="text-base font-medium">Mesai saati kontrolü</Label>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Aktif olduğunda widget, temsilci taleplerinde mesai dışı bilgisini kullanıcıya söyler.
                                    </p>
                                </div>
                                <Switch
                                    id="handoff-business-hours"
                                    checked={state.businessHoursEnabled}
                                    onCheckedChange={(checked) => setState((prev) => ({ ...prev, businessHoursEnabled: checked }))}
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-2">
                                    <Label htmlFor="handoff-business-start">Başlangıç</Label>
                                    <Input
                                        id="handoff-business-start"
                                        type="time"
                                        value={state.businessHoursStart}
                                        onChange={(event) => setState((prev) => ({ ...prev, businessHoursStart: event.target.value }))}
                                        disabled={!state.businessHoursEnabled}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="handoff-business-end">Bitiş</Label>
                                    <Input
                                        id="handoff-business-end"
                                        type="time"
                                        value={state.businessHoursEnd}
                                        onChange={(event) => setState((prev) => ({ ...prev, businessHoursEnd: event.target.value }))}
                                        disabled={!state.businessHoursEnabled}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="handoff-business-timezone">Saat Dilimi</Label>
                                    <Input
                                        id="handoff-business-timezone"
                                        value={state.businessHoursTimezone}
                                        onChange={(event) => setState((prev) => ({ ...prev, businessHoursTimezone: event.target.value }))}
                                        placeholder="Europe/Istanbul"
                                        disabled={!state.businessHoursEnabled}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label>Aktif Günler</Label>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    {DAY_OPTIONS.map((day) => {
                                        const checked = state.businessDays.includes(day.code)
                                        return (
                                            <label key={day.code} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${state.businessHoursEnabled ? "cursor-pointer" : "opacity-60"}`}>
                                                <Checkbox
                                                    checked={checked}
                                                    disabled={!state.businessHoursEnabled}
                                                    onCheckedChange={(nextChecked) => {
                                                        setState((prev) => ({
                                                            ...prev,
                                                            businessDays: nextChecked
                                                                ? [...prev.businessDays, day.code]
                                                                : prev.businessDays.filter((value) => value !== day.code),
                                                        }))
                                                    }}
                                                />
                                                <span className="text-sm">{day.label}</span>
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Bildirim ayarlari</CardTitle>
                            <CardDescription>
                                E-posta belirtilmezse Omni escalation email, lead notification email veya tenant e-postasi sirayla fallback olarak kullanilir.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="handoff-email">Bildirim e-postasi</Label>
                                <Input
                                    id="handoff-email"
                                    value={state.notificationEmail}
                                    onChange={(event) => setState((prev) => ({ ...prev, notificationEmail: event.target.value }))}
                                    placeholder="destek@firma.com"
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="flex items-center justify-between rounded-xl border p-4">
                                    <div>
                                        <Label htmlFor="notify-email">E-posta bildirimi</Label>
                                        <p className="mt-1 text-sm text-muted-foreground">Callback olustugunda e-posta gonder.</p>
                                    </div>
                                    <Switch
                                        id="notify-email"
                                        checked={state.notifyEmail}
                                        onCheckedChange={(checked) => setState((prev) => ({ ...prev, notifyEmail: checked }))}
                                    />
                                </div>

                                <div className="flex items-center justify-between rounded-xl border p-4">
                                    <div>
                                        <Label htmlFor="notify-inapp">Uygulama ici bildirim</Label>
                                        <p className="mt-1 text-sm text-muted-foreground">Tenant panelinde okunabilir bildirim olustur.</p>
                                    </div>
                                    <Switch
                                        id="notify-inapp"
                                        checked={state.notifyInApp}
                                        onCheckedChange={(checked) => setState((prev) => ({ ...prev, notifyInApp: checked }))}
                                    />
                                </div>

                                <div className="flex items-center justify-between rounded-xl border p-4">
                                    <div>
                                        <Label htmlFor="trigger-user">Kullanici temsilci isterse</Label>
                                        <p className="mt-1 text-sm text-muted-foreground">Acik temsilci taleplerini otomatik yakala.</p>
                                    </div>
                                    <Switch
                                        id="trigger-user"
                                        checked={state.triggerOnUserRequest}
                                        onCheckedChange={(checked) => setState((prev) => ({ ...prev, triggerOnUserRequest: checked }))}
                                    />
                                </div>

                                <div className="flex items-center justify-between rounded-xl border p-4">
                                    <div>
                                        <Label htmlFor="trigger-assistant">Assistant escalation</Label>
                                        <p className="mt-1 text-sm text-muted-foreground">Guided veya assistant handoff aksiyonlarini isle.</p>
                                    </div>
                                    <Switch
                                        id="trigger-assistant"
                                        checked={state.triggerOnAssistantHandoff}
                                        onCheckedChange={(checked) => setState((prev) => ({ ...prev, triggerOnAssistantHandoff: checked }))}
                                    />
                                </div>
                            </div>

                            <div className="mt-6 grid gap-4 border-t pt-6 md:grid-cols-2">
                                <div className="flex flex-col gap-4 rounded-xl border p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label htmlFor="notify-wa">WhatsApp Bildirimi</Label>
                                            <p className="mt-1 text-sm text-muted-foreground">Aktarım taleplerini WhatsApp&apos;a linkli bildirim olarak gönder.</p>
                                        </div>
                                        <Switch
                                            id="notify-wa"
                                            checked={state.notifyWhatsApp}
                                            onCheckedChange={(checked) => setState((prev) => ({ ...prev, notifyWhatsApp: checked }))}
                                        />
                                    </div>
                                    {state.notifyWhatsApp && (
                                        <Input
                                            placeholder="WhatsApp Numaranız (+90...)"
                                            value={state.whatsappNumber}
                                            onChange={(event) => setState((prev) => ({ ...prev, whatsappNumber: event.target.value }))}
                                        />
                                    )}
                                </div>

                                <div className="flex flex-col gap-4 rounded-xl border p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label htmlFor="notify-ig">Instagram Bildirimi</Label>
                                            <p className="mt-1 text-sm text-muted-foreground">Aktarım taleplerini Instagram DM olarak gönder.</p>
                                        </div>
                                        <Switch
                                            id="notify-ig"
                                            checked={state.notifyInstagram}
                                            onCheckedChange={(checked) => setState((prev) => ({ ...prev, notifyInstagram: checked }))}
                                        />
                                    </div>
                                    {state.notifyInstagram && (
                                        <Input
                                            placeholder="Instagram Kullanıcı Adı/ID"
                                            value={state.instagramAccountId}
                                            onChange={(event) => setState((prev) => ({ ...prev, instagramAccountId: event.target.value }))}
                                        />
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button onClick={saveSettings} disabled={isSaving || !canManage}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {i18n.save}
                        </Button>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
