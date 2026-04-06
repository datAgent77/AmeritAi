"use client"

import Link from "next/link"
import { useLanguage } from "@/context/LanguageContext"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { Button } from "@/components/ui/button"
import {
    ArrowRight,
    CheckCircle2,
    TrendingUp,
    Users,
    Wrench,
    BadgePercent,
    Crown,
    Globe,
    ShieldCheck,
    Zap,
    Building2,
    DollarSign,
    Star
} from "lucide-react"

const content = {
    tr: {
        badge: "Partner Programı",
        hero_title: "Vion ile Büyü, Birlikte Kazan",
        hero_desc: "Müşterilerinize yapay zeka destekli satış ve iletişim çözümleri sunun. Aylık yinelenen komisyon kazanın, markanızı güçlendirin.",
        cta_apply: "Partner Başvurusu Yap",
        cta_contact: "Bize Ulaşın",
        why_title: "Neden Vion Partner'ı Olmalısınız?",
        why_items: [
            { icon: DollarSign, title: "%25'e Kadar Yinelenen Komisyon", desc: "Getirdiğiniz müşteri aktif olduğu sürece her ay komisyon kazanırsınız. Tek seferlik değil, sürdürülebilir gelir." },
            { icon: Crown, title: "Müşteri Sahipliği", desc: "Getirdiğiniz müşteri sizindir. 12 ay boyunca başka partner veya Vion direkt satış ekibi müdahale edemez." },
            { icon: Globe, title: "Beyaz Etiket Seçeneği", desc: "Solution Partner olarak Vion'u kendi markanızla sunabilirsiniz. Müşteri sizin markanızla tanışır." },
            { icon: ShieldCheck, title: "Teknik Destek & Eğitim", desc: "Satış öncesi ve sonrası teknik destek, demo hesabı, eğitim materyalleri ve co-branded dokümanlar." },
        ],
        tiers_title: "Partner Seviyeleri",
        tiers_desc: "Katılım seviyenize göre farklı avantajlar ve komisyon oranları sunuluyor.",
        tiers: [
            {
                icon: Star,
                name: "Referans Partner",
                color: "border-slate-400/30 bg-slate-500/5",
                badge_color: "bg-slate-500/10 text-slate-400",
                commission: "%15",
                commission_label: "İlk yıl, tek seferlik",
                for_whom: "Freelancer, içerik üretici, topluluk yöneticisi, sektör blogu",
                how: "Referral linkinizle müşteri yönlendirirsiniz. Satış Vion tarafından yapılır.",
                features: [
                    "Kişisel referral linki",
                    "Ödeme takip paneli",
                    "Destek materyalleri",
                ],
                limit: "Fiyat belirleme yetkisi yoktur."
            },
            {
                icon: TrendingUp,
                name: "Satış Partneri",
                color: "border-blue-400/30 bg-blue-500/5",
                badge_color: "bg-blue-500/10 text-blue-400",
                commission: "%25",
                commission_label: "Yıllık sözleşmede, yinelenen",
                for_whom: "Dijital ajanslar, yazılım bayileri, teknoloji danışmanları",
                how: "Teklif sunup anlaşmayı kapatırsınız. Satış süreci sizin kontrolünüzde.",
                features: [
                    "Partner portalı erişimi",
                    "Teklif şablonları",
                    "Demo hesabı",
                    "Co-branded materyaller",
                    "12 ay müşteri sahipliği",
                ],
                limit: "Resmi liste fiyatının altına inemezsiniz."
            },
            {
                icon: Wrench,
                name: "Çözüm Partneri",
                color: "border-purple-400/30 bg-purple-500/5",
                badge_color: "bg-purple-500/10 text-purple-400",
                commission: "%30",
                commission_label: "Lisans marjı + sınırsız hizmet geliri",
                for_whom: "Dijital dönüşüm şirketleri, sistem entegratörleri, danışmanlık firmaları",
                how: "Kurulum, entegrasyon ve optimizasyon yaparsınız. Enterprise anlaşmalarını Vion ile birlikte satarsınız.",
                features: [
                    "Tam API erişimi",
                    "Sandbox ortamı",
                    "Teknik destek önceliği",
                    "Beyaz etiket erişimi",
                    "Enterprise co-sell yetkisi",
                    "Eğitim & sertifikasyon",
                ],
                limit: null
            },
        ],
        commission_title: "Komisyon Yapısı",
        commission_desc: "Hangi plan satarsanız kazancınız değişir. Partnerlerimizi Pro ve Enterprise'a yönlendiriyoruz.",
        commission_table: [
            { plan: "Starter", rate: "%5", note: "Yalnızca Referans Partner" },
            { plan: "Growth", rate: "%15", note: "Tüm partner seviyeleri" },
            { plan: "Pro", rate: "%25", note: "Tüm partner seviyeleri" },
            { plan: "Enterprise", rate: "%30 + hizmet geliri", note: "Sınırsız potansiyel" },
        ],
        rules_title: "Partner Kuralları",
        rules: [
            "Partnerler resmi liste fiyatının altına inemez. İndirim yetkisi Vion'a aittir.",
            "Bir müşteri getirdiyseniz ve kullanıcı 30 gün içinde direkt satın aldıysa, komisyon size aittir.",
            "İki partner aynı müşteriyi getirirse, ilk kayıt eden komisyon alır (first-touch kuralı).",
            "Enterprise co-sell anlaşmazlıklarında Vion hakemlik yapar, Çözüm Partneri önceliklendirilir.",
            "Partner anlaşması ihlali durumunda komisyon ve anlaşma iptali uygulanır.",
        ],
        faq_title: "Sıkça Sorulan Sorular",
        faqs: [
            { q: "Başvurmak için ödeme yapmam gerekiyor mu?", a: "Hayır. Partner programına katılım tamamen ücretsizdir." },
            { q: "Komisyon ne zaman ödenir?", a: "Müşteri ödeme yaptıktan sonraki 30 gün içinde ödeme yapılır." },
            { q: "Müşteri planını değiştirirse ne olur?", a: "Komisyon oranı güncel plana göre yeniden hesaplanır." },
            { q: "Beyaz etiket için ek ücret var mı?", a: "Beyaz etiket yalnızca Çözüm Partneri seviyesinde mevcuttur. Kurulum ücreti hakkında ekibimizle görüşebilirsiniz." },
        ],
        cta_title: "Hemen Başvurun",
        cta_desc: "Ekibimizle 30 dakikalık ücretsiz bir görüşme ayarlayın ve hangi partner seviyesinin size uygun olduğunu birlikte belirleyelim.",
    },
    en: {
        badge: "Partner Program",
        hero_title: "Grow with Vion, Earn Together",
        hero_desc: "Offer AI-powered sales and communication solutions to your customers. Earn monthly recurring commissions and strengthen your brand.",
        cta_apply: "Apply to Partner Program",
        cta_contact: "Contact Us",
        why_title: "Why Become a Vion Partner?",
        why_items: [
            { icon: DollarSign, title: "Up to 25% Recurring Commission", desc: "Earn commission every month as long as your referred customer stays active. Sustainable, not one-time income." },
            { icon: Crown, title: "Customer Ownership", desc: "The customer you bring is yours. No other partner or Vion direct sales team can interfere for 12 months." },
            { icon: Globe, title: "White Label Option", desc: "As a Solution Partner, you can present Vion under your own brand. The customer meets your brand first." },
            { icon: ShieldCheck, title: "Technical Support & Training", desc: "Pre- and post-sales technical support, demo account, training materials, and co-branded documents." },
        ],
        tiers_title: "Partner Tiers",
        tiers_desc: "Different benefits and commission rates depending on your level of involvement.",
        tiers: [
            {
                icon: Star,
                name: "Referral Partner",
                color: "border-slate-400/30 bg-slate-500/5",
                badge_color: "bg-slate-500/10 text-slate-400",
                commission: "15%",
                commission_label: "First year, one-time",
                for_whom: "Freelancers, content creators, community managers, industry blogs",
                how: "You refer customers via your referral link. Vion closes the sale.",
                features: [
                    "Personal referral link",
                    "Payment tracking dashboard",
                    "Support materials",
                ],
                limit: "No pricing authority."
            },
            {
                icon: TrendingUp,
                name: "Sales Partner",
                color: "border-blue-400/30 bg-blue-500/5",
                badge_color: "bg-blue-500/10 text-blue-400",
                commission: "25%",
                commission_label: "Annual contract, recurring",
                for_whom: "Digital agencies, software resellers, technology consultants",
                how: "You present proposals and close deals. You control the sales process.",
                features: [
                    "Partner portal access",
                    "Proposal templates",
                    "Demo account",
                    "Co-branded materials",
                    "12-month customer ownership",
                ],
                limit: "Cannot go below official list price."
            },
            {
                icon: Wrench,
                name: "Solution Partner",
                color: "border-purple-400/30 bg-purple-500/5",
                badge_color: "bg-purple-500/10 text-purple-400",
                commission: "30%",
                commission_label: "License margin + unlimited service revenue",
                for_whom: "Digital transformation companies, system integrators, consulting firms",
                how: "You handle setup, integration, and optimization. You co-sell Enterprise deals with Vion.",
                features: [
                    "Full API access",
                    "Sandbox environment",
                    "Priority technical support",
                    "White label access",
                    "Enterprise co-sell authority",
                    "Training & certification",
                ],
                limit: null
            },
        ],
        commission_title: "Commission Structure",
        commission_desc: "Your earnings vary by plan sold. We guide our partners toward Pro and Enterprise.",
        commission_table: [
            { plan: "Starter", rate: "5%", note: "Referral Partner only" },
            { plan: "Growth", rate: "15%", note: "All partner tiers" },
            { plan: "Pro", rate: "25%", note: "All partner tiers" },
            { plan: "Enterprise", rate: "30% + service revenue", note: "Unlimited potential" },
        ],
        rules_title: "Partner Rules",
        rules: [
            "Partners cannot go below official list price. Discount authority belongs to Vion.",
            "If you refer a customer and they purchase directly within 30 days, commission is yours.",
            "If two partners refer the same customer, the first to register earns the commission (first-touch rule).",
            "In co-sell disputes, Vion mediates and Solution Partner is prioritized.",
            "Violation of partner agreement results in immediate commission and agreement cancellation.",
        ],
        faq_title: "Frequently Asked Questions",
        faqs: [
            { q: "Do I need to pay to apply?", a: "No. Joining the partner program is completely free." },
            { q: "When are commissions paid?", a: "Within 30 days after the customer makes a payment." },
            { q: "What happens if the customer changes plans?", a: "Commission rate is recalculated based on the current plan." },
            { q: "Is there an extra fee for white label?", a: "White label is available only at the Solution Partner level. Contact our team for setup pricing." },
        ],
        cta_title: "Apply Now",
        cta_desc: "Schedule a free 30-minute call with our team to determine which partner tier suits you best.",
    }
}

export default function PartnerPage() {
    const { language } = useLanguage()
    const lang = language === 'tr' ? 'tr' : 'en'
    const c = content[lang]

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <PublicHeader transparent={false} />

            {/* Hero */}
            <section className="pt-32 pb-20 px-4">
                <div className="container mx-auto max-w-4xl text-center space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-medium text-purple-400">
                        <Users className="w-3.5 h-3.5" />
                        {c.badge}
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{c.hero_title}</h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">{c.hero_desc}</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link href="/contact">
                            <Button size="lg" className="h-12 px-8 rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium">
                                {c.cta_apply} <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </Link>
                        <Link href="/contact">
                            <Button size="lg" variant="outline" className="h-12 px-8 rounded-full">
                                {c.cta_contact}
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Why Partner */}
            <section className="py-16 px-4 border-t border-border">
                <div className="container mx-auto max-w-5xl">
                    <h2 className="text-3xl font-bold text-center mb-12">{c.why_title}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {c.why_items.map((item, i) => (
                            <div key={i} className="flex gap-4 p-6 rounded-2xl border border-border bg-muted/30">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                                    <item.icon className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <div className="font-semibold mb-1">{item.title}</div>
                                    <div className="text-sm text-muted-foreground leading-relaxed">{item.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Tiers */}
            <section className="py-16 px-4 border-t border-border">
                <div className="container mx-auto max-w-5xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-3">{c.tiers_title}</h2>
                        <p className="text-muted-foreground">{c.tiers_desc}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {c.tiers.map((tier, i) => (
                            <div key={i} className={`rounded-2xl border p-6 flex flex-col gap-4 ${tier.color}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tier.badge_color}`}>
                                        {tier.name}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-2xl font-bold">{tier.commission}</div>
                                    <div className="text-xs text-muted-foreground">{tier.commission_label}</div>
                                </div>

                                <div className="text-xs text-muted-foreground border-t border-border pt-3">
                                    <span className="font-medium text-foreground">{lang === 'tr' ? 'Kimler için:' : 'For:'}</span><br />
                                    {tier.for_whom}
                                </div>

                                <div className="text-xs text-muted-foreground border-t border-border pt-3">
                                    <span className="font-medium text-foreground">{lang === 'tr' ? 'Nasıl çalışır:' : 'How it works:'}</span><br />
                                    {tier.how}
                                </div>

                                <ul className="space-y-1.5 border-t border-border pt-3">
                                    {tier.features.map((f, fi) => (
                                        <li key={fi} className="flex items-center gap-2 text-sm">
                                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>

                                {tier.limit && (
                                    <div className="text-xs text-amber-500 border-t border-border pt-3">
                                        ⚠️ {tier.limit}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Commission Table */}
            <section className="py-16 px-4 border-t border-border bg-muted/20">
                <div className="container mx-auto max-w-3xl">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold mb-3">{c.commission_title}</h2>
                        <p className="text-muted-foreground">{c.commission_desc}</p>
                    </div>
                    <div className="rounded-2xl border border-border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/40">
                                    <th className="text-left px-5 py-3 font-semibold text-foreground">Plan</th>
                                    <th className="text-left px-5 py-3 font-semibold text-foreground">{lang === 'tr' ? 'Komisyon' : 'Commission'}</th>
                                    <th className="text-left px-5 py-3 font-semibold text-foreground">{lang === 'tr' ? 'Not' : 'Note'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {c.commission_table.map((row, i) => (
                                    <tr key={i} className={`border-b border-border last:border-0 ${row.plan === 'Enterprise' ? 'bg-purple-500/5' : ''}`}>
                                        <td className="px-5 py-4 font-medium">{row.plan}</td>
                                        <td className="px-5 py-4 font-bold text-green-500">{row.rate}</td>
                                        <td className="px-5 py-4 text-muted-foreground">{row.note}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Rules */}
            <section className="py-16 px-4 border-t border-border">
                <div className="container mx-auto max-w-3xl">
                    <h2 className="text-3xl font-bold mb-8">{c.rules_title}</h2>
                    <ul className="space-y-3">
                        {c.rules.map((rule, i) => (
                            <li key={i} className="flex items-start gap-3 p-4 rounded-xl border border-border bg-muted/20">
                                <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                <span className="text-sm text-muted-foreground leading-relaxed">{rule}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-16 px-4 border-t border-border bg-muted/20">
                <div className="container mx-auto max-w-3xl">
                    <h2 className="text-3xl font-bold mb-10">{c.faq_title}</h2>
                    <div className="space-y-4">
                        {c.faqs.map((faq, i) => (
                            <div key={i} className="p-5 rounded-2xl border border-border bg-background">
                                <div className="font-semibold mb-2">{faq.q}</div>
                                <div className="text-sm text-muted-foreground">{faq.a}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-4 border-t border-border">
                <div className="container mx-auto max-w-2xl text-center space-y-6">
                    <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto">
                        <Zap className="w-7 h-7 text-purple-400" />
                    </div>
                    <h2 className="text-3xl font-bold">{c.cta_title}</h2>
                    <p className="text-muted-foreground">{c.cta_desc}</p>
                    <Link href="/contact">
                        <Button size="lg" className="h-12 px-10 rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium">
                            {c.cta_apply} <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    </Link>
                </div>
            </section>

            <PublicFooter />
        </div>
    )
}
