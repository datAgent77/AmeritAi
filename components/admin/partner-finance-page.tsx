"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Percent, Save, Users, Wallet } from "lucide-react"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

interface PartnerFinanceRow {
    id: string
    partnerName?: string | null
    email?: string | null
    partnerLevel: string
    partnerCommissionRate?: number | null
    tenantCount: number
    activeTenantCount: number
    planBreakdown: Record<string, number>
}

interface PartnerFinancePayload {
    summary: {
        totalPartners: number
        totalTenants: number
        levelBreakdown: Record<string, number>
        planBreakdown: Record<string, number>
    }
    partners: PartnerFinanceRow[]
}

export function PartnerFinancePage() {
    const [isLoading, setIsLoading] = useState(true)
    const [isSavingId, setIsSavingId] = useState<string | null>(null)
    const [data, setData] = useState<PartnerFinancePayload | null>(null)
    const [draftRates, setDraftRates] = useState<Record<string, string>>({})

    const loadData = async () => {
        setIsLoading(true)
        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) return

            const response = await fetch("/api/admin/partner-finance", {
                headers: { Authorization: `Bearer ${token}` },
            })
            const payload = response.ok ? await response.json() : null
            if (!payload) return

            setData(payload)
            setDraftRates(
                Object.fromEntries((payload.partners || []).map((partner: PartnerFinanceRow) => [
                    partner.id,
                    partner.partnerCommissionRate !== null && partner.partnerCommissionRate !== undefined
                        ? String(partner.partnerCommissionRate)
                        : "",
                ]))
            )
        } catch (error) {
            console.error("Failed to load partner finance:", error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const levelSummary = useMemo(
        () => Object.entries(data?.summary.levelBreakdown || {}).map(([key, value]) => `${key}: ${value}`).join(" • "),
        [data]
    )
    const planSummary = useMemo(
        () => Object.entries(data?.summary.planBreakdown || {}).map(([key, value]) => `${key}: ${value}`).join(" • "),
        [data]
    )

    const saveRate = async (partnerId: string) => {
        setIsSavingId(partnerId)
        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) return

            const response = await fetch("/api/admin/update-user", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    targetUserId: partnerId,
                    partnerCommissionRate: Number(draftRates[partnerId] || 0),
                }),
            })

            if (!response.ok) {
                throw new Error("Save failed")
            }

            await loadData()
        } catch (error) {
            console.error("Failed to save commission:", error)
        } finally {
            setIsSavingId(null)
        }
    }

    if (isLoading) {
        return (
            <div className="flex min-h-[320px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Partner Finans</h1>
                <p className="text-sm text-muted-foreground">
                    Partner sayisi, bagli tenant dagilimi, paket kirilimi ve komisyon oranlari bu panelden izlenir ve guncellenir.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Toplam partner</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{data?.summary.totalPartners || 0}</div>
                        <p className="mt-2 text-xs text-muted-foreground">{levelSummary || "Seviye dagilimi yok"}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Bagli tenant</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{data?.summary.totalTenants || 0}</div>
                        <p className="mt-2 text-xs text-muted-foreground">{planSummary || "Paket kirilimi yok"}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Komisyon yonetimi</CardTitle>
                        <Percent className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground">
                            Komisyon oranlari partner bazinda ayarlanir ve partner panelinde read-only gorunur.
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Partner tablosu</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-hidden rounded-md border">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead>Partner</TableHead>
                                    <TableHead>Seviye</TableHead>
                                    <TableHead>Tenant</TableHead>
                                    <TableHead>Paket dagilimi</TableHead>
                                    <TableHead>Komisyon %</TableHead>
                                    <TableHead className="text-right">Aksiyon</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(data?.partners || []).map((partner) => (
                                    <TableRow key={partner.id}>
                                        <TableCell>
                                            <div className="font-medium">{partner.partnerName || partner.email || partner.id}</div>
                                            <div className="text-xs text-muted-foreground">{partner.email || "-"}</div>
                                        </TableCell>
                                        <TableCell>{partner.partnerLevel}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{partner.tenantCount}</div>
                                            <div className="text-xs text-muted-foreground">Aktif: {partner.activeTenantCount}</div>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {Object.entries(partner.planBreakdown || {}).length > 0
                                                ? Object.entries(partner.planBreakdown).map(([key, value]) => `${key}: ${value}`).join(" • ")
                                                : "-"}
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                                value={draftRates[partner.id] || ""}
                                                onChange={(event) => setDraftRates((prev) => ({
                                                    ...prev,
                                                    [partner.id]: event.target.value,
                                                }))}
                                                className="w-28"
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" onClick={() => saveRate(partner.id)} disabled={isSavingId === partner.id}>
                                                {isSavingId === partner.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                                Kaydet
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
