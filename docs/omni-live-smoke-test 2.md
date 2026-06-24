# Omni Live Smoke Test

Bu runbook, `AmeritAI Omni-Channel` icin gercek provider smoke testini production-benzeri sekilde yurutmeye yarar.

## 1. Hazirlik

- Local uygulama calisiyor olmali: `http://localhost:3000`
- Public URL gerekli. `localhost` Twilio ve Meta callback alamaz.
- Bu makinede su an `ngrok`, `cloudflared` ve `vercel` CLI kurulu degil.
- En hizli seceneklerden biri:
  - mevcut bir preview/deploy URL kullanmak
  - `cloudflared` kurup `localhost:3000` icin tunnel acmak
  - `ngrok` kurup `localhost:3000` icin tunnel acmak

## 2. Kontrol Ekranlari

- Settings: `/omni/settings`
- Voice Calls: `/omni/channels/voice-calls`
- WhatsApp: `/omni/channels/whatsapp`
- Instagram DM: `/omni/channels/instagram-dm`
- Unified Inbox: `/omni/operations/unified-inbox`
- Delivery Monitor: `/omni/operations/delivery-monitor`
- Analytics: `/omni/analytics`

## 3. Public URL Sonrasi Beklenen Webhook Mapping

`BASE_URL` yerine public tunnel veya preview domain'ini koy.

### Twilio Voice

- Incoming Call Webhook:
  - `POST {BASE_URL}/api/omni/channels/voice/inbound`
- Status Callback URL:
  - `POST {BASE_URL}/api/omni/channels/voice/status`
- Test Call Endpoint:
  - `{BASE_URL}/api/omni/channels/voice/test-call`

### WhatsApp Cloud API

- Webhook URL:
  - `GET/POST {BASE_URL}/api/omni/channels/whatsapp/webhook`
- Verify Token:
  - Omni channel settings'te kayitli verify token ile ayni olmali
- Meta tarafinda en az inbound message event'leri aktif olmali

### Instagram DM

- Webhook URL:
  - `GET/POST {BASE_URL}/api/omni/channels/instagram/webhook`
- Verify Token:
  - Omni channel settings'te kayitli verify token ile ayni olmali
- Meta tarafinda DM message event'leri aktif olmali

## 4. Voice Smoke Test

### Omni tarafi

1. `Channels > Voice Calls` ekraninda:
   - Twilio `Account SID`
   - Twilio `Auth Token`
   - en az bir `active` voice number
   kayitli olmali.
2. `Settings` ekraninda `Voice` readiness `Ready` olmali.
3. `Voice Calls` ekraninda `Health Check` calistir.
4. `Voice Calls` ekraninda `Start Test Call` ile test aramasi baslat.

### Twilio tarafi

1. Test edecegin voice number icin `Incoming Call Webhook` alanina inbound URL'yi gir.
2. `Status Callback URL` alanina status URL'yi gir.
3. Method `POST` olsun.

### Basarili smoke sonucu

- Telefon cagliyor.
- Arama acilinca greeting oynuyor.
- Kullanici konusunca yeni `voice-*` session olusuyor.
- `Unified Inbox` icinde voice thread gorunuyor.
- `Settings > Provider Event Inspector` icinde su event'ler gorulebiliyor:
  - `voice.webhook_signature`
  - `voice.test_call`
  - `voice.test_call_status`
  - `voice.call_status`
- `Delivery Monitor` icinde outbound callback/test call denemeleri gorunuyor.

### Sik hata nedenleri

- `403` signature denied:
  - Twilio Auth Token yanlis
  - public URL degisti ama Twilio console guncellenmedi
- Arama geliyor ama session olusmuyor:
  - number `active` degil
  - inbound URL yanlis
- Status event yok:
  - Status Callback URL bos veya yanlis

## 5. WhatsApp Smoke Test

### Omni tarafi

1. `Channels > WhatsApp` ekraninda su alanlar dolu olmali:
   - `phoneNumberId`
   - `access token`
   - `app secret`
   - `verify token`
2. `Settings` ekraninda `WhatsApp` readiness `Ready` olmali.
3. `Health Check` calistir.
4. `Send Test Message` calistir.

### Meta tarafi

1. App webhook callback URL alanina WhatsApp webhook URL'yi gir.
2. Verify token alanina Omni'deki verify token'i birebir gir.
3. WhatsApp inbound message event subscription aktif olsun.

### Basarili smoke sonucu

- Test message basarili donuyor.
- Gercek telefondan business numaraya mesaj atinca auto-reply geliyor.
- `Unified Inbox` icinde `whatsapp-*` session gorunuyor.
- `Provider Event Inspector` icinde su event'ler gorunuyor:
  - `whatsapp.webhook_signature`
  - `whatsapp.health_check`
  - `whatsapp.test_message`
  - `whatsapp.auto_reply`
- `Delivery Monitor` icinde message denemeleri gorunuyor.

### Sik hata nedenleri

- GET verify `403`:
  - verify token yanlis
- POST signature denied:
  - app secret yanlis
- Test message config error:
  - `phoneNumberId` veya `access token` eksik

## 6. Instagram DM Smoke Test

### Omni tarafi

1. `Channels > Instagram DM` ekraninda su alanlar dolu olmali:
   - `pageId`
   - `accountId`
   - `access token`
   - `app secret`
   - `verify token`
2. `Settings` ekraninda `Instagram` readiness `Ready` olmali.
3. `Health Check` calistir.
4. `Send Test Message` sadece daha once DM acilmis bir recipient ile calisir.

### Meta tarafi

1. App webhook callback URL alanina Instagram webhook URL'yi gir.
2. Verify token alanina Omni'deki verify token'i birebir gir.
3. Instagram DM message event subscription aktif olsun.

### Basarili smoke sonucu

- Gercek test hesabi ile DM gonderince auto-reply geliyor.
- `Unified Inbox` icinde `instagram-*` session gorunuyor.
- `Provider Event Inspector` icinde su event'ler gorunuyor:
  - `instagram.webhook_signature`
  - `instagram.health_check`
  - `instagram.test_message`
  - `instagram.auto_reply`

### Sik hata nedenleri

- `403` verify token uyusmuyor
- signature denied:
  - app secret yanlis
- test message calismiyor:
  - recipient daha once DM acmamis
  - `pageId/accountId/access token` yanlis

## 7. Son Kontrol

Smoke test sonunda su ekranlari kontrol et:

1. `/omni/settings`
   - readiness `Ready`
   - provider event'leri akiyor
   - smoke runs gecmisi doluyor
2. `/omni/operations/unified-inbox`
   - voice, whatsapp, instagram thread'leri olusuyor
3. `/omni/operations/delivery-monitor`
   - success, failed, retry ve exhausted denemeler gorunuyor
4. `/omni/analytics`
   - delivery failure ve exhausted sayilari yansiyor

## 8. Minimum Basari Kriteri

- Voice inbound call cevaplanmali
- Voice test call status event'leri gorulmeli
- WhatsApp inbound mesaja auto-reply donmeli
- Instagram DM inbound mesaja auto-reply donmeli
- Signature denied olmamali
- Delivery Monitor'da beklenmeyen `exhausted` retry olmamali
