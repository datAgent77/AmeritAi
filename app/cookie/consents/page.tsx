"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Download, Loader2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { cmpFetch } from "@/components/cookie/cmp-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type CmpDomain = {
  id: string
  name: string
  primaryHostname: string
}

type ConsentEvent = {
  id: string
  domainId: string
  hostname?: string
  action: string
  policyVersionId: string
  choices: any
  createdAt: string
}

function toCsvRow(values: string[]) {
  const escaped = values.map((v) => `"${(v || "").replace(/"/g, '""')}"`)
  return escaped.join(",")
}

export default function CookieConsentsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [domains, setDomains] = useState<CmpDomain[]>([])
  const [events, setEvents] = useState<ConsentEvent[]>([])
  const [domainId, setDomainId] = useState<string>("")
  const [action, setAction] = useState<string>("all")
  const [limit, setLimit] = useState<string>("200")

  useEffect(() => {
    const fromUrlDomainId = searchParams?.get("domainId") || ""
    const fromUrlAction = searchParams?.get("action") || "all"
    const fromUrlLimit = searchParams?.get("limit") || "200"

    if (fromUrlDomainId && fromUrlDomainId !== domainId) setDomainId(fromUrlDomainId)
    if (fromUrlAction && fromUrlAction !== action) setAction(fromUrlAction)
    if (fromUrlLimit && fromUrlLimit !== limit) setLimit(fromUrlLimit)
  }, [action, domainId, limit, searchParams])

  useEffect(() => {
    const next = new URLSearchParams(searchParams?.toString() || "")
    if (domainId) next.set("domainId", domainId)
    else next.delete("domainId")
    if (action && action !== "all") next.set("action", action)
    else next.delete("action")
    if (limit) next.set("limit", limit)
    else next.delete("limit")

    const nextUrl = next.toString() ? `${pathname}?${next.toString()}` : pathname
    const currentUrl = searchParams?.toString() ? `${pathname}?${searchParams.toString()}` : pathname
    if (nextUrl !== currentUrl) router.replace(nextUrl)
  }, [action, domainId, limit, pathname, router, searchParams])

  const domainNameMap = useMemo(() => {
    const map = new Map<string, string>()
    domains.forEach((d) => map.set(d.id, d.name))
    return map
  }, [domains])

  const loadDomains = useCallback(async () => {
    if (!user) return
    const data = await cmpFetch<{ domains: CmpDomain[] }>(user, "/api/cmp/domains")
    const list = Array.isArray(data.domains) ? data.domains : []
    setDomains(list)
    setDomainId((prev) => prev || searchParams?.get("domainId") || list[0]?.id || "")
  }, [searchParams, user])

  const loadEvents = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (domainId) qs.set("domainId", domainId)
      if (action && action !== "all") qs.set("action", action)
      if (limit) qs.set("limit", limit)
      const data = await cmpFetch<{ events: ConsentEvent[] }>(user, `/api/cmp/consents?${qs.toString()}`)
      setEvents(Array.isArray(data.events) ? data.events : [])
    } catch (error: any) {
      toast({ title: "Hata", description: error?.message || "Kayıtlar yüklenemedi", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [action, domainId, limit, toast, user])

  useEffect(() => {
    if (!user) return
    loadDomains().catch(() => null)
  }, [loadDomains, user])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const exportCsv = () => {
    const header = ["createdAt", "domain", "hostname", "action", "policyVersionId", "choices"]
    const rows = events.map((e) => [
      e.createdAt,
      domainNameMap.get(e.domainId) || e.domainId,
      e.hostname || "",
      e.action,
      e.policyVersionId,
      JSON.stringify(e.choices || {}),
    ])
    const csv = [toCsvRow(header), ...rows.map((r) => toCsvRow(r))].join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `cmp_consents_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)

    toast({ title: "Hazır", description: "CSV indirildi." })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Rıza Kayıtları</h1>
          <p className="text-sm text-muted-foreground">Domain bazında consent event kayıtları.</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={events.length === 0} className="gap-2">
          <Download className="h-4 w-4" />
          CSV indir
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtreler</CardTitle>
          <CardDescription>Listeyi daralt ve export al.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Domain</Label>
            <Select value={domainId} onValueChange={setDomainId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seç" />
              </SelectTrigger>
              <SelectContent>
                {domains.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} ({d.primaryHostname})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Aksiyon</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Hepsi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hepsi</SelectItem>
                <SelectItem value="accept_all">accept_all</SelectItem>
                <SelectItem value="reject_all">reject_all</SelectItem>
                <SelectItem value="save_preferences">save_preferences</SelectItem>
                <SelectItem value="withdraw">withdraw</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Limit</Label>
            <Input value={limit} onChange={(e) => setLimit(e.target.value)} type="number" min={1} max={500} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kayıtlar</CardTitle>
          <CardDescription>Son kayıtlar en üstte.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Hostname</TableHead>
                  <TableHead>Aksiyon</TableHead>
                  <TableHead>Policy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">
                      Kayıt bulunamadı.
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{new Date(e.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{domainNameMap.get(e.domainId) || e.domainId}</TableCell>
                      <TableCell className="max-w-[260px] truncate" title={e.hostname || ""}>
                        {e.hostname || "-"}
                      </TableCell>
                      <TableCell>{e.action}</TableCell>
                      <TableCell className="max-w-[220px] truncate" title={e.policyVersionId}>
                        {e.policyVersionId}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
