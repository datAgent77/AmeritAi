"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, Plus, Users } from "lucide-react"
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
import type { ContactGraphRecord, OmniContactMemoryRecord } from "@/lib/omni/types"

interface ContactTimelineItem {
    id: string
    type: "session" | "callback" | "appointment" | "lead"
    channel: string
    title: string
    subtitle: string
    status?: string | null
    createdAt?: string | null
    updatedAt?: string | null
    sourceSessionId?: string | null
}

function formatDate(value: string | null | undefined, language: string, t: (key: string) => string) {
    if (!value) return t("omni.contacts.noActivity")

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
        return t("omni.contacts.noActivity")
    }

    return formatOmniDateTime(parsed, language as any)
}

function describeContactLink(contact: ContactGraphRecord) {
    if (contact.manualMergeReview) return "Manual merge review"
    if (contact.matchingStrategy === "verified_phone") return "Linked by verified phone"
    if (contact.matchingStrategy === "whatsapp_number") return "Linked by WhatsApp number"
    if (contact.matchingStrategy === "email") return "Linked by email"
    return "Linked by channel handle or context alias"
}

const EMPTY_FORM: ContactGraphRecord = {
    chatbotId: "",
    linkedChannels: [],
    displayName: "",
    verifiedPhone: "",
    whatsappNumber: "",
    email: "",
    instagramHandle: "",
    contactKey: "",
    notes: "",
    manualMergeReview: false,
}

export function OmniContactsPanel() {
    const { user } = useAuth()
    const { activeAccountId: chatbotId } = useOmniAccount()
    const { language, t } = useLanguage()
    const { toast } = useToast()
    const searchParams = useSearchParams()
    const [contacts, setContacts] = useState<ContactGraphRecord[]>([])
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [form, setForm] = useState<ContactGraphRecord>(EMPTY_FORM)
    const [searchTerm, setSearchTerm] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [timeline, setTimeline] = useState<ContactTimelineItem[]>([])
    const [memory, setMemory] = useState<OmniContactMemoryRecord | null>(null)
    const [resolvedCanonicalContactId, setResolvedCanonicalContactId] = useState<string | null>(null)
    const [isTimelineLoading, setIsTimelineLoading] = useState(false)
    const [mergeTargetId, setMergeTargetId] = useState("")
    const [isMerging, setIsMerging] = useState(false)
    const [isSplitting, setIsSplitting] = useState(false)

    const loadContacts = async () => {
        if (!user) return

        setIsLoading(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/contacts?chatbotId=${chatbotId || user.uid}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                throw new Error("Failed to load contacts")
            }

            const data = await response.json()
            const nextContacts = data.contacts || []
            setContacts(nextContacts)
            const queryContactId = searchParams.get("contactId")
            const queryContactKey = searchParams.get("contactKey")
            const queryPhone = searchParams.get("phone")
            const selected =
                nextContacts.find((contact: ContactGraphRecord) => contact.id === queryContactId) ||
                nextContacts.find((contact: ContactGraphRecord) => contact.contactKey === queryContactKey) ||
                nextContacts.find((contact: ContactGraphRecord) => contact.verifiedPhone === queryPhone || contact.whatsappNumber === queryPhone) ||
                nextContacts.find((contact: ContactGraphRecord) => contact.id === selectedId) ||
                nextContacts[0] ||
                null
            if (selected) {
                setSelectedId(selected.id || null)
                setForm({ ...selected, chatbotId: chatbotId || user.uid })
                const preferredMergeTarget = nextContacts.find((contact: ContactGraphRecord) => contact.id !== selected.id && !contact.mergedInto)
                setMergeTargetId(preferredMergeTarget?.id || "")
            } else {
                setSelectedId(null)
                setForm({ ...EMPTY_FORM, chatbotId: chatbotId || user.uid })
                setSearchTerm(queryContactKey || queryPhone || "")
                setMergeTargetId("")
            }
        } catch (error) {
            console.error("Failed to load contacts", error)
            setContacts([])
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadContacts()
    }, [user, searchParams])

    useEffect(() => {
        if (!user || !selectedId) {
            setTimeline([])
            setMemory(null)
            return
        }

        const loadTimeline = async () => {
            setIsTimelineLoading(true)
            try {
                const token = await user.getIdToken()
                const response = await fetch(`/api/omni/contacts/timeline?chatbotId=${chatbotId || user.uid}&contactId=${encodeURIComponent(selectedId)}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })

                if (!response.ok) {
                    throw new Error("Failed to load contact timeline")
                }

                const data = await response.json()
                setTimeline(data.timeline || [])
                setMemory(data.memory || null)
                setResolvedCanonicalContactId(data.canonicalContactId || selectedId)
            } catch (error) {
                console.error("Failed to load contact timeline", error)
                setTimeline([])
                setMemory(null)
                setResolvedCanonicalContactId(selectedId)
            } finally {
                setIsTimelineLoading(false)
            }
        }

        loadTimeline()
    }, [user, selectedId])

    const filteredContacts = useMemo(() => {
        return contacts.filter((contact) => {
            const haystack = [
                contact.displayName,
                contact.contactKey,
                contact.email,
                contact.verifiedPhone,
                contact.whatsappNumber,
                contact.instagramHandle,
                ...(contact.linkedContactKeys || []),
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
            return haystack.includes(searchTerm.toLowerCase())
        })
    }, [contacts, searchTerm])

    const startNewContact = () => {
        if (!user) return
        setSelectedId(null)
        setForm({ ...EMPTY_FORM, chatbotId: chatbotId || user.uid })
        setTimeline([])
        setMemory(null)
        setResolvedCanonicalContactId(null)
    }

    const selectContact = (contact: ContactGraphRecord) => {
        if (!user) return
        setSelectedId(contact.id || null)
        setForm({ ...contact, chatbotId: chatbotId || user.uid })
        setResolvedCanonicalContactId(contact.id || null)
        const preferredMergeTarget = contacts.find((candidate) => candidate.id !== contact.id && !candidate.mergedInto)
        setMergeTargetId(preferredMergeTarget?.id || "")
    }

    const handleSave = async () => {
        if (!user) return

        setIsSaving(true)
        try {
            const token = await user.getIdToken()
            const endpoint = "/api/omni/contacts"
            const response = await fetch(endpoint, {
                method: selectedId ? "PATCH" : "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...form,
                    id: selectedId,
                    chatbotId: chatbotId || user.uid,
                    channel: form.linkedChannels[0] || "web",
                }),
            })

            if (!response.ok) {
                throw new Error("Failed to save contact")
            }

            toast({
                title: selectedId ? t("omni.contacts.toast.updated.title") : t("omni.contacts.toast.created.title"),
                description: selectedId ? t("omni.contacts.toast.updated.description") : t("omni.contacts.toast.created.description"),
            })
            await loadContacts()
        } catch (error) {
            console.error("Failed to save contact", error)
            toast({
                title: t("omni.contacts.toast.saveFailed.title"),
                description: t("omni.contacts.toast.saveFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleMerge = async () => {
        if (!user || !selectedId || !mergeTargetId) return

        setIsMerging(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/omni/contacts/merge", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    chatbotId: chatbotId || user.uid,
                    sourceId: selectedId,
                    targetId: mergeTargetId,
                }),
            })

            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.error || "Failed to merge contact")
            }

            toast({
                title: t("omni.contacts.toast.merged.title"),
                description: t("omni.contacts.toast.merged.description"),
            })
            await loadContacts()
        } catch (error) {
            toast({
                title: t("omni.contacts.toast.mergeFailed.title"),
                description: error instanceof Error ? error.message : t("omni.contacts.toast.mergeFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsMerging(false)
        }
    }

    const handleSplit = async () => {
        if (!user || !selectedId) return

        setIsSplitting(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/omni/contacts/split", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    chatbotId: chatbotId || user.uid,
                    sourceId: selectedId,
                }),
            })

            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.error || "Failed to split contact")
            }

            toast({
                title: t("omni.contacts.toast.split.title"),
                description: t("omni.contacts.toast.split.description"),
            })
            await loadContacts()
        } catch (error) {
            toast({
                title: t("omni.contacts.toast.splitFailed.title"),
                description: error instanceof Error ? error.message : t("omni.contacts.toast.splitFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsSplitting(false)
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
                    <CardTitle className="text-lg">{t("omni.contacts.title")}</CardTitle>
                    <CardDescription>
                        {t("omni.contacts.description")}
                    </CardDescription>
                </CardHeader>
            </Card>

            {contacts.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center text-sm text-muted-foreground">
                        <Users className="h-10 w-10 text-muted-foreground/40" />
                        <div>
                            <p className="font-medium text-foreground">{t("omni.contacts.empty.title")}</p>
                            <p>{t("omni.contacts.empty.description")}</p>
                        </div>
                        <Button variant="outline" onClick={startNewContact}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t("omni.contacts.action.new")}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                    <Card>
                        <CardHeader className="flex flex-row items-start justify-between gap-4">
                            <div>
                                <CardTitle className="text-base">{t("omni.contacts.list.title")}</CardTitle>
                                <CardDescription>{t("omni.contacts.list.description")}</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={startNewContact}>
                                <Plus className="mr-2 h-4 w-4" />
                                {t("omni.contacts.action.new")}
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t("omni.contacts.searchPlaceholder")} />
                            {filteredContacts.map((contact) => {
                                const isActive = selectedId === contact.id
                                return (
                                    <button
                                        key={contact.id}
                                        type="button"
                                        onClick={() => selectContact(contact)}
                                        className={`w-full rounded-lg border p-4 text-left transition ${isActive ? "border-black bg-black text-white" : "hover:bg-muted/40"}`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="font-medium">{contact.displayName || contact.contactKey || t("omni.contacts.unnamed")}</p>
                                                <p className={`text-sm ${isActive ? "text-white/70" : "text-muted-foreground"}`}>{formatDate(contact.lastInteractionAt, language, t)}</p>
                                            </div>
                                            <Badge variant={isActive ? "secondary" : "outline"}>{getOmniEnumLabel(t, "matchingStrategy", contact.matchingStrategy || "channel_handle")}</Badge>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {contact.linkedChannels.map((channel) => (
                                                <Badge key={channel} className={isActive ? "bg-white text-black hover:bg-white" : "bg-zinc-100 text-zinc-800 hover:bg-zinc-100"}>
                                                    {getOmniChannelLabel(t, channel)}
                                                </Badge>
                                            ))}
                                            {contact.mergedInto ? <Badge variant={isActive ? "secondary" : "outline"}>{t("omni.contacts.badge.merged")}</Badge> : null}
                                            {(contact.linkedContactIds || []).length > 0 ? <Badge variant={isActive ? "secondary" : "outline"}>{t("omni.contacts.badge.aliasSet")}</Badge> : null}
                                        </div>
                                    </button>
                                )
                            })}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t("omni.contacts.details.title")}</CardTitle>
                            <CardDescription>{t("omni.contacts.details.description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="contact-display-name">{t("omni.contacts.field.displayName")}</Label>
                                    <Input id="contact-display-name" value={form.displayName || ""} onChange={(e) => setForm((current) => ({ ...current, displayName: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact-key">{t("omni.common.contactKey")}</Label>
                                    <Input id="contact-key" value={form.contactKey || ""} onChange={(e) => setForm((current) => ({ ...current, contactKey: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact-phone">{t("omni.contacts.field.verifiedPhone")}</Label>
                                    <Input id="contact-phone" value={form.verifiedPhone || ""} onChange={(e) => setForm((current) => ({ ...current, verifiedPhone: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact-whatsapp">{t("omni.contacts.field.whatsappNumber")}</Label>
                                    <Input id="contact-whatsapp" value={form.whatsappNumber || ""} onChange={(e) => setForm((current) => ({ ...current, whatsappNumber: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact-email">{t("email")}</Label>
                                    <Input id="contact-email" value={form.email || ""} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact-instagram">{t("omni.contacts.field.instagramHandle")}</Label>
                                    <Input id="contact-instagram" value={form.instagramHandle || ""} onChange={(e) => setForm((current) => ({ ...current, instagramHandle: e.target.value }))} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="contact-notes">{t("notes")}</Label>
                                <Textarea id="contact-notes" rows={5} value={form.notes || ""} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} />
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {(form.linkedChannels || []).map((channel) => (
                                    <Badge key={channel} className="bg-zinc-100 text-zinc-800 hover:bg-zinc-100">{getOmniChannelLabel(t, channel)}</Badge>
                                ))}
                                {(resolvedCanonicalContactId || selectedId) ? <Badge variant="outline">{`Canonical: ${resolvedCanonicalContactId || selectedId}`}</Badge> : null}
                                <Badge variant="outline">{describeContactLink(form)}</Badge>
                                {form.manualMergeReview ? <Badge variant="outline">{t("omni.contacts.badge.manualReview")}</Badge> : null}
                                {form.mergedInto ? <Badge variant="outline">{t("omni.contacts.badge.mergedInto").replace("{id}", form.mergedInto)}</Badge> : null}
                                {(form.linkedContactIds || []).length > 0 ? <Badge variant="outline">{t("omni.contacts.badge.aliases").replace("{count}", String((form.linkedContactIds || []).length))}</Badge> : null}
                            </div>

                            {(form.linkedContactKeys || []).length > 0 ? (
                                <div className="space-y-2">
                                    <Label>Linked aliases</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {(form.linkedContactKeys || []).slice(0, 12).map((alias) => (
                                            <Badge key={alias} variant="outline">
                                                {alias}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            {(form.linkedContactIds || []).length > 0 ? (
                                <div className="space-y-2">
                                    <Label>Linked contact IDs</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {(form.linkedContactIds || []).map((id) => (
                                            <Badge key={id} variant="outline">
                                                {id}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            <div className="space-y-3 rounded-lg border p-4">
                                <div>
                                    <p className="text-sm font-medium text-foreground">{t("omni.contacts.merge.title")}</p>
                                    <p className="text-sm text-muted-foreground">{t("omni.contacts.merge.description")}</p>
                                </div>
                                {form.mergedInto ? (
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-sm text-muted-foreground">{t("omni.contacts.merge.current").replace("{id}", form.mergedInto)}</div>
                                        <Button variant="outline" onClick={handleSplit} disabled={isSplitting || !selectedId}>
                                            {isSplitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("omni.contacts.action.restoreSplit")}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                                        <select
                                            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                            value={mergeTargetId}
                                            onChange={(e) => setMergeTargetId(e.target.value)}
                                        >
                                            <option value="">{t("omni.contacts.merge.selectTarget")}</option>
                                            {contacts
                                                .filter((contact) => contact.id !== selectedId && !contact.mergedInto)
                                                .map((contact) => (
                                                    <option key={contact.id} value={contact.id}>
                                                        {contact.displayName || contact.contactKey || contact.id}
                                                    </option>
                                                ))}
                                        </select>
                                        <Button variant="outline" onClick={handleMerge} disabled={isMerging || !selectedId || !mergeTargetId}>
                                            {isMerging ? <Loader2 className="h-4 w-4 animate-spin" /> : t("omni.contacts.action.merge")}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between gap-3 text-sm text-muted-foreground">
                                <span>{formatDate(form.lastInteractionAt, language, t)}</span>
                                <span>{form.id || t("omni.contacts.newRecord")}</span>
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={handleSave} disabled={isSaving} className="min-w-32">
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : selectedId ? t("omni.contacts.action.save") : t("omni.contacts.action.create")}
                                </Button>
                            </div>

                            <div className="space-y-3 border-t pt-4">
                                <div>
                                    <p className="text-sm font-medium text-foreground">{t("omni.contacts.memory.title")}</p>
                                    <p className="text-sm text-muted-foreground">{t("omni.contacts.memory.description")}</p>
                                </div>
                                {!memory ? (
                                    <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                        {t("omni.contacts.memory.empty")}
                                    </div>
                                ) : (
                                    <div className="space-y-3 rounded-lg border p-4">
                                        {memory.summary ? (
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium text-foreground">{t("omni.contacts.memory.summary")}</p>
                                                <p className="text-sm text-muted-foreground whitespace-pre-line">{memory.summary}</p>
                                            </div>
                                        ) : null}
                                        <div className="grid gap-3 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <p className="text-sm font-medium text-foreground">{t("omni.contacts.memory.preferences")}</p>
                                                {memory.preferences?.length ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {memory.preferences.map((item) => (
                                                            <Badge key={item} variant="outline">
                                                                {item}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">{t("omni.contacts.memory.noPreferences")}</p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-sm font-medium text-foreground">{t("omni.contacts.memory.openIssues")}</p>
                                                {memory.openIssues?.length ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {memory.openIssues.map((item) => (
                                                            <Badge key={item} variant="outline">
                                                                {item}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">{t("omni.contacts.memory.noOpenIssues")}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium text-foreground">{t("omni.contacts.memory.recentTopics")}</p>
                                            {memory.recentTopics?.length ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {memory.recentTopics.map((item) => (
                                                        <Badge key={item} className="bg-zinc-100 text-zinc-800 hover:bg-zinc-100">
                                                            {item}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">{t("omni.contacts.memory.noTopics")}</p>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                            {memory.lastChannel ? <span>{t("omni.contacts.memory.lastChannel").replace("{channel}", getOmniChannelLabel(t, memory.lastChannel))}</span> : null}
                                            {memory.lastDisposition ? <span>{t("omni.contacts.memory.lastDisposition").replace("{value}", memory.lastDisposition)}</span> : null}
                                            {memory.updatedAt ? <span>{t("omni.contacts.memory.updatedAt").replace("{value}", formatDate(memory.updatedAt, language, t))}</span> : null}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3 border-t pt-4">
                                <div>
                                    <p className="text-sm font-medium text-foreground">{t("omni.contacts.timeline.title")}</p>
                                    <p className="text-sm text-muted-foreground">{t("omni.contacts.timeline.description")}</p>
                                </div>
                                {isTimelineLoading ? (
                                    <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {t("omni.contacts.timeline.loading")}
                                    </div>
                                ) : timeline.length === 0 ? (
                                    <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                        {t("omni.contacts.timeline.empty")}
                                    </div>
                                ) : (
                                    timeline.slice(0, 8).map((item) => (
                                        <div key={`${item.type}-${item.id}`} className="rounded-lg border p-4">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                                                    <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge variant="outline">{getOmniEnumLabel(t, "timelineType", item.type)}</Badge>
                                                    <Badge variant="outline">{getOmniChannelLabel(t, item.channel)}</Badge>
                                                    {item.status ? <Badge variant="outline">{item.status}</Badge> : null}
                                                </div>
                                            </div>
                                            <div className="mt-3 flex justify-between gap-3 text-xs text-muted-foreground">
                                                <span>{formatDate(item.updatedAt || item.createdAt, language, t)}</span>
                                                <span>{item.sourceSessionId || item.id}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
