# ABD Pazarına Giriş — Go-to-Market & Teknik Hazırlık Planı

**Ürün:** vion-ai tabanlı, yeni marka altında white-label AI asistan / randevu & lead platformu
**Hedef dikeyler:** HVAC firmaları, berber & kuaför salonları, diş klinikleri (ve benzeri yerel hizmet işletmeleri)
**Hazırlayan:** Teknik inceleme + GTM değerlendirmesi
**Tarih:** 2026-06-07
**Durum:** Taslak v1

> Efor tahminleri **adam-gün (ag)** cinsindedir ve 1 deneyimli full-stack geliştirici varsayımına dayanır. Aralıklar belirsizliği yansıtır. "ag" = adam-gün, "ah" = adam-hafta (≈5 ag).

---

## 1. Yönetici Özeti

Ürünün çekirdeği bu dikeylere teknik olarak uygun: çok kiracılı (multi-tenant) mimari, ajans/white-label modeli, randevu + Google/Outlook takvim entegrasyonu, omnichannel (WhatsApp/Messenger) ve mevcut EN/TR dil desteği. Yani "her işletmeye kendi markası altında widget" senaryosu mimariyle uyumlu.

Ancak **"yeni marka açıp satmak" işin küçük kısmı.** ABD'de ticari olarak satılabilir hale gelmek için üç kritik boşluğun kapatılması gerekiyor: (1) güvenlik açıkları, (2) gerçek ödeme/faturalama altyapısı, (3) uyumluluk (özellikle diş kliniği için HIPAA). Önerilen yol: önce teknik blocker'ları kapat, sonra HVAC + berber ile pilot, diş dikeyini HIPAA netleştikten sonra ekle.

**Toplam tahmini hazırlık eforu (MVP satışa hazır):** ~45–70 ag (≈9–14 ahafta, tek geliştirici) + uyumluluk/hukuk için harici danışmanlık.

---

## 2. Pazar & Konumlandırma

### Hedef dikeyler ve uygunluk

| Dikey | Temel ihtiyaç | Ürün uyumu | Uyumluluk yükü |
|---|---|---|---|
| HVAC | Lead yakalama, acil servis talebi, randevu/keşif | Yüksek | Düşük (TCPA, CCPA) |
| Berber / Kuaför / Salon | Online randevu, hatırlatma, no-show azaltma | Yüksek | Düşük (TCPA, CCPA) |
| Diş klinikleri | Randevu, hasta soruları, hatırlatma | Yüksek ama riskli | **Yüksek (HIPAA)** |

**Öneri:** Pilotu HVAC + berber ile başlat (düşük uyumluluk yükü, hızlı satış döngüsü). Diş dikeyini ayrı, HIPAA-hazır bir SKU olarak sonraya bırak.

### Rakipler

ABD'de bu segmentte güçlü oyuncular var: **Podium, Birdeye, Thryv, Housecall Pro (HVAC), Boulevard / Squire (berber & salon), NexHealth (diş)**. "Bir chatbot daha" konumlanması zor; farklılaşma şu üçgende olmalı:

- **AI + çok dilli** asistan (İngilizce + İspanyolca ABD yerel hizmet sektöründe büyük avantaj)
- **Randevu otomasyonu + no-show azaltma** (ölçülebilir ROI)
- **Uygun fiyat + hızlı kurulum** (white-label/ajans kanalı ile)

---

## 3. Faz Bazlı Yapılacaklar + Efor

### Faz 0 — Güvenlik & Teknik Borç (BLOCKER) · ~9–14 ag

Müşteri almadan önce kapatılması zorunlu. Detaylar koddaki inceleme bulgularına dayanır.

| # | İş | Efor | Öncelik |
|---|---|---|---|
| 0.1 | `next.config.mjs` global CORS'u düzelt: `Access-Control-Allow-Origin: *` + `Allow-Credentials: true` kombinasyonunu kaldır, bilinen origin'lere kilitle | 1–2 ag | Kritik |
| 0.2 | Auth'suz AI uçlarını koru (`copywriter/generate`, `generate-context-bubble`, `crawl` vb.) — auth + tenant + rate limit ekle (maliyet suistimali riski) | 2–3 ag | Kritik |
| 0.3 | Rate limiter'ı in-memory Map'ten Upstash Redis'e taşı (serverless'ta paylaşımlı limit) | 1–2 ag | Yüksek |
| 0.4 | Tüm 295 route için auth denetimi: korumasız ama korunması gereken uçları tespit & düzelt (`campaigns` stub'ı dahil) | 2–3 ag | Yüksek |
| 0.5 | Hata mesajı sızıntılarını temizle (örn. `dashboard-stats` token hata detayı) | 0.5 ag | Orta |
| 0.6 | Repo hijyeni: `.backup`, `current_changes.patch`, `trigger.txt`, `testdb.js`, `query_db.js`, `scratch/` temizliği | 0.5 ag | Düşük |
| 0.7 | `gitleaks` taraması + bağımlılık güvenlik denetimi (`npm audit`) | 1 ag | Orta |

### Faz 1 — Ticarileştirme: Ödeme & Faturalama · ~8–12 ag

Şu an gerçek bir ödeme ağ geçidi bağlı değil; `pricing-config` ve `subscription-access` var ama Stripe yok.

| # | İş | Efor |
|---|---|---|
| 1.1 | Stripe entegrasyonu: Checkout + Customer Portal | 3–4 ag |
| 1.2 | Abonelik webhook'ları → `subscription-access` ile bağla (plan değişimi, iptal, ödeme başarısız) | 2–3 ag |
| 1.3 | Plan/paket yapısını ABD fiyatlandırmasına göre yapılandır (USD, dikey bazlı paketler) | 1–2 ag |
| 1.4 | Kullanım bazlı sınırlar (AI mesaj kotası) + aşım yönetimi | 2 ag |
| 1.5 | Faturalama testleri (test mode, başarısız ödeme akışı) | 1 ag |

### Faz 2 — Lokalizasyon & Rebrand (White-label) · ~10–15 ag

"vion" markası ~185 dosyada gömülü (çoğu çeviri/config/`widget.js`).

| # | İş | Efor |
|---|---|---|
| 2.1 | Marka soyutlama: hardcoded "vion" referanslarını tek config/env'e taşı | 3–4 ag |
| 2.2 | Yeni marka kimliği uygula (logo, renkler, e-posta şablonları, `widget.js`) | 2–3 ag |
| 2.3 | İngilizce'yi birincil dil yap; varsayılan dil/coğrafya mantığını ABD'ye göre çevir (`middleware.ts` TR-öncelikli mantık) | 2 ag |
| 2.4 | İspanyolca (es) dil desteği ekle — ABD yerel hizmet sektöründe büyük avantaj | 2–3 ag |
| 2.5 | ABD formatları: telefon (E.164/US), saat dilimi, tarih, para birimi | 1–2 ag |
| 2.6 | Pazarlama sitesi / landing'i ABD pazarına göre yeniden yaz | 2 ag |

### Faz 3 — Uyumluluk · ~5–8 ag (geliştirme) + harici hukuk danışmanlığı

> **Not: Bu bölüm hukuki tavsiye değildir. ABD'de bir avukat ve gerekirse uyumluluk danışmanı ile netleştirilmelidir.**

| # | İş | Efor |
|---|---|---|
| 3.1 | **CCPA**: gizlilik politikası, "Do Not Sell/Share", veri silme akışı (mevcut CMP modülü temel sağlıyor) | 2–3 ag |
| 3.2 | **TCPA**: SMS/WhatsApp pazarlama mesajları için açık rıza (opt-in) kaydı + opt-out | 2–3 ag |
| 3.3 | ABD'ye uygun ToS / Privacy / DPA şablonları (hukukçu ile) | hukuk |
| 3.4 | **HIPAA (yalnız diş dikeyi için, ayrı SKU):** Firebase/altyapı için BAA, PHI veri akışı tasarımı, şifreleme & erişim logları, audit trail | 8–15 ag + danışman |

### Faz 4 — Dikey Paketleme · ~6–9 ag

| # | İş | Efor |
|---|---|---|
| 4.1 | HVAC paketi: acil servis lead formu, keşif randevusu, sezon kampanyası şablonları | 2–3 ag |
| 4.2 | Berber/salon paketi: online rezervasyon, no-show hatırlatma, çalışan bazlı takvim | 2–3 ag |
| 4.3 | Diş paketi (HIPAA sonrası): hasta randevu, ön-tarama soruları, hatırlatma | 2–3 ag |
| 4.4 | Her dikey için hazır AI persona + bilgi tabanı + onboarding sihirbazı | 1 ag |

### Faz 5 — Go-to-Market / Satış · paralel yürür

| # | İş | Efor |
|---|---|---|
| 5.1 | Demo ortamı + her dikey için örnek tenant | 1–2 ag |
| 5.2 | Self-serve onboarding akışı (kayıt → kurulum → widget yayını) | 3–4 ag |
| 5.3 | Ajans/reseller kanalı paketi (white-label fiyatlandırma, partner paneli — kısmen mevcut) | 2–3 ag |
| 5.4 | Satış materyali: ROI hesaplayıcı (no-show azaltma, lead artışı), case study şablonu | hukuk/pazarlama |
| 5.5 | Pilot: 3–5 işletme ile ücretsiz/indirimli erken erişim | — |

---

## 4. Efor Özeti

| Faz | Kapsam | Tahmini efor |
|---|---|---|
| Faz 0 | Güvenlik & teknik borç (blocker) | 9–14 ag |
| Faz 1 | Ödeme & faturalama | 8–12 ag |
| Faz 2 | Lokalizasyon & rebrand | 10–15 ag |
| Faz 3 | Uyumluluk (HIPAA hariç) | 5–8 ag + hukuk |
| Faz 4 | Dikey paketleme | 6–9 ag |
| Faz 5 | GTM / self-serve / kanal | 6–9 ag |
| **Toplam (diş/HIPAA hariç, satışa hazır MVP)** | | **~45–70 ag (≈9–14 ahafta)** |
| Faz 3.4 | HIPAA (diş için, ayrı) | +8–15 ag + danışman |

---

## 5. Önerilen Zaman Çizelgesi (tek geliştirici)

- **Ay 1:** Faz 0 (güvenlik) + Faz 1 başlangıç (Stripe)
- **Ay 2:** Faz 1 tamam + Faz 2 (rebrand & lokalizasyon)
- **Ay 3:** Faz 4 (HVAC + berber paketleri) + Faz 3 (CCPA/TCPA) + Faz 5 (self-serve, demo)
- **Ay 4:** HVAC + berber ile **pilot satış**; geri bildirimle iterasyon
- **Ay 5+:** Diş dikeyi için HIPAA hazırlığı (talep doğrulanırsa)

> 2 geliştirici ile takvim kabaca yarıya iner; uyumluluk ve pilot satış kısımları paralelleşebilir.

---

## 6. Riskler & Azaltma

| Risk | Etki | Azaltma |
|---|---|---|
| HIPAA yükü (diş) | Yüksek hukuki/maliyet riski | Dişi ertele; önce HVAC+berber. Ayrı HIPAA-hazır SKU |
| Auth'suz AI uçları → maliyet suistimali | OpenAI faturası patlayabilir | Faz 0.2 önce yapılır, satıştan önce |
| Doygun rakip pazarı | Düşük dönüşüm | Çok dilli (EN+ES) + fiyat + ROI ile farklılaş |
| Ödeme altyapısı yokluğu | Self-serve satış imkânsız | Faz 1 erken |
| Marka gömülülüğü (185 dosya) | Rebrand gecikir | Faz 2.1 ile config'e soyutla |
| Tek geliştirici darboğazı | Takvim kayar | Pilotu dar tut, kapsamı kademelendir |

---

## 7. İlk 30 Gün — Aksiyon Listesi

1. Faz 0.1 + 0.2: CORS düzelt, auth'suz AI uçlarını kapat (kritik).
2. Faz 0.3: Rate limiter → Upstash.
3. Stripe hesabı aç, Faz 1.1 başlat.
4. ABD'de bir avukatla görüş: HVAC/berber için ToS/Privacy + TCPA; diş için HIPAA kapsam analizi.
5. Marka adı & alan adı belirle; Faz 2.1 marka soyutlamasına başla.
6. Hedef dikeyde 3–5 potansiyel pilot işletme ile ön görüşme.

---

*Bu plan teknik bir değerlendirme + pazar yorumudur; hukuki ve finansal kararlar için ilgili uzmanlara danışılmalıdır. Efor tahminleri yaklaşıktır ve kapsam netleştikçe revize edilmelidir.*
