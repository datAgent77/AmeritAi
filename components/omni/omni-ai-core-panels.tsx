"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/context/AuthContext"
import { useOmniAccount } from "@/context/OmniAccountContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { OMNI_CHANNELS, resolveCapabilityIdsForChannel } from "@/lib/omni/assistant-capabilities"
import { getOmniCapabilityDescription, getOmniCapabilityTitle, getOmniChannelLabel, getOmniEnumLabel } from "@/lib/omni/i18n"
import type {
    AssistantCapability,
    AssistantCapabilityId,
    ChannelPolicy,
    OmniAssistantCoreSettings,
    OmniAssistantProfile,
    OmniChannel,
    OmniCustomerMemorySettings,
    OmniKnowledgeGovernanceSettings,
} from "@/lib/omni/types"

interface OmniAiCorePayload {
    assistantCore: OmniAssistantCoreSettings
    defaults: {
        capabilities: AssistantCapability[]
        channelPolicies: Record<OmniChannel, ChannelPolicy>
        actions: string[]
    }
}

type ChannelCapabilitySelections = Record<OmniChannel, AssistantCapabilityId[]>

function createEmptyChannelSelections(): ChannelCapabilitySelections {
    return {
        web: [],
        whatsapp: [],
        instagram: [],
        voice: [],
    }
}

function buildChannelSelections(payload: OmniAiCorePayload): ChannelCapabilitySelections {
    return Object.fromEntries(
        OMNI_CHANNELS.map((channel) => [channel, resolveCapabilityIdsForChannel(channel, payload.assistantCore)])
    ) as ChannelCapabilitySelections
}

function useOmniAiCoreData() {
    const { user } = useAuth()
    const { activeAccountId: chatbotId } = useOmniAccount()
    const { t } = useLanguage()
    const { toast } = useToast()
    const [payload, setPayload] = useState<OmniAiCorePayload | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    const load = async () => {
        if (!user) return

        setIsLoading(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/ai-core?chatbotId=${chatbotId || user.uid}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                throw new Error("Failed to load assistant core settings")
            }

            const data = await response.json()
            setPayload(data)
        } catch (error) {
            console.error("Failed to load Omni AI core settings", error)
            setPayload(null)
            toast({
                title: t("omni.aiCore.toast.loadFailed.title"),
                description: t("omni.aiCore.toast.loadFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        load()
    }, [user, chatbotId])

    const save = async (assistantCore: Partial<OmniAssistantCoreSettings>) => {
        if (!user) return null

        setIsSaving(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/omni/ai-core", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    chatbotId: chatbotId || user.uid,
                    assistantCore,
                }),
            })

            if (!response.ok) {
                throw new Error("Failed to save assistant core settings")
            }

            const data = await response.json()
            setPayload(data)
            return data
        } catch (error) {
            console.error("Failed to save Omni AI core settings", error)
            toast({
                title: t("omni.aiCore.toast.saveFailed.title"),
                description: t("omni.aiCore.toast.saveFailed.description"),
                variant: "destructive",
            })
            return null
        } finally {
            setIsSaving(false)
        }
    }

    return {
        user,
        payload,
        isLoading,
        isSaving,
        load,
        save,
    }
}

function LoadingState() {
    return (
        <div className="flex items-center justify-center rounded-lg border bg-white p-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
    )
}

function EmptyState() {
    const { t } = useLanguage()
    return (
        <Card className="border-dashed">
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
                {t("omni.aiCore.empty")}
            </CardContent>
        </Card>
    )
}

export function OmniCapabilitiesPanel() {
    const { payload, isLoading, isSaving, save } = useOmniAiCoreData()
    const { t } = useLanguage()
    const { toast } = useToast()
    const [channelSelections, setChannelSelections] = useState<ChannelCapabilitySelections>(createEmptyChannelSelections)

    useEffect(() => {
        if (!payload) return
        setChannelSelections(buildChannelSelections(payload))
    }, [payload])

    const selectedIds = useMemo(
        () => Array.from(new Set(Object.values(channelSelections).flat())) as AssistantCapabilityId[],
        [channelSelections]
    )

    const isEnabledForChannel = (channel: OmniChannel, id: AssistantCapabilityId) => channelSelections[channel].includes(id)

    const toggleChannel = (channel: OmniChannel, id: AssistantCapabilityId, checked: boolean) => {
        setChannelSelections((current) => ({
            ...current,
            [channel]: checked
                ? (Array.from(new Set([...current[channel], id])) as AssistantCapabilityId[])
                : current[channel].filter((item) => item !== id),
        }))
    }

    const toggleAllSupportedChannels = (capability: AssistantCapability, checked: boolean) => {
        setChannelSelections((current) => {
            const next = { ...current }

            for (const channel of capability.supportedChannels) {
                next[channel] = checked
                    ? (Array.from(new Set([...next[channel], capability.id])) as AssistantCapabilityId[])
                    : next[channel].filter((item) => item !== capability.id)
            }

            return next
        })
    }

    const handleSave = async () => {
        const channelCapabilityOverrides = Object.fromEntries(
            OMNI_CHANNELS.map((channel) => [channel, channelSelections[channel]])
        ) as Partial<Record<OmniChannel, AssistantCapabilityId[]>>

        const result = await save({
            enabledCapabilityIds: selectedIds,
            channelCapabilityOverrides,
        })
        if (result) {
            toast({
                title: t("omni.aiCore.capabilities.toast.saved.title"),
                description: t("omni.aiCore.capabilities.toast.saved.description"),
            })
        }
    }

    if (isLoading) return <LoadingState />
    if (!payload) return <EmptyState />

    return (
        <div className="space-y-4">
            {payload.defaults.capabilities.map((capability) => {
                const enabledChannelCount = capability.supportedChannels.filter((channel) => isEnabledForChannel(channel, capability.id)).length
                const enabledEverywhere = enabledChannelCount === capability.supportedChannels.length
                return (
                    <Card key={capability.id}>
                        <CardHeader>
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-2">
                                    <CardTitle className="text-lg">{getOmniCapabilityTitle(t, capability.id, capability.title)}</CardTitle>
                                    <CardDescription>{getOmniCapabilityDescription(t, capability.id, capability.description)}</CardDescription>
                                    <div className="flex flex-wrap gap-2">
                                        {capability.supportedChannels.map((channel) => (
                                            <Badge key={channel} variant="outline">
                                                {getOmniChannelLabel(t, channel)}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                                <div className="min-w-[148px] space-y-2 text-right">
                                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                        {t("omni.aiCore.capabilities.toggleAll")}
                                    </div>
                                    <div className="flex items-center justify-end gap-3">
                                        <span className="text-xs text-muted-foreground">
                                            {enabledChannelCount}/{capability.supportedChannels.length} {t("omni.aiCore.capabilities.channels")}
                                        </span>
                                        <Switch checked={enabledEverywhere} onCheckedChange={(checked) => toggleAllSupportedChannels(capability, checked)} />
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-muted-foreground">
                            <div>
                                {t("omni.aiCore.capabilities.allowedActions")}: {capability.allowedActions.join(", ")}
                            </div>
                            <div className="space-y-2">
                                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                    {t("omni.aiCore.capabilities.channelOverrides")}
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {capability.supportedChannels.map((channel) => (
                                        <div key={channel} className="flex items-center justify-between rounded-lg border bg-muted/15 px-3 py-2">
                                            <div className="font-medium text-foreground">{getOmniChannelLabel(t, channel)}</div>
                                            <Switch
                                                checked={isEnabledForChannel(channel, capability.id)}
                                                onCheckedChange={(checked) => toggleChannel(channel, capability.id, checked)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {capability.channelBehaviorOverrides?.voice?.notes ? (
                                <div className="rounded-lg bg-muted/40 p-3">{capability.channelBehaviorOverrides.voice.notes}</div>
                            ) : null}
                        </CardContent>
                    </Card>
                )
            })}

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("omni.aiCore.capabilities.action.save")}
                </Button>
            </div>
        </div>
    )
}

export function OmniChannelPoliciesPanel() {
    const { payload, isLoading, isSaving, save } = useOmniAiCoreData()
    const { t } = useLanguage()
    const { toast } = useToast()
    const [policies, setPolicies] = useState<Record<OmniChannel, ChannelPolicy> | null>(null)

    useEffect(() => {
        if (!payload) return

        const merged = Object.fromEntries(
            Object.entries(payload.defaults.channelPolicies).map(([channel, policy]) => [
                channel,
                {
                    ...policy,
                    ...(payload.assistantCore.channelPolicyOverrides?.[channel as OmniChannel] || {}),
                },
            ])
        ) as Record<OmniChannel, ChannelPolicy>

        setPolicies(merged)
    }, [payload])

    const handleSave = async () => {
        if (!policies) return
        const result = await save({ channelPolicyOverrides: policies })
        if (result) {
            toast({
                title: t("omni.aiCore.policies.toast.saved.title"),
                description: t("omni.aiCore.policies.toast.saved.description"),
            })
        }
    }

    if (isLoading) return <LoadingState />
    if (!payload || !policies) return <EmptyState />

    return (
        <div className="grid gap-4 xl:grid-cols-2">
            {Object.values(policies).map((policy) => (
                <Card key={policy.channel}>
                    <CardHeader>
                        <CardTitle className="text-lg">{getOmniChannelLabel(t, policy.channel)}</CardTitle>
                        <CardDescription>{payload.defaults.channelPolicies[policy.channel].responseStyle}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor={`${policy.channel}-response-style`}>{t("omni.aiCore.policies.field.responseStyle")}</Label>
                            <Textarea
                                id={`${policy.channel}-response-style`}
                                rows={3}
                                value={policy.responseStyle}
                                onChange={(e) =>
                                    setPolicies((current) =>
                                        current
                                            ? {
                                                  ...current,
                                                  [policy.channel]: {
                                                      ...current[policy.channel],
                                                      responseStyle: e.target.value,
                                                  },
                                              }
                                            : current
                                    )
                                }
                            />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor={`${policy.channel}-verbosity`}>{t("omni.common.verbosity")}</Label>
                                <select
                                    id={`${policy.channel}-verbosity`}
                                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                    value={policy.maxVerbosity}
                                    onChange={(e) =>
                                        setPolicies((current) =>
                                            current
                                                ? {
                                                      ...current,
                                                      [policy.channel]: {
                                                          ...current[policy.channel],
                                                          maxVerbosity: e.target.value as ChannelPolicy["maxVerbosity"],
                                                      },
                                                  }
                                                : current
                                        )
                                    }
                                >
                                    <option value="short">{getOmniEnumLabel(t, "verbosity", "short")}</option>
                                    <option value="medium">{getOmniEnumLabel(t, "verbosity", "medium")}</option>
                                    <option value="long">{getOmniEnumLabel(t, "verbosity", "long")}</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`${policy.channel}-handoff`}>{t("omni.aiCore.policies.field.handoffMode")}</Label>
                                <select
                                    id={`${policy.channel}-handoff`}
                                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                    value={policy.handoffMode}
                                    onChange={(e) =>
                                        setPolicies((current) =>
                                            current
                                                ? {
                                                      ...current,
                                                      [policy.channel]: {
                                                          ...current[policy.channel],
                                                          handoffMode: e.target.value as ChannelPolicy["handoffMode"],
                                                      },
                                                  }
                                                : current
                                        )
                                    }
                                >
                                    <option value="inline">{getOmniEnumLabel(t, "handoff", "inline")}</option>
                                    <option value="callback_ticket">{getOmniEnumLabel(t, "handoff", "callback_ticket")}</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`${policy.channel}-formatting`}>{t("omni.aiCore.policies.field.safeFormatting")}</Label>
                            <Input
                                id={`${policy.channel}-formatting`}
                                value={policy.safeFormatting.join(", ")}
                                onChange={(e) =>
                                    setPolicies((current) =>
                                        current
                                            ? {
                                                  ...current,
                                                  [policy.channel]: {
                                                      ...current[policy.channel],
                                                      safeFormatting: e.target.value
                                                          .split(",")
                                                          .map((item) => item.trim())
                                                          .filter(Boolean),
                                                  },
                                              }
                                            : current
                                    )
                                }
                            />
                        </div>
                    </CardContent>
                </Card>
            ))}

            <div className="xl:col-span-2 flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("omni.aiCore.policies.action.save")}
                </Button>
            </div>
        </div>
    )
}

export function OmniActionsPanel() {
    const { payload, isLoading, isSaving, save } = useOmniAiCoreData()
    const { t } = useLanguage()
    const { toast } = useToast()
    const [selectedActions, setSelectedActions] = useState<string[]>([])

    useEffect(() => {
        if (!payload) return
        setSelectedActions(
            payload.assistantCore.enabledActions?.length ? payload.assistantCore.enabledActions : payload.defaults.actions
        )
    }, [payload])

    const toggle = (action: string, checked: boolean) => {
        setSelectedActions((current) => (checked ? Array.from(new Set([...current, action])) : current.filter((item) => item !== action)))
    }

    const handleSave = async () => {
        const result = await save({ enabledActions: selectedActions as any })
        if (result) {
            toast({
                title: t("omni.aiCore.actions.toast.saved.title"),
                description: t("omni.aiCore.actions.toast.saved.description"),
            })
        }
    }

    if (isLoading) return <LoadingState />
    if (!payload) return <EmptyState />

    return (
        <div className="space-y-4">
            {payload.defaults.actions.map((action) => (
                <Card key={action}>
                    <CardContent className="flex items-center justify-between gap-4 py-5">
                        <div>
                            <div className="font-medium text-foreground">{action}</div>
                            <div className="text-sm text-muted-foreground">
                                {t("omni.aiCore.actions.itemDescription")}
                            </div>
                        </div>
                        <Switch checked={selectedActions.includes(action)} onCheckedChange={(checked) => toggle(action, checked)} />
                    </CardContent>
                </Card>
            ))}

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("omni.aiCore.actions.action.save")}
                </Button>
            </div>
        </div>
    )
}

export function OmniBrandVoicePanel() {
    const { payload, isLoading, isSaving, save } = useOmniAiCoreData()
    const { t } = useLanguage()
    const { toast } = useToast()
    const [prompt, setPrompt] = useState("")
    const [profiles, setProfiles] = useState<OmniAssistantProfile[]>([])
    const [channelAssignments, setChannelAssignments] = useState<Partial<Record<OmniChannel, string>>>({})

    useEffect(() => {
        setPrompt(payload?.assistantCore.brandVoicePrompt || "")
        setProfiles(payload?.assistantCore.assistantProfiles || [{ id: "omni-default", name: "Default", prompt: "", active: true }])
        setChannelAssignments(
            payload?.assistantCore.channelAssistantProfiles || {
                web: "omni-default",
                whatsapp: "omni-default",
                instagram: "omni-default",
                voice: "omni-default",
            }
        )
    }, [payload])

    const handleSave = async () => {
        const cleanedProfiles = profiles
            .map((profile) => ({
                ...profile,
                id: String(profile.id || "").trim() || `profile-${Date.now()}`,
                name: String(profile.name || "").trim(),
                description: String(profile.description || "").trim(),
                prompt: String(profile.prompt || ""),
            }))
            .filter((profile) => profile.id && profile.name)

        const validProfileIds = new Set(cleanedProfiles.map((profile) => profile.id))
        const normalizedAssignments = Object.fromEntries(
            (["web", "whatsapp", "instagram", "voice"] as OmniChannel[]).map((channel) => [
                channel,
                channelAssignments[channel] && validProfileIds.has(channelAssignments[channel] as string)
                    ? channelAssignments[channel]
                    : cleanedProfiles[0]?.id || "omni-default",
            ])
        ) as Partial<Record<OmniChannel, string>>

        const result = await save({
            brandVoicePrompt: prompt,
            assistantProfiles: cleanedProfiles,
            channelAssistantProfiles: normalizedAssignments,
        })
        if (result) {
            toast({
                title: t("omni.aiCore.brandVoice.toast.saved.title"),
                description: t("omni.aiCore.brandVoice.toast.saved.description"),
            })
        }
    }

    const addProfile = () => {
        setProfiles((current) => [
            ...current,
            {
                id: `profile-${Date.now()}`,
                name: "",
                description: "",
                prompt: "",
                active: true,
                channelToneOverrides: {},
            },
        ])
    }

    const removeProfile = (profileId: string) => {
        setProfiles((current) => current.filter((profile) => profile.id !== profileId))
        setChannelAssignments((current) =>
            Object.fromEntries(
                Object.entries(current).map(([channel, assignedProfileId]) => [
                    channel,
                    assignedProfileId === profileId ? profiles.find((profile) => profile.id !== profileId)?.id || "omni-default" : assignedProfileId,
                ])
            ) as Partial<Record<OmniChannel, string>>
        )
    }

    if (isLoading) return <LoadingState />
    if (!payload) return <EmptyState />

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{t("omni.aiCore.brandVoice.global.title")}</CardTitle>
                    <CardDescription>
                        {t("omni.aiCore.brandVoice.global.description")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="brand-voice-prompt">{t("omni.aiCore.brandVoice.global.prompt")}</Label>
                        <Textarea
                            id="brand-voice-prompt"
                            rows={6}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={t("omni.aiCore.brandVoice.global.placeholder")}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{t("omni.aiCore.brandVoice.mapping.title")}</CardTitle>
                    <CardDescription>{t("omni.aiCore.brandVoice.mapping.description")}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {(["web", "whatsapp", "instagram", "voice"] as OmniChannel[]).map((channel) => (
                        <div key={channel} className="space-y-2">
                            <Label htmlFor={`channel-profile-${channel}`}>{getOmniChannelLabel(t, channel)}</Label>
                            <select
                                id={`channel-profile-${channel}`}
                                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                value={channelAssignments[channel] || profiles[0]?.id || "omni-default"}
                                onChange={(e) =>
                                    setChannelAssignments((current) => ({
                                        ...current,
                                        [channel]: e.target.value,
                                    }))
                                }
                            >
                                {profiles.map((profile) => (
                                    <option key={profile.id} value={profile.id}>
                                        {profile.name || profile.id}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <div className="flex justify-between gap-3">
                <div>
                    <h3 className="text-lg font-semibold tracking-tight">{t("omni.aiCore.brandVoice.profiles.title")}</h3>
                    <p className="text-sm text-muted-foreground">{t("omni.aiCore.brandVoice.profiles.description")}</p>
                </div>
                <Button variant="outline" onClick={addProfile}>
                    {t("omni.aiCore.brandVoice.action.addProfile")}
                </Button>
            </div>

            {profiles.map((profile, index) => (
                <Card key={profile.id}>
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="text-lg">{profile.name || `Profile ${index + 1}`}</CardTitle>
                            <CardDescription>{profile.id}</CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Label htmlFor={`profile-active-${profile.id}`} className="text-sm">{t("omni.aiCore.brandVoice.field.active")}</Label>
                                <Switch
                                    id={`profile-active-${profile.id}`}
                                    checked={profile.active !== false}
                                    onCheckedChange={(checked) =>
                                        setProfiles((current) =>
                                            current.map((item) => (item.id === profile.id ? { ...item, active: checked } : item))
                                        )
                                    }
                                />
                            </div>
                            <Button variant="outline" onClick={() => removeProfile(profile.id)} disabled={profiles.length <= 1}>
                                {t("omni.aiCore.brandVoice.action.removeProfile")}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor={`profile-name-${profile.id}`}>{t("omni.aiCore.brandVoice.field.name")}</Label>
                                <Input
                                    id={`profile-name-${profile.id}`}
                                    value={profile.name || ""}
                                    onChange={(e) =>
                                        setProfiles((current) =>
                                            current.map((item) => (item.id === profile.id ? { ...item, name: e.target.value } : item))
                                        )
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`profile-id-${profile.id}`}>{t("omni.aiCore.brandVoice.field.profileId")}</Label>
                                <Input
                                    id={`profile-id-${profile.id}`}
                                    value={profile.id}
                                    onChange={(e) =>
                                        setProfiles((current) =>
                                            current.map((item) => (item.id === profile.id ? { ...item, id: e.target.value } : item))
                                        )
                                    }
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`profile-description-${profile.id}`}>{t("omni.aiCore.brandVoice.field.description")}</Label>
                            <Input
                                id={`profile-description-${profile.id}`}
                                value={profile.description || ""}
                                onChange={(e) =>
                                    setProfiles((current) =>
                                        current.map((item) => (item.id === profile.id ? { ...item, description: e.target.value } : item))
                                    )
                                }
                                placeholder={t("omni.aiCore.brandVoice.field.descriptionPlaceholder")}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`profile-prompt-${profile.id}`}>{t("omni.aiCore.brandVoice.field.profilePrompt")}</Label>
                            <Textarea
                                id={`profile-prompt-${profile.id}`}
                                rows={5}
                                value={profile.prompt || ""}
                                onChange={(e) =>
                                    setProfiles((current) =>
                                        current.map((item) => (item.id === profile.id ? { ...item, prompt: e.target.value } : item))
                                    )
                                }
                                placeholder={t("omni.aiCore.brandVoice.field.profilePromptPlaceholder")}
                            />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            {(["web", "whatsapp", "instagram", "voice"] as OmniChannel[]).map((channel) => (
                                <div key={`${profile.id}-${channel}`} className="space-y-2">
                                    <Label htmlFor={`profile-tone-${profile.id}-${channel}`}>
                                        {t("omni.aiCore.brandVoice.field.toneOverride").replace("{channel}", getOmniChannelLabel(t, channel))}
                                    </Label>
                                    <Textarea
                                        id={`profile-tone-${profile.id}-${channel}`}
                                        rows={3}
                                        value={profile.channelToneOverrides?.[channel] || ""}
                                        onChange={(e) =>
                                            setProfiles((current) =>
                                                current.map((item) =>
                                                    item.id === profile.id
                                                        ? {
                                                              ...item,
                                                              channelToneOverrides: {
                                                                  ...(item.channelToneOverrides || {}),
                                                                  [channel]: e.target.value,
                                                              },
                                                          }
                                                        : item
                                                )
                                            )
                                        }
                                        placeholder={t("omni.aiCore.brandVoice.field.toneOverridePlaceholder").replace("{channel}", getOmniChannelLabel(t, channel))}
                                    />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ))}

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("omni.aiCore.brandVoice.action.save")}
                </Button>
            </div>
        </div>
    )
}

const DEFAULT_KNOWLEDGE_GOVERNANCE: OmniKnowledgeGovernanceSettings = {
    sourcePriority: ["policy", "crm", "knowledge_base", "catalog", "fallback"],
    staleAfterHours: 24,
    includeFreshnessHints: true,
    includeConfidenceHints: true,
}

const DEFAULT_CUSTOMER_MEMORY: OmniCustomerMemorySettings = {
    enabled: true,
    maxFacts: 5,
    storePreferences: true,
    storeOpenIssues: true,
    storeConversationSummary: true,
}

export function OmniKnowledgeGovernancePanel() {
    const { payload, isLoading, isSaving, save } = useOmniAiCoreData()
    const { t } = useLanguage()
    const { toast } = useToast()
    const [knowledgeGovernance, setKnowledgeGovernance] = useState<OmniKnowledgeGovernanceSettings>(DEFAULT_KNOWLEDGE_GOVERNANCE)
    const [customerMemory, setCustomerMemory] = useState<OmniCustomerMemorySettings>(DEFAULT_CUSTOMER_MEMORY)

    useEffect(() => {
        setKnowledgeGovernance({
            ...DEFAULT_KNOWLEDGE_GOVERNANCE,
            ...(payload?.assistantCore.knowledgeGovernance || {}),
        })
        setCustomerMemory({
            ...DEFAULT_CUSTOMER_MEMORY,
            ...(payload?.assistantCore.customerMemory || {}),
        })
    }, [payload])

    const priorityValue = useMemo(
        () => (knowledgeGovernance.sourcePriority || DEFAULT_KNOWLEDGE_GOVERNANCE.sourcePriority || []).join(", "),
        [knowledgeGovernance.sourcePriority]
    )

    const handleSave = async () => {
        const result = await save({
            knowledgeGovernance: {
                ...knowledgeGovernance,
                sourcePriority: (knowledgeGovernance.sourcePriority || [])
                    .map((item) => String(item).trim())
                    .filter(Boolean) as OmniKnowledgeGovernanceSettings["sourcePriority"],
            },
            customerMemory,
        })

        if (result) {
            toast({
                title: t("omni.aiCore.knowledge.toast.saved.title"),
                description: t("omni.aiCore.knowledge.toast.saved.description"),
            })
        }
    }

    if (isLoading) return <LoadingState />
    if (!payload) return <EmptyState />

    return (
        <div className="grid gap-4 xl:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{t("omni.aiCore.knowledge.governance.title")}</CardTitle>
                    <CardDescription>
                        {t("omni.aiCore.knowledge.governance.description")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="knowledge-priority">{t("omni.aiCore.knowledge.field.sourcePriority")}</Label>
                        <Input
                            id="knowledge-priority"
                            value={priorityValue}
                            onChange={(e) =>
                                setKnowledgeGovernance((current) => ({
                                    ...current,
                                    sourcePriority: e.target.value
                                        .split(",")
                                        .map((item) => item.trim())
                                        .filter(Boolean) as OmniKnowledgeGovernanceSettings["sourcePriority"],
                                }))
                            }
                            placeholder={t("omni.aiCore.knowledge.field.sourcePriorityPlaceholder")}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="knowledge-stale-after">{t("omni.aiCore.knowledge.field.staleAfterHours")}</Label>
                        <Input
                            id="knowledge-stale-after"
                            type="number"
                            min={1}
                            max={168}
                            value={knowledgeGovernance.staleAfterHours ?? ""}
                            onChange={(e) =>
                                setKnowledgeGovernance((current) => ({
                                    ...current,
                                    staleAfterHours: e.target.value ? Number(e.target.value) : DEFAULT_KNOWLEDGE_GOVERNANCE.staleAfterHours,
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-3 rounded-lg border p-4">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium text-foreground">{t("omni.aiCore.knowledge.field.freshnessHints")}</p>
                                <p className="text-sm text-muted-foreground">{t("omni.aiCore.knowledge.field.freshnessHintsDescription")}</p>
                            </div>
                            <Switch
                                checked={knowledgeGovernance.includeFreshnessHints !== false}
                                onCheckedChange={(checked) =>
                                    setKnowledgeGovernance((current) => ({
                                        ...current,
                                        includeFreshnessHints: checked,
                                    }))
                                }
                            />
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium text-foreground">{t("omni.aiCore.knowledge.field.confidenceHints")}</p>
                                <p className="text-sm text-muted-foreground">{t("omni.aiCore.knowledge.field.confidenceHintsDescription")}</p>
                            </div>
                            <Switch
                                checked={knowledgeGovernance.includeConfidenceHints !== false}
                                onCheckedChange={(checked) =>
                                    setKnowledgeGovernance((current) => ({
                                        ...current,
                                        includeConfidenceHints: checked,
                                    }))
                                }
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{t("omni.aiCore.memory.title")}</CardTitle>
                    <CardDescription>
                        {t("omni.aiCore.memory.description")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                        <div>
                            <p className="text-sm font-medium text-foreground">{t("omni.aiCore.memory.field.enabled")}</p>
                            <p className="text-sm text-muted-foreground">{t("omni.aiCore.memory.field.enabledDescription")}</p>
                        </div>
                        <Switch
                            checked={customerMemory.enabled !== false}
                            onCheckedChange={(checked) =>
                                setCustomerMemory((current) => ({
                                    ...current,
                                    enabled: checked,
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="memory-max-facts">{t("omni.aiCore.memory.field.maxFacts")}</Label>
                        <Input
                            id="memory-max-facts"
                            type="number"
                            min={1}
                            max={10}
                            value={customerMemory.maxFacts ?? ""}
                            onChange={(e) =>
                                setCustomerMemory((current) => ({
                                    ...current,
                                    maxFacts: e.target.value ? Number(e.target.value) : DEFAULT_CUSTOMER_MEMORY.maxFacts,
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-3 rounded-lg border p-4">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium text-foreground">{t("omni.aiCore.memory.field.storePreferences")}</p>
                                <p className="text-sm text-muted-foreground">{t("omni.aiCore.memory.field.storePreferencesDescription")}</p>
                            </div>
                            <Switch
                                checked={customerMemory.storePreferences !== false}
                                onCheckedChange={(checked) =>
                                    setCustomerMemory((current) => ({
                                        ...current,
                                        storePreferences: checked,
                                    }))
                                }
                            />
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium text-foreground">{t("omni.aiCore.memory.field.storeOpenIssues")}</p>
                                <p className="text-sm text-muted-foreground">{t("omni.aiCore.memory.field.storeOpenIssuesDescription")}</p>
                            </div>
                            <Switch
                                checked={customerMemory.storeOpenIssues !== false}
                                onCheckedChange={(checked) =>
                                    setCustomerMemory((current) => ({
                                        ...current,
                                        storeOpenIssues: checked,
                                    }))
                                }
                            />
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium text-foreground">{t("omni.aiCore.memory.field.storeSummary")}</p>
                                <p className="text-sm text-muted-foreground">{t("omni.aiCore.memory.field.storeSummaryDescription")}</p>
                            </div>
                            <Switch
                                checked={customerMemory.storeConversationSummary !== false}
                                onCheckedChange={(checked) =>
                                    setCustomerMemory((current) => ({
                                        ...current,
                                        storeConversationSummary: checked,
                                    }))
                                }
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="xl:col-span-2 flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("omni.aiCore.knowledge.action.save")}
                </Button>
            </div>
        </div>
    )
}
