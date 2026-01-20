import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Mesafeli Satış Sözleşmesi | Vion AI",
  description: "Vion AI mesafeli satış sözleşmesi - 6502 sayılı kanun uyumlu.",
}

export default function DistanceSalesPage() {
  return (
    <article className="prose prose-zinc dark:prose-invert prose-lg max-w-none">
      <h1>Mesafeli Satış Sözleşmesi</h1>
      <p className="text-muted-foreground">Son güncelleme: 19 Ocak 2025</p>
      
      <section className="mb-8">
        <h2>1. Taraflar</h2>
        
        <h3>1.1 Satıcı Bilgileri</h3>
        <div className="not-prose bg-muted/50 rounded-xl p-6 border border-border my-4">
          <dl className="grid gap-3">
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-muted-foreground">Unvan:</dt>
              <dd className="col-span-2 text-foreground">Userex Design Studio</dd>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-muted-foreground">Adres:</dt>
              <dd className="col-span-2 text-foreground">Caferağa Mh. Şifa Sk. No:19 Kadıköy / İstanbul</dd>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-muted-foreground">E-posta:</dt>
              <dd className="col-span-2 text-foreground">info@userex.com.tr</dd>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-muted-foreground">Web:</dt>
              <dd className="col-span-2 text-foreground">www.getvion.com</dd>
            </div>
          </dl>
        </div>

        <h3>1.2 Alıcı Bilgileri</h3>
        <p>
          Alıcı bilgileri, sipariş sürecinde alıcı tarafından sağlanan ve 
          üyelik formunda belirtilen bilgilerdir.
        </p>
      </section>

      <section className="mb-8">
        <h2>2. Sözleşmenin Konusu</h2>
        <p>
          {`Bu sözleşmenin konusu, ALICI'nın SATICI'ya ait www.getvion.com internet sitesinden 
          elektronik ortamda sipariş ettiği Vion AI SaaS hizmet aboneliğinin satışı ve 
          teslimi ile ilgili olarak 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve 
          Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak ve 
          yükümlülüklerinin belirlenmesidir.`}
        </p>
      </section>

      <section className="mb-8">
        <h2>3. Hizmet Bilgileri</h2>
        <div className="not-prose bg-muted/50 rounded-xl p-6 border border-border my-4">
          <dl className="grid gap-3">
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-muted-foreground">Hizmet Adı:</dt>
              <dd className="col-span-2 text-foreground">Vion AI - Yapay Zeka Destekli Müşteri Deneyimi Platformu</dd>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-muted-foreground">Hizmet Türü:</dt>
              <dd className="col-span-2 text-foreground">SaaS (Hizmet Olarak Yazılım) - Dijital Ürün</dd>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-muted-foreground">Teslimat:</dt>
              <dd className="col-span-2 text-foreground">Elektronik ortamda anında teslim</dd>
            </div>
          </dl>
        </div>
        <p>
          Hizmet detayları ve fiyatlandırma seçenekleri 
          <a href="https://www.getvion.com/pricing"> www.getvion.com/pricing </a> 
          adresinde güncel olarak yayınlanmaktadır.
        </p>
      </section>

      <section className="mb-8">
        <h2>4. Sözleşme Tarihi ve Teslimat</h2>
        <p>
          Sözleşme, ALICI tarafından elektronik ortamda onaylandığı tarihte kurulmuş sayılır.
        </p>
        <ul>
          <li>Hizmet, ödeme onayının ardından anında aktive edilir.</li>
          <li>Hesap erişim bilgileri kayıtlı e-posta adresine gönderilir.</li>
          <li>Platform erişimi 7/24 kesintisiz olarak sağlanır.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>5. Ödeme ve Fiyat</h2>
        <p>
          Tüm fiyatlar Türk Lirası (TL) cinsindendir ve KDV dahildir.
        </p>
        <ul>
          <li>Ödemeler iyzico güvenli ödeme altyapısı üzerinden gerçekleştirilir.</li>
          <li>Kredi kartı ve banka kartı ile ödeme kabul edilmektedir.</li>
          <li>Ödeme, sipariş onayı sırasında tahsil edilir.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>6. Cayma Hakkı</h2>
        <div className="not-prose bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-6 my-4">
          <p className="text-amber-800 dark:text-amber-200 font-medium mb-2">Yasal Bilgilendirme</p>
          <p className="text-amber-700 dark:text-amber-100/80">
            {`6502 sayılı Tüketicinin Korunması Hakkında Kanun'un 48. maddesi ve Mesafeli 
            Sözleşmeler Yönetmeliği'nin 15. maddesinin (ğ) bendi uyarınca; elektronik 
            ortamda anında ifa edilen hizmetler ve tüketiciye anında teslim edilen 
            gayri maddi mallara ilişkin sözleşmelerde cayma hakkı kullanılamaz.`}
          </p>
        </div>
        <p>
          Vion AI hizmeti, sipariş onayı ile birlikte anında aktive edilen dijital bir 
          hizmettir. Bu nedenle, hizmet aktivasyonundan sonra cayma hakkı bulunmamaktadır.
        </p>
        <p>
          Ancak, ücretsiz deneme süresi içinde aboneliğinizi iptal etmeniz halinde 
          herhangi bir ücret yansıtılmaz.
        </p>
      </section>

      <section className="mb-8">
        <h2>7. Genel Hükümler</h2>
        <ul>
          <li>ALICI, sipariş onayı öncesinde tüm hizmet bilgilerini, özelliklerini ve fiyatlarını incelediğini kabul eder.</li>
          <li>ALICI, işbu sözleşmede yer alan tüm şartları kabul etmiş sayılır.</li>
          <li>SATICI, hizmet kalitesini artırmak amacıyla özellik güncellemeleri yapma hakkını saklı tutar.</li>
          <li>Taraflar arasındaki uyuşmazlıklarda İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>8. ALICI Beyanı</h2>
        <p>
          ALICI; bu sözleşmeyi elektronik ortamda onaylayarak, hizmet özelliklerini, 
          ödeme koşullarını, teslimat şartlarını ve cayma hakkına ilişkin bilgilendirmeyi 
          okuduğunu, anladığını ve kabul ettiğini beyan eder.
        </p>
      </section>
    </article>
  )
}
