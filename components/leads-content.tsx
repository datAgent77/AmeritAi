"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Download, User, Mail, Phone, Calendar, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import * as XLSX from 'xlsx';

interface Lead {
    id: string
    name: string
    email: string
    phone: string
    source: string
    createdAt: string
    customFields?: Record<string, string>
}

interface LeadsContentProps {
    targetUserId?: string
}

export function LeadsContent({ targetUserId }: LeadsContentProps) {
    const { user } = useAuth()
    const { t } = useLanguage()
    const [leads, setLeads] = useState<Lead[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
    const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({})

    // Use targetUserId if provided, otherwise use current user's uid
    const effectiveUserId = targetUserId || user?.uid

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
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {leads.map((lead) => (
                                    <React.Fragment key={lead.id}>
                                        <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => lead.customFields && Object.keys(lead.customFields).length > 0 && toggleRowExpansion(lead.id)}>
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
                                        </TableRow>
                                        {expandedRows.has(lead.id) && lead.customFields && Object.keys(lead.customFields).length > 0 && (
                                            <TableRow className="bg-muted/30">
                                                <TableCell colSpan={6}>
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
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
