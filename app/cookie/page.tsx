import { BarChart3, Braces, FileText, Globe2, ShieldCheck } from "lucide-react"

const cookieSetupItems = [
    {
        title: "Domainler",
        description: "Müşteri sitelerini ekleyin, yayın durumunu ve allowlist ayarlarını yönetin.",
        icon: Globe2,
    },
    {
        title: "Banner ve Tercihler",
        description: "Zorunlu, analitik, pazarlama ve işlevsel kategoriler için görünümü yapılandırın.",
        icon: ShieldCheck,
    },
    {
        title: "Aydınlatma Metinleri",
        description: "Çerez politikası, metin sürümleri ve hash bazlı kanıt kayıtlarını hazırlayın.",
        icon: FileText,
    },
    {
        title: "Kurulum Kodu",
        description: "JS snippet, Google Consent Mode v2 ve GTM entegrasyonu için geliştirici çıktıları üretin.",
        icon: Braces,
    },
    {
        title: "Rıza Kayıtları",
        description: "Anonim consent id, kategori tercihleri, metin sürümü ve denetim exportlarını takip edin.",
        icon: BarChart3,
    },
]

export default function CookiePage() {
    return (
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6 lg:p-8">
            <div className="flex flex-col gap-2">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">CMP Workspace</div>
                <h1 className="text-3xl font-semibold tracking-tight">Çerez Yönetimi</h1>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                    Vion Cookie, tenant siteleri için çerez tercihleri, aydınlatma metinleri, consent kayıtları ve Google Consent Mode v2 kurulumunu ayrı bir ürün olarak yönetir.
                </p>
            </div>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {cookieSetupItems.map((item) => (
                    <article key={item.title} className="rounded-lg border bg-background p-5 shadow-sm">
                        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            <item.icon className="h-5 w-5" />
                        </div>
                        <h2 className="text-base font-semibold">{item.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                    </article>
                ))}
            </section>

            <section className="rounded-lg border bg-background p-6 shadow-sm">
                <h2 className="text-lg font-semibold">V1 kapsamı</h2>
                <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                    <div>Domain ekleme ve kurulum doğrulama</div>
                    <div>Consent log, export ve raporlama</div>
                    <div>Banner tasarımı ve kategori tercihleri</div>
                    <div>Google Consent Mode v2 ve GTM sinyalleri</div>
                    <div>Çerez aydınlatma metni ve sürümleme</div>
                    <div>IAB TCF 2.2 için genişletilebilir altyapı</div>
                </div>
            </section>
        </main>
    )
}
