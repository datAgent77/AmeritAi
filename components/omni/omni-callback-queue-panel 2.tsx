"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, PhoneCall } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/context/AuthContext"
import { useOmniAccount } from "@/context/OmniAccountContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { formatOmniDateTime, getOmniChannelLabel, getOmniEnumLabel } from "@/lib/omni/i18n"
import type { Language } from "@/lib/translations"
import type { CallbackRequestRecord, OmniTeamMember, VoiceNumberRecord } from "@/lib/omni/types"

function formatDateTime(value: string | null | undefined, language: Language) {
    if (!value) return language === "tr" ? "Planlanmadı" : "Not scheduled"
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
        return language === "tr" ? "Planlanmadı" : "Not scheduled"
    }
    return formatOmniDateTime(parsed, language)
}

const EMPTY_FORM: CallbackRequestRecord = {
    chatbotId: "",
    priority: "normal",
    status: "pending",
    sourceChannel: "voice",
    resolutionStatus: "open",
    owner: "",
    displayName: "",
    contactKey: "",
    dueAt: "",
    notes: "",
}

export function OmniCallbackQueuePanel() {
    const { user } = useAuth()
    const { activeAccountId: chatbotId } = useOmniAccount()
    const { language, t } = useLanguage()
    const { toast } = useToast()
    const searchParams = useSearchParams()
    const [requests, setRequests] = useState<CallbackRequestRecord[]>([])
    const [voiceNumbers, setVoiceNumbers] = useState<VoiceNumberRecord[]>([])
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [selectedVoiceNumberId, setSelectedVoiceNumberId] = useState<string>("")
    const [teamMembers, setTeamMembers] = useState<OmniTeamMember[]>([])
    const [form, setForm] = useState<CallbackRequestRecord>(EMPTY_FORM)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isCalling, setIsCalling] = useState(false)
    const queryContactId = searchParams.get("contactId")

    const loadRequests = async () => {
        if (!user) return

        setIsLoading(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/callbacks?chatbotId=${chatbotId || user.uid}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                throw new Error("Failed to load callback queue")
            }

            const data = await response.json()
            const nextRequests = data.requests || []
            setRequests(nextRequests)

            const callbackId = searchParams.get("callbackId")
            const sourceSessionId = searchParams.get("sessionId")
            const contactKey = searchParams.get("contactKey")
            const contactId = searchParams.get("contactId")
            const selected =
                nextRequests.find((request: CallbackRequestRecord) => request.id === callbackId) ||
                nextRequests.find((request: CallbackRequestRecord) => request.sourceSessionId === sourceSessionId) ||
                nextRequests.find((request: CallbackRequestRecord) => request.canonicalContactId === contactId) ||
                nextRequests.find((request: CallbackRequestRecord) => request.contactKey === contactKey) ||
                nextRequests.find((request: CallbackRequestRecord) => request.id === selectedId) ||
                nextRequests[0] ||
                null
            if (selected) {
                setSelectedId(selected.id || null)
                setForm({ ...selected, chatbotId: chatbotId || user.uid })
                setSelectedVoiceNumberId(selected.voiceNumberId || "")
            } else {
                setSelectedId(null)
                setForm({ ...EMPTY_FORM, chatbotId: chatbotId || user.uid })
            }
        } catch (error) {
            console.error("Failed to load callback queue", error)
            setRequests([])
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadRequests()
        loadVoiceNumbers()
        loadAssignees()
    }, [user, searchParams, queryContactId])

    const loadVoiceNumbers = async () => {
        if (!user) return

        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/channels/voice?chatbotId=${chatbotId || user.uid}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                throw new Error("Failed to load voice numbers")
            }

            const data = await response.json()
            const numbers = (data.numbers || []) as VoiceNumberRecord[]
            const preferredNumber = numbers.find((number) => number.routingStatus === "active") || numbers[0] || null
            setVoiceNumbers(numbers)
            setSelectedVoiceNumberId((current) => current || preferredNumber?.id || "")
        } catch (error) {
            console.error("Failed to load voice numbers", error)
        }
    }

    const loadAssignees = async () => {
        if (!user) return

        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/settings?chatbotId=${chatbotId || user.uid}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                throw new Error("Failed to load assignment settings")
            }

            const data = await response.json()
            setTeamMembers(Array.isArray(data.assigneeOptions) ? data.assigneeOptions : [])
        } catch (error) {
            console.error("Failed to load callback assignees", error)
        }
    }

    const assigneeSuggestions = useMemo(
        () => teamMembers.map((member) => member.email ? `${member.name} (${member.email})` : member.name),
        [teamMembers]
    )

    const openCount = useMemo(
        () => requests.filter((request) => request.resolutionStatus !== "completed").length,
        [requests]
    )

    const selectRequest = (request: CallbackRequestRecord) => {
        if (!user) return
        setSelectedId(request.id || null)
        setForm({ ...request, chatbotId: chatbotId || user.uid })
        if (request.voiceNumberId) {
            setSelectedVoiceNumberId(request.voiceNumberId)
        }
    }

    const handleSave = async () => {
        if (!user || !selectedId) return

        setIsSaving(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/omni/callbacks", {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...form,
                    id: selectedId,
                    chatbotId: chatbotId || user.uid,
                    canonicalContactId: form.canonicalContactId || null,
                }),
            })

            if (!response.ok) {
                throw new Error("Failed to update callback")
            }

            toast({
                title: t("omni.callback.toast.saved.title"),
                description: t("omni.callback.toast.saved.description"),
            })
            await loadRequests()
        } catch (error) {
            console.error("Failed to update callback", error)
            toast({
                title: t("omni.callback.toast.saveFailed.title"),
                description: t("omni.callback.toast.saveFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleStartCallback = async () => {
        if (!user || !selectedId || !selectedVoiceNumberId) return

        setIsCalling(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/omni/callbacks/execute", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    chatbotId: chatbotId || user.uid,
                    id: selectedId,
                    voiceNumberId: selectedVoiceNumberId,
                }),
            })

            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.error || "Failed to start callback")
            }

            toast({
                title: t("omni.callback.toast.started.title"),
                description: `${t("omni.callback.started.callSid")}: ${data?.call?.sid || t("omni.common.notAvailable")}`,
            })
            await loadRequests()
        } catch (error) {
            console.error("Failed to start callback", error)
            toast({
                title: t("omni.callback.toast.startFailed.title"),
                description: error instanceof Error ? error.message : t("omni.callback.toast.startFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsCalling(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center rounded-lg border bg-white p-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{t("omni.callback.title")}</CardTitle>
                    <CardDescription>
                        {t("omni.callback.description")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Badge className="bg-black text-white hover:bg-black">{t("omni.callback.openCount").replace("{count}", String(openCount))}</Badge>
                    <span>{t("omni.callback.queueNote")}</span>
                </CardContent>
            </Card>

            {requests.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center text-sm text-muted-foreground">
                        <PhoneCall className="h-10 w-10 text-muted-foreground/40" />
                        <div>
                            <p className="font-medium text-foreground">No callback tickets yet</p>
                            <p>{t("omni.callback.empty.description")}</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t("omni.callback.queue.title")}</CardTitle>
                            <CardDescription>{t("omni.callback.queue.description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {requests.map((request) => {
                                const isActive = selectedId === request.id
                                return (
                                    <button
                                        key={request.id}
                                        type="button"
                                        onClick={() => selectRequest(request)}
                                        className={`w-full rounded-lg border p-4 text-left transition ${isActive ? "border-black bg-black text-white" : "hover:bg-muted/40"}`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="font-medium">{request.displayName || request.contactKey || t("omni.callback.unknownCaller")}</p>
                                                <p className={`text-sm ${isActive ? "text-white/70" : "text-muted-foreground"}`}>{getOmniChannelLabel(t, request.sourceChannel)}</p>
                                            </div>
                                            <Badge variant={isActive ? "secondary" : "outline"}>{getOmniEnumLabel(t, "callbackPriority", request.priority)}</Badge>
                                        </div>
                                        <div className={`mt-3 text-xs ${isActive ? "text-white/70" : "text-muted-foreground"}`}>
                                            {getOmniEnumLabel(t, "callbackStatus", request.status)} • {formatDateTime(request.dueAt, language)}
                                        </div>
                                    </button>
                                )
                            })}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t("omni.callback.details.title")}</CardTitle>
                            <CardDescription>{t("omni.callback.details.description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="callback-display-name">{t("omni.callback.field.displayName")}</Label>
                                    <Input id="callback-display-name" value={form.displayName || ""} onChange={(e) => setForm((current) => ({ ...current, displayName: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="callback-contact-key">{t("omni.callback.field.contact")}</Label>
                                    <Input id="callback-contact-key" value={form.contactKey || ""} onChange={(e) => setForm((current) => ({ ...current, contactKey: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="callback-owner">{t("omni.common.owner")}</Label>
                                    <Input
                                        id="callback-owner"
                                        list="callback-owner-options"
                                        value={form.owner || ""}
                                        onChange={(e) => setForm((current) => ({ ...current, owner: e.target.value }))}
                                        placeholder={t("omni.callback.placeholder.owner")}
                                    />
                                    <datalist id="callback-owner-options">
                                        {assigneeSuggestions.map((option) => (
                                            <option key={option} value={option} />
                                        ))}
                                    </datalist>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="callback-due-at">{t("omni.callback.field.dueAt")}</Label>
                                    <Input id="callback-due-at" type="datetime-local" value={form.dueAt ? form.dueAt.slice(0, 16) : ""} onChange={(e) => setForm((current) => ({ ...current, dueAt: e.target.value ? new Date(e.target.value).toISOString() : "" }))} />
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="callback-canonical-contact">Canonical contact ID</Label>
                                    <Input id="callback-canonical-contact" value={form.canonicalContactId || ""} readOnly />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("omni.common.sourceSession")}</Label>
                                    <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                                        {form.sourceSessionId || t("omni.common.notAvailable")}
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-2">
                                    <Label htmlFor="callback-priority">{t("omni.callback.field.priority")}</Label>
                                    <select id="callback-priority" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={form.priority} onChange={(e) => setForm((current) => ({ ...current, priority: e.target.value as CallbackRequestRecord["priority"] }))}>
                                        <option value="low">{getOmniEnumLabel(t, "callbackPriority", "low")}</option>
                                        <option value="normal">{getOmniEnumLabel(t, "callbackPriority", "normal")}</option>
                                        <option value="high">{getOmniEnumLabel(t, "callbackPriority", "high")}</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="callback-status">{t("omni.callback.field.status")}</Label>
                                    <select id="callback-status" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value as CallbackRequestRecord["status"] }))}>
                                        <option value="pending">{getOmniEnumLabel(t, "callbackStatus", "pending")}</option>
                                        <option value="scheduled">{getOmniEnumLabel(t, "callbackStatus", "scheduled")}</option>
                                        <option value="in_progress">{getOmniEnumLabel(t, "callbackStatus", "in_progress")}</option>
                                        <option value="resolved">{getOmniEnumLabel(t, "callbackStatus", "resolved")}</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="callback-resolution">{t("omni.callback.field.resolution")}</Label>
                                    <select id="callback-resolution" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={form.resolutionStatus} onChange={(e) => setForm((current) => ({ ...current, resolutionStatus: e.target.value as CallbackRequestRecord["resolutionStatus"] }))}>
                                        <option value="open">{getOmniEnumLabel(t, "callbackResolution", "open")}</option>
                                        <option value="waiting">{getOmniEnumLabel(t, "callbackResolution", "waiting")}</option>
                                        <option value="completed">{getOmniEnumLabel(t, "callbackResolution", "completed")}</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="callback-notes">{t("omni.common.notes")}</Label>
                                <Textarea id="callback-notes" rows={5} value={form.notes || ""} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="callback-voice-number">{t("omni.callback.field.voiceLine")}</Label>
                                    <select
                                        id="callback-voice-number"
                                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                        value={selectedVoiceNumberId}
                                        onChange={(e) => setSelectedVoiceNumberId(e.target.value)}
                                    >
                                        {voiceNumbers.length === 0 ? <option value="">{t("omni.callback.voiceLine.none")}</option> : null}
                                        {voiceNumbers.map((number) => (
                                            <option key={number.id} value={number.id}>
                                                {number.phoneNumber} ({getOmniEnumLabel(t, "routingStatus", number.routingStatus)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("omni.callback.field.activeCallSid")}</Label>
                                    <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                                        {form.activeCallSid || t("omni.callback.activeCall.none")}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between gap-3 text-sm text-muted-foreground">
                                <span>{t("omni.callback.sourceSession")}: {form.sourceSessionId || t("omni.common.notAvailable")}</span>
                                <span>{formatDateTime(form.updatedAt, language)}</span>
                            </div>

                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={handleStartCallback} disabled={isCalling || !selectedId || !selectedVoiceNumberId}>
                                    {isCalling ? <Loader2 className="h-4 w-4 animate-spin" /> : t("omni.callback.action.start")}
                                </Button>
                                <Button onClick={handleSave} disabled={isSaving || !selectedId} className="min-w-32">
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("omni.callback.action.save")}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
