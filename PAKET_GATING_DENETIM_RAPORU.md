# Paket / Modül Gating — Tam Denetim Raporu

> Tarih: 15 Haziran 2026
> Kapsam: `PLAN_PAKET_MODUL_UYUMU.md` spec'inin gerçek kod karşılığı + uçtan uca gating denetimi
> Aktif fiyatlandırma senaryosu: **D** (`ACTIVE_PRICING_SCENARIO = 'D'`, `lib/pricing-config.ts:529`)

---

## Özet

Spec'te tarif edilen paket/modül gating **büyük ölçüde uygulanmış ve sağlam**. Çekirdek
fonksiyonlar (`isModuleIncludedInPlan`, `getModuleAccess`, `canEnableModule`) ve konsol UI'si
plana göre doğru kilitliyor. Spec'te adı geçen iki yardımcı (`getModulesForPlanAndSector`,
`getAvailableModulesForPlan`) literal olarak yok; işlevleri mevcut fonksiyonlarla karşılanıyor —
dolayısıyla doküman güncel değil, kod tamam.

Ancak **onboarding tarafında gerçek bir sızıntı** var: kullanıcı kaydında varsayılan açılan
modül seti, planın `included` listesinin tamamını sektör default'larıyla birleştiriyor; ne plan
`defaultEnabled` alanını kullanıyor ne de sektör uyumunu filtreliyor. Bu, alt plan kullanıcılarına
premium/sektör-dışı modülleri varsayılan açık veriyor.

---

## Doğru Çalışan Mimari

| Katman | Dosya | Durum |
| :-- | :-- | :-- |
| Paket dahil mi? | `lib/pricing-config.ts:780 isModuleIncludedInPlan` | ✅ `included` + enterprise `'all'` sentinel'i doğru |
| Zengin erişim kararı | `lib/module-access.ts getModuleAccess` | ✅ core / coming_soon / included / upgrade_required + sektör uyumu + trial override |
| Entitlement kontrolü | `lib/entitlements.ts:246 canEnableModule` | ✅ `premium_locked` / `addon_required` yolları |
| Yükseltme hedefi | `lib/pricing-config.ts:796 getModuleUpgradeTarget` | ✅ starter→growth→enterprise sıralı arama |
| Konsol UI | `components/modules-content.tsx` | ✅ `checkModuleIncluded` + sektör + status filtresi, premium rozet |
| Plan alias | `lib/pricing-config.ts:54 LEGACY_PLAN_ALIASES` | ✅ `pro/professional/premium → growth` |

Aktif Senaryo D planları: **starter** ($19), **growth / "Scale"** ($49, `preferred` rozet),
**enterprise** (`included: ['all']`).

---

## Bulgular

### F1 — Onboarding plan + sektör dışı modülleri varsayılan AÇIK yapıyor  `[Yüksek]`

`lib/onboarding-intelligence.ts:194 buildDefaultModules`:

```ts
const planIncludedModules = getPlanIncludedModules(context.planId); // included listesinin TAMAMI
const sectorDefaults = getDefaultModulesForSector(context.sectorId);
return Array.from(new Set([...planIncludedModules, ...sectorDefaults]));
```

Üç ayrı sorun:

1. **`included` ≠ varsayılan açık.** `getPlanDefaultModules` (plan.defaultEnabled) yerine
   `getPlanIncludedModules` kullanılıyor. Sonuç: Growth kullanıcısı 14 modülün **hepsini**
   varsayılan açık alıyor (oysa `growth.defaultEnabled` yalnızca
   `[generalChatbot, productCatalog, salesOptimization]` olarak tanımlı).
2. **Sektör default'ları plana bakılmadan ekleniyor.** `defaultEnabledBySector` sektör
   eşleşmesi:
   - `productCatalog` → ecommerce, `digitalWaiter` → restaurant.
   - **Starter + restaurant** → premium `digitalWaiter` (starter planında YOK) varsayılan açık.
   - **Starter + ecommerce** → `productCatalog` (starter planında YOK) varsayılan açık.
3. **Sektör uyum filtresi yok.** Growth'un `included` listesindeki sektör-kısıtlı modüller
   (örn. `visualDiagnosis` = agriculture/healthcare/real_estate; `digitalWaiter` = restaurant),
   tenant'ın sektörü uymasa bile varsayılan açık geliyor.

Önerilen düzeltme: `buildDefaultModules`'u (a) `getPlanDefaultModules` tabanlı kur,
(b) sektör default'larını **yalnızca planda dahilse** ekle, (c) `isModuleAvailableForSector`
ile son bir uyum filtresi geçir.

```ts
const planDefaults = getPlanDefaultModules(context.planId);
const sectorDefaults = getDefaultModulesForSector(context.sectorId)
  .filter(m => isModuleIncludedInPlan(context.planId, m));
return Array.from(new Set([...planDefaults, ...sectorDefaults]))
  .filter(m => isModuleAvailableForSector(m, context.sectorId));
```

### F2 — `plan.defaultEnabled` alanı ölü kod  `[Yüksek / F1'in kökü]`

`getPlanDefaultModules` (`lib/pricing-config.ts:686`) tanımlı ama **hiçbir yerde çağrılmıyor**
(`grep` ile doğrulandı). Her plana özenle yazılmış `defaultEnabled` küçük seti tamamen göz ardı
ediliyor. F1 bunun doğrudan sonucu.

### F3 — Master KB ile aktif config çelişiyor  `[Orta]`

`VION_AI_MASTER_KB.md` 4 paket listeliyor: Starter $19, Growth $49, **Pro $99 (Önerilen, sınırsız)**,
Enterprise. Aktif Senaryo D'de **Pro yok** — sadece starter / growth("Scale") / enterprise var ve
`preferred` rozeti growth'ta. Ayrıca:

- `pro` planId'si sessizce `growth`'a alias'lanıyor → mevcut "pro" tenant'ları $49 growth'a düşer.
- displayName "Scale", KB'de "Growth". İsim tutarsız.

Karar gerekli: KB mı güncellenecek, yoksa Pro $99 planı config'e mi eklenecek?

### F4 — Bazı premium modüllerin enterprise-altı erişim yolu yok  `[Orta]`

`voiceAssistant`, `appointments`, `gamification`, `campaignManager` hiçbir planın `included`
listesinde değil (yalnız enterprise `'all'`). starter/growth'ta `premiumEligible: []` ve
`maxPremiumAddOns: 0` → add-on yolu da kapalı. Sonuç: Growth kullanıcısı `appointments` istiyorsa
tek seçenek Enterprise (Contact Sales). `appointments`/voice pazarlanan özellikler olduğundan bu
muhtemelen istenmeyen bir boşluk; ürün kararı gerek.

### F5 — Pasif senaryolarda (A/B/C) registry'de olmayan modül ID'leri  `[Düşük / footgun]`

`SCENARIO_A/B/C` `generalAssistant`, `salesCatalog`, `voiceAppointments`, `aiCopywriter`,
`emailMarketing` gibi registry'de **bulunmayan** ID'lere referans veriyor. D aktifken zararsız;
fakat senaryo değiştirildiği an `isModuleIncludedInPlan` hiçbir zaman eşleşmez ve gating sessizce
kırılır. Senaryo geçişi öncesi ID'ler registry ile hizalanmalı (veya A/B/C arşivlenmeli).

### F6 — `campaignManager`: premium + coming_soon  `[Bilgi]`

Enterprise `'all'` ile dahil sayılıyor ama `getModuleAccess` `coming_soon` → kilitli döndürüyor.
Tutarlı, aksiyon gerektirmez; bütünlük için not edildi.

### F7 — Test koşumu doğrulanamadı (ortam)  `[Doğrulama]`

Mevcut testler (`pricing-config.test.ts`, `module-access.test.ts`, `modules-registry.test.ts`)
bu Linux sandbox'ta çalıştırılamadı — `rolldown` native binding mimari uyumsuzluğu (`node_modules`
macOS'ta kurulu). Mac'te `npx vitest run` ile yeşil olduğu teyit edilmeli; F1/F2 için onboarding
default-module testleri eklenmeli.

---

## Önceliklendirme

| # | Bulgu | Önem | Efor | Aksiyon |
| :-- | :-- | :-- | :-- | :-- |
| F1 | Onboarding plan/sektör-dışı modülleri açıyor | Yüksek | Düşük | `buildDefaultModules` düzeltmesi |
| F2 | `defaultEnabled` ölü kod | Yüksek | Düşük | F1 ile birlikte çözülür |
| F3 | KB ↔ config plan farkı (Pro yok) | Orta | — | Ürün kararı + doc/config hizalama |
| F4 | Premium modüllere enterprise-altı yol yok | Orta | — | Ürün kararı |
| F5 | A/B/C senaryolarında geçersiz modül ID'leri | Düşük | Orta | Senaryo geçişi öncesi hizala |
| F7 | Testler ortamda koşulamadı | — | — | Mac'te koş + F1 testi ekle |

**Önerilen ilk iş:** F1 + F2 birlikte (tek fonksiyon düzeltmesi, düşük efor, yüksek etki),
ardından F1 için birim testi.
