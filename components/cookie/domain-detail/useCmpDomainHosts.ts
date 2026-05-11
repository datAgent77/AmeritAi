"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { cmpFetch } from "@/components/cookie/cmp-client"
import type { HostRow } from "@/components/cookie/domain-detail/types"

type CreateHostPayload = {
  hostname: string
  method: "dns_txt" | "http_file"
}

type CreateHostResponse = {
  id: string
  token: string
  instructions: any
}

export function useCmpDomainHosts(domainId: string) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [hosts, setHosts] = useState<HostRow[]>([])
  const [workingHost, setWorkingHost] = useState<string | null>(null)
  const [lastInstructions, setLastInstructions] = useState<any>(null)

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await cmpFetch<{ hosts: HostRow[] }>(user, `/api/cmp/domains/${domainId}/hosts`)
      setHosts(Array.isArray(data.hosts) ? data.hosts : [])
    } catch (error: any) {
      toast({ title: "Hata", description: error?.message || "Hostlar yüklenemedi", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [domainId, toast, user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createHost = useCallback(
    async (payload: CreateHostPayload) => {
      if (!user) return
      setWorkingHost(payload.hostname)
      try {
        const res = await cmpFetch<CreateHostResponse>(user, `/api/cmp/domains/${domainId}/hosts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        setLastInstructions(res.instructions || null)
        toast({ title: "Eklendi", description: "Doğrulama talimatlarını uygulayıp 'Doğrula'ya bas." })
        await refresh()
      } catch (error: any) {
        toast({ title: "Hata", description: error?.message || "Eklenemedi", variant: "destructive" })
      } finally {
        setWorkingHost(null)
      }
    },
    [domainId, refresh, toast, user]
  )

  const verifyHost = useCallback(
    async (hostname: string) => {
      if (!user) return
      setWorkingHost(hostname)
      try {
        const res = await cmpFetch<{ ok: boolean }>(user, `/api/cmp/domains/${domainId}/hosts/${encodeURIComponent(hostname)}/verify`, {
          method: "POST",
        })
        toast({ title: res.ok ? "Doğrulandı" : "Beklemede", description: res.ok ? "Hostname doğrulandı." : "Henüz doğrulanamadı." })
        await refresh()
      } catch (error: any) {
        toast({ title: "Hata", description: error?.message || "Doğrulanamadı", variant: "destructive" })
      } finally {
        setWorkingHost(null)
      }
    },
    [domainId, refresh, toast, user]
  )

  const deleteHost = useCallback(
    async (hostname: string) => {
      if (!user) return
      setWorkingHost(hostname)
      try {
        await cmpFetch(user, `/api/cmp/domains/${domainId}/hosts/${encodeURIComponent(hostname)}`, { method: "DELETE" })
        toast({ title: "Silindi", description: "Hostname silindi." })
        await refresh()
      } catch (error: any) {
        toast({ title: "Hata", description: error?.message || "Silinemedi", variant: "destructive" })
      } finally {
        setWorkingHost(null)
      }
    },
    [domainId, refresh, toast, user]
  )

  return { loading, hosts, workingHost, lastInstructions, createHost, verifyHost, deleteHost, refresh }
}

