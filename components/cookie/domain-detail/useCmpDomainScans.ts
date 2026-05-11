"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { cmpFetch } from "@/components/cookie/cmp-client"

export type ScanRun = {
  id: string
  hostname: string
  url: string
  status: "running" | "completed" | "failed"
  createdAt?: string
  startedAt?: string
  endedAt?: string | null
  error?: string | null
  result?: {
    ok: boolean
    status: number
    finalUrl: string
    cookies: Array<{ name: string; raw: string; domain?: string; path?: string; expires?: string; sameSite?: string }>
  } | null
}

export function useCmpDomainScans(domainId: string) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [runs, setRuns] = useState<ScanRun[]>([])

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await cmpFetch<{ runs: ScanRun[] }>(user, `/api/cmp/domains/${domainId}/scans`)
      setRuns(Array.isArray(data.runs) ? data.runs : [])
    } catch (error: any) {
      toast({ title: "Hata", description: error?.message || "Tarama kayıtları yüklenemedi", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [domainId, toast, user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const runScan = useCallback(
    async (hostname: string) => {
      if (!user) return
      setRunning(true)
      try {
        await cmpFetch(user, `/api/cmp/domains/${domainId}/scans`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hostname }),
        })
        toast({ title: "Tarama tamamlandı", description: "Sonuçlar listelendi." })
        await refresh()
      } catch (error: any) {
        toast({ title: "Hata", description: error?.message || "Tarama başarısız", variant: "destructive" })
      } finally {
        setRunning(false)
      }
    },
    [domainId, refresh, toast, user]
  )

  return { loading, running, runs, refresh, runScan }
}

