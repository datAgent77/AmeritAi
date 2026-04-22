# Widget Module Maturity Report

Tarih: 2026-04-21

## Ozet

Bu turda widget quick action altyapisi 3 modulluk sinirdan 7 modulluk ortak sozlesmeye tasindi. Public widget settings payload, admin quick action ayari ve runtime tetikleme akisi ayni module map uzerinden normalize edildi.

Otomatik test sonucu:
- `Pass`: `lib/quick-actions.test.ts`
- `Pass`: `lib/quick-action-runtime.test.ts`
- `Pass`: `app/api/widget-settings/route.test.ts`

## Modül Durumu

| Modul | Durum | Not |
| --- | --- | --- |
| Potansiyel Musteri Toplama | Pass | Inline form tetikleme ve quick action routing kapsandi. |
| Proaktif Etkilesim | Partial | Deterministik starter prompt ile quick action routing var; ayrik davranis smoke'u halen manuel takip edilmeli. |
| Gorsel Tani ve Analiz | Partial | Quick action dogru yonlendirme veriyor; gercek gorsel upload ve analiz akisi icin manuel smoke gerekli. |
| KVKK ve Veri Gizliligi | Pass | Consent gating ve KVKK quick action istisnasi testle kapsandi. |
| Musteri Temsilcisine Aktarma | Pass | Inline handoff formu ve stale mapping onarimi kapsandi. |
| Randevular | Pass | Booking form quick action routing kapsandi. |
| Restoran ve Kafe AI | Partial | Menu varsa starter prompt, menu yoksa kontrollu fallback kapsandi; gercek menu/siparis akisi manuel test edilmeli. |

## Kapanan Hatalar

| Alan | Siddet | Durum | Aciklama |
| --- | --- | --- | --- |
| Quick action module kapsami yalniz 3 moduldu | Yuksek | Fixed | Tip, normalize ve UI secenekleri 7 modulu destekliyor. |
| Butonlar yanlis modulu tetikleyebiliyordu | Yuksek | Fixed | Trigger/label tabanli stale mapping onceliklendirildi. |
| Aktif moduller quick action listesine eksik dusuyordu | Yuksek | Fixed | Auto-add ve disabled-module filter merkezi hale getirildi. |
| KVKK aktifken quick action akislari sessizce bloklaniyordu | Orta | Fixed | KVKK modal yonlendirmesi ve KVKK quick action istisnasi eklendi. |
| Digital waiter verisi yokken bos akis olusuyordu | Orta | Fixed | Kontrollu fallback mesajina cekildi. |

## Kalan Riskler

| Alan | Siddet | Not |
| --- | --- | --- |
| Gorsel tani gercek upload/analysis entegrasyonu | Orta | Bu turda unit/API seviyesinde degil, manuel widget smoke ile dogrulanmali. |
| Proaktif etkilesim davranisinin urun beklentisi | Orta | Ilk fazda deterministik starter prompt kullaniliyor; popup/orchestrator mantigi ayrica kararlastirilabilir. |
| Restoran/Kafe AI gercek menu veri kalitesi | Orta | QR/PDF/menu parsing kalitesi module smoke ile ayrica test edilmeli. |
| Widget icindeki mevcut `<img>` kullanimi | Dusuk | Lint warning olarak duruyor; bu turda fonksiyonel degisiklik disinda tutuldu. |

## Manuel Smoke Checklist

- `widget-test` sayfasinda desktop classic mod
- `widget-test` sayfasinda mobile classic mod
- Ambient modda quick action gizli kalma kontrolu
- `leadCollection` butonu ile inline lead form
- `humanHandoff` butonu ile inline handoff form
- `appointments` butonu ile inline booking form
- `visualDiagnosis` butonu ile upload yonlendirmesi
- `kvkkConsent` butonu ile modal acilisi ve kabul sonrasi bilgi mesaji
- `proactiveMessaging` butonu ile deterministic ilk prompt
- `digitalWaiter` butonu ile menu varsa starter prompt, yoksa fallback mesaji
- Save, refresh, reopen sonrasi quick action sirasi ve modul eslesmesi
