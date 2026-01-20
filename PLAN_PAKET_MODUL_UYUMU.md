# Plan: Paket ve Sektör Uyumuna Göre Modül Gösterimi

## Problem
Şu anda sistemde paket bazlı modül kontrolü yok. Tüm paketlerde (Starter, Pro, Enterprise) sektör bazlı modüller gösteriliyor ama paket bazlı kısıtlama yapılmıyor. Bu yüzden:
- Starter plan kullanıcıları Pro plan modüllerini görebiliyor
- Paket bazlı modül farklılaştırması yapılmıyor
- `pricing-config.ts`'teki `modules.included` listesi kullanılmıyor

## Çözüm Planı

### 1. Yeni Fonksiyonlar Ekleme

#### `lib/modules-registry.ts`
- `getModulesForPlanAndSector(planId: string, sectorId: SectorId): ModuleId[]`
  - Paket ve sektör uyumuna göre erişilebilir modülleri döndürür
  - `pricing-config.ts`'teki `modules.included` listesini kullanır
  - Sektör uyumunu kontrol eder

#### `lib/entitlements.ts`
- `getAvailableModulesForPlan(planId: string, sectorId: SectorId): ModuleId[]`
  - Paket ve sektör bazlı erişilebilir modülleri döndürür
  - Core modüller + paket dahil modüller + sektör uyumlu modüller
- `canEnableModule` fonksiyonunu güncelle
  - Paket bazlı kontrol ekle
  - Paket dahilinde olmayan modülleri `premium_locked` olarak işaretle

### 2. Mevcut Fonksiyonları Güncelleme

#### `lib/pricing-config.ts`
- `getPlanIncludedModules(planId: string): string[]` ✅ (Zaten var)
- `getPlanDefaultModules(planId: string): string[]` ✅ (Zaten var)
- Yeni: `isModuleIncludedInPlan(planId: string, moduleId: string): boolean`
  - Bir modülün paket dahilinde olup olmadığını kontrol eder

#### `lib/entitlements.ts`
- `canEnableModule` fonksiyonunu güncelle:
  1. Core modül kontrolü (değişmez)
  2. Sektör uyum kontrolü (değişmez)
  3. **YENİ:** Paket dahilinde mi kontrolü ekle
  4. Premium modül kontrolü (paket dahilinde değilse premium_locked)

#### `lib/onboarding-intelligence.ts`
- `buildDefaultModules` fonksiyonunu güncelle:
  - Sadece sektör defaults değil, paket dahil modülleri de kullan
  - Paket + sektör uyumuna göre modül listesi oluştur

### 3. UI Bileşenlerini Güncelleme

#### `components/modules-content.tsx`
- `isModuleIncluded` fonksiyonunu güncelle:
  - Sadece sektör kontrolü değil, paket kontrolü de yap
  - `getPlanIncludedModules` kullanarak paket dahilinde mi kontrol et
- `filteredModules` mantığını güncelle:
  - Paket dahilinde olmayan modülleri filtrele veya "premium" olarak işaretle

#### `app/onboarding/page.tsx`
- Modül gösterim mantığını güncelle:
  - Paket bazlı modül kontrolü ekle
  - Paket dahilinde olmayan modülleri kilitle veya "upgrade required" göster

### 4. Mantık Akışı

```
Kullanıcı Modül Görmek İstiyor
    ↓
1. Core modül mü? → EVET → Göster (her zaman)
    ↓ HAYIR
2. Paket dahilinde mi? (pricing-config.ts'ten kontrol)
    ↓ EVET
3. Sektör uyumlu mu? (modules-registry.ts'ten kontrol)
    ↓ EVET → Göster (paket dahil)
    ↓ HAYIR → Gösterme (sektör uyumsuz)
    ↓ HAYIR (paket dahilinde değil)
4. Premium modül mü?
    ↓ EVET → Premium badge ile göster (upgrade required)
    ↓ HAYIR → Gösterme veya "not available" göster
```

### 5. Örnek Senaryolar

#### Senaryo 1: Starter Plan + E-commerce Sektörü
- **Paket dahil modüller:** `['generalAssistant', 'knowledgeEducation', 'leadCollection']`
- **Sektör defaults:** `['generalChatbot', 'knowledgeBase', 'productCatalog', 'leadCollection']`
- **Gösterilecek modüller:** 
  - Core: `generalChatbot`, `knowledgeBase` (her zaman)
  - Paket dahil + sektör uyumlu: `leadCollection`
  - Premium (göster ama kilitle): `productCatalog`, `salesOptimization` vb.

#### Senaryo 2: Pro Plan + E-commerce Sektörü
- **Paket dahil modüller:** `['generalAssistant', 'knowledgeEducation', 'leadCollection', 'salesCatalog']`
- **Sektör defaults:** `['generalChatbot', 'knowledgeBase', 'productCatalog', 'leadCollection']`
- **Gösterilecek modüller:**
  - Core: `generalChatbot`, `knowledgeBase`
  - Paket dahil: `leadCollection`, `salesCatalog` (productCatalog ile eşleşiyor)
  - Premium eligible: `voiceAppointments`, `aiCopywriter`, `salesOptimization`, `emailMarketing` (seçilebilir)

### 6. Dosya Değişiklikleri

1. **lib/modules-registry.ts**
   - `getModulesForPlanAndSector` fonksiyonu ekle

2. **lib/pricing-config.ts**
   - `isModuleIncludedInPlan` fonksiyonu ekle

3. **lib/entitlements.ts**
   - `getAvailableModulesForPlan` fonksiyonu ekle
   - `canEnableModule` fonksiyonunu güncelle (paket kontrolü ekle)

4. **lib/onboarding-intelligence.ts**
   - `buildDefaultModules` fonksiyonunu güncelle (paket kontrolü ekle)

5. **components/modules-content.tsx**
   - `isModuleIncluded` fonksiyonunu güncelle (paket kontrolü ekle)

6. **app/onboarding/page.tsx**
   - Modül gösterim mantığını güncelle (paket kontrolü ekle)

### 7. Test Senaryoları

1. ✅ Starter plan kullanıcısı sadece Starter dahil modülleri görmeli
2. ✅ Pro plan kullanıcısı Pro dahil modülleri + premium eligible modülleri görmeli
3. ✅ Enterprise plan kullanıcısı tüm modülleri görmeli
4. ✅ Paket dahilinde olmayan modüller "premium" badge ile gösterilmeli
5. ✅ Sektör uyumsuz modüller gösterilmemeli (veya "not available" gösterilmeli)

## Uygulama Sırası

1. ✅ Yeni helper fonksiyonları ekle (`lib/modules-registry.ts`, `lib/pricing-config.ts`)
2. ✅ `lib/entitlements.ts`'i güncelle
3. ✅ `lib/onboarding-intelligence.ts`'i güncelle
4. ✅ `components/modules-content.tsx`'i güncelle
5. ✅ `app/onboarding/page.tsx`'i güncelle
6. ✅ Test et ve doğrula
