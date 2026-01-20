import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Gizlilik Sözleşmesi | Vion AI",
  description: "Vion AI gizlilik politikası ve kişisel verilerin korunması hakkında bilgi.",
}

export default function PrivacyPage() {
  return (
    <article className="prose prose-zinc dark:prose-invert prose-lg max-w-none">
      <h1>Gizlilik Sözleşmesi</h1>
      <p className="text-muted-foreground">Son güncelleme: 19 Ocak 2025</p>
      
      <section className="mb-8">
        <h2>1. Giriş</h2>
        <p>
          {`Bu Gizlilik Sözleşmesi, Userex Design Studio ("Şirket", "biz", "bizim") tarafından işletilen 
          Vion AI platformu ("Hizmet") kullanıcılarının kişisel verilerinin nasıl toplandığını, 
          kullanıldığını ve korunduğunu açıklamaktadır.`}
        </p>
        <p>
          {`Hizmetimizi kullanarak, bu Gizlilik Sözleşmesi'nde belirtilen uygulamaları kabul etmiş olursunuz.`}
        </p>
      </section>

      <section className="mb-8">
        <h2>2. Toplanan Veriler</h2>
        <h3>2.1 Hesap Bilgileri</h3>
        <ul>
          <li>Ad ve soyad</li>
          <li>E-posta adresi</li>
          <li>Şirket/işletme adı</li>
          <li>Telefon numarası (opsiyonel)</li>
        </ul>
        
        <h3>2.2 Kullanım Verileri</h3>
        <ul>
          <li>Oturum bilgileri</li>
          <li>Platform kullanım istatistikleri</li>
          <li>Chatbot etkileşim verileri</li>
          <li>IP adresi ve tarayıcı bilgileri</li>
        </ul>

        <h3>2.3 Ödeme Bilgileri</h3>
        <p>
          Ödeme işlemleri iyzico altyapısı üzerinden gerçekleştirilmektedir. Kredi kartı bilgileriniz 
          yalnızca iyzico tarafından işlenmekte olup, tarafımızca saklanmamaktadır.
        </p>
      </section>

      <section className="mb-8">
        <h2>3. Verilerin Kullanım Amaçları</h2>
        <p>Topladığımız verileri aşağıdaki amaçlarla kullanmaktayız:</p>
        <ul>
          <li>Hizmetimizi sunmak ve yönetmek</li>
          <li>Hesabınızı oluşturmak ve yönetmek</li>
          <li>Müşteri desteği sağlamak</li>
          <li>Hizmet güncellemeleri ve bilgilendirmeler göndermek</li>
          <li>Platformumuzu geliştirmek ve optimize etmek</li>
          <li>Yasal yükümlülüklerimizi yerine getirmek</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>4. Veri Güvenliği</h2>
        <p>
          Verilerinizin güvenliğini sağlamak için endüstri standardı güvenlik önlemleri uyguluyoruz:
        </p>
        <ul>
          <li>SSL/TLS şifreleme</li>
          <li>Güvenli sunucu altyapısı</li>
          <li>Düzenli güvenlik denetimleri</li>
          <li>Erişim kontrolü ve yetkilendirme</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>5. Çerezler (Cookies)</h2>
        <p>
          Platformumuz, kullanıcı deneyimini geliştirmek için çerezler kullanmaktadır. 
          Çerezler, oturum yönetimi, tercih kaydetme ve analitik amaçlarla kullanılır.
        </p>
        <p>
          Tarayıcı ayarlarınızdan çerezleri devre dışı bırakabilirsiniz, ancak bu durumda 
          bazı özellikler düzgün çalışmayabilir.
        </p>
      </section>

      <section className="mb-8">
        <h2>6. Üçüncü Taraf Hizmetler</h2>
        <p>Aşağıdaki üçüncü taraf hizmetlerle çalışmaktayız:</p>
        <ul>
          <li><strong>iyzico:</strong> Ödeme işlemleri</li>
          <li><strong>Firebase/Google Cloud:</strong> Veri depolama ve kimlik doğrulama</li>
          <li><strong>OpenAI:</strong> Yapay zeka hizmetleri</li>
        </ul>
        <p>
          Bu hizmet sağlayıcıların kendi gizlilik politikaları bulunmaktadır ve 
          verileriniz ilgili hizmet koşullarına tabi olacaktır.
        </p>
      </section>

      <section className="mb-8">
        <h2>7. KVKK Kapsamındaki Haklarınız</h2>
        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında aşağıdaki haklara sahipsiniz:
        </p>
        <ul>
          <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
          <li>İşlenmişse buna ilişkin bilgi talep etme</li>
          <li>İşlenme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme</li>
          <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme</li>
          <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
          <li>Silinmesini veya yok edilmesini isteme</li>
          <li>İşlenen verilerin münhasıran otomatik sistemler aracılığıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>8. Değişiklikler</h2>
        <p>
          Bu Gizlilik Sözleşmesi'ni zaman zaman güncelleyebiliriz. Önemli değişiklikler 
          olması durumunda kayıtlı e-posta adresinize bildirim göndereceğiz.
        </p>
      </section>
    </article>
  )
}
