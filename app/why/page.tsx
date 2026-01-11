"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    ArrowRight,
    TrendingUp,
    Building2,
    Palette,
    Tag,
    Package,
    ShoppingCart,
    GitCompare,
    CheckCircle2,
    X,
    Minus,
    Home,
    ChevronRight,
    Sparkles
} from "lucide-react"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { useLanguage } from "@/context/LanguageContext"
import { HeroBackgroundGradient } from "@/components/landing/hero-background-gradient"
import { getModule } from "@/lib/feature-consistency-checker"
import { ModuleId } from "@/lib/modules-registry"

export default function WhyPage() {
    const { t, language } = useLanguage()

    // Feature mapping: feature name -> module ID (for ready status check)
    const featureModuleMap: Record<string, ModuleId | 'core' | 'widget'> = {
        'Sales Optimization': 'salesOptimization',
        'Satış Optimizasyonu': 'salesOptimization',
        'Industry-Specific AI': 'core', // Core feature, always available
        'Sektöre Özel AI': 'core',
        'Brand Customization': 'widget', // Widget settings, always available
        'Marka Özelleştirme': 'widget',
        'XML Feed Sync': 'productCatalog',
        'Stok Uyarıları': 'productCatalog',
        'Stock Alerts': 'productCatalog',
        'Cart Recovery': 'salesOptimization',
        'Sepet Kurtarma': 'salesOptimization',
        'Appointment System': 'appointments',
        'Randevu Sistemi': 'appointments',
        'Live Chat (Takeover)': 'core', // Core feature
        'Canlı Destek (Takeover)': 'core',
        'Knowledge Base': 'knowledgeBase',
        'Lead Collection': 'leadCollection',
        'Lead Toplama': 'leadCollection',
        'Omnichannel': 'core', // Core feature
        'Çok Kanallı': 'core'
    }

    // Build comparison data dynamically from MODULES_REGISTRY
    const baseComparisonData = [
        { featureKey: 'Sales Optimization', moduleId: 'salesOptimization' as ModuleId, tawkto: false, intercom: 'partial' as const, drift: 'partial' as const },
        { featureKey: 'Industry-Specific AI', moduleId: 'core' as const, tawkto: false, intercom: false, drift: false },
        { featureKey: 'Brand Customization', moduleId: 'widget' as const, tawkto: '$29/mo', intercom: '$$$', drift: '$$$' },
        { featureKey: 'XML Feed Sync', moduleId: 'productCatalog' as ModuleId, tawkto: false, intercom: false, drift: false },
        { featureKey: 'Stock Alerts', moduleId: 'productCatalog' as ModuleId, tawkto: false, intercom: false, drift: false },
        { featureKey: 'Cart Recovery', moduleId: 'salesOptimization' as ModuleId, tawkto: false, intercom: 'partial' as const, drift: true },
        { featureKey: 'Appointment System', moduleId: 'appointments' as ModuleId, tawkto: false, intercom: true, drift: true },
        { featureKey: 'Live Chat (Takeover)', moduleId: 'core' as const, tawkto: true, intercom: true, drift: true },
        { featureKey: 'Knowledge Base', moduleId: 'knowledgeBase' as ModuleId, tawkto: true, intercom: true, drift: false },
        { featureKey: 'Lead Collection', moduleId: 'leadCollection' as ModuleId, tawkto: true, intercom: true, drift: true },
        { featureKey: 'Omnichannel', moduleId: 'core' as const, tawkto: true, intercom: true, drift: true },
    ]

    const comparisonData = baseComparisonData.map(item => {
        let userex: boolean | string = true
        
        if (item.moduleId === 'core' || item.moduleId === 'widget') {
            // Core features and widget settings are always available
            userex = true
        } else {
            // Check if module is ready
            const module = getModule(item.moduleId)
            userex = module?.status === 'ready' || false
        }

        return {
            feature: language === 'tr' 
                ? (item.featureKey === 'Sales Optimization' ? 'Satış Optimizasyonu' :
                   item.featureKey === 'Industry-Specific AI' ? 'Sektöre Özel AI' :
                   item.featureKey === 'Brand Customization' ? 'Marka Özelleştirme' :
                   item.featureKey === 'XML Feed Sync' ? 'XML Feed Sync' :
                   item.featureKey === 'Stock Alerts' ? 'Stok Uyarıları' :
                   item.featureKey === 'Cart Recovery' ? 'Sepet Kurtarma' :
                   item.featureKey === 'Appointment System' ? 'Randevu Sistemi' :
                   item.featureKey === 'Live Chat (Takeover)' ? 'Canlı Destek (Takeover)' :
                   item.featureKey === 'Knowledge Base' ? 'Knowledge Base' :
                   item.featureKey === 'Lead Collection' ? 'Lead Toplama' :
                   item.featureKey === 'Omnichannel' ? 'Çok Kanallı' : item.featureKey)
                : item.featureKey,
            userex,
            tawkto: item.tawkto,
            intercom: item.intercom,
            drift: item.drift
        }
    })

    const renderStatus = (status: boolean | string) => {
        if (status === true) return <CheckCircle2 className="w-5 h-5 text-white" />
        if (status === false) return <X className="w-5 h-5 text-zinc-700" />
        if (status === 'partial') return <Minus className="w-5 h-5 text-zinc-500" />
        return <span className="text-sm text-zinc-400">{status}</span>
    }

    return (
        <div className="dark min-h-screen bg-black text-white font-sans relative overflow-hidden">
            <PublicHeader transparent={true} />

            <div className="absolute top-0 left-0 w-full h-[120vh] min-h-[800px] overflow-hidden -z-10">
                <HeroBackgroundGradient />
            </div>

            {/* Breadcrumb */}
            <div className="container mx-auto px-4 pt-24 pb-4 relative z-10">
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Link href="/" className="hover:text-white transition-colors flex items-center gap-1">
                        <Home className="w-4 h-4" />
                        Home
                    </Link>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-white">{language === 'tr' ? 'Neden Biz' : 'Why Us'}</span>
                </div>
            </div>

            {/* Hero */}
            <section className="relative pt-12 pb-20 overflow-hidden border-b border-white/5">
                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-4xl mx-auto text-center space-y-6 animate-in fade-in zoom-in-95 duration-700">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-zinc-400 backdrop-blur-sm">
                            <Sparkles className="w-3 h-3 text-white" />
                            <span>{language === 'tr' ? 'Farkı Keşfedin' : 'Discover the Difference'}</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white">
                            {language === 'tr' ? 'Neden Vion?' : 'Why Vion?'}
                        </h1>
                        <p className="text-xl text-white font-medium">
                            {language === 'tr' ? '"Satış yapan chatbot. Destek değil, dönüşüm."' : '"Sales Chatbot. Not Support, Conversion."'}
                        </p>
                        <p className="text-lg text-zinc-400 max-w-2xl mx-auto font-light">
                            {language === 'tr'
                                ? 'Rakipler müşteri desteği için tasarlandı. Biz müşteri kazanımı için.'
                                : 'Competitors are designed for customer support. We are designed for customer acquisition.'}
                        </p>
                    </div>
                </div>
            </section>

            {/* 3 Main Differences */}
            <section className="py-20 relative">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-12 text-white tracking-tight">
                        {language === 'tr' ? '3 Ana Fark' : '3 Key Differences'}
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Sales Focused */}
                        <div className="p-8 rounded-3xl bg-zinc-900/50 border border-white/10 hover:border-white/20 transition-all hover:-translate-y-1 duration-300">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/5">
                                <TrendingUp className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4 text-white">
                                {language === 'tr' ? 'Satış Odaklı' : 'Sales Focused'}
                            </h3>
                            <p className="text-zinc-400 mb-4 text-sm leading-relaxed">
                                {language === 'tr'
                                    ? '"Nasıl yardımcı olabilirim?" yerine "Bu ürünü almanızı öneririm" der.'
                                    : 'Instead of "How can I help?" says "I recommend this product for you."'}
                            </p>
                            <ul className="space-y-3 text-sm text-zinc-300">
                                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-white" /> {language === 'tr' ? 'İndirim kodu önerisi' : 'Discount code offers'}</li>
                                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-white" /> {language === 'tr' ? 'Stok uyarıları' : 'Stock alerts'}</li>
                                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-white" /> {language === 'tr' ? 'Sepet kurtarma' : 'Cart recovery'}</li>
                            </ul>
                        </div>

                        {/* Industry Intelligence */}
                        <div className="p-8 rounded-3xl bg-zinc-900/50 border border-white/10 hover:border-white/20 transition-all hover:-translate-y-1 duration-300">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/5">
                                <Building2 className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4 text-white">
                                {language === 'tr' ? 'Sektör Zekası' : 'Industry Intelligence'}
                            </h3>
                            <p className="text-zinc-400 mb-4 text-sm leading-relaxed">
                                {language === 'tr'
                                    ? '10 farklı sektöre özel AI davranışı. E-ticarete farklı, seyahate farklı.'
                                    : '10 different industry-specific AI behaviors. Different for e-commerce, different for travel.'}
                            </p>
                            <ul className="space-y-3 text-sm text-zinc-300">
                                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-white" /> {language === 'tr' ? 'E-ticaret' : 'E-commerce'}</li>
                                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-white" /> {language === 'tr' ? 'Seyahat' : 'Travel'}</li>
                                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-white" /> {language === 'tr' ? '+8 sektör daha' : '+8 more industries'}</li>
                            </ul>
                        </div>

                        {/* Brand Freedom */}
                        <div className="p-8 rounded-3xl bg-zinc-900/50 border border-white/10 hover:border-white/20 transition-all hover:-translate-y-1 duration-300">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/5">
                                <Palette className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4 text-white">
                                {language === 'tr' ? 'Marka Özgürlüğü' : 'Brand Freedom'}
                            </h3>
                            <p className="text-zinc-400 mb-4 text-sm leading-relaxed">
                                {language === 'tr'
                                    ? 'Logonuzu kullanın, bizimkini değil. Ücretsiz. Rakiplerde $29/ay.'
                                    : 'Use your logo, not ours. Free. Competitors charge $29/month.'}
                            </p>
                            <ul className="space-y-3 text-sm text-zinc-300">
                                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-white" /> {language === 'tr' ? 'Özel renkler' : 'Custom colors'}</li>
                                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-white" /> {language === 'tr' ? 'Logo & avatar' : 'Logo & avatar'}</li>
                                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-white" /> {language === 'tr' ? 'Branding silme: $0' : 'Remove branding: $0'}</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Sales Optimization Features */}
            <section className="py-20 border-t border-white/5">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-4 text-white">
                        {language === 'tr' ? 'Satış Optimizasyonu' : 'Sales Optimization'}
                    </h2>
                    <p className="text-zinc-400 text-center mb-12 max-w-2xl mx-auto font-light">
                        {language === 'tr'
                            ? 'Chatbot\'unuz sadece soru cevaplamaz, satış yapar.'
                            : 'Your chatbot doesn\'t just answer questions, it sells.'}
                    </p>
                    <div className="grid md:grid-cols-4 gap-6">
                        <div className="p-6 rounded-2xl bg-zinc-900/30 border border-white/5 hover:border-white/20 transition-colors text-center group">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                <Tag className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="font-bold mb-2 text-white">{language === 'tr' ? 'İndirim Kodları' : 'Discount Codes'}</h3>
                            <p className="text-sm text-zinc-400">
                                {language === 'tr' ? '"Size özel %10 indirim kodu"' : '"Special 10% discount for you"'}
                            </p>
                        </div>
                        <div className="p-6 rounded-2xl bg-zinc-900/30 border border-white/5 hover:border-white/20 transition-colors text-center group">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                <Package className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="font-bold mb-2 text-white">{language === 'tr' ? 'Stok Uyarıları' : 'Stock Alerts'}</h3>
                            <p className="text-sm text-zinc-400">
                                {language === 'tr' ? '"Sadece 3 adet kaldı!"' : '"Only 3 left in stock!"'}
                            </p>
                        </div>
                        <div className="p-6 rounded-2xl bg-zinc-900/30 border border-white/5 hover:border-white/20 transition-colors text-center group">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                <ShoppingCart className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="font-bold mb-2 text-white">{language === 'tr' ? 'Sepet Kurtarma' : 'Cart Recovery'}</h3>
                            <p className="text-sm text-zinc-400">
                                {language === 'tr' ? 'Terk edilen sepetleri geri kazan' : 'Recover abandoned carts'}
                            </p>
                        </div>
                        <div className="p-6 rounded-2xl bg-zinc-900/30 border border-white/5 hover:border-white/20 transition-colors text-center group">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                <GitCompare className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="font-bold mb-2 text-white">{language === 'tr' ? 'Ürün Karşılaştırma' : 'Product Comparison'}</h3>
                            <p className="text-sm text-zinc-400">
                                {language === 'tr' ? 'En iyi seçeneği öner' : 'Recommend the best option'}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Comparison Table */}
            <section className="py-20 border-t border-white/5">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-4 text-white">
                        {language === 'tr' ? 'Rakiplerle Karşılaştırma' : 'Competitor Comparison'}
                    </h2>
                    <p className="text-zinc-400 text-center mb-12">
                        {language === 'tr' ? 'Özelliklere göre kıyaslama' : 'Feature-by-feature comparison'}
                    </p>
                    <div className="max-w-5xl mx-auto overflow-x-auto bg-zinc-900/20 rounded-3xl p-8 border border-white/5">
                        <table className="w-full table-fixed">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left py-4 px-4 w-[200px] text-zinc-300 font-medium">{language === 'tr' ? 'Özellik' : 'Feature'}</th>
                                    <th className="py-4 px-4 text-white w-[120px] font-bold"><div className="flex justify-center">Vion</div></th>
                                    <th className="py-4 px-4 text-zinc-500 w-[120px] font-medium"><div className="flex justify-center">Tawk.to</div></th>
                                    <th className="py-4 px-4 text-zinc-500 w-[120px] font-medium"><div className="flex justify-center">Intercom</div></th>
                                    <th className="py-4 px-4 text-zinc-500 w-[120px] font-medium"><div className="flex justify-center">Drift</div></th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparisonData.map((row, i) => (
                                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="py-4 px-4 text-sm text-zinc-300">{row.feature}</td>
                                        <td className="py-4 px-4"><div className="flex justify-center">{renderStatus(row.userex)}</div></td>
                                        <td className="py-4 px-4"><div className="flex justify-center">{renderStatus(row.tawkto)}</div></td>
                                        <td className="py-4 px-4"><div className="flex justify-center">{renderStatus(row.intercom)}</div></td>
                                        <td className="py-4 px-4"><div className="flex justify-center">{renderStatus(row.drift)}</div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 border-t border-white/5">
                <div className="container mx-auto px-4">
                    <div className="max-w-3xl mx-auto text-center">
                        <h2 className="text-3xl md:text-5xl font-bold mb-8 text-white tracking-tight">
                            {language === 'tr' ? 'Hazır mısınız?' : 'Ready to Start?'}
                        </h2>
                        <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto font-light">
                            {language === 'tr'
                                ? 'Satış yapan chatbot\'unuzu bugün oluşturun.'
                                : 'Create your sales-focused chatbot today.'}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/signup">
                                <Button className="h-14 px-12 text-lg bg-white text-black hover:bg-zinc-200 rounded-full transition-all hover:scale-105 font-medium">
                                    {language === 'tr' ? 'Ücretsiz Başla' : 'Start Free'}
                                    <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </Link>
                            <Link href="/contact">
                                <Button variant="outline" className="h-14 px-12 text-lg border-white/20 text-white hover:bg-white hover:text-black rounded-full transition-all hover:scale-105">
                                    {language === 'tr' ? 'Demo Talep Et' : 'Request Demo'}
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <PublicFooter />
        </div>
    )
}
