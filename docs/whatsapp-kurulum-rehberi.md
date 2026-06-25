# WhatsApp (Business Cloud API) Entegrasyonu — Kurulum Rehberi

WhatsApp kanalını AmeritAI'ye bağlamak için adımlar. Kod tarafı hazır
(WhatsApp Cloud API + Embedded Signup). Aynı Meta App (AmeritAI, 933635223025179) kullanılır.

> **İyi haber:** WhatsApp'ta dev-mode testi Messenger/Instagram'dan **daha kolay** —
> Meta ücretsiz bir **test telefon numarası** verir ve **test alıcısı** ekleyebilirsin.
> Tester davet sistemiyle uğraşmana gerek yok.

---

## 0. ÖN KOŞULLAR

- **WhatsApp Business Account (WABA)** — Embedded Signup sırasında oluşturulur (önceden gerekmez).
- **Bir telefon numarası:**
  - **Dev/test için:** Meta ücretsiz bir **test numarası** verir (kendi numaran gerekmez). Bununla test alıcılarına mesaj atılır.
  - **Production için:** Kişisel WhatsApp'ta **kayıtlı OLMAYAN** gerçek bir numara. (Numara WABA'ya kaydedilince o numara artık normal WhatsApp uygulamasında kullanılamaz.)
- Bir **Meta Business** hesabı (Donate Chain / AmeritAi — zaten var).

---

## 1. İzinler (Use case)

Meta App → **Use cases → "Connect with customers through WhatsApp"** (veya Add use case) → Customize → **Permissions**:
- `whatsapp_business_management`
- `whatsapp_business_messaging`
- (genelde otomatik gelir: `business_management`)

---

## 2. Webhook

Meta App → **WhatsApp → Configuration → Webhooks** (veya use case'in webhook bölümü):
- **Callback URL:**
  ```
  https://www.ameritai.com/api/omni/channels/whatsapp/webhook
  ```
- **Verify Token:** `ameritai-ab90be8baf929123d7e1caec`
  (Kod `WHATSAPP_WEBHOOK_VERIFY_TOKEN` yoksa `META_WEBHOOK_VERIFY_TOKEN`'a düşüyor — bu zaten set.)
- **Verify and Save** → yeşil onay.
- **Webhook fields:** `messages` alanına abone ol.

> Hızlı test (tarayıcı): `https://www.ameritai.com/api/omni/channels/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=ameritai-ab90be8baf929123d7e1caec&hub.challenge=test123` → `test123` dönmeli.

---

## 3. AmeritAI Panelinden Bağla (Embedded Signup)

AmeritAI → **Console → Integrations → WhatsApp → Connect**:
- Açılan **Meta Embedded Signup** penceresinde:
  - Business hesabını seç (Donate Chain / AmeritAi).
  - **WABA oluştur/seç.**
  - **Telefon numarası ekle** → dev için Meta'nın verdiği **test numarasını** kullanabilir veya kendi numaranı doğrularsın (SMS/arama kodu).
- ⚠️ Onay ekranında — Instagram/Messenger'da öğrendiğimiz gibi — **business'ı (Donate Chain) ve WABA'yı açıkça seç/ver.** Boş geçersen bağlantı eksik kalır.
- Geri dönüşte sistem WABA ID + Phone Number ID + erişim token'ını saklar.

Panelde WhatsApp "Connected" görünmeli; "Check System" ile doğrula.

---

## 4. Test (dev modunda — kolay yol)

WhatsApp dev-mode, Messenger/Instagram'dan farklı: **test alıcısı** ekleyip mesajlaşırsın.

1. Meta App → **WhatsApp → API Setup**:
   - "From" (gönderen) = **test numarası** (veya doğruladığın numara).
   - **"To" (recipient) alanına** test edeceğin gerçek bir WhatsApp numarası ekle (en fazla 5 numara) → numara bir kod alır, doğrular.
2. Eklediğin numaradan, WhatsApp'tan **WABA numarasına bir mesaj at** (örn. "Merhaba").
3. Vercel Logs (Live + `whatsapp`) → **`POST /api/omni/channels/whatsapp/webhook`** → bot yanıtlar.

> Not: WhatsApp'ta da **24 saat müşteri hizmetleri penceresi** var — kullanıcı sana yazdıktan sonra 24 saat serbest yanıt verebilirsin. Bu pencere dışında onaylı **message template** gerekir. Bot gelen mesaja yanıt verdiği için normal akış bu pencereye uyar.

---

## 5. Canlıya Alma (Production)

Gerçek müşterilerle (test alıcısı olmayan) mesajlaşmak için:
- WABA'yı **gerçek bir numarayla** doğrula (test numarası değil).
- **Business Verification** (kayıtlı şirket).
- `whatsapp_business_messaging` için gerekiyorsa **App Review / Advanced Access**.
- Numara için **görünen ad (display name) onayı** ve mesajlaşma limiti seviyesi.

---

## Özet Kontrol Listesi

- [ ] İzinler: `whatsapp_business_management`, `whatsapp_business_messaging`
- [ ] Webhook callback + verify token doğrulandı (`test123`)
- [ ] `messages` alanına abone olundu
- [ ] Panelden Connect (Embedded Signup) → WABA + numara bağlandı, business açıkça verildi
- [ ] API Setup'ta bir **test alıcı numarası** eklendi (dev test için)
- [ ] Test numarasından WABA'ya mesaj → `POST .../whatsapp/webhook` → bot yanıtladı
- [ ] (Production) gerçek numara + Business Verification + display name onayı
