# Messenger (Facebook) Entegrasyonu — Kurulum Rehberi

Bu rehber, AmeritAI'nin Facebook Messenger kanalını canlıya almak için gereken tüm adımları içerir.
Kod tarafı hazır ve denetlendi; burada yapılacaklar **Meta Developer yapılandırması + env değişkenleri + bağlama/test** adımlarıdır.

> Mimari özet: Tenant, panelden "Connect" der → Facebook OAuth → sayfa (Page) seçilir → uzun-ömürlü
> Page Access Token saklanır → sayfa webhook'a abone edilir → gelen mesajlar webhook'a düşer, asistan yanıtlar.

---

## 0. Ön Koşullar

- Bir **Facebook Sayfası** (işletme sayfası). Messenger yalnızca Sayfalar üzerinden çalışır; kişisel profil olmaz.
- Sayfada **yönetici (admin)** rolün olmalı.
- Uygulamanın canlı (production) URL'i. Örnek bu rehberde: `https://ameritai.com`
  (Yerel test için webhook'lar herkese açık bir HTTPS adresi gerektirir — localhost çalışmaz. `ngrok` veya Vercel preview kullan.)

---

## 1. Meta App Oluştur

1. https://developers.facebook.com/apps → **Create App**.
2. Use case / tip: **Business** (Other → Business da olur).
3. App'i oluşturduktan sonra **App ID** ve **App Secret** değerlerini not al
   (App Secret: Settings → Basic → "Show").
4. Sol menüden **Add Product** → **Messenger** ürününü ekle.

---

## 2. Env Değişkenleri

Aşağıdakileri hem yerelde (`.env.local`) hem de production'da (Vercel → Project → Settings → Environment Variables) ekle:

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `META_APP_ID` | Evet | Meta App ID |
| `META_APP_SECRET` | Evet | Meta App Secret (webhook imza doğrulaması + token değişimi için) |
| `META_WEBHOOK_VERIFY_TOKEN` | Evet | Kendi belirlediğin rastgele bir gizli dize. Dashboard'daki "Verify Token" ile **birebir aynı** olmalı. |
| `META_API_VERSION` | Hayır | Varsayılan `v23.0`. Genelde dokunma. |

> Not: Tenant'lar kendi Meta App bilgilerini panelden de girebilir (çoklu-müşteri senaryosu). O durumda
> bu env'ler "platform app" olarak yedek/varsayılan rolü görür. Tek işletme için bu env'leri doldurman yeterli.

Env değiştirince **dev sunucusunu yeniden başlat** (production'da redeploy).

---

## 3. OAuth Redirect URI

Facebook Login / OAuth'un dönebileceği adresi izinli listeye ekle:

1. App Dashboard → **Facebook Login** ürünü yoksa ekle (Messenger akışı için Login gerekir).
2. **Facebook Login → Settings → Valid OAuth Redirect URIs** alanına ekle:

   ```
   https://ameritai.com/api/integrations/messenger/callback
   ```

   (Yerel/preview test ediyorsan o adresi de ekle, örn. `https://<preview>.vercel.app/api/integrations/messenger/callback`)

3. **App Domains** (Settings → Basic) alanına: `ameritai.com`

---

## 4. Webhook Yapılandırması

1. App Dashboard → **Messenger → Settings** (veya Webhooks bölümü) → **Add Callback URL**.
2. Değerler:

   - **Callback URL:**
     ```
     https://ameritai.com/api/omni/channels/messenger/webhook
     ```
   - **Verify Token:** `.env`'deki `META_WEBHOOK_VERIFY_TOKEN` ile **aynı** dizeyi gir.

3. **Verify and Save** → Meta `GET` isteğiyle doğrular; token eşleşirse yeşil onay gelir.
4. **Webhook Fields** (abone olunacak alanlar): en az şunları işaretle:
   - `messages`
   - `messaging_postbacks`
   - (opsiyonel) `messaging_optins`, `message_deliveries`, `message_reads`

---

## 5. Sayfayı (Page) Uygulamaya Bağla

1. AmeritAI panelinde ilgili tenant için: **Integrations → Messenger → Connect**.
2. Açılan Facebook penceresinde:
   - Hesabınla giriş yap.
   - Bağlamak istediğin **Sayfayı** seç.
   - İstenen izinleri onayla.
3. Geri dönüşte sistem otomatik olarak:
   - Uzun-ömürlü Page Access Token'ı saklar (`omni_channel_configs`).
   - Sayfayı uygulamanın webhook'una **subscribe** eder.

İstenen izinler (scope): `pages_messaging`, `pages_manage_metadata`, `pages_show_list`, `business_management`.

---

## 6. Test

1. Bağlama tamamlandıktan sonra, **Sayfanın admini olan bir hesapla** Sayfaya Messenger'dan mesaj gönder.
   (App "Development" modundayken yalnızca app rolüne sahip kişiler — admin/developer/tester — mesajlaşabilir.)
2. Asistan birkaç saniye içinde yanıt vermeli.
3. Sorun olursa kontrol noktaları:
   - Webhook GET doğrulaması yeşil mi?
   - `messages` alanına abone olundu mu?
   - Sayfa app'e subscribe edildi mi? (panelde "Connected" görünmeli)
   - Sunucu logunda `api/omni/channels/messenger/webhook` çağrısı düşüyor mu?
   - `META_APP_SECRET` doğru mu? (yanlışsa imza doğrulaması 403 verir)

---

## 7. Canlıya Alma (App Review / Advanced Access)

Development modunda yalnızca app rollerindeki kişilerle mesajlaşılır. **Gerçek müşterilerle** mesajlaşmak için:

1. **Business Verification** (Meta Business hesabı doğrulaması) tamamla.
2. **App Review** ile şu izinler için **Advanced Access** al:
   - `pages_messaging`
   - `pages_manage_metadata`
   - (Instagram eklenince) `instagram_manage_messages`
3. App'i **Live** moduna al (Dashboard üst bardaki Development → Live anahtarı).

> Mesajlaşma politikası: Messenger'da kullanıcı sana mesaj attıktan sonra **24 saatlik** standart yanıt penceresi
> vardır. Bu pencere dışında yalnızca onaylı message tag'leri ile mesaj gönderilebilir. Asistan gelen mesaja
> yanıt verdiği (RESPONSE) için normal akışta bu pencere yeterlidir.

---

## 8. Sık Karşılaşılan Hatalar

| Belirti | Olası neden | Çözüm |
|---|---|---|
| Webhook "Verify Token mismatch" | Dashboard token ≠ env token | İkisini birebir aynı yap, redeploy |
| Webhook'a istek düşüyor ama 403 | `META_APP_SECRET` yanlış/eksik | Doğru App Secret'ı env'e gir |
| Bağlandı ama yanıt yok | Sayfa subscribe olmamış / `messages` alanı kapalı | Webhook fields'ta `messages` aç, yeniden Connect |
| Sadece admin'e cevap veriyor | App hâlâ Development modunda | App Review + Live mod |
| OAuth "redirect_uri" hatası | Redirect URI listeye eklenmemiş | Adım 3'teki callback URL'i ekle |

---

## Özet Kontrol Listesi

- [ ] Meta App oluşturuldu, Messenger ürünü eklendi
- [ ] `META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN` env'leri (yerel + Vercel)
- [ ] Valid OAuth Redirect URI eklendi
- [ ] Webhook Callback URL + Verify Token doğrulandı (yeşil)
- [ ] `messages` + `messaging_postbacks` alanlarına abone olundu
- [ ] Panelden Connect ile Sayfa bağlandı
- [ ] Admin hesabıyla test mesajı → asistan yanıtladı
- [ ] (Canlı için) Business Verification + App Review + Live mod
