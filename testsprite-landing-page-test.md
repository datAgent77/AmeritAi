# TestSprite Landing Page Test Plan

## Test URL
- **Local**: http://localhost:3000
- **Production**: https://www.getvion.com

## Test Senaryoları

### 1. Hero Section Test
- [ ] Hero başlığının görünür olduğunu kontrol et
- [ ] Rotating slogan'ların çalıştığını kontrol et
- [ ] "Start for Free" / "Ücretsiz Başlayın" butonunun görünür ve tıklanabilir olduğunu kontrol et
- [ ] Hero background animasyonunun çalıştığını kontrol et
- [ ] Responsive tasarımın mobil ve desktop'ta çalıştığını kontrol et

### 2. Header Navigation Test
- [ ] Logo'nun görünür olduğunu kontrol et
- [ ] Navigation menü öğelerinin görünür olduğunu kontrol et
- [ ] Language switcher'ın çalıştığını kontrol et (TR/EN)
- [ ] Mobile menu'nun açılıp kapandığını kontrol et
- [ ] "Sign In" ve "Get Started" butonlarının çalıştığını kontrol et

### 3. Sectors Grid Test
- [ ] Sektör kartlarının görünür olduğunu kontrol et
- [ ] Her sektör kartının tıklanabilir olduğunu kontrol et
- [ ] Sektör kartlarına tıklandığında doğru sayfaya yönlendirme yapıldığını kontrol et

### 4. How It Works Section Test
- [ ] "How It Works" başlığının görünür olduğunu kontrol et
- [ ] Adım adım açıklamaların görünür olduğunu kontrol et
- [ ] İkonların ve görsellerin yüklendiğini kontrol et

### 5. Modules Showcase Test
- [ ] Modül kartlarının görünür olduğunu kontrol et
- [ ] Her modülün açıklamasının görünür olduğunu kontrol et
- [ ] Modül kartlarına hover efekti çalıştığını kontrol et

### 6. Analytics Preview Test
- [ ] Analytics preview bölümünün görünür olduğunu kontrol et
- [ ] Grafiklerin ve metriklerin görünür olduğunu kontrol et
- [ ] Animasyonların çalıştığını kontrol et

### 7. Features Grid Test
- [ ] Özellik kartlarının görünür olduğunu kontrol et
- [ ] Her özelliğin başlık ve açıklamasının görünür olduğunu kontrol et
- [ ] Grid layout'un responsive olduğunu kontrol et

### 8. Integration Cloud Test
- [ ] Entegrasyon logolarının görünür olduğunu kontrol et
- [ ] Entegrasyon kartlarının hover efektinin çalıştığını kontrol et

### 9. FAQ Section Test
- [ ] FAQ başlığının görünür olduğunu kontrol et
- [ ] FAQ sorularının görünür olduğunu kontrol et
- [ ] FAQ sorularına tıklandığında açılıp kapandığını kontrol et
- [ ] Accordion animasyonunun çalıştığını kontrol et

### 10. CTA Section Test
- [ ] CTA başlığının görünür olduğunu kontrol et
- [ ] "Create Account" butonunun görünür ve tıklanabilir olduğunu kontrol et
- [ ] Butona tıklandığında signup sayfasına yönlendirme yapıldığını kontrol et

### 11. Footer Test
- [ ] Footer'ın görünür olduğunu kontrol et
- [ ] Footer linklerinin görünür ve tıklanabilir olduğunu kontrol et
- [ ] Social media linklerinin çalıştığını kontrol et

### 12. Language Switching Test
- [ ] TR diline geçildiğinde içeriklerin Türkçe olduğunu kontrol et
- [ ] EN diline geçildiğinde içeriklerin İngilizce olduğunu kontrol et
- [ ] Dil değişikliğinin tüm sayfada uygulandığını kontrol et

### 13. Performance Test
- [ ] Sayfa yükleme süresinin 3 saniyeden az olduğunu kontrol et
- [ ] Tüm görsellerin optimize edildiğini kontrol et
- [ ] Lazy loading'in çalıştığını kontrol et

### 14. Accessibility Test
- [ ] Tüm butonların keyboard ile erişilebilir olduğunu kontrol et
- [ ] Alt text'lerin görsellerde mevcut olduğunu kontrol et
- [ ] ARIA label'ların doğru kullanıldığını kontrol et
- [ ] Color contrast'ın WCAG standartlarına uygun olduğunu kontrol et

### 15. Cross-Browser Test
- [ ] Chrome'da çalıştığını kontrol et
- [ ] Firefox'ta çalıştığını kontrol et
- [ ] Safari'de çalıştığını kontrol et
- [ ] Edge'de çalıştığını kontrol et

### 16. Mobile Responsive Test
- [ ] iPhone (375px) görünümünü kontrol et
- [ ] iPad (768px) görünümünü kontrol et
- [ ] Desktop (1920px) görünümünü kontrol et
- [ ] Tüm breakpoint'lerde içeriklerin düzgün göründüğünü kontrol et

## TestSprite MCP Komutları

Cursor Composer'da kullanabileceğiniz komutlar:

1. **Genel Test:**
   ```
   Test the landing page at http://localhost:3000 with TestSprite. Check all sections including hero, features, FAQ, and CTA buttons.
   ```

2. **Hero Section Test:**
   ```
   Test the hero section of the landing page. Verify the rotating slogans work, CTA button is clickable, and hero background animation loads correctly.
   ```

3. **Navigation Test:**
   ```
   Test the header navigation. Check if logo, menu items, language switcher, and sign-in buttons work correctly on both desktop and mobile.
   ```

4. **Responsive Test:**
   ```
   Test the landing page responsiveness. Verify it works correctly on mobile (375px), tablet (768px), and desktop (1920px) viewports.
   ```

5. **Language Switching Test:**
   ```
   Test language switching functionality. Verify that switching between Turkish and English updates all content correctly.
   ```

6. **Performance Test:**
   ```
   Test landing page performance. Check page load time, image optimization, and lazy loading functionality.
   ```

7. **Accessibility Test:**
   ```
   Test landing page accessibility. Verify keyboard navigation, ARIA labels, alt texts, and color contrast meet WCAG standards.
   ```

8. **Complete E2E Test:**
   ```
   Run a complete end-to-end test of the landing page. Test user journey from landing page to signup, including all interactive elements and form submissions.
   ```

## Test Execution

TestSprite MCP ile test yapmak için:

1. Cursor Composer'ı açın (Cmd+I veya Ctrl+I)
2. Yukarıdaki komutlardan birini kullanın
3. TestSprite otomatik olarak test senaryolarını oluşturup çalıştıracak
4. Test sonuçları ve hatalar otomatik olarak raporlanacak

## Expected Results

- ✅ Tüm bölümler görünür ve çalışır durumda
- ✅ Tüm butonlar tıklanabilir ve doğru sayfalara yönlendiriyor
- ✅ Responsive tasarım tüm cihazlarda çalışıyor
- ✅ Dil değiştirme işlevi çalışıyor
- ✅ Sayfa yükleme süresi 3 saniyeden az
- ✅ Accessibility standartlarına uygun
- ✅ Cross-browser uyumluluğu sağlanmış
