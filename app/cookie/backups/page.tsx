"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, RefreshCw, Save } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { cmpFetch } from "@/components/cookie/cmp-client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type TenantSettings = {
  backupEmail: string | null
  backupDeliveryMethod?: "attachment" | "link"
  backupLinkTtlHours?: number
  retentionDaysConsents?: number
  retentionDaysBackups?: number
}

type BackupHistoryItem = {
  id: string
  trigger?: "cron" | "manual"
  status?: "sent" | "email_failed" | "missing_email" | "error"
  createdAt?: string
  fromDate?: string
  toDate?: string
  consentCount?: number | null
  recipientEmail?: string | null
  storedObjectPath?: string | null
}

function statusVariant(status: BackupHistoryItem["status"]) {
  if (status === "sent") return "outline" as const
  if (status === "missing_email") return "secondary" as const
  if (status === "email_failed" || status === "error") return "destructive" as const
  return "secondary" as const
}

export default function CookieBackupsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [tenantId, setTenantId] = useState<string>("")
  const [settings, setSettings] = useState<TenantSettings>({ backupEmail: null })
  const [backupEmailInput, setBackupEmailInput] = useState<string>("")
  const [backupDeliveryMethod, setBackupDeliveryMethod] = useState<"attachment" | "link">("attachment")
  const [backupLinkTtlHours, setBackupLinkTtlHours] = useState<string>("72")
  const [retentionDaysConsents, setRetentionDaysConsents] = useState<string>("365")
  const [retentionDaysBackups, setRetentionDaysBackups] = useState<string>("365")
  const [items, setItems] = useState<BackupHistoryItem[]>([])

  const settingsDirty = useMemo(() => {
    const emailDirty = (settings.backupEmail || "") !== backupEmailInput.trim()
    const deliveryDirty = (settings.backupDeliveryMethod || "attachment") !== backupDeliveryMethod
    const ttlDirty = String(settings.backupLinkTtlHours || 72) !== String(backupLinkTtlHours)
    const consentsDirty = String(settings.retentionDaysConsents || 365) !== String(retentionDaysConsents)
    const backupsDirty = String(settings.retentionDaysBackups || 365) !== String(retentionDaysBackups)
    return emailDirty || deliveryDirty || ttlDirty || consentsDirty || backupsDirty
  }, [
    backupDeliveryMethod,
    backupEmailInput,
    backupLinkTtlHours,
    retentionDaysBackups,
    retentionDaysConsents,
    settings.backupDeliveryMethod,
    settings.backupEmail,
    settings.backupLinkTtlHours,
    settings.retentionDaysBackups,
    settings.retentionDaysConsents,
  ])

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const s = await cmpFetch<{ tenantId: string; settings: TenantSettings }>(user, "/api/cmp/tenant-settings")
      setTenantId(s.tenantId)
      setSettings(s.settings)
      setBackupEmailInput(s.settings.backupEmail || "")
      setBackupDeliveryMethod(s.settings.backupDeliveryMethod || "attachment")
      setBackupLinkTtlHours(String(s.settings.backupLinkTtlHours || 72))
      setRetentionDaysConsents(String(s.settings.retentionDaysConsents || 365))
      setRetentionDaysBackups(String(s.settings.retentionDaysBackups || 365))

      const h = await cmpFetch<{ tenantId: string; items: BackupHistoryItem[] }>(user, "/api/cmp/backups/history?limit=50")
      setItems(Array.isArray(h.items) ? h.items : [])
    } catch (error: any) {
      toast({ title: "Hata", description: error?.message || "Yedek bilgileri yüklenemedi", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast, user])

  useEffect(() => {
    load()
  }, [load])

  const saveEmail = async () => {
    if (!user) return
    setSaving(true)
    try {
      const payload = {
        backupEmail: backupEmailInput.trim(),
        backupDeliveryMethod,
        backupLinkTtlHours: Number(backupLinkTtlHours) || 72,
        retentionDaysConsents: Number(retentionDaysConsents) || 365,
        retentionDaysBackups: Number(retentionDaysBackups) || 365,
      }
      const res = await cmpFetch<{ ok: boolean; settings: TenantSettings }>(user, "/api/cmp/tenant-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      setSettings(res.settings)
      setBackupEmailInput(res.settings.backupEmail || "")
      toast({ title: "Kaydedildi", description: "Backup e-posta ayarı güncellendi." })
    } catch (error: any) {
      toast({ title: "Hata", description: error?.message || "Kaydedilemedi", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const resend = async (historyId: string) => {
    if (!user) return
    setResendingId(historyId)
    try {
      const res = await cmpFetch<{ ok: boolean }>(user, "/api/cmp/backups/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historyId }),
      })

      if (res.ok) {
        toast({ title: "Gönderildi", description: "CSV yeniden gönderildi." })
      } else {
        toast({ title: "Hata", description: "Gönderim başarısız.", variant: "destructive" })
      }

      await load()
    } catch (error: any) {
      toast({ title: "Hata", description: error?.message || "Gönderilemedi", variant: "destructive" })
    } finally {
      setResendingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Yedekler</h1>
          <p className="text-sm text-muted-foreground">CMP rıza kayıtları CSV yedekleri ve gönderim geçmişi.</p>
        </div>
        <Button variant="outline" onClick={load} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Yenile
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Backup ayarları</CardTitle>
          <CardDescription>Gönderim yöntemi ve saklama sürelerini tenant bazında yapılandır.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Tenant</Label>
              <Input translate="no" value={tenantId} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Backup e-posta (opsiyonel)</Label>
              <Input
                translate="no"
                type="email"
                value={backupEmailInput}
                onChange={(e) => setBackupEmailInput(e.target.value)}
                placeholder="privacy@firma.com"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Gönderim yöntemi</Label>
              <Select value={backupDeliveryMethod} onValueChange={(v) => setBackupDeliveryMethod(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seç" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attachment">E-posta eki (CSV)</SelectItem>
                  <SelectItem value="link">İmzalı link</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Link TTL (saat)</Label>
              <Input type="number" min={1} max={168} value={backupLinkTtlHours} onChange={(e) => setBackupLinkTtlHours(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Consent saklama (gün)</Label>
              <Input type="number" min={7} max={3650} value={retentionDaysConsents} onChange={(e) => setRetentionDaysConsents(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Backup saklama (gün)</Label>
              <Input type="number" min={7} max={3650} value={retentionDaysBackups} onChange={(e) => setRetentionDaysBackups(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveEmail} disabled={saving || !settingsDirty} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Kaydet
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gönderim geçmişi</CardTitle>
          <CardDescription>Son denemeler en üstte.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zaman</TableHead>
                <TableHead>Aralık</TableHead>
                <TableHead>Kayıt</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>E-posta</TableHead>
                <TableHead className="text-right">Aksiyon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    Henüz gönderim yok.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.createdAt ? new Date(it.createdAt).toLocaleString() : "-"}</TableCell>
                    <TableCell translate="no" className="whitespace-nowrap">
                      {(it.fromDate && it.toDate) ? `${it.fromDate} → ${it.toDate}` : "-"}
                    </TableCell>
                    <TableCell>{typeof it.consentCount === "number" ? it.consentCount : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(it.status)}>{it.status || "unknown"}</Badge>
                    </TableCell>
                    <TableCell translate="no" className="max-w-[260px] truncate" title={it.recipientEmail || ""}>
                      {it.recipientEmail || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={resendingId === it.id || !it.storedObjectPath}
                        onClick={() => resend(it.id)}
                        className="gap-2"
                      >
                        {resendingId === it.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Yeniden gönder
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
