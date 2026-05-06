"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Download, User, Mail, Phone, ChevronDown, ChevronUp, MessageSquare, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import * as XLSX from 'xlsx';
import { cn } from "@/lib/utils"

export interface Lead {
    id: string
    name: string
    email: string
    phone: string
    source: string
    createdAt: string
    sessionId?: string | null
    sourceSessionId?: string | null
    contactKey?: string | null
    customFields?: Record<string, string>
}

interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
    createdAt?: string | null
}

interface LeadsContentProps {
    targetUserId?: string
}

export function buildLeadChatHref(sessionId?: string | null) {
    return sessionId ? `/console/chatbot/chats?sessionId=${encodeURIComponent(sessionId)}` : null
}

export function buildTenantLeadChatHref(targetUserId: string | undefined, sessionId?: string | null) {
    if (!sessionId) return null
    if (!targetUserId) return buildLeadChatHref(sessionId)
    return `/admin/tenant/${encodeURIComponent(targetUserId)}/chatbot/chats?sessionId=${encodeURIComponent(sessionId)}`
}

export function getLeadSessionId(lead: Pick<Lead, "sessionId" | "sourceSessionId">) {
    return lead.sessionId || lead.sourceSessionId || null
}

export function leadHasExpandableDetails(lead: Lead) {
    return Boolean(
        (lead.customFields && Object.keys(lead.customFields).length > 0) ||
        lead.sessionId ||
        lead.sourceSessionId ||
        lead.contactKey
    )
}

export function LeadsContent({ targetUserId }: LeadsContentProps) {
    const searchParams = useSearchParams()
    const { user } = useAuth()
    const { t } = useLanguage()
    const [leads, setLeads] = useState<Lead[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
    const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({})
    const [conversationLead, setConversationLead] = useState<Lead | null>(null)
    const [conversationMessages, setConversationMessages] = useState<ChatMessage[]>([])
    const [isLoadingConversation, setIsLoadingConversation] = useState(false)
    const autoOpenedLeadRef = useRef<string | null>(null)

    // Use targetUserId if provided, otherwise use current user's uid
    const effectiveUserId = targetUserId || user?.uid
    const highlightedLeadId = searchParams?.get("leadId")
    const highlightedSessionId = searchParams?.get("sessionId")

    useEffect(() => {
        const fetchData = async () => {
            if (!effectiveUserId) return
            try {
                // Fetch Leads
                const leadsRes = await fetch(`/api/leads?chatbotId=${effectiveUserId}`)
                if (leadsRes.ok) {
                    const data = await leadsRes.json()
                    setLeads(data.leads || [])
                }

                // Fetch Settings for Field Labels
                const settingsRes = await fetch(`/api/widget-settings?chatbotId=${effectiveUserId}`)
                if (settingsRes.ok) {
                    const settings = await settingsRes.json()
                    if (settings.leadCustomFields) {
                        const labels: Record<string, string> = {}
                        settings.leadCustomFields.forEach((field: any) => {
                            labels[field.id] = field.label
                        })
                        setFieldLabels(labels)
                    }
                }
            } catch (error) {
                console.error("Failed to fetch data", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [effectiveUserId])

    const toggleRowExpansion = (id: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev)
            if (newSet.has(id)) {
                newSet.delete(id)
            } else {
                newSet.add(id)
            }
            return newSet
        })
    }

    const openConversation = useCallback(async (lead: Lead) => {
        const sessionId = getLeadSessionId(lead)
        if (!sessionId) return
        setConversationLead(lead)
        setConversationMessages([])
        setIsLoadingConversation(true)
        try {
            const res = await fetch(`/api/chat-sessions?chatbotId=${effectiveUserId}&sessionId=${sessionId}`)
            if (res.ok) {
                const data = await res.json()
                setConversationMessages(data.messages || [])
            }
        } catch (_) {
            // ignore
        } finally {
            setIsLoadingConversation(false)
        }
    }, [effectiveUserId])

    useEffect(() => {
        const matchedLead =
            leads.find((lead) => lead.id === highlightedLeadId) ||
            leads.find((lead) => highlightedSessionId && getLeadSessionId(lead) === highlightedSessionId) ||
            null

        if (!matchedLead) return

        const row = document.getElementById(`lead-row-${matchedLead.id}`)
        if (row) {
            row.scrollIntoView({ behavior: "smooth", block: "center" })
        }

        if (matchedLead.customFields && Object.keys(matchedLead.customFields).length > 0) {
            setExpandedRows((previous) => {
                if (previous.has(matchedLead.id)) return previous
                const next = new Set(previous)
                next.add(matchedLead.id)
                return next
            })
        }

        if (getLeadSessionId(matchedLead) && autoOpenedLeadRef.current !== matchedLead.id) {
            autoOpenedLeadRef.current = matchedLead.id
            void openConversation(matchedLead)
        }
    }, [highlightedLeadId, highlightedSessionId, leads, openConversation])

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(leads.map(l => {
            const sourceLabel = l.source === "In-Chat Conversation" || l.source === "Sohbet İçi Konuşma"
                ? (t('inChatConversation') || l.source)
                : l.source
            const base: Record<string, string> = {
                [t('name')]: l.name,
                [t('email')]: l.email,
                [t('phone')]: l.phone,
                [t('source')]: sourceLabel,
                [t('date')]: new Date(l.createdAt).toLocaleString()
            }
            // Merge custom fields into export
            if (l.customFields) {
                Object.entries(l.customFields).forEach(([key, value]) => {
                    const label = fieldLabels[key] || key.replace('field_', '')
                    base[label] = value
                })
            }
            return base
        }));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, t('leads'));
        XLSX.writeFile(workbook, "leads_export.xlsx");
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <>
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t('leads')}</h2>
                    <p className="text-muted-foreground">
                        {t('leadsDescription')}
                    </p>
                </div>
                <Button onClick={exportToExcel} disabled={leads.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    {t('exportToExcel')}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('capturedLeads')}</CardTitle>
                    <CardDescription>
                        {t('capturedLeadsDescription')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {leads.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            {t('noLeadsYet')}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-8"></TableHead>
                                    <TableHead>{t('name')}</TableHead>
                                    <TableHead>{t('email')}</TableHead>
                                    <TableHead>{t('phone')}</TableHead>
                                    <TableHead>{t('source')}</TableHead>
                                    <TableHead className="text-right">{t('date')}</TableHead>
                                    <TableHead className="w-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {leads.map((lead) => {
                                    const linkedSessionId = getLeadSessionId(lead)
                                    const chatHref = targetUserId
                                        ? buildTenantLeadChatHref(targetUserId, linkedSessionId)
                                        : buildLeadChatHref(linkedSessionId)

                                    return (
                                    <React.Fragment key={lead.id}>
                                        <TableRow
                                            id={`lead-row-${lead.id}`}
                                            className={cn(
                                                "cursor-pointer hover:bg-muted/50",
                                                (highlightedLeadId === lead.id || (highlightedSessionId && linkedSessionId === highlightedSessionId)) && "bg-primary/5"
                                            )}
                                            onClick={() => lead.customFields && Object.keys(lead.customFields).length > 0 && toggleRowExpansion(lead.id)}
                                        >
                                            <TableCell>
                                                {lead.customFields && Object.keys(lead.customFields).length > 0 && (
                                                    expandedRows.has(lead.id) ?
                                                        <ChevronUp className="h-4 w-4 text-muted-foreground" /> :
                                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                {lead.name}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                                    {lead.email || "-"}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                                    {lead.phone || "-"}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {lead.source === "In-Chat Conversation" || lead.source === "Sohbet İçi Konuşma" 
                                                    ? (t('inChatConversation') || lead.source)
                                                    : lead.source}
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground text-xs">
                                                {new Date(lead.createdAt).toLocaleString()}
                                            </TableCell>
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                {chatHref && (
                                                    <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 px-2">
                                                        <Link href={chatHref} title="Sohbete git">
                                                            <MessageSquare className="h-4 w-4" />
                                                            <span className="hidden xl:inline">Sohbet</span>
                                                        </Link>
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                        {expandedRows.has(lead.id) && lead.customFields && Object.keys(lead.customFields).length > 0 && (
                                            <TableRow className="bg-muted/30">
                                                <TableCell colSpan={7}>
                                                    <div className="py-2 px-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                                                        {Object.entries(lead.customFields).map(([fieldId, value]) => (
                                                            <div key={fieldId} className="text-sm">
                                                                <span className="font-medium text-muted-foreground">
                                                                    {fieldLabels[fieldId] || fieldId.replace('field_', '')}:
                                                                </span>
                                                                <span className="ml-2">{value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                )})}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>

        <Dialog open={!!conversationLead} onOpenChange={(open) => !open && setConversationLead(null)}>
            <DialogContent className="max-w-lg max-h-[80vh] p-0 overflow-hidden flex flex-col">
                <DialogHeader className="px-8 pt-8 pb-4 shrink-0 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        {conversationLead?.name} — Sohbet Geçmişi
                    </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto space-y-3 px-8 py-6 pr-1">
                    {isLoadingConversation ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : conversationMessages.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">Mesaj bulunamadı.</p>
                    ) : (
                        conversationMessages.map((msg, i) => (
                            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'assistant' && (
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                                        <Bot className="h-3 w-3 text-primary" />
                                    </div>
                                )}
                                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                                    msg.role === 'user'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-foreground'
                                }`}>
                                    {msg.content}
                                    {msg.createdAt && (
                                        <div className="text-[10px] opacity-60 mt-1">
                                            {new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    )}
                                </div>
                                {msg.role === 'user' && (
                                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                                        <User className="h-3 w-3 text-muted-foreground" />
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
        </>
    )
}
