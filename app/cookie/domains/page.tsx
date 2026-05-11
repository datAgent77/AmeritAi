"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Copy, Globe2, Loader2, Plus } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { cmpFetch } from "@/components/cookie/cmp-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

type CmpDomain = {
  id: string
  name: string
  primaryHostname: string
  cookieDomain?: string | null
  status?: "active" | "paused"
  updatedAt?: string
}

export default function CookieDomainsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [domains, setDomains] = useState<CmpDomain[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const [primaryHostname, setPrimaryHostname] = useState("")
  const [cookieDomain, setCookieDomain] = useState("")

  const origin = useMemo(() => (typeof window === "undefined" ? "" : window.location.origin), [])

  const loadDomains = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await cmpFetch<{ domains: CmpDomain[] }>(user, "/api/cmp/domains")
      setDomains(Array.isArray(data.domains) ? data.domains : [])
    } catch (error: any) {
      toast({ title: "Hata", description: error?.message || "Domainler yüklenemedi", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast, user])

  useEffect(() => {
    loadDomains()
  }, [loadDomains])

  const snippet = `<script defer src="${origin}/cmp/runtime.js"></script>`

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast({ title: "Kopyalandı", description: "Panoya kopyalandı." })
    } catch {
      toast({ title: "Hata", description: "Kopyalanamadı.", variant: "destructive" })
    }
  }

  const createDomain = async () => {
    if (!user) return
    setCreating(true)
    try {
      const payload = { name, primaryHostname, cookieDomain: cookieDomain || null }
      await cmpFetch(user, "/api/cmp/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      setCreateOpen(false)
      setName("")
      setPrimaryHostname("")
      setCookieDomain("")
      await loadDomains()
      toast({ title: "Oluşturuldu", description: "Domain eklendi." })
    } catch (error: any) {
      toast({ title: "Hata", description: error?.message || "Domain eklenemedi", variant: "destructive" })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Domainler</h1>
          <p className="text-sm text-muted-foreground">
            CMP ayarlarını domain bazında yönet. Kurulum için script’i sitene ekle.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => copyToClipboard(snippet)} className="gap-2">
            <Copy className="h-4 w-4" />
            Snippet’i kopyala
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Domain ekle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni domain</DialogTitle>
                <DialogDescription>Örn: example.com (https yazmadan)</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Ad</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Müşteri sitesi" />
                </div>
                <div className="space-y-2">
                  <Label>Primary hostname</Label>
                  <Input value={primaryHostname} onChange={(e) => setPrimaryHostname(e.target.value)} placeholder="example.com…" />
                </div>
                <div className="space-y-2">
                  <Label>Cookie domain (opsiyonel)</Label>
                  <Input value={cookieDomain} onChange={(e) => setCookieDomain(e.target.value)} placeholder=".example.com…" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={createDomain} disabled={creating || !name.trim() || !primaryHostname.trim()}>
                  {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Oluştur
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kurulum kodu</CardTitle>
          <CardDescription>Script asenkron yüklenir; site akışını bozmaz.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/20 p-4">
            <pre translate="no" className="whitespace-pre-wrap text-xs text-muted-foreground">
              {snippet}
            </pre>
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(snippet)} className="gap-2">
              <Copy className="h-4 w-4" />
              Kopyala
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe2 className="h-5 w-5" />
            <CardTitle>Domain listesi</CardTitle>
          </div>
          <CardDescription>Domain’e tıklayıp banner/metin ayarlarını yönetebilirsin.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-[160px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad</TableHead>
                  <TableHead>Hostname</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">Aksiyon</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-sm text-muted-foreground">
                      Domain bulunamadı.
                    </TableCell>
                  </TableRow>
                ) : (
                  domains.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/cookie/domains/${d.id}`}
                          className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                        >
                          {d.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/cookie/domains/${d.id}`}
                          translate="no"
                          className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                        >
                          {d.primaryHostname}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={d.status === "paused" ? "secondary" : "outline"}>
                          {d.status === "paused" ? "Paused" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/cookie/domains/${d.id}`}>Aç</Link>
                        </Button>
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
