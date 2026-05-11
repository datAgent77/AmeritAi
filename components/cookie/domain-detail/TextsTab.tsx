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
  controllerName,
  controllerEmail,
  controllerAddress,
  controllerPhone,
  dpoEmail,
  purposesText,
  legalBasesText,
  recipientsText,
  transfersText,
  retentionText,
  rightsText,
  dsarText,
  vendorsJson,
  onCreateDraft,
  onSelectDraft,
  onChangeTitle,
  onChangeDescription,
  onChangeUrl,
  onChangeLang,
  onChangeControllerName,
  onChangeControllerEmail,
  onChangeControllerAddress,
  onChangeControllerPhone,
  onChangeDpoEmail,
  onChangePurposesText,
  onChangeLegalBasesText,
  onChangeRecipientsText,
  onChangeTransfersText,
  onChangeRetentionText,
  onChangeRightsText,
  onChangeDsarText,
  onChangeVendorsJson,
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
  controllerName: string
  controllerEmail: string
  controllerAddress: string
  controllerPhone: string
  dpoEmail: string
  purposesText: string
  legalBasesText: string
  recipientsText: string
  transfersText: string
  retentionText: string
  rightsText: string
  dsarText: string
  vendorsJson: string
  onCreateDraft: () => void
  onSelectDraft: (policy: PolicyRow) => void
  onChangeTitle: (value: string) => void
  onChangeDescription: (value: string) => void
  onChangeUrl: (value: string) => void
  onChangeLang: (value: string) => void
  onChangeControllerName: (value: string) => void
  onChangeControllerEmail: (value: string) => void
  onChangeControllerAddress: (value: string) => void
  onChangeControllerPhone: (value: string) => void
  onChangeDpoEmail: (value: string) => void
  onChangePurposesText: (value: string) => void
  onChangeLegalBasesText: (value: string) => void
  onChangeRecipientsText: (value: string) => void
  onChangeTransfersText: (value: string) => void
  onChangeRetentionText: (value: string) => void
  onChangeRightsText: (value: string) => void
  onChangeDsarText: (value: string) => void
  onChangeVendorsJson: (value: string) => void
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

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Veri sorumlusu adı</Label>
                <Input value={controllerName} onChange={(e) => onChangeControllerName(e.target.value)} placeholder="Şirket Ünvanı" />
              </div>
              <div className="space-y-2">
                <Label>İletişim e-postası</Label>
                <Input translate="no" value={controllerEmail} onChange={(e) => onChangeControllerEmail(e.target.value)} placeholder="privacy@firma.com" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Adres</Label>
                <Textarea value={controllerAddress} onChange={(e) => onChangeControllerAddress(e.target.value)} className="min-h-[90px]" placeholder="Adres" />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input translate="no" value={controllerPhone} onChange={(e) => onChangeControllerPhone(e.target.value)} placeholder="+90 ..." />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>DPO/İrtibat (opsiyonel)</Label>
                <Input translate="no" value={dpoEmail} onChange={(e) => onChangeDpoEmail(e.target.value)} placeholder="dpo@firma.com" />
              </div>
              <div className="space-y-2">
                <Label>DSAR başvuru bilgisi</Label>
                <Textarea value={dsarText} onChange={(e) => onChangeDsarText(e.target.value)} className="min-h-[90px]" placeholder="Başvurular için e-posta/posta adresi ve süreç" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>İşleme amaçları</Label>
              <Textarea value={purposesText} onChange={(e) => onChangePurposesText(e.target.value)} className="min-h-[140px]" placeholder="Amaçlar" />
            </div>
            <div className="space-y-2">
              <Label>Hukuki sebepler / dayanaklar</Label>
              <Textarea value={legalBasesText} onChange={(e) => onChangeLegalBasesText(e.target.value)} className="min-h-[140px]" placeholder="KVKK/GDPR hukuki dayanaklar" />
            </div>
            <div className="space-y-2">
              <Label>Alıcı grupları / üçüncü taraflar</Label>
              <Textarea value={recipientsText} onChange={(e) => onChangeRecipientsText(e.target.value)} className="min-h-[120px]" placeholder="Alıcı grupları" />
            </div>
            <div className="space-y-2">
              <Label>Yurt dışına aktarım</Label>
              <Textarea value={transfersText} onChange={(e) => onChangeTransfersText(e.target.value)} className="min-h-[120px]" placeholder="Aktarım ülkeleri ve dayanak" />
            </div>
            <div className="space-y-2">
              <Label>Saklama süresi</Label>
              <Textarea value={retentionText} onChange={(e) => onChangeRetentionText(e.target.value)} className="min-h-[90px]" placeholder="Saklama süreleri ve kriter" />
            </div>
            <div className="space-y-2">
              <Label>Kullanıcı hakları</Label>
              <Textarea value={rightsText} onChange={(e) => onChangeRightsText(e.target.value)} className="min-h-[140px]" placeholder="KVKK/GDPR hakları" />
            </div>

            <div className="space-y-2">
              <Label>Vendor listesi (JSON)</Label>
              <Textarea translate="no" value={vendorsJson} onChange={(e) => onChangeVendorsJson(e.target.value)} className="min-h-[180px]" placeholder='[{"name":"Google Analytics","domain":"google-analytics.com","category":"analytics","purpose":"Analytics","privacyUrl":"https://..."}]' />
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
