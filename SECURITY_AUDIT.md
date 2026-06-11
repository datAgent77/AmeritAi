# Güvenlik Denetimi (Beyaz Kutu / White-box)

**Kapsam:** vion-ai (Vois AI) — tüm uygulama, kod tabanı üzerinden
**Yöntem:** Statik analiz (SAST tarzı) + OWASP Web/API Top 10 hizalı manuel inceleme
**Tarih:** 2026-06-09
**Not:** Bu beyaz kutu (kod) denetimidir. Deploy sonrası ayrıca dış (black-box/DAST) tarama önerilir.

---

## Özet

Uygulama **genel olarak iyi durumda.** Bu oturumda kritik açıkların çoğu kapatıldı; kalanlar orta/düşük seviyede ve çoğu "derinlemesine savunma" (defense-in-depth) iyileştirmesi.

| Önem | Bulgu | Durum |
|---|---|---|
| Yüksek | CORS `*` + credentials (her API'ye açık) | ✅ Düzeltildi |
| Yüksek | Auth'suz AI uçları (maliyet suistimali) | ✅ Düzeltildi (rate limit) |
| Yüksek | `leads` GET IDOR — PII sızıntısı | ✅ Düzeltildi |
| Yüksek | CMS `?reset=true` — auth'suz veri silme | ✅ Düzeltildi |
| Yüksek | Kodda gömülü Firebase config/API key | ✅ Düzeltildi (env'e taşındı) |
| Yüksek | E-posta doğrulaması zorlanmıyor | ✅ Düzeltildi |
| Orta | Kendi rolünü yükseltme (privilege escalation) | ✅ Azaltıldı (Firestore kuralları) |
| Orta | Bağımlılık açıkları (59: 3 kritik) | ⚠️ Açık — `npm audit fix` |
| Orta | CMS içeriğinde stored XSS (sanitize yok) | ⚠️ Açık |
| Orta | Zayıf girdi validasyonu (17/295 route zod) | ⚠️ Açık |
| Orta | Rate limit yalnız Upstash ayarlıysa dağıtık | ⚠️ Prod'da env gerek |
| Düşük | Firestore kuralları yeni — test edilmeli | ⚠️ Açık |

---

## OWASP API/Web Top 10 — Detaylı Bulgular

### A01 — Broken Access Control / IDOR
- ✅ **Admin route'ların tamamı (34/34)** kimlik doğrulama/CRON_SECRET içeriyor.
- ✅ `leads` GET artık `authorizeTargetAccess` ile sahibe/admin'e kilitli (önceden `chatbotId` ile herkes okuyabiliyordu — PII IDOR).
- ✅ CMS yıkıcı `?reset=true` yolu kaldırıldı; CMS yazma süper-admin'e kilitlendi.
- ✅ Firestore güvenlik kuralları: kiracı yalnız kendi verisine erişir; `users` dokümanında `role/planId/subscriptionStatus/entitlements` gibi yetki alanları **client tarafından değiştirilemez** (privilege escalation engellendi).
- ⚠️ **Yapılacak:** Firestore kurallarını yayına almadan Rules Playground'da test et; ziyaretçi-yüzü (widget) uçlarının `chatbotId` doğrulamasını gözden geçir.

### A02 — Cryptographic Failures / Secrets
- ✅ Kodda **gömülü gerçek sır yok** (eski gömülü Firebase API key env'e taşındı).
- ✅ `token-cipher` (omni token şifreleme) AES-GCM + tamper detection ile test ediliyor.
- ✅ `.env*` gitignore'da; gitleaks pre-commit hook'u mevcut.

### A03 — Injection
- ✅ `eval / new Function / child_process / exec` **yok** (yalnız regex `.exec()` — zararsız).
- ✅ Veri katmanı Firestore (klasik SQL injection yüzeyi yok).
- ⚠️ **SSRF:** `crawl`, `knowledge`, `sitemap` `isSafeUrl()` ile korunuyor ✅. CMP domain scan/verify ve omni health uçları da fetch yapıyor — bunların URL'i kullanıcı kontrollü ise `isSafeUrl` eklenmeli (omni health'ler sabit Meta/Graph URL'i kullanıyor, düşük risk).
- ⚠️ **Prompt injection:** Chat girdisi LLM'e gidiyor; sistem promptu + araç işaretleri (`[CALL_STAFF]` vb.) metinden parse ediliyor. Kötü niyetli kullanıcı bu işaretleri taklit edebilir. Öneri: araç komutlarını model çıktısından değil yapılandırılmış yanıttan (function calling) almak — orta vadeli iyileştirme.

### A04 — Insecure Design / Rate Limiting & Abuse
- ✅ `/api/chat` + public AI uçları rate limit'li (IP+session); P1'de Upstash-destekli dağıtık limiter + AI timeout + girdi boyut sınırı eklendi.
- ⚠️ **Dağıtık limit yalnız Upstash env'leri ayarlıysa** gerçekten paylaşımlı. Prod'da `UPSTASH_REDIS_REST_URL/TOKEN` girilmeli (yoksa instance-bazlı, serverless'ta zayıf).
- ✅ Chatbot başına aylık kota altyapısı eklendi (plan limiti sayısalsa devreye girer).

### A05 — Security Misconfiguration
- ✅ CORS path-segmentli (admin/console/agency kilitli, widget açık-credentials'sız).
- ✅ Güvenlik başlıkları (X-Frame-Options, X-Content-Type-Options, Referrer-Policy) middleware'de.
- ✅ Debug/test route'ları (`/api/test*`) bloklu.
- ✅ Hata sızıntısı giderildi (dashboard-stats token detayı, generic mesajlar).

### A06 — Vulnerable & Outdated Components
- ⚠️ **`npm audit`: 59 açık (3 kritik, 18 yüksek).** Çoğu güvenli düzeltilebilir (`fast-xml-parser`, `protobufjs`, `axios`, `js-cookie`, `undici`). **Yapılacak:** Mac'te `npm audit fix`. Kırıcı olanlar (`next@16`, `eslint-config-next@16`) planlı major yükseltme. `xlsx` (SheetJS) npm'de fix yok → güvenilir dosya işle / CDN sürümüne geç.

### A07 — Identification & Authentication
- ✅ Firebase Auth (ID token doğrulama). E-posta doğrulaması artık AuthContext'te zorlanıyor (her giriş yolunda).
- ✅ Süper-admin rolü Firestore + env (`NEXT_PUBLIC_SUPER_ADMIN_EMAILS`) ile; sabit eski e-posta kaldırıldı.

### A08 — Software & Data Integrity / Webhooks
- ✅ **Stripe** webhook: `constructEvent` imza doğrulaması.
- ✅ **WhatsApp/Meta** webhook: HMAC-SHA256 + `crypto.timingSafeEqual` (zamanlama saldırısına dayanıklı).
- ⚠️ **Mass assignment:** CMS route'ları `collection.add(body)` ile ham body yazıyor (artık süper-admin'e kilitli ama alan beyaz listesi/şema yok). Stored XSS'e kapı (aşağıya bkz).

### A09 — Logging & Monitoring
- ✅ Merkezi `captureError` eklendi (bağlamlı log + opsiyonel `ERROR_WEBHOOK_URL` → Slack/Sentry-relay). Tam Sentry deploy'da bir config ile bağlanabilir.
- ⚠️ Prod'da bir hata izleme hedefi (Sentry vb.) bağlanması önerilir.

### A10 — SSRF
- Bkz. A03. Ana crawl uçları korumalı; ikincil fetch noktaları gözden geçirilmeli.

### XSS (Web)
- ⚠️ **`dangerouslySetInnerHTML` 10+ dosyada** (blog/[slug], products/[slug], legal sayfalar, faq, ChatbotContainer, WidgetLoader). CMS/blog içeriği artık süper-admin tarafından yazılıyor (düşük risk) ama **HTML sanitize edilmiyor** → stored XSS vektörü. **Öneri:** render edilen CMS/blog HTML'ini `DOMPurify`/`sanitize-html` ile temizle; widget'ta AI çıktısı zaten markdown (react-markdown) ile güvenli, ama `dangerouslySetInnerHTML` kullanılan yerleri tek tek doğrula.
- ✅ widget.js gelen context değerlerini `sanitizeTrustedContext*` ile temizliyor.

---

## Öncelikli Yapılacaklar (yayına çıkmadan)

1. **`npm audit fix`** (güvenli düzeltmeler) + `next` major'ı planla, `xlsx`'i azalt. *(Orta-Yüksek)*
2. **CMS/blog içeriğine HTML sanitizasyonu** (DOMPurify) + alan beyaz listesi. *(Orta — stored XSS)*
3. **Upstash'i prod env'ine** ekle (dağıtık rate limit gerçekten çalışsın). *(Orta)*
4. **Firestore kurallarını** Rules Playground'da test et, gerekiyorsa daralt. *(Orta)*
5. **Girdi validasyonu**: en kritik public route'lara `zod` şeması ekle. *(Orta — derinlemesine savunma)*
6. **Hata izleme** hedefi bağla (Sentry / `ERROR_WEBHOOK_URL`). *(Düşük-Orta)*
7. **Deploy sonrası:** OWASP ZAP/Burp ile dış tarama; kurumsal/HIPAA satışında üçüncü taraf pentest. *(Süreç)*

---

## Bu Oturumda Zaten Kapatılanlar
CORS sertleştirme · auth'suz AI uçlarına rate limit · leads IDOR · CMS yıkıcı reset + yazma kilidi · gömülü Firebase config → env · e-posta doğrulama zorlaması · privilege-escalation (Firestore kuralları) · AI timeout/iptal · girdi boyut sınırı · nazik+dilli hata deneyimi · merkezi hata izleme · dürüst entegrasyon paneli.

*Bu rapor kod denetimine dayanır; deploy sonrası dinamik (DAST) test ve gerektiğinde profesyonel pentest ile tamamlanmalıdır.*
