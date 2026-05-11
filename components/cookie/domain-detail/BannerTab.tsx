"use client"

import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { CmpConfig, DerivedConfig } from "@/components/cookie/domain-detail/types"

export function BannerTab({
  config,
  derived,
  saving,
  onConfigChange,
  onSave,
}: {
  config: CmpConfig
  derived: DerivedConfig
  saving: boolean
  onConfigChange: (next: CmpConfig) => void
  onSave: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Banner ayarları</CardTitle>
        <CardDescription>UI ayarları ve kategori tercihleri.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Pozisyon</Label>
            <Select
              value={derived.bannerPosition}
              onValueChange={(v) => onConfigChange({ ...config, bannerSettings: { ...(config.bannerSettings || {}), position: v as any } })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seç" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bottom">Bottom bar</SelectItem>
                <SelectItem value="center">Center modal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tema</Label>
            <Select value={derived.bannerTheme} onValueChange={(v) => onConfigChange({ ...config, bannerSettings: { ...(config.bannerSettings || {}), theme: v as any } })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seç" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Primary color</Label>
            <Input value={derived.primaryColor} onChange={(e) => onConfigChange({ ...config, bannerSettings: { ...(config.bannerSettings || {}), primaryColor: e.target.value } })} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <div className="text-sm font-medium">Analitik</div>
              <div className="text-xs text-muted-foreground">Google Analytics vb.</div>
            </div>
            <Switch
              checked={derived.analyticsEnabled}
              onCheckedChange={(checked) =>
                onConfigChange({
                  ...config,
                  preferenceSettings: {
                    ...(config.preferenceSettings || {}),
                    categories: {
                      ...((config.preferenceSettings || {}).categories || {}),
                      analytics: { enabled: checked },
                    },
                  },
                })
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <div className="text-sm font-medium">Pazarlama</div>
              <div className="text-xs text-muted-foreground">Reklam/pixel</div>
            </div>
            <Switch
              checked={derived.marketingEnabled}
              onCheckedChange={(checked) =>
                onConfigChange({
                  ...config,
                  preferenceSettings: {
                    ...(config.preferenceSettings || {}),
                    categories: {
                      ...((config.preferenceSettings || {}).categories || {}),
                      marketing: { enabled: checked },
                    },
                  },
                })
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <div className="text-sm font-medium">İşlevsel</div>
              <div className="text-xs text-muted-foreground">Tercihler, kişiselleştirme</div>
            </div>
            <Switch
              checked={derived.functionalEnabled}
              onCheckedChange={(checked) =>
                onConfigChange({
                  ...config,
                  preferenceSettings: {
                    ...(config.preferenceSettings || {}),
                    categories: {
                      ...((config.preferenceSettings || {}).categories || {}),
                      functional: { enabled: checked },
                    },
                  },
                })
              }
            />
          </div>
          <div className="space-y-2 rounded-lg border px-4 py-3">
            <Label>Yeniden gösterim (gün)</Label>
            <Input
              type="number"
              min={1}
              max={3650}
              value={derived.revisitDays}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  preferenceSettings: { ...(config.preferenceSettings || {}), revisitDays: Number(e.target.value) || 180 },
                })
              }
            />
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
