# Gerçek İnsan Resimlerinin Kullanım Planı

## 🎯 Önerilen Kullanım Alanları

### 1. **Hero Section** ⭐ (Yüksek Öncelik)
**Konum:** `app/page.tsx` - Hero section
**Kullanım:**
- Sağ tarafta veya arka planda profesyonel insan resmi
- Split layout: Sol tarafta text, sağ tarafta resim
- Veya arka planda blur efekti ile

**Örnek:**
```
[Text Content] | [Professional Business Person Image]
```

**Faydalar:**
- İlk izlenimde güven oluşturur
- Profesyonel görünüm
- İnsan odaklı mesaj verir

---

### 2. **Testimonials/Reviews Bölümü** ⭐⭐⭐ (Çok Öncelikli)
**Konum:** Yeni component - `components/landing/testimonials.tsx`
**Kullanım:**
- Müşteri yorumları ile birlikte gerçek müşteri fotoğrafları
- 3-4 testimonial kartı
- Her kartta: Fotoğraf, isim, şirket, yorum

**Örnek Layout:**
```
[Customer Photo] | "AmeritAI sayesinde satışlarımız %40 arttı" - Ahmet Yılmaz, CEO
```

**Faydalar:**
- Sosyal kanıt (social proof)
- Güvenilirlik
- Gerçek kullanıcı deneyimleri

---

### 3. **Features Grid** ⭐⭐
**Konum:** `components/landing/features-grid.tsx`
**Kullanım:**
- Her feature'ın yanında veya altında ilgili insan resmi
- Örnek: "Çok Dilli Destek" → Farklı milletlerden insanlar
- Örnek: "7/24 Destek" → Gece/gündüz çalışan ekip

**Faydalar:**
- Feature'ları daha anlaşılır hale getirir
- Duygusal bağlantı kurar

---

### 4. **CTA Section** ⭐⭐
**Konum:** `components/landing/cta-section.tsx`
**Kullanım:**
- Split layout: Sol tarafta text + CTA, sağ tarafta mutlu müşteri/ekip resmi
- Veya arka planda subtle olarak

**Faydalar:**
- Dönüşüm oranını artırır
- İnsan odaklı mesaj

---

### 5. **How It Works** ⭐
**Konum:** `components/landing/how-it-works.tsx`
**Kullanım:**
- Her adımda ilgili insan resmi (opsiyonel)
- Örnek: "Eğit" adımında → Doküman yükleyen kişi
- Örnek: "Başlat" adımında → Başarılı işletme sahibi

**Faydalar:**
- Süreci daha somut hale getirir
- Kullanıcı odaklı görünüm

---

### 6. **Customer Success Stories** ⭐⭐⭐ (Yeni Bölüm)
**Konum:** Yeni component - `components/landing/success-stories.tsx`
**Kullanım:**
- Başarı hikayeleri ile birlikte gerçek müşteri fotoğrafları
- Before/After metrikleri
- Müşteri isimleri ve şirketleri

**Örnek:**
```
[Customer Photo]
"AmeritAI ile 3 ayda %60 daha fazla lead topladık"
- Mehmet Demir, Marketing Director, TechCorp
```

**Faydalar:**
- Güçlü sosyal kanıt
- ROI gösterimi
- Gerçek sonuçlar

---

### 7. **About/Team Section** (Eğer varsa)
**Konum:** Yeni sayfa veya mevcut sayfa
**Kullanım:**
- Ekip üyelerinin fotoğrafları
- Kurucular, geliştiriciler, destek ekibi

---

## 📋 Öncelik Sırası

1. **Testimonials Bölümü** - En yüksek etki
2. **Hero Section** - İlk izlenim
3. **Customer Success Stories** - Güvenilirlik
4. **CTA Section** - Dönüşüm
5. **Features Grid** - Görsel destek
6. **How It Works** - Opsiyonel

---

## 🎨 Tasarım Prensipleri

### Siyah-Beyaz Konsept ile Uyum:
- **Siyah-beyaz fotoğraflar** veya **desaturated** (soluk renkli)
- **High contrast** görseller
- **Minimal overlay** efektleri
- **Gradient masks** ile entegrasyon

### Fotoğraf Stili:
- **Profesyonel** iş ortamı fotoğrafları
- **Diverse** (çeşitli) insanlar
- **Natural lighting**
- **Business casual** veya **professional** kıyafetler

---

## 🛠️ Implementasyon Önerileri

### 1. Testimonials Component Oluştur
```tsx
// components/landing/testimonials.tsx
- 3-4 testimonial kartı
- Her birinde fotoğraf, isim, şirket, yorum
- Siyah-beyaz minimal tasarım
```

### 2. Hero Section'a Split Layout
```tsx
// app/page.tsx hero section'ı güncelle
- Grid layout: 2 kolon
- Sol: Text content
- Sağ: Professional image
```

### 3. Success Stories Component
```tsx
// components/landing/success-stories.tsx
- Customer photos
- Metrics (before/after)
- Company logos
```

---

## 📸 Fotoğraf Kaynakları

### Ücretsiz:
- **Unsplash** - https://unsplash.com (Business, People)
- **Pexels** - https://pexels.com (Professional photos)
- **Pixabay** - https://pixabay.com

### Premium:
- **Getty Images** - https://gettyimages.com
- **Shutterstock** - https://shutterstock.com
- **Adobe Stock** - https://stock.adobe.com

### Arama Terimleri:
- "professional business person"
- "diverse team working"
- "customer service representative"
- "business meeting"
- "entrepreneur"
- "tech professional"

---

## ✅ Sonraki Adımlar

1. Hangi bölümlerden başlamak istersiniz?
2. Fotoğrafları nereden temin edeceğiz? (Unsplash/Pexels/Özel çekim)
3. Hangi bölümü önce implement edelim?
