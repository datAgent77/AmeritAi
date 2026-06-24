# AmeritAI Projesi - Son Durum ve Yetenekler (Detaylı Doküman)

Bu doküman, projenin mevcut (repo) durumunu, ana mimarisini, ürün yüzeylerini, widget yeteneklerini, modülleri, entegrasyonları ve son dönemde yapılan önemli iyileştirmeleri özetler.

## 1. Kapsam ve Referans

- Proje: `vion-ai`
- Teknoloji tabanı: Next.js App Router + React + TypeScript + Tailwind
- Bu dokümanın referans aldığı commit: `24143a6`
- Doküman amacı:
  - Projenin son halini tek bir yerden anlatmak
  - Widget ve panel yeteneklerini ürün/teknik seviyede özetlemek
  - Geliştirme, test ve deploy süreçlerini netleştirmek

## 2. Projenin Genel Tanımı

AmeritAI; web sitelerine, iframe’lere veya farklı kanallara entegre edilebilen, çok modüllü bir AI chatbot platformudur.

Sistem; sadece bir chat widget’tan ibaret değildir. Aynı repo içinde şunları barındırır:

- Public website / landing pages
- Tenant console (müşteri paneli)
- Admin / platform yönetim alanları
- Widget runtime (`public/widget.js` + `app/chatbot-view` iframe ekranı)
- Modül yönetimi (lead, satış, görsel analiz, vb.)
- Entegrasyon API’leri (Shopify, WhatsApp, Telegram, takvimler, CRM, e-posta servisleri)
- Onboarding akışları
- Widget tasarım / appearance editor ve canlı preview

## 3. Teknoloji Yığını (Stack)

### Frontend / UI

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS + tailwindcss-animate
- Radix UI bileşenleri (shadcn tabanlı UI parçaları)
- Framer Motion (animasyonlar)
- Lottie (`lottie-react`) (launcher/animasyon preview ve full-image launcher senaryoları)

### AI / Veri / Servisler

- OpenAI (`openai`, `@ai-sdk/openai`, `ai`)
- Anthropic SDK
- Google Generative AI SDK (Gemini)
- Pinecone (vektör/veri arama altyapısı)
- Firebase (client + admin)
- Cheerio / web crawl / parsing yardımcıları
- PDF / DOC işleme (`pdf-parse`, `mammoth`)

### Operasyon / Güvenlik / Kalite

- ESLint
- TypeScript type-check
- Vitest (unit tests)
- Gitleaks (pre-commit güvenlik taraması)
- Vercel deployment (Github `main` branch bağlantılı)

## 4. Ürün Yüzeyleri (Product Surfaces)

### 4.1 Public Site / Landing

Repo içinde ürün tanıtım sayfaları, pricing, industries, solutions, blog, legal sayfalar ve iletişim sayfaları bulunur.

Örnek route grupları:

- `app/(site)/(home)`
- `app/(site)/pricing`
- `app/(site)/products/*`
- `app/(site)/industries`
- `app/(site)/blog`
- `app/(site)/(legal)/*`

### 4.2 Tenant Console (Müşteri Paneli)

Müşterilerin chatbot, bilgi tabanı, modüller, entegrasyonlar, branding, widget ayarları, lead/chats/analytics ekranlarını yönettiği paneldir.

Örnek alanlar:

- `app/console/chatbot/widget` (widget ayarları / preview)
- `app/console/chatbot/integration`
- `app/console/chatbot/analytics`
- `app/console/chatbot/leads`
- `app/console/chatbot/chats`
- `app/console/knowledge/*` (text / QA / file / URL / behavior)
- `app/console/modules/*` (modül bazlı ayarlar)

### 4.3 Admin / Platform

Platform yönetimi, tenant yönetimi, içerik yönetimi ve super-admin/sistem işlemleri için ayrı ekranlar bulunur.

Örnek:

- `app/admin/*`
- `app/platform/*`
- `app/admin/tenant/[userId]/*`

### 4.4 Widget Runtime

Widget’ın canlı çalışan kısmı iki ana bileşenden oluşur:

- `public/widget.js`: Embed script (host siteye eklenen script)
- `app/chatbot-view/*`: Iframe içindeki gerçek widget UI/runtime

Bu ayrım sayesinde widget host siteye script ile kolay entegre edilir, UI ise kontrollü bir iframe içinde çalışır.

## 5. Widget Yetenekleri (Detaylı)

## 5.1 Widget Görünüm Modları

Widget iki ana görüntü modunu destekler:

1. `classic`
- Launcher + modal/chat pencere mantığı
- Farklı launcher stilleri, launcher animasyonları
- Açılır chat penceresi davranışı

2. `ambient`
- Ekran altına gömülü, daha “UI-native” his veren form + feed deneyimi
- Açık/kapalı (feed görünür/gizli) durumları
- Focus/idle state’leri
- Gelişmiş border/background görselleştirmeleri

## 5.2 Interaction Modları

- `launcher`: Kullanıcı launcher’a tıklayarak açar
- `always_open`: Widget başlangıçta açık olabilir
- Ambient mod kendi akışına göre input/feed davranışı ile çalışır

## 5.3 Per-Device (Mobil/Desktop Ayrı) Görünüm Ayarları

Son geliştirmelerle birlikte hem `Ambient` hem `Classic` mod için cihaz bazlı (desktop/mobile) görünüm ayarı desteklenir.

### Ambient (Per-device)

- `ambientPerDeviceSettingsEnabled`
- `ambientDesktopSettings`
- `ambientMobileSettings`

### Classic (Per-device)

- `classicPerDeviceSettingsEnabled`
- `classicDesktopSettings`
- `classicMobileSettings`

### Çalışma Mantığı

- Toggle kapalıysa shared ayarlar çalışır (geriye uyumlu)
- Toggle açıksa ilgili cihazın ayarları override eder
- Eksik alanlar shared ayarlardan fallback alır
- Classic mobil legacy alanlar (`mobileBottomSpacing`, `mobileSideSpacing`, `mobileLauncherAnimation`) fallback olarak desteklenir

Bu sayede eski tenant verileri bozulmadan yeni per-device model kullanılabilir.

## 5.4 Widget Appearance / Branding Özelleştirme

Widget tasarım tarafında geniş kapsamlı özelleştirme desteklenir.

### Classic tarafında

- Launcher tipi: standard / full image
- Launcher stil: icon / text / icon+text vb.
- Launcher boyutları (width/height/radius)
- Launcher gölge / animasyon / hover effect
- Launcher ikon tipi (default/library/custom image)
- Launcher arka plan rengi / ikon rengi
- Modal size / görünüm modları
- Header renkleri / logo / metin renkleri
- Suggested questions / placeholder / branding metinleri

### Ambient tarafında

- Mesaj alan yüksekliği (`ambientMaxHeight`)
- Overlay siyahlığı (`ambientOverlayOpacity`)
- Maksimum genişlik (`ambientWidth`)
- Yan boşluk (`ambientSideMargin`)
- Alt boşluk (`ambientBottomMargin`)
- Input boyutu (`ambientInputSize`: sm/md/lg/xl)
- Ambient ikon göster/gizle + ikon tipi/rengi
- Placeholder / input text rengi
- Ambient tema (`light` / `dark` / `auto`)
- AI mesaj balonu rengi
- Kullanıcı mesaj balonu rengi

## 5.5 Ambient Border Sistemi (Gelişmiş)

Ambient dock/form border sistemi son dönemde ciddi şekilde sadeleştirildi ve güçlendirildi.

### Temel Kavramlar

- `Kapalı (Collapsed)`: Feed kapalı, input-only görünüm
- `Açık (Expanded/Open)`: Feed açık
- `Odaklı (Focused)`: Input focus state

### Ortak Çerçeve Ayarı

Kapalı/açık widget için form border ayarı tek mantıkta yönetilir:

- `Çerçeve (Pasif)` -> `ambientBorderColorIdle`
- `Çerçeve (Odaklı)` -> `ambientBorderColorFocused`

Eski kapalı-border alanları geriye uyum için fallback olarak kalır.

### Durum Bazlı Arka Planlar

- `ambientClosedBgColor`
- `ambientInputBgColorIdle`
- `ambientInputBgColorFocused`

### Gradient Border (4 Renk + Animasyon)

Ambient form border için düz renk yanında 4 renkli gradient/animasyon sistemi vardır.

Desteklenen alanlar:

- `enableAmbientRainbowBorder` (master toggle)
- `ambientBorderGradientColor1..4`
- `ambientBorderGradientShowWhenCollapsed`
- `ambientBorderGradientShowWhenOpen`
- `ambientBorderGradientShowWhenThinking`

Davranış:

- Toggle kapalıysa gradient/animasyon görünmez, solid border çalışır
- Toggle açık ve ilgili durum checkbox’ı işaretliyse animasyon görünür
- `Thinking` durumu `isChatLoading` ile eşlenir

## 5.6 Widget Preview (Canlı Önizleme) Yetenekleri

Widget ayar ekranında gelişmiş preview sistemi vardır.

### Desktop / Mobile Preview

- Classic + Ambient modlar için ayrı preview render edilir
- Preview mode switch (`Mobile` / `Desktop`) vardır
- Son geliştirmelerle mobil mockup büyütülmüş ve daha gerçekçi hale getirilmiştir

### Ambient Preview State Simulator

Ambient preview için local-only state simülatörü vardır:

- `auto`
- `collapsed-idle`
- `collapsed-focused`
- `open-idle`
- `open-focused`
- `thinking` (ayrı switch)

Amaç:
- Kullanıcının border/background/focus/thinking davranışlarını ayar ekranında görmesi

### Preview Parity İyileştirmeleri (Son Durum)

Preview tarafında son yapılan iyileştirmeler:

- Ambient mobil/desktop per-device ayarlarını daha doğru uygular
- Ambient `max width / side margin / bottom margin` preview’da görünür
- `0 = full width` mantığı preview’da da çalışır
- Ambient leading icon preview’da runtime ayarlarını kullanır (library/custom/show/hide/color)
- Ambient utility butonlar preview’a eklendi (refresh/collapse/expand)
- Dark tema görünümü preview’da daha tutarlı
- Classic preview logo/icon görünürlüğü iyileştirildi

Not: Preview hâlâ “runtime birebir kopyası” değildir; ancak resolver parity ile mümkün olduğunca yaklaştırılmıştır.

## 5.7 Mobil Kullanım / UX İyileştirmeleri (Widget)

Mobil kullanım tarafında yakın zamanda iyileştirilen davranışlar:

- Mobilde `autofocus` azaltıldı/kontrol altına alındı (özellikle ambient input için)
- AI yanıt sonrası mobilde istemsiz tekrar focus (klavye re-open) engellendi
- Mobil input/textarea font-size 16px standardı ile iOS zoom problemi azaltıldı
- Keyboard açıldığında ambient root için ekstra alt boşluk (black gap) azaltıldı
- Çerez banner mobil alt boşluğu/safe-area spacing sıkılaştırıldı
- Widget test sayfası mobil layout’u iyileştirildi

Önemli not:
- iOS klavye üstündeki sistem toolbar (şifre/anahtar/konum vb.) tamamen web tarafında garanti şekilde kaldırılamaz. Mevcut yaklaşım “best-effort azaltma”dır.

## 5.8 Çok Dil ve Placeholder Davranışı

Widget dil desteği bulunur (`tr`, `en`, vb.) ve bazı alanlar `auto` modda tarayıcı diline göre davranır.

- `initialLanguage = auto` ise tarayıcı dilinden başlatma yapılabilir
- Ambient placeholder için custom metin verilebilir (`ambientPlaceholderText`)
- Placeholder boş bırakılırsa runtime fallback metni kullanılır

## 5.9 Lead Collection (Lead Toplama)

Lead toplama modülü aktifse widget şu yetenekleri sunar:

- Initial lead collection overlay (sohbet öncesi form)
- In-chat lead form (AI komutu ile inline form açma)
- Form alanlarını özelleştirme (name/email/phone + custom fields)
- Alan görünürlüğü / zorunluluk / placeholder yönetimi
- Lead kaydı API’ye gönderme

Son iyileştirme:
- Inline lead form inputlarında yazı rengi okunurluğu düzeltildi (özellikle ambient/dark bağlamında)

## 5.10 Voice / Speech Özellikleri

Kod tabanında voice fonksiyonları mevcuttur:

- Sesli input / transcribe akışı
- Voice overlay
- TTS/voice yanıt altyapısı (provider bazlı)
- `useVoiceInput` hook ile kayıt/okuma kontrolü

Not: `modules-registry` içinde `voiceAssistant` modülü artık `ready` statüsündedir. Widget Voice, web widget içinde tarayıcı tabanlı sesli konuşma olarak aktif edilebilir; telefon hattı/Omni Voice Calls kanalından ayrıdır.

## 5.11 Visual Diagnosis / Görsel Analiz

Widget ve platform tarafında görsel analiz akışı desteklenir:

- Görsel yükleme (chat input üzerinden image selection)
- Görselin AI bağlamında analizi
- Görsel tanı / hasar değerlendirme gibi senaryolar için modül mantığı
- `visualDiagnosis` modülü registry’de `ready`

## 5.12 Randevu / Booking Altyapısı

Runtime’da ve API tarafında randevu ile ilgili bileşenler bulunur:

- `BookingOverlay`
- Appointments API’leri
- Google / Outlook calendar entegrasyon endpoint’leri
- Appointment extractor / hizmet ayarları

Registry notu:
- `appointments` modülü registry’de `coming_soon` görünse de, altyapı parçalarının önemli kısmı repo içinde vardır.

## 5.13 Dynamic Context (Gerçek Zamanlı Veri Bağlamı)

Dinamik bağlam modülü sayesinde host uygulama verileri AI context’e taşınabilir.

Örnek kullanım:
- Kullanıcının bakiyesi, siparişi, görev sayısı vb. kişisel veriler
- Widget script / host sayfa context update mesajları
- AI, bağlama göre kişiselleştirilmiş yanıt verir

## 5.14 Shopper / Catalog / Sales Odaklı Yetenekler

E-ticaret ve satış senaryoları için repo içinde güçlü altyapı bulunur:

- Product catalog / personal shopper modülü
- Shopify entegrasyon endpoint’leri
- Shopper feed sync / site crawl / upload endpoint’leri
- Satış optimizasyonu modülü (upsell / cross-sell / cart recovery yaklaşımı)
- Ürün kartı / carousel bileşenleri

## 5.15 Proactive Messaging / Engagement

Proaktif etkileşim modülü (`proactiveMessaging`) desteklenir:

- Zamanlanmış balon mesajları
- Kullanıcı davranışına göre tetikleme mantıkları
- Engagement modül ayar ekranları ve tasarım sekmeleri

## 5.16 Business Hours / Offline Message Notu

- `enableBusinessHours`, `timezone`, `businessHoursStart`, `businessHoursEnd`, `offlineMessage` alanları altyapıda hâlâ bulunur
- `public/widget.js` içinde business hours ve offline message mantığı mevcuttur
- Ancak kullanılmayan `availability-tab` UI bileşeni yakın zamanda kaldırılmıştır

Sonuç:
- Özellik altyapısı duruyor
- Ayar panelindeki eski ayrı sekme UI bileşeni kaldırıldı

## 6. Modül Sistemi (Modules Registry)

Modül tanımları `lib/modules-registry.ts` içinde merkezi olarak tutulur. Bu dosya platformun “source of truth” modül registry’sidir.

### Registry’nin sağladıkları

- Modül adı / açıklaması (TR/EN)
- Fiyat / premium durumu
- Core modül ayrımı
- Sektör desteği (`supportedSectors`)
- Sektöre göre default modül etkinleştirme
- Legacy Firestore field mapping (geriye uyum)
- Landing page üzerinde gösterim durumu
- Modül bazlı AI system instruction enjeksiyonu

### Registry’de Yer Alan Başlıca Modüller

- `generalChatbot` (core, ready)
- `knowledgeBase` (core, ready)
- `productCatalog` (ready)
- `leadCollection` (ready)
- `salesOptimization` (ready)
- `visualDiagnosis` (ready)
- `digitalWaiter` (ready)
- `proactiveMessaging` (ready)
- `dynamicContext` (ready)
- `voiceAssistant` (ready)
- `appointments` (coming_soon)
- `campaignManager` (coming_soon)
- `gamification` (coming_soon)

## 7. Entegrasyon Yetenekleri (API + Plan Access)

`lib/integration-access-config.ts` üzerinden plan bazlı entegrasyon erişim matrisi yönetilir.

### Starter (temel web entegrasyonları)

- Website Widget
- iFrame Embed
- Direct Link
- WordPress

### Growth+

- Telegram
- WhatsApp Business
- Slack

### Pro+

- Salesforce
- Google Calendar
- Outlook Calendar
- Shopify
- Mailchimp
- SendGrid
- Constant Contact

## 8. API Yetenekleri (Route Kategorileri)

Projede geniş bir App Router API yüzeyi bulunur. Başlıca kategoriler:

### 8.1 Chat & Widget

- `app/api/chat/route.ts`
- `app/api/widget-settings/route.ts`
- `app/api/chat-sessions/route.ts`
- `app/api/analytics/route.ts`
- `app/api/generate-context-bubble/route.ts`
- `app/api/generate-bubbles/route.ts`

### 8.2 Leads / Appointments / CRM Akışları

- `app/api/leads/route.ts`
- `app/api/appointments/*`
- `app/api/appointments/settings/route.ts`
- `app/api/lead-finder/search/route.ts`

### 8.3 Knowledge / Crawl / Content

- `app/api/knowledge/route.ts`
- `app/api/crawl/route.ts`
- `app/api/chatbot/shopper/site-crawl/route.ts`
- `app/api/chatbot/shopper/feed-sync/route.ts`
- `app/api/chatbot/shopper/upload/route.ts`

### 8.4 Voice / Visual / AI Özellikleri

- `app/api/voice/transcribe/route.ts`
- `app/api/voice/elevenlabs/route.ts`
- `app/api/voice/klassifier/route.ts`
- `app/api/visual-diagnosis/route.ts`
- `app/api/ai-engagement/generate/route.ts`
- `app/api/copywriter/generate/route.ts`
- `app/api/translate/route.ts`

### 8.5 Entegrasyonlar

- `app/api/integrations/whatsapp/*`
- `app/api/integrations/telegram/*`
- `app/api/integrations/slack/*`
- `app/api/integrations/shopify/*`
- `app/api/integrations/mailchimp/*`
- `app/api/integrations/sendgrid/*`
- `app/api/integrations/constant-contact/*`
- `app/api/integrations/salesforce/*`
- `app/api/integrations/google-calendar/*`
- `app/api/integrations/outlook-calendar/*`
- `app/api/calendar/google/*`
- `app/api/calendar/outlook/*`

### 8.6 Onboarding ve Tenant Yönetimi

- `app/api/onboarding/*`
- `app/api/admin/*`
- `app/api/console/*`
- `app/api/auth/register-user/route.ts`

### 8.7 Public/Website Yardımcı API’ler

- `app/api/contact/route.ts`
- `app/api/social/route.ts`
- `app/api/reviews/route.ts`
- `app/api/cms/*`
- `app/api/public/menu/[tenantId]/route.ts`

## 9. Widget Embed ve Runtime Mimarisi

### 9.1 `public/widget.js` (Embed Script)

Widget’ın host sayfaya gömülen script’i aşağıdaki işleri üstlenir:

- Widget settings fetch
- Iframe oluşturma ve src parametreleri ile runtime başlatma
- Position / spacing / launcher davranışı
- Business hours kontrolü
- Offline message aktarımı
- Host sayfadan context dinleme / postMessage akışları
- Bazı fallback polling / selector tabanlı tetikleyici davranışları

Yakın zamanda yapılan performans iyileştirmesi:
- Ayarlar fetch’i `DOMContentLoaded` beklemeden erken başlatılarak widget görünme gecikmesi azaltıldı.

### 9.2 `app/chatbot-view/*` (Iframe İçi Widget Runtime)

Temel runtime akışı:

- `ChatbotContainer.tsx`: orchestration / layout / mode switching
- `useWidgetSettings.ts`: widget settings fetch + normalize
- `useChatCore.ts`: mesaj gönder/al, typing, state yönetimi
- `useVoiceInput.ts`: voice input/TTS etkileşimleri
- `useVisualContext.ts`: sayfa/görsel bağlamı

UI bileşenleri:

- `ChatHeader`
- `MessageList`
- `ChatInput`
- `LeadCollectionOverlay`
- `InlineLeadForm`
- `BookingOverlay`
- `VoiceOverlay`
- `ConfirmationModal`
- `WidgetLoader`

## 10. Son Dönem Yapılan Önemli Geliştirmeler (Widget / Preview / Mobil)

Aşağıdaki commitler son dönemde widget deneyimini belirgin şekilde geliştirdi:

- `24143a6` `fix: improve widget preview mobile parity and icons`
- `18bef7b` `fix: respect ambient mobile width and side margins`
- `ef44fc1` `chore: remove unused availability settings tab`
- `20e1110` `fix: improve mobile widget spacing and preview parity`
- `7cc6816` `fix: restore availability settings types`
- `457b2c1` `feat: add per-device widget styling and preview parity`
- `d7c1d52` `feat(widget): add customizable ambient placeholder text support matching UI`
- `96846d2` `feat(widget): add ambientTheme support (light/dark/auto) to settings and chatbot container`

### Bu geliştirmelerin pratik etkisi

- Ambient/classic cihaz bazlı görünüm ayarları
- Preview’da device parity iyileşmesi
- Ambient border sistemi sadeleştirme + gradient animasyon kontrolü
- Mobil spacing / keyboard davranışı iyileştirmeleri
- Lead form okunurluk düzeltmeleri
- Çerez banner mobil spacing düzeltmeleri
- Preview ikon görünürlük / parity düzeltmeleri

## 11. Kalite, Test ve Geliştirme Pratikleri

### 11.1 Scriptler

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run validate-modules`
- `npm run security:scan`
- `npm run security:scan:repo`

### 11.2 Son Eklenen Unit Testler (Widget Styling / Device Resolver)

Lib testleri:

- `lib/ambient-dock-style.test.ts`
- `lib/ambient-device-settings.test.ts`
- `lib/classic-device-settings.test.ts`

Bu testler özellikle şunları doğrular:

- Per-device settings fallback mantığı
- Ambient dock border/background resolver davranışı
- Gradient border görünürlük matrisi (collapsed/open/thinking)

### 11.3 Widget Test Sayfası

- `app/widget-test/page.tsx`

Bu sayfa entegrasyon testleri için kullanılır:
- script yüklenmesi
- launcher görünmesi
- branding doğruluğu
- mesaj gönderimi ve temel fonksiyonellik
- mobil/desktop görünüm kontrolü

## 12. Mevcut Kısıtlar / Notlar (Gerçekçi Durum)

- Preview tarafı geliştirilmiş olsa da tam pixel-perfect runtime kopyası değildir.
- iOS klavye üstündeki sistem accessory toolbar tamamen web tarafında kontrol edilemez.
- `Business Hours` altyapısı duruyor, ancak eski `availability` tab UI bileşeni kaldırılmış durumda.
- Bazı modüller registry’de `coming_soon` statüsünde olsa da altyapı/UI parçaları repo içinde mevcut olabilir.

## 13. Önemli Dosya Haritası (Hızlı Referans)

### Widget Runtime

- `public/widget.js`
- `app/chatbot-view/ChatbotContainer.tsx`
- `app/chatbot-view/components/ChatInput.tsx`
- `app/chatbot-view/components/MessageList.tsx`
- `app/chatbot-view/hooks/useWidgetSettings.ts`

### Widget Ayarları ve Preview

- `components/widget-settings/widget-settings.tsx`
- `components/widget-settings/tabs/appearance-tab.tsx`
- `components/widget-settings/tabs/branding-tab.tsx`
- `components/widget-settings/preview/widget-live-preview.tsx`
- `components/widget-settings/preview/preview-ambient.tsx`
- `components/widget-settings/preview/preview-classic.tsx`

### Resolver / Style Logic (Yeni Mimari için Kritik)

- `lib/ambient-dock-style.ts`
- `lib/ambient-device-settings.ts`
- `lib/classic-device-settings.ts`

### Platform Registry / Access

- `lib/modules-registry.ts`
- `lib/integration-access-config.ts`
- `types/chatbot.ts`

### API (Örnek Ana Girişler)

- `app/api/chat/route.ts`
- `app/api/widget-settings/route.ts`
- `app/api/leads/route.ts`
- `app/api/appointments/route.ts`
- `app/api/integrations/*`
- `app/api/onboarding/*`

## 14. Sonuç

Projenin son hali, sadece temel bir chatbot widget’tan çok daha ileri bir seviyededir:

- Çok modlu widget deneyimi (classic + ambient)
- Mobil/desktop cihaz bazlı görünüm yönetimi
- Güçlü preview altyapısı ve state simülasyonu
- Modüler ürün mimarisi (sektör ve plan bazlı modül sistemi)
- Zengin entegrasyon ekosistemi (mesajlaşma, CRM, takvim, e-ticaret, e-posta)
- Onboarding, admin, tenant console ve public site yüzeylerinin aynı repo içinde yönetimi
- Sürekli iyileştirilen mobil UX, preview parity ve görsel özelleştirme altyapısı

Bu yapı, ürünü hem SaaS platformu hem de güçlü bir embed AI widget çözümü olarak konumlandırır.
