# Instagram (DM) Entegrasyonu — Kurulum Rehberi

Instagram Direct Message kanalını AmeritAI'ye bağlamak için adımlar.
Kod tarafı hazır (Messenger ile aynı altyapı); buradaki iş **ön koşullar + Meta config + bağlama**.

> Aynı Meta App (AmeritAI, App ID: 933635223025179) ve aynı domain ayarları kullanılır — Messenger için
> yaptığın App Domains / OAuth redirect / verify token ayarları geçerli, tekrar yapmana gerek yok.

---

## 0. ÖN KOŞUL (en kritik) — Instagram Professional hesabı

Instagram DM API'si **yalnızca Professional (Business/Creator) hesapla** ve **bir Facebook Sayfasına bağlıyken** çalışır. Kişisel IG hesabı olmaz.

1. **Instagram hesabını Professional yap:** IG uygulaması → Ayarlar → **Hesap türü ve araçlar → Profesyonel hesaba geç** → **Business**.
2. **Facebook Sayfasına bağla:** Bu IG hesabını **Kampyerlerim** sayfasına bağla.
   - IG geçişi sırasında sorar; ya da Facebook Sayfası → **Settings → Linked accounts → Instagram → Connect account**.
3. **Mesaj erişimine izin ver:** IG → Ayarlar → **Mesajlar / Messages and story replies** → "bağlı araçların (connected tools) mesajlara erişimi" **açık** olmalı. (API'nin DM okuyabilmesi için şart.)

Yoksa "Connect" adımında IG hesabı listede çıkmaz.

---

## 1. Meta App — İzinler (Use case)

Meta App → **Use cases**. Instagram için iki yol olabilir:
- "Engage with customers on Messenger" use case'i Instagram'ı da kapsar, **veya**
- Ayrı "Manage messaging & content on Instagram" use case'i.

İlgili use case → **Customize → Permissions and features** → şu izinleri **Add**:
- `instagram_basic`
- `instagram_manage_messages`
- `pages_show_list`
- `pages_manage_metadata`
- (Messenger'dan zaten ekli olabilir: `business_management`, `pages_messaging`)

---

## 2. Webhook (Instagram alanı)

Meta App → ilgili **API Settings → Webhooks** (Instagram bölümü):
- **Callback URL:**
  ```
  https://www.ameritai.com/api/omni/channels/instagram/webhook
  ```
- **Verify Token:** `META_WEBHOOK_VERIFY_TOKEN` ile aynı → `ameritai-ab90be8baf929123d7e1caec`
- **Verify and Save** → yeşil onay.
- **Webhook fields:** `messages` (Instagram messaging) alanına abone ol.

> Hızlı kontrol (tarayıcı): `https://www.ameritai.com/api/omni/channels/instagram/webhook?hub.mode=subscribe&hub.verify_token=ameritai-ab90be8baf929123d7e1caec&hub.challenge=test123` → `test123` dönmeli.

---

## 3. AmeritAI Panelinden Bağla

AmeritAI → **Console → Integrations** (`ameritai.com/console/chatbot/integration`) → **Instagram** bölümü → **Connect**:
- Açılan Facebook penceresinde giriş yap.
- **Kampyerlerim** sayfasını ve ona bağlı **Instagram hesabını** seç.
- İzinleri onayla.
- Geri dönüşte sistem IG erişim token'ını saklar + webhook'a abone eder.

Panelde Instagram "Connected" görünmeli; "Check" ile uygunluğu doğrula.

---

## 4. Test

> Messenger'daki ile **aynı dev-mode kısıtı** geçerli: development modunda yalnızca app rolü (admin/developer/tester) olan hesaplar botla mesajlaşabilir. Ayrıca **kendi IG hesabından kendi işletme hesabına** mesaj atmak webhook'u tetiklemeyebilir — admin olmayan ayrı bir hesapla test et.

1. Admin olmayan bir Instagram hesabıyla, Kampyerlerim'in IG profiline git → **Message** → bir DM at.
2. Vercel → Logs (Live + `instagram` filtresi) → **`POST /api/omni/channels/instagram/webhook`** görünmeli.
3. Bot birkaç saniyede yanıtlamalı.

---

## 5. Canlıya Alma

Gerçek (app rolü olmayan) kullanıcılarla DM için:
- **App Review** → `instagram_manage_messages` (+ `instagram_basic`) için **Advanced Access**.
- **Business Verification** (kayıtlı şirket gerekir).
- App'i **Live** moduna al.

> Mesajlaşma penceresi: Instagram'da kullanıcı sana yazdıktan sonra standart yanıt penceresi vardır; asistan gelen DM'e
> yanıt verdiği için normal akış bu pencereye uyar.

---

## Özet Kontrol Listesi

- [ ] IG hesabı **Professional (Business)** + **Kampyerlerim sayfasına bağlı**
- [ ] IG'de "connected tools mesaj erişimi" açık
- [ ] İzinler eklendi: `instagram_basic`, `instagram_manage_messages`, `pages_show_list`, `pages_manage_metadata`
- [ ] Instagram webhook callback + verify token doğrulandı (yeşil)
- [ ] `messages` alanına abone olundu
- [ ] AmeritAI panelinden Connect ile IG hesabı bağlandı ("Connected")
- [ ] Admin olmayan bir hesapla DM testi → bot yanıtladı
- [ ] (Canlı için) App Review + Business Verification + Live mod
