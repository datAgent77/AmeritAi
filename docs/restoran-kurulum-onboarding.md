# Restoran Müşterisi — Kurulum & Eğitim Playbook'u (AmeritAI)

Bir restorana satış yaptıktan sonra uçtan uca kurulum ve bot eğitimi nasıl yapılır.
Bu akış **web sitesi widget'ı** üzerinden çalışır ve Meta App Review gerektirmez — yani
bugün uygulanabilir. Sosyal kanallar (WhatsApp/Instagram/Messenger) en sonda, App Review
sonrasına bırakılmıştır.

Tahmini süre: **30–60 dakika** (içerik hazırsa).

---

## 0. Satış sonrası — müşteriden toplanacak bilgiler

Kuruluma başlamadan önce restorandan şunları iste (tek bir formla topla):

- **Marka:** restoran adı, logo (PNG/SVG), marka rengi (hex).
- **Web sitesi:** adres (varsa). WordPress mi, özel site mi?
- **Menü:** PDF / görsel / Excel ya da site linki. Fiyatlar, kategoriler.
- **Operasyon bilgisi:** çalışma saatleri, adres(ler), telefon, park, paket/teslimat var mı, online sipariş linki.
- **Rezervasyon politikası:** rezervasyon alıyor mu? Hangi saatler, kaç kişiye kadar, depozito var mı?
- **Sık sorulanlar:** alerjen/vegan/helal, çocuk menüsü, grup/etkinlik, otopark, evcil hayvan vb.
- **Bildirim:** lead/rezervasyon bildirimi hangi e-postaya gitsin?
- **Dil:** botun ana dili (EN/TR/ES) ve birden çok dil gerekiyor mu?

> İpucu: Bu bilgiler botun "beyni" olacak. Ne kadar net toplarsan, eğitim o kadar hızlı ve bot o kadar isabetli olur.

---

## 1. Hesap / tenant oluşturma

1. Müşteri için yeni bir hesap aç (kayıt → onboarding). 14 günlük deneme otomatik başlar.
2. Onboarding adımlarını tamamla (işletme adı, sektör = Restoran/Food, dil).
3. Panel açıldığında sol menü: **Overview · Training · Skills · Widget Settings · Integrations · Chats · Reports**.

---

## 2. Marka & widget görünümü

**Widget Settings** (CONNECT bölümü):

- Bot adı (örn. "Bella'nın Asistanı") ve avatar/logo.
- Karşılama mesajı (örn. "Merhaba! Menü, saatler veya rezervasyon için buradayım 🍽️").
- Marka rengi (restoranın hex'i).
- Dil ve varsa otomatik dil algılama.
- Lead formu açık mı, hangi alanları toplayacak (ad, telefon, e-posta).

---

## 3. Bot eğitimi (Knowledge) — en önemli adım

**Training** altında dört kaynak türü var; restoran için hepsini kullan:

**a) URL import** (`Knowledge → URL`)
Restoranın web sitesini ve menü sayfasını ekle. Site JavaScript ağırlıklıysa sistem
otomatik olarak render'lı içerik çekme (SPA fallback) devreye girer. Birden çok sayfa
varsa tek tek ya da sitemap ile ekle.

**b) Dosya yükleme** (`Knowledge → File`)
Menü PDF'i, fiyat listesi (Excel/CSV), broşür (PDF/DOCX) yükle. Menü en kritik içeriktir.

**c) Soru-Cevap** (`Knowledge → Q&A`)
En çok sorulanları elle gir — botun en isabetli yanıt verdiği kaynak budur:
- "Çalışma saatleriniz nedir?" → "Pzt–Cuma 11:00–23:00, Hafta sonu 10:00–24:00."
- "Vegan seçeneğiniz var mı?" → "Evet, … (liste)."
- "Rezervasyon nasıl yapılır?" → "… (politika)."
- "Otopark var mı? / Paket servis? / Çocuk menüsü?"

**d) Serbest metin** (`Knowledge → Text`)
Q&A'ya sığmayan genel bilgi (hikaye, konsept, kampanya koşulları) buraya yapıştır.

> Eğitimden sonra botla **test sohbeti** yap; eksik/yanlış yanıtları Q&A'ya ekleyerek düzelt. Eğitim canlı bir döngüdür.

---

## 4. Restorana özel modüller (opsiyonel ama güçlü)

Modüller **Modules** (`/console/modules`) ekranından açılır/kapanır — her modül bir kart +
aç/kapa anahtarı. Modülü açınca ilgili ayar ekranı erişilebilir olur.

**Restoran sektörü seçilince zaten AÇIK gelenler (çekirdek/ücretsiz):**

- **General AI Assistant** — temel sohbet botu (çekirdek, kapatılamaz).
- **AI Training / Knowledge Base** — bilgi kaynakları (çekirdek).
- **Data Privacy & Consent** — sohbet öncesi gizlilik onayı (CCPA/GDPR).
- **Restaurant & Cafe AI (Digital Waiter)** — menü anlatımı, öneri, servis modu
  (Masaya Servis / Self Servis), garson çağır / hesap iste akışı. Restoran sektöründe
  **varsayılan açık** gelir.

**Restorana uygun, elle açılabilen premium modüller:**

- **Sales & Catalog** (~$29): menü/ürün kartları, öneri.
- **Lead Collection** (~$29): rezervasyon ve iletişim talebi toplama formu + bildirim.
- **Gamification & Wheel** (~$39): çark/oyun ile etkileşim ve indirim kodu.
- **Proactive Engagement** (~$19): widget üstünde zamanlı balon mesaj (kampanya, karşılama).
- Tüm sektörlerde açılabilenler: **Human Handoff** (canlı temsilciye aktarma),
  **Surveys** (memnuniyet anketi), **Guided** (yönlendirmeli butonlar), **Widget Voice** (sesli).
- **Campaign Wizard** (mutlu saatler/indirim): restoran destekli ama şu an **"coming soon"** — henüz hazır değil.

**Restoran sektöründe DESTEKLENMEYEN (kullanma):**

- **Appointments / Randevu modülü** — kayıt defterinde restoran sektörü yok ve "coming soon"
  durumunda. Restoran **rezervasyonunu** bunun yerine **Lead Collection formu** (veya Digital
  Waiter akışı) ile topla; takvime düşürmek için Adım 6'daki **Google/Outlook Calendar**
  entegrasyonunu kullan.

> **Önemli (ödeme nüansı):** Premium modüller **deneme sürümünde kilitlidir**. Digital Waiter,
> Gamification, Sales & Catalog gibi modülleri gerçekten açmak için müşterinin **ücretli planda**
> olması gerekir (plan modülü içeriyorsa otomatik açılır). Ödemeyi yüz yüze alıyorsan, Stripe'a
> girmeden **admin panelinden müşterinin planını elle ücretli tier'a çekerek** premium modülleri
> açabilirsin (SUPER_ADMIN yetkisi gerekir).

---

## 5. Lead & bildirim ayarı

- **Modules → Leads → Settings**: lead/rezervasyon bildiriminin gideceği e-postayı gir
  (müşterinin topladığın adresi). Bildirim e-postası İngilizce/seçili dilde gider.
- Lead formunda hangi alanların zorunlu olduğunu belirle.

---

## 6. Takvim bağlama (rezervasyon için)

**Integrations → Google Calendar** veya **Outlook Calendar** → "Connect" → OAuth onayı.
Bağlandığında Lead Collection ile toplanan rezervasyon talepleri takvime düşer.
(Resmi Meta onayı gerektirmez. Not: ayrı "Appointments" modülü restoran sektöründe
kullanılmaz — rezervasyonu Lead Collection ile topla.)

---

## 7. Widget'ı siteye gömme

**Integrations → Website** → kurulum kodunu kopyala:

```html
<script src="https://www.ameritai.com/widget.js?v=2.0" data-chatbot-id="MUSTERI_ID" data-color="#RENK"></script>
```

- **Özel site:** kodu `</body>` etiketinden hemen önce yapıştır.
- **WordPress:** `Integrations → WordPress` adımındaki talimatları izle (tema/footer ya da
  eklenti ile ekleme).
- Alternatif: **Direct Link** ile tam sayfa sohbeti paylaşılabilir link olarak ver
  (site yoksa veya Instagram bio / Google işletme linki için pratik). *Not: Direct Link/iFrame
  kartları şu an gizli; gerekirse açabiliriz.*

---

## 8. Test (teslim öncesi)

- Botla gerçek bir müşteri gibi konuş: menü, saatler, konum, rezervasyon, alerjen soruları.
- Yanlış/eksik yanıtları Q&A ile düzelt.
- Lead formunu doldur → bildirim e-postası geldi mi?
- **Chats** ekranında konuşmanın göründüğünü doğrula.
- Mobilde widget'ın düzgün açıldığını kontrol et.

---

## 9. Teslim & müşteri eğitimi (15 dk)

Müşteriye paneli kısaca göster:

- **Chats:** gelen tüm konuşmalar, lead/rezervasyon talepleri.
- **Reports / Analytics:** soru hacmi, en çok sorulanlar, lead sayısı.
- **Training:** menü/saat değişince bilgiyi nasıl güncelleyecekleri (özellikle Q&A).
- **Widget Settings:** karşılama mesajı / kampanya metnini nasıl değiştirecekleri.

Kısa bir "menünüz değişince şu adımı izleyin" notu bırak — self-servis güncelleme müşteriyi mutlu eder.

---

## 10. İleride — sosyal kanallar (App Review sonrası)

WhatsApp / Instagram / Messenger'ı **gerçek müşterilerle** açmak için:

1. AmeritAI tarafında **Business Verification + App Review + Live mod** tamamlanmalı
   (şirket gerekiyor — bkz. `docs/meta-app-review-hazirlik.md`).
2. Sonra müşteri sadece kendi Facebook Sayfası / Instagram Professional / WhatsApp Business
   hesabını **Integrations**'tan "Connect" ile bağlar.

Bu kapı açılana kadar restoranı **web widget + takvim + lead** akışıyla tam çalışır halde
teslim edebilirsin.

---

## Hızlı kontrol listesi

- [ ] Müşteri bilgileri toplandı (Adım 0)
- [ ] Hesap açıldı, onboarding tamam
- [ ] Marka & widget ayarlandı
- [ ] Knowledge: URL + Menü dosyası + Q&A + metin eklendi
- [ ] Modules ekranından gerekli modüller açıldı (Digital Waiter zaten açık; premium için ücretli plan)
- [ ] Lead Collection açıldı + bildirim e-postası ayarlandı (rezervasyon bunun üstünden)
- [ ] Takvim bağlandı (Google/Outlook — rezervasyon talepleri takvime düşsün)
- [ ] Widget siteye gömüldü
- [ ] Test sohbeti + lead testi yapıldı
- [ ] Müşteriye panel eğitimi verildi
