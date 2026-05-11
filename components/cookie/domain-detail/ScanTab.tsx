"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Play, ScanSearch } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ScanRun } from "@/components/cookie/domain-detail/useCmpDomainScans"

export function ScanTab({
  loading,
  running,
  allowedHostnames,
  runs,
  onRunScan,
}: {
  loading: boolean
  running: boolean
  allowedHostnames: string[]
  runs: ScanRun[]
  onRunScan: (hostname: string) => void
}) {
  const [hostname, setHostname] = useState(allowedHostnames[0] || "")

  useEffect(() => {
    if (!hostname && allowedHostnames[0]) {
      setHostname(allowedHostnames[0])
    }
  }, [allowedHostnames, hostname])

  const sortedRuns = useMemo(() => {
    return [...runs].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
  }, [runs])

  const selectedHostnames = useMemo(() => {
    const unique = Array.from(new Set(allowedHostnames.filter(Boolean)))
    return unique.length > 0 ? unique : [hostname]
  }, [allowedHostnames, hostname])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ScanSearch className="h-5 w-5" />
            <CardTitle>Cookie tarama</CardTitle>
          </div>
          <CardDescription>
            Sunucu tarafında hedef host’a istek atıp response `set-cookie` header’larından çıktı üretir.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1 space-y-2">
            <div className="text-sm font-medium">Hostname</div>
            <Select value={hostname} onValueChange={setHostname}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seç" />
              </SelectTrigger>
              <SelectContent>
                {selectedHostnames.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => onRunScan(hostname)} disabled={!hostname || running} className="gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Tarama başlat
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scan runs</CardTitle>
          <CardDescription>Son taramalar en üstte.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-[180px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Hostname</TableHead>
                  <TableHead>HTTP</TableHead>
                  <TableHead>Cookie sayısı</TableHead>
                  <TableHead>URL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRuns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">
                      Tarama kaydı yok.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedRuns.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}</TableCell>
                      <TableCell className="font-medium">{r.hostname}</TableCell>
                      <TableCell>{r.result ? String(r.result.status) : r.status}</TableCell>
                      <TableCell>{r.result?.cookies?.length ?? 0}</TableCell>
                      <TableCell translate="no" className="max-w-[340px] truncate" title={r.result?.finalUrl || r.url}>
                        {r.result?.finalUrl || r.url}
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
