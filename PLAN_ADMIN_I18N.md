# Plan: Yönetici Panelini İki Dilli Yapma (TR + EN)

> Tarih: 15 Haziran 2026
> Hedef: Süper Yönetici / Tenant yönetim panelini, mevcut widget altyapısını kullanarak
> tam olarak Türkçe **ve** İngilizce destekler hâle getirmek.

---

## 1. Mevcut Durum (Denetim Bulguları)

**İyi haber — altyapı zaten var:**
- `context/LanguageContext.tsx` → `useLanguage()` ile `{ language, setLanguage, t }`.
  `t(key)` aktif dile bakar, yoksa **en**'e düşer, o da yoksa anahtarı "humanize" eder.
- `lib/translations.ts` → `en`, `tr` dolu; `de`, `es` kısmen; `fr`, `pt`, `ar` boş (en'e fallback).
- `components/language-switcher.tsx` mevcut.

**Asıl iş nerede:**
- Admin sayfalarının çoğu ince **wrapper** (`app/admin/.../page.tsx` → `components/...` çağırır).
  Gerçek görünen metinler **paylaşılan bileşenlerde** (`components/`), bu bileşenler hem
  `/console` (tenant) hem `/admin` (süper admin) tarafından kullanılır.
- Tahmini sabit-Türkçe yoğunluğu (`components/`, ~150 dosya, kaba tarama):

  | Bölüm | TR-string satırı (kaba) |
  | :-- | --: |
  | modules (surveys, voice, kvkk, gamification, dynamic-context, handoff, ...) | ~558 |
  | kök bileşenler (sidebar'lar, dashboard'lar, content-management, modules-content) | ~505 |
  | integrations (whatsapp, instagram, messenger, evolution, mobile) | ~310 |
  | knowledge (guided-skills, assistant-training, file/url/text/qa) | ~178 |
  | omni | ~159 |
  | widget-settings (appearance-tab vb.) | ~116 |
  | shopper | ~107 |
  | cookie / landing (public, kapsam dışı) | ~121 |

  Net admin kapsamı kabaca **~1.900 string / ~120 bileşen**.

**Engelleyici bulgu:** `LanguageSwitcher` admin kabuğunda render **edilmiyor**. Çeviri
yapılsa bile super admin dili değiştiremez. Faz 0'da eklenmeli.

---

## 2. Çalışma Modeli ve Sözleşmeler

### 2.1 Çeviri anahtarı isimlendirme
Namespace'li, çakışmasız anahtarlar:
```
admin.shell.nav.overview          "Genel Bakış"        / "Overview"
admin.content.blog.title          "Blog Yazıları"      / "Blog Posts"
admin.content.blog.addNew         "Yeni Ekle"          / "Add New"
admin.modules.surveys.<...>
```
- Bölüm prefix'i = dosyanın ait olduğu özellik alanı.
- Mevcut düz anahtarlar (`infoReceived` vb.) korunur; yenileri namespace'li eklenir.
- Dinamik metinlerde interpolation: `t('...').replace('{name}', x)` (mevcut `leadThankYou` deseni).

### 2.2 Dosya başına mekanik prosedür
1. `import { useLanguage } from "@/context/LanguageContext"` (yoksa ekle), `const { t } = useLanguage()`.
2. Görünen her sabit string'i `t('namespace.key')` ile değiştir.
3. Anahtar + TR/EN değerini `lib/translations.ts`'in `en` ve `tr` bloklarına ekle.
4. `placeholder`, `title`, `aria-label`, `toast`, `alert`, buton metinleri dahil.
5. Sektör/enum gibi veri-etiketlerini de gözden geçir (registry'den geliyorsa orası).

### 2.3 Doğrulama
- Dev'de `t()` eksik anahtarı `console.warn("[i18n] Missing translation key...")` basıyor —
  her fazda konsolu temiz bırakmak hedef.
- Her faz sonrası ilgili ekranlarda **EN/TR toggle** ile gözle kontrol.
- Opsiyonel: CI'ya "admin altında JSX'te çıplak Türkçe string" yakalayan basit bir lint script'i.

---

## 3. Fazlar

### Faz 0 — Hazırlık (engelleri kaldır)  `[~yarım gün]`
- `LanguageSwitcher`'ı admin kabuğuna ekle (super-admin layout / topbar).
- Admin'de dil tercihini kalıcı yap (localStorage + tenant/kullanıcı tercihi).
- Anahtar namespace kuralını ve çeviri ekleme akışını sabitle.
- (Opsiyonel) eksik-string lint script'i.

### Faz 1 — Admin Kabuğu / Çatı  `[~505 string'in shell kısmı]`
Her ekranda görünen çerçeve; en yüksek görünür etki:
- `components/super-admin-dashboard.tsx`, `*-sidebar.tsx` (console/agency/omni),
  breadcrumb'lar, `app/admin/content/layout.tsx` sekme adları.
- Sonuç: menü, başlıklar, navigasyon iki dilli.

### Faz 2 — İçerik Yönetimi (kullanıcının baktığı ekran)
- `components/content-management.tsx` + `app/admin/content/{blog,faq,education}`.
- Sabit metinler: "Blog Yazıları", "Yeni Ekle", "Web sitenizdeki...", "Ara...", "Yayında",
  durum etiketleri, toast'lar.

### Faz 3 — Tenant Ayarları
- `app/admin/tenant/[userId]/settings/*` + ilgili form bileşenleri
  (account, ai, notifications, customer-admin, developers, permissions).

### Faz 4 — Modüller  `[~558 string — en büyük blok]`
- `components/modules/*`: surveys, dynamic-context, gamification, voice, handoff, kvkk,
  lead-collection, engagement, smart-shopper, visual, digital-waiter, guided.
- Form-ağırlıklı; alt fazlara bölünebilir (4a temel modüller, 4b premium modüller).

### Faz 5 — Bilgi Tabanı (Knowledge)  `[~178]`
- `components/knowledge/*`: guided-skills (~97, en yoğun tek dosya), assistant-training,
  file/url/text/qa içerik bileşenleri.

### Faz 6 — Widget Ayarları  `[~116]`
- `components/widget-settings/*` (özellikle `appearance-tab.tsx` ~81).

### Faz 7 — Entegrasyonlar  `[~310]`
- WhatsApp Business, Instagram DM, Messenger, Evolution API, Mobile Support sihirbazları
  ve `integration-page.tsx`.

### Faz 8 — Omni + Shopper  `[~266]`
- `components/omni/*` (content/account-center/web-widget panelleri),
  `components/shopper/*` (workspace, recommendation-engine, experiments-lab, dashboard).

### Faz 9 — Tamamlama & QA
- Eksik anahtar taraması (dev konsolu temiz).
- `de`/`es`/`fr`/`pt`/`ar` için en azından admin-kritik anahtarların çevirisi (veya bilinçli
  en-fallback kararı).
- Uçtan uca EN/TR gezinti testi; ekran görüntüsü karşılaştırması.

---

## 4. Önceliklendirme ve Sıra

Etki/efor dengesi: **Faz 0 → 1 → 2** ilk teslimat (switcher çalışır + çatı + bakılan ekran
iki dilli). Sonra hacme göre **4 (modüller)**, ardından 3/5/6/7/8. Public (landing, cookie,
public-header) bu projenin kapsamı dışında — ayrı ele alınır.

| Faz | Kapsam | Kaba string | Not |
| :-- | :-- | --: | :-- |
| 0 | Switcher + altyapı | — | Engelleyici; önce |
| 1 | Admin kabuğu | ~150 | En görünür |
| 2 | İçerik yönetimi | ~80 | İstenen ekran |
| 3 | Tenant ayarları | ~200 | |
| 4 | Modüller | ~558 | Alt fazlara böl |
| 5 | Knowledge | ~178 | guided-skills yoğun |
| 6 | Widget ayarları | ~116 | |
| 7 | Entegrasyonlar | ~310 | Sihirbazlar |
| 8 | Omni + Shopper | ~266 | |
| 9 | QA + diğer diller | — | Kapanış |

---

## 5. Riskler / Notlar
- **Paylaşımlı bileşenler:** Bir bileşeni çevirmek hem /console hem /admin'i etkiler — bonus,
  ama test ederken iki tarafa da bakılmalı.
- **Veri kaynaklı etiketler** (sektör adları, modül adları, enum'lar) `lib/*-registry.ts` ve
  Firestore'dan gelebilir; bunlar UI string'i değil — ayrı değerlendirilmeli (registry'de
  `{ en, tr }` zaten var, kullanılıyor mu kontrol).
- **Çeviri kalitesi:** EN metinler için ABD pazarına uygun, native ton tercih edilmeli.
- Daha önce tespit edilen e-posta/widget sabit-Türkçe sorunları (lead bildirim e-postası
  gövdesi) bu projeyle aynı anahtar sistemine bağlanabilir.

---

## 6. İlk Adım Önerisi
Faz 0 + Faz 1'i birlikte yapalım: switcher'ı admin kabuğuna ekle, kabuk/menü metinlerini
çevir. Böylece panelde EN/TR'yi gerçekten çevirebildiğini görür, deseni netleştiririz;
sonraki fazlar hızlı ve tekrarlı ilerler.
