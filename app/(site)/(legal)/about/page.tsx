"use client"

import { Sparkles, Users, Target, Zap, Shield, Globe } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border text-muted-foreground text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          Userex Design Studio Ürünü
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
          Vion AI
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          İşletmelerin müşterileriyle 7/24 akıllı etkileşim kurmasını sağlayan, 
          yapay zeka destekli müşteri deneyimi platformu.
        </p>
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { value: "7/24", label: "Kesintisiz Destek" },
          { value: "50+", label: "Sektöre Özel Çözüm" },
          { value: "%95", label: "Müşteri Memnuniyeti" },
          { value: "<3s", label: "Ortalama Yanıt Süresi" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-2xl p-6 text-center">
            <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Vision Section */}
      <section className="relative">
        <div className="bg-card border border-border rounded-3xl p-8 md:p-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Vizyonumuz</h2>
          <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
            <p>
              Vion AI, geleneksel chatbotların çok ötesinde bir platform olarak tasarlandı. Müşterilerinizin sorularını 
              yanıtlamakla kalmaz; işletmenizin satış, randevu ve lead toplama hedeflerini anlayarak bu hedeflere 
              ulaşmanız için proaktif olarak çalışır. Her müşteri etkileşimini, işletmeniz için bir fırsata dönüştürür.
            </p>
            <p>
              Platform, yapay zeka teknolojisinin gücünü kullanarak müşterilerinizin ihtiyaçlarını anlar, onlara 
              kişiselleştirilmiş öneriler sunar ve satın alma kararlarını kolaylaştırır. Ziyaretçileriniz sitenizi 
              gezinirken, Vion AI arka planda çalışarak en uygun anda devreye girer ve onları müşteriye dönüştürür.
            </p>
            <p>
              E-ticaret, emlak, turizm, SaaS, sağlık, eğitim... Hangi sektörde faaliyet gösterirseniz gösterin, 
              Vion AI işletmenizin dijital yüzü olarak 7/24 kesintisiz hizmet verir. Çoklu dil desteği sayesinde 
              global müşterilerinize ana dillerinde hitap eder, kültürel farklılıkları göz önünde bulundurarak 
              iletişim kurar.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="space-y-8">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center">Neden Vion AI?</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Target,
              title: "Hedef Odaklı Yaklaşım",
              description: "Vion AI, geleneksel chatbotlar gibi sadece soruları cevaplamakla kalmaz. İşletmenizin satış, randevu ve dönüşüm hedeflerini anlayarak bu hedeflere ulaşmanız için stratejik olarak çalışır. Her müşteri etkileşimini potansiyel bir satış fırsatına dönüştürür."
            },
            {
              icon: Zap,
              title: "Dakikalar İçinde Entegrasyon",
              description: "Web sitenize entegre etmek için teknik bilgiye ihtiyacınız yok. Sadece birkaç tıklama ile chatbot'unuzu aktive edin. Özel kodlama gerektirmeyen altyapımız sayesinde, işletmeniz dakikalar içinde yapay zeka destekli müşteri hizmetlerine kavuşur."
            },
            {
              icon: Users,
              title: "Akıllı Lead Toplama",
              description: "Potansiyel müşterilerinizin bilgilerini doğal konuşma akışı içinde toplar. İsim, e-posta, telefon gibi kritik bilgileri zorla form doldurmak yerine, sohbet ederken organik şekilde elde eder ve CRM sisteminize otomatik olarak aktarır."
            },
            {
              icon: Shield,
              title: "Kurumsal Düzeyde Güvenlik",
              description: "KVKK ve GDPR uyumlu altyapımız, müşteri verilerinizi en üst düzeyde korur. SSL şifreleme, güvenli veri depolama ve düzenli güvenlik denetimleri ile işletmenizin ve müşterilerinizin güvenliğini garanti altına alırız."
            },
            {
              icon: Globe,
              title: "50+ Dil Desteği",
              description: "Global pazarlara açılmak mı istiyorsunuz? Vion AI, 50'den fazla dilde akıcı iletişim kurabilir. Müşterileriniz hangi ülkeden olursa olsun, ana dillerinde hizmet alarak kendilerini evlerinde hissederler."
            },
            {
              icon: Sparkles,
              title: "Sürekli Öğrenen Yapay Zeka",
              description: "Vion AI, her müşteri etkileşiminden öğrenir ve zamanla daha akıllı hale gelir. Sektörünüze özgü terimleri, müşteri davranış kalıplarını ve en etkili satış tekniklerini analiz ederek sürekli kendini geliştirir."
            },
          ].map((feature) => (
            <div 
              key={feature.title} 
              className="group bg-card border border-border rounded-2xl p-6 hover:border-foreground/20 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4 group-hover:bg-muted/80 transition-colors">
                <feature.icon className="w-6 h-6 text-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-3">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Userex Section */}
      <section className="bg-muted/50 border border-border rounded-3xl p-8 md:p-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 bg-border" />
          <span className="text-muted-foreground text-sm uppercase tracking-wider">Arkamızdaki Güç</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">Userex Design Studio</h2>
        <div className="max-w-4xl mx-auto space-y-6 text-center">
          <p className="text-lg text-foreground leading-relaxed">
            Userex, dijital dünyada estetiği işlevsellikle birleştirmeyi hedefleyen bir tasarım ve yazılım stüdyosudur. 
            2018 yılından bu yana, yerli ve uluslararası markalar için kullanıcı odaklı dijital deneyimler tasarlıyoruz.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            "İşimizi seviyoruz, bu yüzden iyi yapıyoruz" mottosuyla yola çıktık. Arayüzde basit, içerikte derin, 
            çözümlerde net olmak ana prensibimiz. Marketplaces, e-ticaret platformları, SaaS ürünleri... Ne olursa olsun, 
            bizi ilgilendiren her zaman "kullanıcı"dır. Çünkü tasarımın merkezine insanı koyarsanız, teknoloji sadece 
            bir araç olur ve bu araç doğru yönde hareket eder.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            İyi iş, iyi niyetle başlar. Ve biz hem müşterilerimize hem de işimize duyduğumuz saygıyla, 
            güvenilirliğimizi her adımda aktarmak için çalışıyoruz. Vion AI, bu vizyonun en somut 
            ürünlerinden biri olarak işletmelerin dijital dönüşümüne katkı sağlamaktadır.
          </p>
          <a 
            href="https://www.userex.com.tr" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 text-foreground font-medium hover:underline transition-colors"
          >
            www.userex.com.tr
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </section>
    </div>
  )
}
