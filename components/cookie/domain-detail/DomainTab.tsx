"use client"

import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { CmpDomain } from "@/components/cookie/domain-detail/types"

export function DomainTab({ domain, saving, onChange, onSave }: { domain: CmpDomain; saving: boolean; onChange: (next: CmpDomain) => void; onSave: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Domain bilgileri</CardTitle>
        <CardDescription>Hostname ve yayın durumunu yönet.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Ad</Label>
            <Input value={domain.name} onChange={(e) => onChange({ ...domain, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Primary hostname</Label>
            <Input value={domain.primaryHostname} onChange={(e) => onChange({ ...domain, primaryHostname: e.target.value })} placeholder="example.com…" />
          </div>
          <div className="space-y-2">
            <Label>Cookie domain</Label>
            <Input value={domain.cookieDomain || ""} onChange={(e) => onChange({ ...domain, cookieDomain: e.target.value })} placeholder=".example.com…" />
          </div>
          <div className="flex items-end justify-between rounded-lg border bg-muted/20 px-4 py-3">
            <div>
              <div className="text-sm font-medium">Yayın durumu</div>
              <div className="text-xs text-muted-foreground">Paused iken banner gösterilmez.</div>
            </div>
            <Switch checked={domain.status !== "paused"} onCheckedChange={(checked) => onChange({ ...domain, status: checked ? "active" : "paused" })} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={onSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Kaydet
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
