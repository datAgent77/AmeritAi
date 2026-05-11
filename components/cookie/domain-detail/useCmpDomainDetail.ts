"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { cmpFetch } from "@/components/cookie/cmp-client"
import type { CmpConfig, CmpDomain, DerivedConfig, PolicyRow } from "@/components/cookie/domain-detail/types"

export function useCmpDomainDetail(domainId: string) {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState<string | null>(null)
  const [domain, setDomain] = useState<CmpDomain | null>(null)
  const [config, setConfig] = useState<CmpConfig>({})
  const [policies, setPolicies] = useState<PolicyRow[]>([])

  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null)
  const [policyDraftTitle, setPolicyDraftTitle] = useState("")
  const [policyDraftDescription, setPolicyDraftDescription] = useState("")
  const [policyDraftUrl, setPolicyDraftUrl] = useState("")
  const [policyDraftLang, setPolicyDraftLang] = useState("tr")

  const derivedConfig: DerivedConfig = useMemo(() => {
    const banner = config.bannerSettings || {}
    const pref = config.preferenceSettings || {}
    const cats = pref.categories || {}

    return {
      bannerPosition: (banner.position || "bottom") as "bottom" | "center",
      bannerTheme: (banner.theme || "light") as "light" | "dark",
      primaryColor: banner.primaryColor || "#111827",
      revisitDays: typeof pref.revisitDays === "number" ? pref.revisitDays : 180,
      analyticsEnabled: Boolean(cats.analytics?.enabled),
      marketingEnabled: Boolean(cats.marketing?.enabled),
      functionalEnabled: Boolean(cats.functional?.enabled),
      publishedPolicyVersionId: config.publishedPolicyVersionId || null,
    }
  }, [config])

  const loadAll = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [domainRes, configRes, policiesRes] = await Promise.all([
        cmpFetch<{ domain: CmpDomain }>(user, `/api/cmp/domains/${domainId}`),
        cmpFetch<{ config: CmpConfig }>(user, `/api/cmp/domains/${domainId}/config`),
        cmpFetch<{ policies: PolicyRow[] }>(user, `/api/cmp/domains/${domainId}/policies`),
      ])

      setDomain(domainRes.domain)
      setConfig(configRes.config || {})
      const nextPolicies = Array.isArray(policiesRes.policies) ? policiesRes.policies : []
      setPolicies(nextPolicies)

      const activeDraftId = selectedDraftId
      const draft = activeDraftId ? nextPolicies.find((p) => p.id === activeDraftId) : nextPolicies.find((p) => p.status === "draft")
      if (draft && draft.status === "draft") {
        setSelectedDraftId(draft.id)
        setPolicyDraftTitle(draft.content?.title || "")
        setPolicyDraftDescription(draft.content?.bannerDescription || "")
        setPolicyDraftUrl(draft.content?.policyUrl || "")
        setPolicyDraftLang(draft.language || "tr")
      }
    } catch (error: any) {
      toast({ title: "Hata", description: error?.message || "Yüklenemedi", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [domainId, selectedDraftId, toast, user])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const saveDomain = useCallback(async () => {
    if (!user || !domain) return
    setSaving(true)
    try {
      await cmpFetch(user, `/api/cmp/domains/${domainId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(domain),
      })
      toast({ title: "Kaydedildi", description: "Domain güncellendi." })
    } catch (error: any) {
      toast({ title: "Hata", description: error?.message || "Kaydedilemedi", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }, [domain, domainId, toast, user])

  const saveConfig = useCallback(async () => {
    if (!user) return
    setSaving(true)
    try {
      const payload: CmpConfig = {
        bannerSettings: {
          position: derivedConfig.bannerPosition,
          theme: derivedConfig.bannerTheme,
          primaryColor: derivedConfig.primaryColor,
        },
        preferenceSettings: {
          revisitDays: derivedConfig.revisitDays,
          categories: {
            necessary: { required: true },
            analytics: { enabled: derivedConfig.analyticsEnabled },
            marketing: { enabled: derivedConfig.marketingEnabled },
            functional: { enabled: derivedConfig.functionalEnabled },
          },
        },
        publishedPolicyVersionId: derivedConfig.publishedPolicyVersionId,
      }

      await cmpFetch(user, `/api/cmp/domains/${domainId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      toast({ title: "Kaydedildi", description: "Ayarlar güncellendi." })
      await loadAll()
    } catch (error: any) {
      toast({ title: "Hata", description: error?.message || "Kaydedilemedi", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }, [derivedConfig, domainId, loadAll, toast, user])

  const createDraft = useCallback(async () => {
    if (!user) return
    setSaving(true)
    try {
      const res = await cmpFetch<{ id: string }>(user, `/api/cmp/domains/${domainId}/policies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "tr" }),
      })

      toast({ title: "Oluşturuldu", description: "Taslak metin oluşturuldu." })
      setSelectedDraftId(res.id)
      setPolicyDraftTitle("")
      setPolicyDraftDescription("")
      setPolicyDraftUrl("")
      setPolicyDraftLang("tr")
      await loadAll()
    } catch (error: any) {
      toast({ title: "Hata", description: error?.message || "Oluşturulamadı", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }, [domainId, loadAll, toast, user])

  const selectDraft = useCallback((policy: PolicyRow) => {
    if (policy.status !== "draft") return
    setSelectedDraftId(policy.id)
    setPolicyDraftTitle(policy.content?.title || "")
    setPolicyDraftDescription(policy.content?.bannerDescription || "")
    setPolicyDraftUrl(policy.content?.policyUrl || "")
    setPolicyDraftLang(policy.language || "tr")
  }, [])

  const saveDraft = useCallback(async () => {
    if (!user || !selectedDraftId) return
    setSaving(true)
    try {
      await cmpFetch(user, `/api/cmp/domains/${domainId}/policies/${selectedDraftId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: policyDraftTitle,
          bannerDescription: policyDraftDescription,
          policyUrl: policyDraftUrl,
          language: policyDraftLang,
        }),
      })
      toast({ title: "Kaydedildi", description: "Taslak güncellendi." })
      await loadAll()
    } catch (error: any) {
      toast({ title: "Hata", description: error?.message || "Kaydedilemedi", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }, [domainId, loadAll, policyDraftDescription, policyDraftLang, policyDraftTitle, policyDraftUrl, selectedDraftId, toast, user])

  const publish = useCallback(
    async (policyId: string) => {
      if (!user) return
      setPublishing(policyId)
      try {
        await cmpFetch(user, `/api/cmp/domains/${domainId}/policies/${policyId}/publish`, { method: "POST" })
        toast({ title: "Yayınlandı", description: "Bu sürüm yayınlandı ve domain’e bağlandı." })
        await loadAll()
      } catch (error: any) {
        toast({ title: "Hata", description: error?.message || "Yayınlanamadı", variant: "destructive" })
      } finally {
        setPublishing(null)
      }
    },
    [domainId, loadAll, toast, user]
  )

  const deleteDomain = useCallback(async () => {
    if (!user) return
    setSaving(true)
    try {
      await cmpFetch(user, `/api/cmp/domains/${domainId}`, { method: "DELETE" })
      toast({ title: "Silindi", description: "Domain silindi." })
      router.push("/cookie/domains")
    } catch (error: any) {
      toast({ title: "Hata", description: error?.message || "Silinemedi", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }, [domainId, router, toast, user])

  return {
    loading,
    saving,
    publishing,
    domain,
    setDomain,
    config,
    setConfig,
    derivedConfig,
    policies,
    selectedDraftId,
    policyDraftTitle,
    policyDraftDescription,
    policyDraftUrl,
    policyDraftLang,
    setPolicyDraftTitle,
    setPolicyDraftDescription,
    setPolicyDraftUrl,
    setPolicyDraftLang,
    saveDomain,
    saveConfig,
    createDraft,
    selectDraft,
    saveDraft,
    publish,
    deleteDomain,
    refresh: loadAll,
  }
}
