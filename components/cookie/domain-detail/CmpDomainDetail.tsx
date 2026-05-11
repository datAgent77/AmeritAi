"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCmpDomainDetail } from "@/components/cookie/domain-detail/useCmpDomainDetail"
import { DomainHeader } from "@/components/cookie/domain-detail/DomainHeader"
import { DomainTab } from "@/components/cookie/domain-detail/DomainTab"
import { BannerTab } from "@/components/cookie/domain-detail/BannerTab"
import { TextsTab } from "@/components/cookie/domain-detail/TextsTab"
import { HostsTab } from "@/components/cookie/domain-detail/HostsTab"
import { useCmpDomainHosts } from "@/components/cookie/domain-detail/useCmpDomainHosts"
import { ScanTab } from "@/components/cookie/domain-detail/ScanTab"
import { useCmpDomainScans } from "@/components/cookie/domain-detail/useCmpDomainScans"

export function CmpDomainDetail({ domainId }: { domainId: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const tabs = useMemo(() => ["domain", "hosts", "banner", "texts", "scan"] as const, [])
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("domain")
  const state = useCmpDomainDetail(domainId)
  const hosts = useCmpDomainHosts(domainId)
  const scans = useCmpDomainScans(domainId)

  useEffect(() => {
    const fromUrl = searchParams?.get("tab")
    if (fromUrl && (tabs as readonly string[]).includes(fromUrl) && fromUrl !== activeTab) {
      setActiveTab(fromUrl as any)
    }
  }, [activeTab, searchParams, tabs])

  useEffect(() => {
    const current = new URLSearchParams(searchParams?.toString() || "")
    if (current.get("tab") === activeTab) return
    current.set("tab", activeTab)
    router.replace(`${pathname}?${current.toString()}`)
  }, [activeTab, pathname, router, searchParams])

  if (state.loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!state.domain) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Domain bulunamadı</CardTitle>
          <CardDescription>Bu domain silinmiş olabilir.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => router.push("/cookie/domains")}>
            Geri dön
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <DomainHeader
        domain={state.domain}
        deleting={state.saving}
        onDelete={() => {
          const ok = window.confirm(`“${state.domain?.name}” domainini silmek istiyor musun?`)
          if (!ok) return
          state.deleteDomain()
        }}
      />
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="domain">Domain</TabsTrigger>
          <TabsTrigger value="hosts">Hostlar</TabsTrigger>
          <TabsTrigger value="banner">Banner & Tercihler</TabsTrigger>
          <TabsTrigger value="texts">Metin & Sürüm</TabsTrigger>
          <TabsTrigger value="scan">Tarama</TabsTrigger>
        </TabsList>

        <TabsContent value="domain" className="space-y-6">
          <DomainTab domain={state.domain} saving={state.saving} onChange={state.setDomain} onSave={state.saveDomain} />
        </TabsContent>

        <TabsContent value="hosts" className="space-y-6">
          <HostsTab
            loading={hosts.loading}
            hosts={hosts.hosts}
            workingHost={hosts.workingHost}
            lastInstructions={hosts.lastInstructions}
            onCreate={hosts.createHost}
            onVerify={hosts.verifyHost}
            onDelete={hosts.deleteHost}
          />
        </TabsContent>

        <TabsContent value="banner" className="space-y-6">
          <BannerTab
            config={state.config}
            derived={state.derivedConfig}
            saving={state.saving}
            onConfigChange={state.setConfig}
            onSave={state.saveConfig}
          />
        </TabsContent>

        <TabsContent value="texts" className="space-y-6">
          <TextsTab
            derived={state.derivedConfig}
            policies={state.policies}
            saving={state.saving}
            publishing={state.publishing}
            selectedDraftId={state.selectedDraftId}
            draftTitle={state.policyDraftTitle}
            draftDescription={state.policyDraftDescription}
            draftUrl={state.policyDraftUrl}
            draftLang={state.policyDraftLang}
            onCreateDraft={() => {
              setActiveTab("texts")
              state.createDraft()
            }}
            onSelectDraft={state.selectDraft}
            onChangeTitle={state.setPolicyDraftTitle}
            onChangeDescription={state.setPolicyDraftDescription}
            onChangeUrl={state.setPolicyDraftUrl}
            onChangeLang={state.setPolicyDraftLang}
            onSaveDraft={state.saveDraft}
            onPublish={state.publish}
          />
        </TabsContent>

        <TabsContent value="scan" className="space-y-6">
          <ScanTab
            loading={scans.loading}
            running={scans.running}
            allowedHostnames={Array.from(
              new Set([
                state.domain.primaryHostname,
                ...hosts.hosts.filter((h) => h.status === "verified").map((h) => h.hostname),
              ].filter(Boolean))
            )}
            runs={scans.runs}
            onRunScan={scans.runScan}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
