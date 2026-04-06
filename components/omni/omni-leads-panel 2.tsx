"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Loader2, Plus, Trash2, Users } from "lucide-react"
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
import { getOmniChannelLabel, getOmniEnumLabel } from "@/lib/omni/i18n"
import type { LeadStatus, OmniChannel, OmniLeadRecord, OmniTeamMember } from "@/lib/omni/types"

const STATUS_OPTIONS: LeadStatus[] = ["new", "contacted", "qualified", "converted", "archived"]
const CHANNEL_OPTIONS: OmniChannel[] = ["web", "whatsapp", "instagram", "voice"]

function createEmptyLead(chatbotId: string, params?: { contactKey?: string | null; sourceSessionId?: string | null; canonicalContactId?: string | null }): OmniLeadRecord {
    return {
        chatbotId,
        name: "",
        email: "",
        phone: "",
        source: "Omni Lead Desk",
        status: "new",
        sourceChannel: "web",
        sourceSessionId: params?.sourceSessionId || null,
        contactKey: params?.contactKey || "",
        canonicalContactId: params?.canonicalContactId || null,
        assignedTo: "",
        notes: "",
        customFields: {},
    }
}

function statusVariant(status: LeadStatus) {
    if (status === "converted") return "bg-emerald-600 text-white hover:bg-emerald-600"
    if (status === "qualified") return "bg-slate-900 text-white hover:bg-slate-900"
    if (status === "contacted") return "bg-sky-600 text-white hover:bg-sky-600"
    if (status === "archived") return "bg-rose-600 text-white hover:bg-rose-600"
    return "bg-amber-500 text-black hover:bg-amber-500"
}

export function OmniLeadsPanel() {
    const { user } = useAuth()
    const { activeAccountId: chatbotId } = useOmniAccount()
    const { t } = useLanguage()
    const { toast } = useToast()
    const searchParams = useSearchParams()
    const [leads, setLeads] = useState<OmniLeadRecord[]>([])
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [form, setForm] = useState<OmniLeadRecord>(createEmptyLead(""))
    const [searchTerm, setSearchTerm] = useState("")
    const [teamMembers, setTeamMembers] = useState<OmniTeamMember[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const queryLeadId = searchParams.get("leadId")
    const querySessionId = searchParams.get("sessionId")
    const queryContactId = searchParams.get("contactId")
    const queryContactKey = searchParams.get("contactKey")
    const queryName = searchParams.get("name")
    const queryEmail = searchParams.get("email")
    const queryPhone = searchParams.get("phone")

    const loadLeads = async () => {
        if (!user) return

        setIsLoading(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/leads?chatbotId=${chatbotId || user.uid}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                throw new Error("Failed to load leads")
            }

            const data = await response.json()
            const nextLeads = (data.leads || []) as OmniLeadRecord[]
            setLeads(nextLeads)

            const selected =
                nextLeads.find((lead) => lead.id === queryLeadId) ||
                nextLeads.find((lead) => lead.sourceSessionId === querySessionId) ||
                nextLeads.find((lead) => lead.canonicalContactId === queryContactId) ||
                nextLeads.find((lead) => lead.contactKey === queryContactKey) ||
                nextLeads.find((lead) => lead.id === selectedId) ||
                null

            if (selected) {
                setSelectedId(selected.id || null)
                setForm({ ...selected, chatbotId: chatbotId || user.uid })
            } else {
                setSelectedId(null)
                setForm({
                    ...createEmptyLead(chatbotId || user.uid, { contactKey: queryContactKey, sourceSessionId: querySessionId, canonicalContactId: queryContactId }),
                    name: queryName || "",
                    email: queryEmail || "",
                    phone: queryPhone || "",
                })
            }
        } catch (error) {
            console.error("Failed to load leads", error)
            toast({
                title: t("omni.leads.toast.loadFailed.title"),
                description: t("omni.leads.toast.loadFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadLeads()
        loadAssignees()
    }, [user, queryLeadId, querySessionId, queryContactId, queryContactKey])

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
            console.error("Failed to load lead assignees", error)
        }
    }

    const filteredLeads = useMemo(() => {
        return leads.filter((lead) => {
            const haystack = [
                lead.name,
                lead.email,
                lead.phone,
                lead.contactKey,
                lead.canonicalContactId,
                lead.assignedTo,
                lead.notes,
                lead.source,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()

            return haystack.includes(searchTerm.toLowerCase())
        })
    }, [leads, searchTerm])

    const counts = useMemo(() => {
        return leads.reduce(
            (accumulator, lead) => {
                accumulator.total += 1
                accumulator[lead.status || "new"] += 1
                return accumulator
            },
            {
                total: 0,
                new: 0,
                contacted: 0,
                qualified: 0,
                converted: 0,
                archived: 0,
            } as Record<string, number>
        )
    }, [leads])

    const assigneeSuggestions = useMemo(
        () => teamMembers.map((member) => member.email ? `${member.name} (${member.email})` : member.name),
        [teamMembers]
    )

    const startNewLead = () => {
        if (!user) return
        setSelectedId(null)
        setForm({
            ...createEmptyLead(chatbotId || user.uid, { contactKey: queryContactKey, sourceSessionId: querySessionId, canonicalContactId: queryContactId }),
            name: queryName || "",
            email: queryEmail || "",
            phone: queryPhone || "",
        })
    }

    const handleSave = async () => {
        if (!user) return

        setIsSaving(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch(selectedId ? `/api/omni/leads/${selectedId}` : "/api/omni/leads", {
                method: selectedId ? "PATCH" : "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                                body: JSON.stringify({
                                    ...form,
                                    chatbotId: chatbotId || user.uid,
                                    canonicalContactId: form.canonicalContactId || null,
                                }),
                            })

            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.error || "Failed to save lead")
            }

            toast({
                title: selectedId ? t("omni.leads.toast.updated.title") : t("omni.leads.toast.created.title"),
                description: selectedId ? t("omni.leads.toast.updated.description") : t("omni.leads.toast.created.description"),
            })
            await loadLeads()
        } catch (error) {
            toast({
                title: t("omni.leads.toast.saveFailed.title"),
                description: error instanceof Error ? error.message : t("omni.leads.toast.saveFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!user || !selectedId) return

        setIsDeleting(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/leads/${selectedId}?chatbotId=${encodeURIComponent(chatbotId || user.uid)}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.error || "Failed to delete lead")
            }

            toast({
                title: t("omni.leads.toast.deleted.title"),
                description: t("omni.leads.toast.deleted.description"),
            })
            startNewLead()
            await loadLeads()
        } catch (error) {
            toast({
                title: t("omni.leads.toast.deleteFailed.title"),
                description: error instanceof Error ? error.message : t("omni.leads.toast.deleteFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsDeleting(false)
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
            <div className="grid gap-4 xl:grid-cols-4">
                <Card>
                    <CardHeader>
                        <CardDescription>{t("omni.leads.metric.total")}</CardDescription>
                        <CardTitle className="text-2xl">{counts.total}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        {t("omni.leads.metric.totalNote").replace("{new}", String(counts.new)).replace("{qualified}", String(counts.qualified))}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>{t("omni.leads.metric.pipeline")}</CardDescription>
                        <CardTitle className="text-2xl">{counts.contacted + counts.qualified}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        {t("omni.leads.metric.pipelineNote").replace("{contacted}", String(counts.contacted)).replace("{qualified}", String(counts.qualified))}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>{t("omni.leads.metric.converted")}</CardDescription>
                        <CardTitle className="text-2xl">{counts.converted}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        {t("omni.leads.metric.convertedNote").replace("{archived}", String(counts.archived))}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>{t("omni.leads.metric.legacy")}</CardDescription>
                        <CardTitle className="text-2xl">{t("omni.leads.metric.compatibility")}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/console/chatbot/leads">{t("omni.leads.openLegacy")}</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{t("omni.leads.title")}</CardTitle>
                    <CardDescription>{t("omni.leads.description")}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <Badge className="bg-amber-500 text-black hover:bg-amber-500">{counts.new} {getOmniEnumLabel(t, "leadStatus", "new")}</Badge>
                    <Badge className="bg-sky-600 text-white hover:bg-sky-600">{counts.contacted} {getOmniEnumLabel(t, "leadStatus", "contacted")}</Badge>
                    <Badge className="bg-slate-900 text-white hover:bg-slate-900">{counts.qualified} {getOmniEnumLabel(t, "leadStatus", "qualified")}</Badge>
                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">{counts.converted} {getOmniEnumLabel(t, "leadStatus", "converted")}</Badge>
                </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-[1.1fr_1.4fr]">
                <Card>
                    <CardHeader className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-lg">{t("omni.leads.queue.title")}</CardTitle>
                                <CardDescription>{t("omni.leads.queue.description")}</CardDescription>
                            </div>
                            <Button variant="outline" onClick={startNewLead}>
                                <Plus className="mr-2 h-4 w-4" />
                                {t("omni.leads.action.new")}
                            </Button>
                        </div>
                        <Input
                            placeholder={t("omni.leads.searchPlaceholder")}
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {filteredLeads.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                                {t("omni.leads.empty")}
                            </div>
                        ) : (
                            filteredLeads.map((lead) => (
                                <button
                                    key={lead.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedId(lead.id || null)
                                        setForm({ ...lead, chatbotId: user?.uid || "" })
                                    }}
                                    className={`w-full rounded-lg border p-4 text-left transition ${
                                        lead.id === selectedId ? "border-black bg-black/5" : "hover:border-black/40"
                                    }`}
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="font-medium text-foreground">{lead.name || t("omni.leads.anonymous")}</div>
                                            <div className="text-sm text-muted-foreground">{lead.email || lead.phone || lead.contactKey || t("omni.leads.noContact")}</div>
                                        </div>
                                        <Badge className={statusVariant(lead.status || "new")}>{getOmniEnumLabel(t, "leadStatus", lead.status || "new")}</Badge>
                                    </div>
                                    <div className="mt-3 text-sm text-muted-foreground">
                                        {lead.assignedTo || t("omni.leads.unassigned")} · {lead.source || t("omni.leads.omniAction")}
                                    </div>
                                </button>
                            ))
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">{selectedId ? t("omni.leads.detailTitle") : t("omni.leads.newTitle")}</CardTitle>
                        <CardDescription>{t("omni.leads.detailDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="lead-name">{t("name") || "Name"}</Label>
                                <Input id="lead-name" value={form.name || ""} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lead-owner">{t("omni.common.assignedTo")}</Label>
                                <Input
                                    id="lead-owner"
                                    list="lead-owner-options"
                                    value={form.assignedTo || ""}
                                    onChange={(event) => setForm((current) => ({ ...current, assignedTo: event.target.value }))}
                                />
                                <datalist id="lead-owner-options">
                                    {assigneeSuggestions.map((option) => (
                                        <option key={option} value={option} />
                                    ))}
                                </datalist>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="lead-email">{t("email")}</Label>
                                <Input id="lead-email" type="email" value={form.email || ""} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lead-phone">{t("omni.appointments.field.phone")}</Label>
                                <Input id="lead-phone" value={form.phone || ""} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="lead-status">{t("omni.common.status")}</Label>
                                <select
                                    id="lead-status"
                                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                    value={form.status || "new"}
                                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as LeadStatus }))}
                                >
                                    {STATUS_OPTIONS.map((status) => (
                                        <option key={status} value={status}>
                                            {getOmniEnumLabel(t, "leadStatus", status)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lead-channel">{t("omni.common.sourceChannel")}</Label>
                                <select
                                    id="lead-channel"
                                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                    value={form.sourceChannel || "web"}
                                    onChange={(event) => setForm((current) => ({ ...current, sourceChannel: event.target.value as OmniChannel }))}
                                >
                                    {CHANNEL_OPTIONS.map((channel) => (
                                        <option key={channel} value={channel}>
                                            {getOmniChannelLabel(t, channel)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lead-source">{t("omni.leads.field.sourceLabel")}</Label>
                                <Input id="lead-source" value={form.source || ""} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))} />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="lead-canonical-contact">Canonical contact ID</Label>
                                <Input id="lead-canonical-contact" value={form.canonicalContactId || ""} readOnly />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lead-contact-key">{t("omni.common.contactKey")}</Label>
                                <Input id="lead-contact-key" value={form.contactKey || ""} onChange={(event) => setForm((current) => ({ ...current, contactKey: event.target.value }))} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lead-session">{t("omni.common.sourceSession")}</Label>
                                <Input id="lead-session" value={form.sourceSessionId || ""} onChange={(event) => setForm((current) => ({ ...current, sourceSessionId: event.target.value }))} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="lead-notes">{t("notes")}</Label>
                            <Textarea id="lead-notes" rows={6} value={form.notes || ""} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
                        </div>

                        <div className="flex flex-wrap justify-between gap-3">
                            <Button variant="outline" onClick={startNewLead}>
                                <Plus className="mr-2 h-4 w-4" />
                                {t("omni.leads.action.reset")}
                            </Button>
                            <div className="flex flex-wrap gap-3">
                                {selectedId ? (
                                    <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                        {t("omni.leads.action.delete")}
                                    </Button>
                                ) : null}
                                <Button onClick={handleSave} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                                    {selectedId ? t("omni.leads.action.saveChanges") : t("omni.leads.action.create")}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
