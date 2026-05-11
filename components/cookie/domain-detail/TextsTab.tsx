"use client"

import { Loader2, Save, Send } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import type { DerivedConfig, PolicyRow } from "@/components/cookie/domain-detail/types"

export function TextsTab({
  derived,
  policies,
  saving,
  publishing,
  selectedDraftId,
  draftTitle,
  draftDescription,
  draftUrl,
  draftLang,
  onCreateDraft,
  onSelectDraft,
  onChangeTitle,
  onChangeDescription,
  onChangeUrl,
  onChangeLang,
  onSaveDraft,
  onPublish,
}: {
  derived: DerivedConfig
  policies: PolicyRow[]
  saving: boolean
  publishing: string | null
  selectedDraftId: string | null
  draftTitle: string
  draftDescription: string
  draftUrl: string
  draftLang: string
  onCreateDraft: () => void
  onSelectDraft: (policy: PolicyRow) => void
  onChangeTitle: (value: string) => void
  onChangeDescription: (value: string) => void
  onChangeUrl: (value: string) => void
  onChangeLang: (value: string) => void
  onSaveDraft: () => void
  onPublish: (policyId: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Metin sürümleme</CardTitle>
            <CardDescription>Taslak oluştur, düzenle ve yayınla.</CardDescription>
          </div>
          <Button onClick={onCreateDraft} disabled={saving} className="gap-2">
            <Send className="h-4 w-4" />
            Yeni taslak
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Durum</TableHead>
              <TableHead>Dil</TableHead>
              <TableHead>Başlık</TableHead>
              <TableHead>Hash</TableHead>
              <TableHead>Yayın</TableHead>
              <TableHead className="text-right">Aksiyon</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-sm text-muted-foreground">
                  Henüz sürüm yok.
                </TableCell>
              </TableRow>
            ) : (
              policies.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Badge variant={p.status === "published" ? "outline" : "secondary"}>{p.status}</Badge>
                  </TableCell>
                  <TableCell>{p.language || "-"}</TableCell>
                  <TableCell className="max-w-[260px] truncate" title={p.content?.title || ""}>
                    {p.content?.title || "-"}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={p.contentHash}>
                    {p.contentHash}
                  </TableCell>
                  <TableCell>{p.publishedAt ? new Date(p.publishedAt).toLocaleString() : "-"}</TableCell>
                  <TableCell className="text-right">
                    {p.status === "draft" ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => onSelectDraft(p)}>
                          Düzenle
                        </Button>
                        <Button size="sm" variant="outline" disabled={publishing === p.id} onClick={() => onPublish(p.id)} className="gap-2">
                          {publishing === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          Yayınla
                        </Button>
                      </div>
                    ) : (
                      <Badge variant={derived.publishedPolicyVersionId === p.id ? "default" : "outline"}>
                        {derived.publishedPolicyVersionId === p.id ? "Aktif" : "Published"}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Taslak düzenle</CardTitle>
            <CardDescription>Draft sürümler düzenlenebilir, yayınlanan sürümler kilitlenir.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Dil</Label>
                <Select value={draftLang} onValueChange={onChangeLang}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seç" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tr">TR</SelectItem>
                    <SelectItem value="en">EN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Politika URL (opsiyonel)</Label>
                <Input value={draftUrl} onChange={(e) => onChangeUrl(e.target.value)} placeholder="https://example.com/cerez-politikasi" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Başlık</Label>
              <Input value={draftTitle} onChange={(e) => onChangeTitle(e.target.value)} placeholder="Çerez Aydınlatma Metni" />
            </div>
            <div className="space-y-2">
              <Label>Banner açıklaması</Label>
              <Textarea value={draftDescription} onChange={(e) => onChangeDescription(e.target.value)} className="min-h-[120px]" placeholder="Sitenin çalışması için zorunlu çerezler kullanıyoruz..." />
            </div>
            <div className="flex justify-end">
              <Button onClick={onSaveDraft} disabled={saving || !selectedDraftId} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Kaydet
              </Button>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}
