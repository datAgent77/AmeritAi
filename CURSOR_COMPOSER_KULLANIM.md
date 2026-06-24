# Cursor Composer Kullanım Kılavuzu

## Cursor Composer Nasıl Açılır?

### Yöntem 1: Klavye Kısayolu
- **Mac**: `Cmd + I` (Command + I)
- **Windows/Linux**: `Ctrl + I`

### Yöntem 2: Menüden
- Cursor menü çubuğunda **"Composer"** sekmesine tıklayın
- Veya **View > Composer** menüsünden açın

### Yöntem 3: Command Palette
- `Cmd + Shift + P` (Mac) veya `Ctrl + Shift + P` (Windows/Linux)
- "Composer" yazın ve seçin

## Composer Arayüzü

Composer açıldığında şunları göreceksiniz:

1. **Chat Input Alanı**: Alt kısımda büyük bir metin kutusu
2. **MCP Tools İkonu**: Sağ üstte MCP araçlarının durumunu gösteren ikon
3. **Chat History**: Önceki konuşmalarınız

## TestSprite MCP ile Test Yapma

### Adım 1: Composer'ı Açın
`Cmd + I` (Mac) veya `Ctrl + I` (Windows/Linux) tuşlarına basın

### Adım 2: Test Komutu Yazın
Aşağıdaki komutlardan birini yazın:

**Basit Test:**
```
Test the landing page at http://localhost:3000 with TestSprite
```

**Detaylı Test:**
```
Test the AmeritAI landing page at http://localhost:3000. Check hero section, navigation menu, features grid, FAQ section, CTA buttons, and verify responsive design works on mobile and desktop.
```

**E2E Test:**
```
Run a complete end-to-end test of the landing page. Test user journey from hero section through all sections, verify language switching works, test all buttons and links.
```

### Adım 3: TestSprite Araçlarını Kullanın

Composer, TestSprite MCP araçlarını otomatik olarak önerecektir. Şunları görebilirsiniz:

- **Test Plan Oluşturma**: TestSprite otomatik test planı oluşturur
- **Test Çalıştırma**: Testleri otomatik çalıştırır
- **Hata Tespiti**: Bulunan hataları raporlar
- **Otomatik Düzeltmeler**: Öneriler sunar

### Adım 4: Test Sonuçlarını İnceleyin

TestSprite test sonuçlarını Composer içinde gösterecek:
- ✅ Başarılı testler
- ❌ Başarısız testler
- ⚠️ Uyarılar
- 📊 Test metrikleri

## Örnek Kullanım Senaryoları

### Senaryo 1: Landing Page Genel Testi

**Komut:**
```
Test the landing page at http://localhost:3000 with TestSprite. Verify all sections load correctly, buttons are clickable, and responsive design works.
```

**Ne Olur:**
1. TestSprite landing page'i analiz eder
2. Tüm bölümleri test eder
3. Butonları ve linkleri kontrol eder
4. Responsive tasarımı test eder
5. Sonuçları raporlar

### Senaryo 2: Hero Section Testi

**Komut:**
```
Test the hero section of the landing page. Check if rotating slogans work, CTA button is clickable, and hero background animation loads correctly.
```

**Ne Olur:**
1. Hero section'ı bulur
2. Rotating slogan animasyonunu test eder
3. CTA butonunun çalıştığını kontrol eder
4. Background animasyonunu test eder

### Senaryo 3: Navigation Testi

**Komut:**
```
Test the header navigation. Verify logo, menu items, language switcher (TR/EN), and sign-in buttons work correctly on both desktop and mobile views.
```

**Ne Olur:**
1. Header'ı bulur
2. Tüm navigation öğelerini test eder
3. Language switcher'ı test eder
4. Mobile ve desktop görünümlerini kontrol eder

### Senaryo 4: Responsive Design Testi

**Komut:**
```
Test landing page responsiveness. Check mobile (375px), tablet (768px), and desktop (1920px) viewports. Verify all content displays correctly at each breakpoint.
```

**Ne Olur:**
1. Farklı viewport boyutlarında test eder
2. Responsive breakpoint'leri kontrol eder
3. İçeriklerin düzgün göründüğünü doğrular

### Senaryo 5: Language Switching Testi

**Komut:**
```
Test language switching functionality. Switch between Turkish and English and verify all content updates correctly including hero text, features, FAQ, and CTA buttons.
```

**Ne Olur:**
1. Language switcher'ı bulur
2. TR ve EN arasında geçiş yapar
3. Tüm içeriklerin güncellendiğini kontrol eder

## TestSprite MCP Araçları

TestSprite MCP aktif olduğunda şu araçlar kullanılabilir:

1. **create_test_plan**: Test planı oluşturur
2. **run_tests**: Testleri çalıştırır
3. **analyze_page**: Sayfayı analiz eder
4. **check_accessibility**: Erişilebilirlik kontrolü yapar
5. **check_performance**: Performans testi yapar
6. **check_responsive**: Responsive tasarım kontrolü yapar

## İpuçları

### 1. Spesifik Olun
❌ Kötü: "Test the page"
✅ İyi: "Test the landing page hero section, verify CTA button works, and check responsive design on mobile"

### 2. URL Belirtin
Her zaman test edilecek URL'yi belirtin:
```
Test http://localhost:3000 with TestSprite
```

### 3. Test Edilecek Öğeleri Listeleyin
Hangi öğelerin test edileceğini belirtin:
```
Test hero section, navigation menu, features grid, FAQ section, and footer
```

### 4. Beklenen Sonuçları Belirtin
Ne kontrol edilmesi gerektiğini açıklayın:
```
Verify all buttons are clickable, links work correctly, and content displays properly
```

## Sorun Giderme

### TestSprite MCP Çalışmıyor

1. **Cursor'ı Yeniden Başlatın**
   - Cursor'ı tamamen kapatın
   - Tekrar açın
   - MCP sunucusu otomatik başlayacak

2. **MCP Yapılandırmasını Kontrol Edin**
   - `.cursor/mcp.json` dosyasının doğru olduğundan emin olun
   - API anahtarının doğru olduğunu kontrol edin

3. **Composer'ı Yeniden Açın**
   - Composer'ı kapatın (`Esc`)
   - Tekrar açın (`Cmd + I` veya `Ctrl + I`)

### TestSprite Araçları Görünmüyor

1. **MCP Sunucusunun Aktif Olduğunu Kontrol Edin**
   - Composer'da sağ üstte MCP ikonunu kontrol edin
   - Yeşil ise aktif, kırmızı ise sorun var

2. **API Anahtarını Kontrol Edin**
   - `.cursor/mcp.json` dosyasında API anahtarının doğru olduğundan emin olun
   - TestSprite hesabınızda API anahtarının aktif olduğunu kontrol edin

### Testler Çalışmıyor

1. **Uygulamanın Çalıştığını Kontrol Edin**
   ```bash
   curl http://localhost:3000
   ```

2. **Doğru URL'yi Kullandığınızdan Emin Olun**
   - Local: `http://localhost:3000`
   - Production: `https://www.getvion.com`

3. **TestSprite Loglarını Kontrol Edin**
   - Composer'da test sonuçlarını inceleyin
   - Hata mesajlarını okuyun

## Örnek Komutlar

### Hızlı Test
```
Test http://localhost:3000 with TestSprite
```

### Detaylı Test
```
Test the AmeritAI landing page at http://localhost:3000. Check:
- Hero section with rotating slogans
- Navigation menu with language switcher
- Features grid
- FAQ accordion
- CTA buttons
- Footer links
- Responsive design on mobile and desktop
- Page load performance
```

### Accessibility Test
```
Test landing page accessibility at http://localhost:3000. Check keyboard navigation, ARIA labels, alt texts, and color contrast.
```

### Performance Test
```
Test landing page performance at http://localhost:3000. Check page load time, image optimization, and lazy loading.
```

### E2E Test
```
Run end-to-end test of landing page. Test complete user journey from landing to signup, including all interactive elements.
```

## Sonuç

Cursor Composer ve TestSprite MCP ile:
- ✅ Otomatik test senaryoları oluşturabilirsiniz
- ✅ Web uygulamanızı test edebilirsiniz
- ✅ Hataları otomatik tespit edebilirsiniz
- ✅ Test sonuçlarını görebilirsiniz
- ✅ Otomatik düzeltme önerileri alabilirsiniz

**Başlamak için:** `Cmd + I` (Mac) veya `Ctrl + I` (Windows/Linux) tuşlarına basın ve test komutunuzu yazın!
