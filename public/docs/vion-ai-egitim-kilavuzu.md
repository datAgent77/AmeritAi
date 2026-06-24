# AmeritAI - Chatbot Eğitim Kılavuzu

Bu doküman, AmeritAI panelini kullanarak chatbot'unuzu nasıl eğiteceğinizi ve bilgi tabanını nasıl yöneteceğinizi adım adım açıklar.

## İçindekiler
1.  [Giriş](#giris)
2.  [Eğitim Yöntemleri](#egitim-yontemleri)
    *   [1. Web Sitesi (URL) ile Eğitim](#1-web-sitesi-url-ile-egitim)
    *   [2. Dosya Yükleme](#2-dosya-yukleme)
    *   [3. Metin Girişi](#3-metin-girisi)
3.  [Veri Yönetimi](#veri-yonetimi)
4.  [İpuçları ve En İyi Uygulamalar](#ipuclari-ve-en-iyi-uygulamalar)

---

## Giriş <a name="giris"></a>
AmeritAI, yüklediğiniz verileri okuyarak öğrenir ve ziyaretçilerinizin sorularına bu veriler ışığında yanıt verir. Ne kadar kaliteli ve kapsamlı veri eklerseniz, chatbot o kadar akıllı olur.

Yönetim panelinde sol menüden **Bilgi Tabanı (Knowledge Base)** sekmesine giderek eğitim işlemlerini başlatabilirsiniz.

---

## Eğitim Yöntemleri <a name="egitim-yontemleri"></a>

### 1. Web Sitesi (URL) ile Eğitim <a name="1-web-sitesi-url-ile-egitim"></a>
Web sitenizdeki içeriği chatbot'a öğretmenin en hızlı yoludur.

**Tek Sayfa Ekleme:**
1.  **URL** sekmesine tıklayın.
2.  İlgili sayfanın adresini (örn: `https://sirketiniz.com/hakkimizda`) yapıştırın.
3.  **Sayfayı Getir (Fetch Page)** butonuna basın.
4.  Sistem içeriği çekecektir. Gerekirse başlığı ve metni düzenleyip **Ekle** butonuna basarak kaydedin.

**Tüm Siteyi Tarama (Sitemap):**
1.  Ana sayfa adresinizi girin.
2.  **Siteyi Tara (Scan Site)** butonuna basın.
3.  Sistem sitenizdeki tüm linkleri bulup listeleyecektir.
4.  Eklemek istediğiniz sayfaları seçin (veya "Tümünü Seç" diyerek hepsini işaretleyin).
5.  **Seçilenleri İçe Aktar** butonuna basarak toplu eğitim başlatın.

> **Gelişmiş Özellik (CSS Selector):** Sadece belirli bir alanı (örneğin sadece blog yazısını, menüleri almadan) çekmek isterseniz "Gelişmiş Ayarlar"ı açıp CSS seçici girebilirsiniz (örn: `#main-content`, `.article-body`).

### 2. Dosya Yükleme <a name="2-dosya-yukleme"></a>
Elinizdeki hazır dökümanları sisteme yükleyebilirsiniz.

**Desteklenen Formatlar:** PDF, DOCX (Word), TXT, XLSX (Excel)
**Maksimum Boyut:** 10 MB

1.  **Dosya** sekmesine tıklayın.
2.  Yükleme alanına tıklayıp bilgisayarınızdan dosya seçin veya sürükleyip bırakın.
3.  **Bilgi Tabanına Ekle** butonuna basın.

> **Öneri:** PDF'lerinizde çok fazla tablo veya görsel varsa, bunları metne döküp TXT olarak yüklemek daha iyi sonuç verebilir.

### 3. Metin Girişi <a name="3-metin-girisi"></a>
Web sitesinde veya dosyalarda olmayan, ancak chatbot'un bilmesini istediğiniz kısa bilgileri (Sıkça Sorulan Sorular gibi) buraya ekleyebilirsiniz.

1.  **Metin** sekmesine tıklayın.
2.  **Başlık:** Konuyu özetleyen bir başlık girin (örn: "İade Politikası").
3.  **İçerik:** Detaylı cevabı yazın.
4.  **Ekle** butonuna basın.

---

## Veri Yönetimi <a name="veri-yonetimi"></a>
Eklediğiniz tüm veriler sayfaların alt kısmındaki listede görünür.

*   **Durum Kontrolü:** Verilerin durumu "İşleniyor" (Processing) veya "Hazır" (Indexed) olarak görünür. Sadece "Hazır" durumundaki veriler chatbot tarafından kullanılır.
*   **Silme:** Artık geçerli olmayan bilgileri çöp kutusu ikonuna basarak silebilirsiniz.
*   **Arama:** Listede başlığa göre arama yapabilirsiniz.

---

## İpuçları ve En İyi Uygulamalar <a name="ipuclari-ve-en-iyi-uygulamalar"></a>

1.  **Küçük Parçalar Halinde Ekleyin:** Tek, devasa bir dosya yerine konu konu ayrılmış (Fiyatlandırma, Hizmetler, İletişim vb.) küçük veriler yüklemek genellikle daha iyi sonuç verir.
2.  **Çelişkili Bilgiden Kaçının:** Eski fiyat listeniz ile yeni fiyat listeniz aynı anda sistemde olmamalıdır. Eski verileri mutlaka silin.
3.  **Test Edin:** Veri ekledikten sonra sağ alttaki chatbot penceresinden hemen soru sorarak öğrenip öğrenmediğini test edin.
4.  **Net Başlıklar Kullanın:** Metin eklerken "Belge 1" yerine "2024 Fiyat Listesi" gibi açıklayıcı başlıklar kullanın. Bu, daha sonra yönetim yapmanızı kolaylaştırır.
