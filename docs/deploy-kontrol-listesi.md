# AmeritAI — Vercel Deploy Kontrol Listesi

Bu liste, projenin gerçek koduna göre çıkarıldı (env kullanımları, `vercel.json`, build config taranarak).
Sıra: **önce env + altyapı → deploy → domain → deploy sonrası (Meta/Stripe webhook'ları)**.

---

## 1. Plan Seçimi — Vercel **Pro** gerekli

`vercel.json` içinde **7 adet cron job** tanımlı (shopper-crawl, delivery-retry, voice-tts-cleanup, appointment-reminder, product-alerts, cmp-backup, cmp-retention).
Hobby plan cron sayısı/sıklığı için yetersiz; **Pro plan** şart. (Pro ayrıca daha uzun fonksiyon süresi ve Fluid Compute sağlar.)

---

## 2. Env Değişkenleri

Vercel → Project → Settings → Environment Variables. `NEXT_PUBLIC_*` değişkenleri **build anında** gerekli olduğundan deploy'dan önce girilmeli.

### 2A. ZORUNLU — bunlarsız uygulama çalışmaz

**Firebase (client):**
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`  ⚠️ **`.env.local`'da eksik — ekle**
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

**Firebase (admin — sunucu):**
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` → Vercel'e yapıştırırken `\n`'leri olduğu gibi bırakabilirsin; kod `\\n`→gerçek satır başına çeviriyor. (Tüm anahtarı tırnaklarıyla yapıştırmak en güvenlisi.)

**AI / Vektör:**
- `OPENAI_API_KEY` (embedding + sohbet)
- `PINECONE_API_KEY` (index: `chatbot-knowledge`, **dim 1024**, cosine — mevcut)

### 2B. LANSMAN ÖZELLİKLERİ İÇİN ZORUNLU

**Meta (Messenger/Instagram/WhatsApp):**
- `META_APP_ID`  ⚠️ **eksik — ekle**
- `META_APP_SECRET`  ⚠️ **eksik — ekle**
- `META_WEBHOOK_VERIFY_TOKEN` (kendi belirlediğin gizli dize)

**Stripe:**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (deploy sonrası webhook kurunca alınır — Adım 6)
- `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_ENTERPRISE`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**E-posta (SMTP):**
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`
- `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`

### 2C. GÜVENLİK / SIR — rastgele üret

- `TOKEN_CIPHER_KEY`  ⚠️ **eksik — ekle.** Saklanan erişim token'larını (Meta page token vb.) şifreler. **64 karakterlik hex** olmalı:
  ```
  openssl rand -hex 32
  ```
- `CRON_SECRET` — cron endpoint'lerini korur (Vercel cron çağrılarına otomatik eklenir):
  ```
  openssl rand -hex 32
  ```
- `PRIVACY_EVENT_HASH_SALT`  ⚠️ **eksik — ekle** (CMP/gizlilik olay hash'i için):
  ```
  openssl rand -hex 16
  ```
- `NEXTAUTH_SECRET` (gizlilik onay route'u kullanıyor) → `openssl rand -base64 32`
- `NEXT_PUBLIC_APP_URL` = `https://ameritai.com` (ve varsa `APP_URL` aynı değer)

**Rate limit (önerilir):**
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

**Süper admin:**
- `NEXT_PUBLIC_SUPER_ADMIN_EMAILS` (virgülle ayrılmış)

### 2D. OPSİYONEL — ilgili özelliği açınca ekle

| Özellik | Env |
|---|---|
| Ses (sonra) | `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID` |
| Instagram kanalı | `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` |
| WhatsApp kanalı | `WHATSAPP_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN` |
| AI yedek sağlayıcı | `GEMINI_API_KEY` / `GOOGLE_API_KEY`, `ANTHROPIC_API_KEY` |
| SPA site tarama | `JINA_READER_API_KEY` (limit için; zaten ekli) |
| Web arama / hava | `SERPER_API_KEY`, `OPENWEATHER_API_KEY` |
| CRM / takvim | `ZOHO_*`, `GOOGLE_CLIENT_*`, `MICROSOFT_CLIENT_*`, `OUTLOOK_CLIENT_*`, `CONSTANT_CONTACT_API_SECRET` |
| Analytics | `NEXT_PUBLIC_GA_ID` |

---

## 3. Deploy

1. Repoyu GitHub'a push et (rebrand'ı bir branch'te tutmuştuk — main'e merge et).
2. Vercel'de **New Project → GitHub repo** seç. Framework otomatik **Next.js** algılanır.
3. Build ayarları (varsayılan doğru):
   - Build command: `next build` (prebuild otomatik `.next` temizliği yapıyor)
   - Output: otomatik
   - Node: 18+ (engines ile uyumlu)
   - Not: `server.js` yalnızca yerel Messenger geliştirme içindir; Vercel onu **kullanmaz** (serverless `next build` ile çalışır) — sorun değil.
4. Tüm env'leri (Bölüm 2) gir → **Deploy**.
5. Settings → Functions → **Fluid Compute**'u aç; ağır route'lar için gerekiyorsa `maxDuration` ayarla.

---

## 4. Domain

1. Vercel → Project → Settings → Domains → `ameritai.com` ekle.
2. DNS'i Vercel'in verdiği kayıtlara yönlendir (A / CNAME). `getvion.com`'dan geçişi unutma.
3. SSL otomatik gelir.
4. `NEXT_PUBLIC_APP_URL`'i `https://ameritai.com` olarak güncelle (gerekirse redeploy).

---

## 5. Firebase Yapılandırması (deploy sonrası)

1. Firebase Console → Authentication → Settings → **Authorized domains** → `ameritai.com` ekle (Google ile giriş / e-posta doğrulama linkleri için).
2. Firestore **güvenlik kuralları** canlıya uygun mu kontrol et (usage-tracker artık Admin SDK kullanıyor, ama client-taraflı okumalar kurallara tabi).
3. Pinecone index'i (`chatbot-knowledge`, 1024, cosine) production key ile erişilebilir olmalı.

---

## 6. Webhook'lar (deploy sonrası, canlı URL ile)

**Stripe:**
- Stripe Dashboard → Developers → Webhooks → endpoint ekle: `https://ameritai.com/api/...stripe webhook route...`
- Gelen **Signing secret**'ı `STRIPE_WEBHOOK_SECRET`'a yaz → redeploy.

**Meta (Messenger önce — `docs/messenger-kurulum-rehberi.md`):**
- Webhook: `https://ameritai.com/api/omni/channels/messenger/webhook`
- OAuth callback: `https://ameritai.com/api/integrations/messenger/callback`
- Verify token = `META_WEBHOOK_VERIFY_TOKEN`

---

## 7. Deploy Sonrası Duman Testi (smoke test)

- [ ] Ana sayfa + login/signup açılıyor (e-posta doğrulama akışı çalışıyor)
- [ ] Console'a giriş, bir chatbot ayarı kaydetme
- [ ] Widget testinde sohbet → yanıt geliyor (OpenAI/Pinecone OK)
- [ ] URL import (SPA fallback) → bir sayfa eklenebiliyor
- [ ] Stripe test ödemesi (test mode) → checkout açılıyor
- [ ] Cron endpoint'i manuel tetikleme (Authorization: CRON_SECRET) → 200
- [ ] Meta webhook GET doğrulaması yeşil

---

## Hızlı Özet — Deploy'dan ÖNCE eklenmesi gereken eksik env'ler

```
META_APP_ID=
META_APP_SECRET=
TOKEN_CIPHER_KEY=        # openssl rand -hex 32
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
PRIVACY_EVENT_HASH_SALT= # openssl rand -hex 16
NEXTAUTH_SECRET=         # openssl rand -base64 32
CRON_SECRET=             # openssl rand -hex 32
NEXT_PUBLIC_APP_URL=https://ameritai.com
```
