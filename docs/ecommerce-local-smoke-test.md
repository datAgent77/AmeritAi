# E-Commerce Local Smoke Test (TR)

Bu runbook, yerel e-ticaret platformlari icin hizli dogrulama adimlarini icerir.
Kapsam: `ikas`, `ideasoft`, `ticimax`, `tsoft`.

## 1. Hazirlik

- Uygulama calisiyor olmali: `http://localhost:3000`
- Firestore/Firebase Admin ayarlari aktif olmali.
- Production-benzeri test icin su env degeri tanimli olmali:
  - `TOKEN_CIPHER_KEY` (64 hex karakter)
- Test edilecek her platformda gecerli API bilgileri hazir olmali.

## 2. Kapsam Matrisi

| Platform | Connect | Manual Sync Products | Manual Sync Orders | Webhook Auto Register |
| --- | --- | --- | --- | --- |
| ikas | Evet | Evet (paged) | Evet (paged) | Evet |
| ideasoft | Evet | Evet (paged + incremental) | Evet (paged) | Evet |
| ticimax | Evet | Evet (paged) | Evet (paged) | Hayir (`webhookSupport: false`) |
| tsoft | Evet | Evet (paged) | Evet (paged) | Hayir (`webhookSupport: false`) |

Not: Incremental urun sync su an `shopify`, `ideasoft`, `woocommerce` icin acik.

## 3. Connect Smoke

Her platform icin Dashboard/Integration ekranindan baglanti kur:

- `ikas`: `storeUrl`, `apiKey`, `apiSecret`
- `ideasoft`: `storeUrl`, `accessToken`
- `ticimax`: `storeUrl`, `accessToken`
- `tsoft`: `storeUrl`, `apiKey`, `apiSecret`

Beklenen sonuc:

- Baglanti `active` olur.
- `ecommerce_connections` kaydinda `credentials` plaintext degil, encrypted tutulur.
- `storeName` ve `storeUrl` alanlari dolu gelir (platformun API cevabina gore).
- `webhookRegistered`:
  - `ikas` ve `ideasoft` icin en az bir webhook kaydi basariliysa `true`
  - `ticimax` ve `tsoft` icin `false`

## 4. Sync Smoke

`/api/ecommerce/sync` endpoint'i ile platform bazli sync tetikle:

Ornek body:

```json
{
  "chatbotId": "<CHATBOT_ID>",
  "platform": "ikas",
  "type": "all"
}
```

Beklenen sonuc:

- `success: true` veya kismi hata durumunda `errors` listesi doner.
- `syncedProducts` ve `syncedOrders` pozitif sayiya ulasir.
- `lastProductSyncAt` ve `lastOrderSyncAt` guncellenir.
- Cok sayfali cekimlerde limit dolarsa `warnings` doner.

Tekrar sync kontrolu:

- `ideasoft` icin ikinci kosuda urun sync daha az veri cekmeli (`updatedSince`).

## 5. Webhook Smoke

Webhook endpoint formati:

- `POST /api/ecommerce/webhook/{platform}?chatbotId=<CHATBOT_ID>`

Beklenen davranis:

- Gecerli payload ile `200` ve `{"received": true}`.
- `ecommerce_webhooks_log` kaydi olusur.
- Event normalize edilir (`product.created`, `order.updated` vb).
- Uygun eventlerde urun/siparis upsert denenir.

Platform notlari:

- `ikas`, `ideasoft`: Auto register akisi var.
- `ticimax`, `tsoft`: Auto register beklenmez, manuel webhook yoksa sadece manual sync ile veri guncellenir.

## 6. Hata Kontrol Listesi

- `401 Invalid signature`:
  - Shopify/WooCommerce secret uyumsuz olabilir.
- `404 Connection not found`:
  - `chatbotId` veya `platform` yanlis.
- `Service unavailable`:
  - Firebase Admin konfig eksik.
- `errors` dolu donuyor:
  - Platform API rate limit / alan map farklari incelenmeli.

## 7. Exit Criteria

Yerel platformlar icin smoke test tamamlandi sayilmasi icin:

- 4 platformda da `connect` basarili.
- 4 platformda da en az bir `products` ve bir `orders` sync basarili.
- `ikas` ve `ideasoft` icin webhook logunda en az bir basarili event goruluyor.
- Kritik hata yok (`500` veya surekli tekrar eden sync hatasi yok).
