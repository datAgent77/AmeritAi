"use client"

import { useState } from "react"
import { Copy, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { HostRow } from "@/components/cookie/domain-detail/types"
import { useToast } from "@/hooks/use-toast"

export function HostsTab({
  loading,
  hosts,
  workingHost,
  lastInstructions,
  onCreate,
  onVerify,
  onDelete,
}: {
  loading: boolean
  hosts: HostRow[]
  workingHost: string | null
  lastInstructions: any
  onCreate: (payload: { hostname: string; method: "dns_txt" | "http_file" }) => void
  onVerify: (hostname: string) => void
  onDelete: (hostname: string) => void
}) {
  const { toast } = useToast()
  const [hostname, setHostname] = useState("")
  const [method, setMethod] = useState<"dns_txt" | "http_file">("dns_txt")

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast({ title: "Kopyalandı", description: "Panoya kopyalandı." })
    } catch {
      toast({ title: "Hata", description: "Kopyalanamadı.", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            <CardTitle>Hostname allowlist & doğrulama</CardTitle>
          </div>
          <CardDescription>
            Subdomain/alternatif host ekleyip doğrulayarak banner’ın sadece izinli hostlarda görünmesini sağlarsın.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label>Hostname</Label>
              <Input value={hostname} onChange={(e) => setHostname(e.target.value)} placeholder="shop.example.com" />
            </div>
            <div className="space-y-2">
              <Label>Doğrulama yöntemi</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as any)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seç" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dns_txt">DNS TXT</SelectItem>
                  <SelectItem value="http_file">HTTP file</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              onClick={() => onCreate({ hostname, method })}
              disabled={!hostname.trim() || Boolean(workingHost)}
              className="gap-2"
            >
              {workingHost ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Host ekle
            </Button>
            {lastInstructions ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Son talimat:</span>
                {lastInstructions.type === "dns_txt" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copy(`${String(lastInstructions.record || "")} = ${String(lastInstructions.value || "")}`)}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    TXT kaydını kopyala
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copy(String(lastInstructions.content || ""))}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Dosya içeriğini kopyala
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hostlar</CardTitle>
          <CardDescription>Verified hostlar allowlist’e eklenir.</CardDescription>
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
                  <TableHead>Hostname</TableHead>
                  <TableHead>Yöntem</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Son kontrol</TableHead>
                  <TableHead className="text-right">Aksiyon</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hosts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">
                      Host eklenmedi.
                    </TableCell>
                  </TableRow>
                ) : (
                  hosts.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell translate="no" className="font-medium">
                        {h.hostname}
                      </TableCell>
                      <TableCell>{h.method}</TableCell>
                      <TableCell>
                        <Badge variant={h.status === "verified" ? "outline" : "secondary"}>{h.status}</Badge>
                      </TableCell>
                      <TableCell>{h.lastCheckedAt ? new Date(h.lastCheckedAt).toLocaleString() : "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={workingHost === h.hostname}
                            onClick={() => onVerify(h.hostname)}
                            className="gap-2"
                          >
                            {workingHost === h.hostname ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Doğrula
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={workingHost === h.hostname}
                            onClick={() => {
                              const ok = window.confirm(`“${h.hostname}” hostname’ini silmek istiyor musun?`)
                              if (!ok) return
                              onDelete(h.hostname)
                            }}
                            className="gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Sil
                          </Button>
                        </div>
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
