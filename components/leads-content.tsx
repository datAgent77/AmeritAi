"use client"

import { useState, useEffect } from "react"
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

    // Use targetUserId if provided, otherwise use current user's uid
    const effectiveUserId = targetUserId || user?.uid

    useEffect(() => {
        const fetchLeads = async () => {
            if (!effectiveUserId) return
            try {
                const res = await fetch(`/api/leads?chatbotId=${effectiveUserId}`)
                if (res.ok) {
                    const data = await res.json()
                    setLeads(data.leads || [])
                }
            } catch (error) {
                console.error("Failed to fetch leads", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchLeads()
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
            const base = {
                Name: l.name,
                Email: l.email,
                Phone: l.phone,
                Source: l.source,
                Date: new Date(l.createdAt).toLocaleString()
            }
            // Merge custom fields into export
            if (l.customFields) {
                Object.entries(l.customFields).forEach(([key, value]) => {
                    (base as any)[key] = value
                })
            }
            return base
        }));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
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
                                    <>
                                        <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => lead.customFields && Object.keys(lead.customFields).length > 0 && toggleRowExpansion(lead.id)}>
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
                                            <TableCell>{lead.source}</TableCell>
                                            <TableCell className="text-right text-muted-foreground text-xs">
                                                {new Date(lead.createdAt).toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                        {expandedRows.has(lead.id) && lead.customFields && Object.keys(lead.customFields).length > 0 && (
                                            <TableRow key={`${lead.id}-custom`} className="bg-muted/30">
                                                <TableCell colSpan={6}>
                                                    <div className="py-2 px-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                                                        {Object.entries(lead.customFields).map(([fieldId, value]) => (
                                                            <div key={fieldId} className="text-sm">
                                                                <span className="font-medium text-muted-foreground">{fieldId.replace('field_', '')}:</span>
                                                                <span className="ml-2">{value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
