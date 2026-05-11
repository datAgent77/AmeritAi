"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Copy, Loader2, Terminal } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { cmpFetch } from "@/components/cookie/cmp-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type CmpDomain = {
  id: string
  name: string
  primaryHostname: string
}

export default function CookieInstallPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [domains, setDomains] = useState<CmpDomain[]>([])
  const [selectedDomainId, setSelectedDomainId] = useState<string>("")

  const origin = useMemo(() => (typeof window === "undefined" ? "" : window.location.origin), [])
  const snippet = `<script defer src="${origin}/cmp/runtime.js"></script>`

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast({ title: "Kopyalandı", description: "Panoya kopyalandı." })
    } catch {
      toast({ title: "Hata", description: "Kopyalanamadı.", variant: "destructive" })
    }
  }

  const loadDomains = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await cmpFetch<{ domains: CmpDomain[] }>(user, "/api/cmp/domains")
      const list = Array.isArray(data.domains) ? data.domains : []
      setDomains(list)
      setSelectedDomainId(list[0]?.id || "")
    } catch (error: any) {
      toast({ title: "Hata", description: error?.message || "Domainler yüklenemedi", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast, user])

  useEffect(() => {
    loadDomains()
  }, [loadDomains])

  const selectedDomain = domains.find((d) => d.id === selectedDomainId) || null

  const verifyUrl = selectedDomain
    ? `${origin}/api/cmp/public/config?hostname=${encodeURIComponent(selectedDomain.primaryHostname)}&lang=tr`
    : `${origin}/api/cmp/public/config?hostname=example.com&lang=tr`

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Kurulum</h1>
        <p className="text-sm text-muted-foreground">
          CMP runtime scripti izole çalışır; Vion/Omni akışlarına dokunmaz.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Script snippet</CardTitle>
          <CardDescription>Site header’ına ekle (tercihen <code>&lt;head&gt;</code> içinde).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/20 p-4">
            <pre translate="no" className="whitespace-pre-wrap text-xs text-muted-foreground">
              {snippet}
            </pre>
            <Button variant="outline" size="sm" onClick={() => copy(snippet)} className="gap-2">
              <Copy className="h-4 w-4" />
              Kopyala
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Doğrulama</CardTitle>
          <CardDescription>Domain yayınlı config ve metin endpoint’inden dönebilmeli.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex min-h-[120px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm font-medium">Domain seç</div>
                <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Domain seç" />
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
                <div className="text-sm font-medium">Config endpoint</div>
                <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-3">
                  <Terminal className="h-4 w-4 text-muted-foreground" />
                  <div translate="no" className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={verifyUrl}>
                    {verifyUrl}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => copy(verifyUrl)} className="gap-2">
                    <Copy className="h-4 w-4" />
                    Kopyala
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
