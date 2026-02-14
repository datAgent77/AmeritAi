# Google Ölçüm Event Haritası

Bu dosya, sitedeki Google Ads / GA4 büyüme ölçüm kurulumunu tek noktadan yönetmek için hazırlanmıştır.

## 1) Önerilen Conversion Event'leri

- `sign_up`
- `start_trial`
- `generate_lead`
- `begin_checkout`

`cta_click` ve `select_item` mikro dönüşüm olarak raporlanmalı, doğrudan ana conversion olarak işaretlenmemelidir.

## 2) Event Kaynakları

- `sign_up`:
  - `/signup` başarılı kayıt
- `start_trial`:
  - `/signup` başarılı kayıt sonrası
- `generate_lead`:
  - `/contact` form gönderimi
  - Widget lead form submit akışı
- `begin_checkout`:
  - `/pricing` sayfasında plan seçimi

## 3) Event Parametreleri

- Ortak parametreler:
  - `language`
  - `location`
  - `cta_label`
  - `destination`
- Plan parametreleri:
  - `plan_id`
  - `billing_cycle`
  - `price`
  - `currency`
  - `value`
- Lead parametreleri:
  - `lead_source`
  - `form_name`
  - `subject`

## 4) GA4 Ayarı

1. GA4 Admin > Events altında event'lerin aktığını doğrula.
2. GA4 Admin > Conversions altında şu event'leri conversion olarak aç:
   - `sign_up`
   - `start_trial`
   - `generate_lead`
   - `begin_checkout`
3. DebugView ile signup/contact/pricing akışlarını uçtan uca test et.

## 5) Google Ads İçe Aktarım

1. Google Ads > Tools > Conversions > Import > GA4.
2. Yukarıdaki 4 conversion event'i Ads'e aktar.
3. Kampanya hedeflerine göre:
   - Lead kampanyası: `generate_lead`
   - Self-serve büyüme: `sign_up`, `start_trial`
   - Plan niyeti optimizasyonu: `begin_checkout`

## 6) Notlar

- Event gönderimi kodda `lib/marketing-tracking.ts` üzerinden merkezi yönetilir.
- Çift event düşmesini engellemek için önce `gtag`, yoksa `dataLayer` fallback kullanılır.
