"use client"

import { useLanguage } from "@/context/LanguageContext"
import { companyContent } from "@/lib/company-content"
import { Sparkles, ArrowUpRight, Heart, Shield, Zap, Lightbulb, User, Layers } from "lucide-react"

export default function AboutPage() {
  const { language } = useLanguage()
  const content = companyContent[language === 'tr' ? 'tr' : 'en']

  return (
    <div className="py-16 md:py-24 space-y-32">
      
      {/* 1. Hero */}
      <section className="container mx-auto px-4 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Sparkles className="w-4 h-4" />
          {content.hero.badge}
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground max-w-5xl mx-auto leading-tight animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
          {content.hero.title}
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          {content.hero.subtitle}
        </p>
      </section>

      {/* 2. Our Story */}
      <section className="container mx-auto px-4">
        <div className="grid md:grid-cols-12 gap-12 items-start">
            <div className="md:col-span-4">
                <h2 className="text-3xl font-bold text-foreground sticky top-24">
                    {content.story.title}
                </h2>
            </div>
            <div className="md:col-span-8 space-y-6 text-lg md:text-xl text-muted-foreground leading-relaxed">
                <p>{content.story.p1}</p>
                <p>{content.story.p2}</p>
            </div>
        </div>
      </section>

      {/* 3. Core Values */}
      <section className="container mx-auto px-4 bg-muted/20 py-16 rounded-3xl">
        <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground">{content.values.title}</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {content.values.items.map((item, idx) => {
                const icons = [User, Lightbulb, Zap, Shield]
                const Icon = icons[idx]
                return (
                    <div key={idx} className="bg-background p-8 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                            <Icon className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-3">{item.title}</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            {item.desc}
                        </p>
                    </div>
                )
            })}
        </div>
      </section>

      {/* 4. Differentiators (Why Us) */}
      <section className="container mx-auto px-4">
        <div className="text-center mb-16">
             <h2 className="text-3xl font-bold text-foreground">{content.whyUs.title}</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
            {content.whyUs.features.map((feature, idx) => (
                <div key={idx} className="space-y-4 text-center md:text-left">
                    <div className="inline-flex w-12 h-12 rounded-full border border-border items-center justify-center bg-card shadow-sm">
                        <span className="font-mono font-bold text-primary">0{idx + 1}</span>
                    </div>
                    <h4 className="text-xl font-bold text-foreground">{feature.title}</h4>
                    <p className="text-muted-foreground leading-relaxed">
                        {feature.desc}
                    </p>
                </div>
            ))}
        </div>
      </section>

      {/* 5. Powered By Userex */}
      <section className="container mx-auto px-4 pb-12">
        <div className="bg-foreground text-background rounded-3xl p-8 md:p-16 overflow-hidden relative">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-background/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 text-background/80 font-medium tracking-wide text-sm uppercase">
                        <Layers className="w-4 h-4" />
                        {content.userex.title}
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                         <span dangerouslySetInnerHTML={{ __html: content.userex.description.replace(/\*\*(.*?)\*\*/g, '<span class="text-primary-foreground underlineDecoration">$1</span>') }} />
                    </h2>
                    <p className="text-background/70 text-lg leading-relaxed">
                        {content.userex.detail}
                    </p>
                    <div className="pt-4">
                        <a 
                            href={content.userex.url}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-background text-foreground font-bold hover:bg-background/90 transition-colors"
                        >
                            {content.userex.linkText}
                            <ArrowUpRight className="w-4 h-4" />
                        </a>
                    </div>
                </div>
                {/* Visual / Abstract Representation of Design */}
                <div className="relative h-64 md:h-full min-h-[300px] border border-white/10 rounded-2xl bg-white/5 backdrop-blur-sm p-8 flex flex-col justify-between">
                     <div className="text-6xl font-black text-white/10 select-none">DESIGN</div>
                     <div className="text-6xl font-black text-white/10 select-none text-right">CODE</div>
                     <div className="absolute inset-0 flex items-center justify-center">
                        <Heart className="w-16 h-16 text-white/80 animate-pulse" />
                     </div>
                </div>
            </div>
        </div>
      </section>
      
    </div>
  )
}
