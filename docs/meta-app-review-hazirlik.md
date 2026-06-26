# Meta App Review + Business Verification — Hazırlık Rehberi

Üç kanalın da (Messenger, Instagram DM, WhatsApp) **gerçek/genel müşterilerle** çalışması için Meta'nın
**App Review** sürecinden geçmek gerekir. Development modunda yalnızca app rolündeki kişiler (admin/tester)
mesajlaşabilir; App Review onayı + Live mod ile bu kısıt kalkar.

Bu rehber, AmeritAI'nin (App ID: 933635223025179) üç Meta mesajlaşma kanalı için App Review hazırlığını kapsar.

---

## Genel Akış (özet)

1. **Business Verification** (Meta Business hesabı doğrulaması) — kayıtlı şirket + belge gerektirir.
2. **App settings tamamlama** — privacy policy, data deletion, app icon, kategori.
3. **İstenecek izinler** (Advanced Access) — kanal başına.
4. **Demo video (screencast)** — her izin için kullanıcı akışını gösteren video. **En kritik adım.**
5. **Use case açıklamaları** — her iznin neden gerektiğini yaz.
6. **Submit** → Meta inceler (genelde günler, bazen 1-2 hafta).
7. Onaylanınca app'i **Live** moduna al.

---

## 1. Ön Koşul — Business Verification

> Şirket kurulmadan bu adım tamamlanamaz. (Daha önce konuştuğumuz konu.)

- Meta Business Suite → **Business Settings → Security Center / Business Verification**.
- Gereken: **kayıtlı tüzel kişilik** (US LLC / TR şahıs ya da limited şirket), ve şunlardan bazıları:
  - İşletme yasal adı, adresi, telefonu (resmi kayıtla eşleşmeli).
  - Vergi numarası / şirket kayıt belgesi.
  - İşletme adına bir web sitesi (ameritai.com) + işletme e-postası.
- Doğrulama, telefon/e-posta/belge ile yapılır; birkaç gün sürebilir.

**US için:** LLC kurmak hızlı (eyalete göre 1-2 gün, ~$50-300). EIN (vergi no) alınır.
**Bu konu mali/hukuki** — bir muhasebeci/oluşum servisiyle (Stripe Atlas, Firstbase vb.) netleştir.

---

## 2. App Settings (Basic) Tamamlama

Meta App → **App settings → Basic** — App Review için şunlar **zorunlu**:

- [ ] **Privacy Policy URL:** `https://www.ameritai.com/privacy` ✅ (girildi)
- [ ] **Terms of Service URL:** `https://www.ameritai.com/terms` ✅
- [ ] **User Data Deletion:** veri silme talimatları URL'i veya callback. (örn. `https://www.ameritai.com/privacy` içinde "verilerinizi silme" bölümü)
- [ ] **App Icon:** 1024×1024 PNG (AmeritAI logosu)
- [ ] **Category:** "Messaging" veya "Business and Pages"
- [ ] **Business Verification:** tamamlanmış (Adım 1)
- [ ] App **Live** moduna alınabilir durumda (review sonrası)

---

## 3. İstenecek İzinler (Advanced Access)

Her kanal için App Review'da şu izinlere **Advanced Access** istenir:

**Messenger:**
- `pages_messaging` ← ana izin
- `pages_manage_metadata`

**Instagram DM:**
- `instagram_basic`
- `instagram_manage_messages`

**WhatsApp:**
- `whatsapp_business_messaging`
- `whatsapp_business_management`

> Not: `business_management`, `pages_show_list` genelde Standart Access ile yeterli olur.

Meta App → **App Review → Permissions and Features** → her izin için **"Request Advanced Access"**.

---

## 4. Demo Video (Screencast) — EN KRİTİK ADIM

Meta, her mesajlaşma izni için **kullanıcının uçtan uca akışı gördüğü bir ekran kaydı** ister.
Reddedilmelerin %1 numaralı sebebi: eksik/yetersiz demo.

Her kanal için ayrı (veya birleşik) bir video çek; şunları **net göster:**

1. **Bağlama akışı:** AmeritAI panelinde Integrations → kanal → "Connect" → Facebook/Meta OAuth onay ekranı → sayfa/hesap seçimi → bağlandı.
2. **Gelen mesaj:** Bir kullanıcı (test) o sayfaya/numaraya mesaj atıyor.
3. **Botun yanıtı:** AmeritAI'nin otomatik cevabı görünüyor.
4. **Panel:** Gelen konuşmanın AmeritAI Chats ekranında göründüğü.
5. İzin **neden gerekli** sesli/yazılı anlat: "pages_messaging, işletmenin müşteri DM'lerine AmeritAI asistanının otomatik yanıt verebilmesi için gerekli."

İpuçları:
- Ekran kaydını İngilizce arayüzle çek (Meta inceleyicileri İngilizce).
- Gerçek bir test akışı göster (mock değil).
- Her izni ayrı net göster; "neden gerekli"yi açıkça söyle.

---

## 5. Use Case Açıklamaları

Her izin için "How will you use this permission?" sorusuna kısa, net yanıt:

- **pages_messaging:** "AmeritAI, işletmelerin Facebook Sayfası'na gelen Messenger mesajlarına yapay zeka asistanıyla otomatik yanıt verir ve gerektiğinde insana aktarır."
- **instagram_manage_messages:** "İşletmelerin Instagram Professional hesabına gelen DM'lere AmeritAI asistanı otomatik yanıt verir."
- **whatsapp_business_messaging:** "İşletmelerin WhatsApp Business numarasına gelen mesajlara AmeritAI asistanı 24 saat penceresi içinde otomatik yanıt verir."

---

## 6. Submission

1. Meta App → **App Review → Requests** → eklediğin izinleri **Submit for Review**.
2. Her izne demo video + use case açıklaması ekle.
3. Test kullanıcısı/talimat ver (Meta inceleyici sisteminizi nasıl test edecek — gerekiyorsa test hesabı bilgisi).
4. Gönder → bekle.

---

## 7. Sık Red Sebepleri (önceden önle)

| Sebep | Önlem |
|---|---|
| Demo video iznin kullanımını net göstermiyor | Uçtan uca akışı (bağla → mesaj → bot yanıt) tek videoda göster |
| Privacy policy eksik/erişilemez | `ameritai.com/privacy` canlı ve net olsun |
| Data deletion yok | Veri silme talimatı/URL ekle |
| Business verification eksik | Önce şirketi doğrula |
| Use case belirsiz | Her izni tek cümlede net açıkla |
| App hâlâ "in development" görünümlü | Live'a hazır, eksiksiz görünmeli |

---

## Şimdiki Durum Özeti

| Kanal | Meta tarafı | Dev test | App Review |
|---|---|---|---|
| **Messenger** | ✅ bağlı, sayfa abone | ⏳ dev-mode tester ile | ⏳ bekliyor |
| **Instagram** | ✅ bağlı, IG-sayfa linkli | ⏳ tester daveti ile | ⏳ bekliyor |
| **WhatsApp** | ✅ WABA + numara + register | ✅ test alıcısı ile | ⏳ bekliyor |

**Tek büyük kapı:** Business Verification (şirket) → App Review → Live. Üçü de bu kapıdan geçecek.

---

## Önerilen Sıra

1. **Şirketi kur** (US LLC öneri — hedef pazar US) + EIN/banka.
2. **Business Verification** tamamla.
3. **App icon + data deletion** ekle (privacy/terms zaten var).
4. **Demo videolarını** çek (her kanal için bağla→mesaj→yanıt).
5. İzinleri **Advanced Access** için submit et.
6. Onay → **Live** mod → gerçek müşteriler.

> Bu aşamaya kadar tüm **teknik kurulum tamamlandı** — kalan iş operasyonel (şirket + Meta onayı).
