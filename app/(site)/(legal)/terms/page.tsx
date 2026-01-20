import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Teslimat ve İade Şartları | Vion AI",
  description: "Vion AI hizmet teslimatı ve iade koşulları hakkında bilgi.",
}

export default function TermsPage() {
  return (
    <article className="prose prose-zinc dark:prose-invert prose-lg max-w-none">
      <h1>Teslimat ve İade Şartları</h1>
      <p className="text-muted-foreground">Son güncelleme: 19 Ocak 2025</p>
      
      <section className="mb-8">
        <h2>1. Hizmet Tanımı</h2>
        <p>
          Vion AI, Userex Design Studio tarafından sunulan bir SaaS (Hizmet Olarak Yazılım) platformudur.
          Platformumuz, işletmelere yapay zeka destekli chatbot çözümleri sunmaktadır.
        </p>
        <p>
          Bu sözleşme, dijital hizmet niteliğindeki abonelik tabanlı ürünlerimiz için geçerlidir.
        </p>
      </section>

      <section className="mb-8">
        <h2>2. Hizmet Teslimatı</h2>
        <h3>2.1 Teslimat Süresi</h3>
        <p>
          Dijital hizmetimiz, ödeme onayının ardından anında teslim edilir. Hesabınız oluşturulduktan 
          sonra platforma hemen erişim sağlayabilirsiniz.
        </p>
        
        <h3>2.2 Teslimat Yöntemi</h3>
        <ul>
          <li>Hizmet, internet üzerinden <a href="https://www.getvion.com">www.getvion.com</a> adresi üzerinden sunulmaktadır.</li>
          <li>Hesap bilgileriniz, kayıt sırasında belirttiğiniz e-posta adresine gönderilir.</li>
          <li>Platform erişimi 7/24 kesintisiz olarak sağlanmaktadır.</li>
        </ul>

        <h3>2.3 Erişim Gereksinimleri</h3>
        <p>
          Hizmeti kullanmak için güncel bir web tarayıcısı ve internet bağlantısı gerekmektedir.
          Desteklenen tarayıcılar: Chrome, Firefox, Safari, Edge.
        </p>
      </section>

      <section className="mb-8">
        <h2>3. Abonelik ve Ödeme</h2>
        <h3>3.1 Abonelik Dönemleri</h3>
        <ul>
          <li><strong>Aylık Abonelik:</strong> Her ay otomatik olarak yenilenir.</li>
          <li><strong>Yıllık Abonelik:</strong> Her yıl otomatik olarak yenilenir, indirimli fiyatlandırma sunar.</li>
        </ul>

        <h3>3.2 Ödeme Yöntemleri</h3>
        <p>Ödemeler iyzico güvenli ödeme altyapısı üzerinden gerçekleştirilmektedir.</p>
        <ul>
          <li>Kredi Kartı (Visa, MasterCard)</li>
          <li>Banka Kartı</li>
        </ul>

        <h3>3.3 Fiyatlandırma</h3>
        <p>
          Güncel fiyatlar <a href="https://www.getvion.com/pricing">www.getvion.com/pricing</a> adresinde yayınlanmaktadır. Fiyatlar KDV dahildir.
        </p>
      </section>

      <section className="mb-8">
        <h2>4. İptal ve İade Politikası</h2>
        
        <h3>4.1 Deneme Süresi</h3>
        <p>
          Tüm yeni kullanıcılarımıza ücretsiz deneme süresi sunulmaktadır. Deneme süresi içinde 
          iptal etmeniz halinde herhangi bir ücret yansıtılmaz.
        </p>

        <h3>4.2 Abonelik İptali</h3>
        <ul>
          <li>Aboneliğinizi istediğiniz zaman iptal edebilirsiniz.</li>
          <li>İptal, mevcut fatura döneminin sonunda geçerli olur.</li>
          <li>{`İptal işlemi için kontrol panelinizdeki "Ayarlar" bölümünü kullanabilirsiniz.`}</li>
        </ul>

        <h3>4.3 İade Koşulları</h3>
        <div className="not-prose bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-6 my-4">
          <p className="text-amber-800 dark:text-amber-200 font-medium mb-2">Önemli Bilgi</p>
          <p className="text-amber-700 dark:text-amber-100/80">
            Dijital hizmet niteliği gereği, hizmet aktivasyonundan sonra kısmi veya tam iade yapılmamaktadır.
            Ancak, teknik bir sorun nedeniyle hizmet kullanamaz durumda olmanız halinde destek ekibimizle 
            iletişime geçerek değerlendirme talep edebilirsiniz.
          </p>
        </div>

        <h3>4.4 Cayma Hakkı</h3>
        <p>
          {`6502 sayılı Tüketicinin Korunması Hakkında Kanun'un 48. maddesi ve Mesafeli Sözleşmeler 
          Yönetmeliği'nin 15. maddesinin (ğ) bendi uyarınca; elektronik ortamda anında ifa edilen 
          hizmetler ve tüketiciye anında teslim edilen gayri maddi mallara ilişkin cayma hakkı 
          kullanılamaz.`}
        </p>
      </section>

      <section className="mb-8">
        <h2>5. Hizmet Değişiklikleri</h2>
        <p>
          Abonelik dönemleri arasında plan değişikliği yapılabilir:
        </p>
        <ul>
          <li><strong>Yükseltme:</strong> Anında geçerli olur, fark ücretlendirilir.</li>
          <li><strong>Düşürme:</strong> Bir sonraki fatura döneminde geçerli olur.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>6. Hizmet Kullanılamaz Durumlar</h2>
        <p>
          Aşağıdaki durumlarda tarafımızca herhangi bir sorumluluk kabul edilmez:
        </p>
        <ul>
          <li>Kullanıcı kaynaklı teknik sorunlar</li>
          <li>İnternet bağlantı problemleri</li>
          <li>Mücbir sebepler (doğal afet, savaş, vb.)</li>
          <li>Planlı bakım çalışmaları (önceden bildirilir)</li>
        </ul>
      </section>
    </article>
  )
}
