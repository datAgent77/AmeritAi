"use client"

import Link from "next/link"
import { useMemo } from "react"
import { ArrowRight, Sparkles, MessageSquareText, Clock3, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { VionLogo } from "@/components/vion-logo"
import { useLanguage } from "@/context/LanguageContext"
import { trackCtaClick } from "@/lib/marketing-tracking"
import { useSearchParams } from "next/navigation"

const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
]

const COPY = {
  tr: {
    heading: "Web sitenizi satış yapan bir chatbot’a dönüştürün.",
    subtitle:
      "Vion chatbot ziyaretçiyi karşılar, soruları anında yanıtlar ve doğru anda kayıt/iletişim aksiyonuna yönlendirir.",
    cta: "Ücretsiz Üye Ol",
    promptLabel: "Chatbot kısa demo",
    promptPlaceholder: "Ziyaretçiler geldiğinde otomatik karşılama ve dönüşüm akışı başlat",
    chips: ["7/24 Otomatik Yanıt", "Lead Toplama", "Hızlı Kurulum"],
    valueTitle: "Neden Vion?",
    values: [
      "Ziyaretçi niyetini anlayıp doğru cevabı saniyeler içinde verir.",
      "Sohbeti sadece destek için değil, kayıt ve satış aksiyonuna taşır.",
      "Tek kodla eklenir, dakikalar içinde canlıya alınır.",
    ],
    trust: "Kredi kartı gerekmez",
  },
  en: {
    heading: "Turn your website into a sales-ready chatbot experience.",
    subtitle:
      "Vion welcomes visitors, answers instantly, and nudges them to the right action at the right time.",
    cta: "Sign Up Free",
    promptLabel: "Quick chatbot preview",
    promptPlaceholder: "Auto-greet new visitors and guide them to signup at the right moment",
    chips: ["24/7 Auto Replies", "Lead Capture", "Quick Setup"],
    valueTitle: "Why Vion?",
    values: [
      "Understands visitor intent and responds in seconds.",
      "Moves conversations from support to signup and sales actions.",
      "Install with a single snippet and go live in minutes.",
    ],
    trust: "No credit card required",
  },
} as const

function buildSignupHref(searchParams: { get: (key: string) => string | null }): string {
  const forwarded = new URLSearchParams()

  for (const key of ATTRIBUTION_KEYS) {
    const value = searchParams.get(key)
    if (value) forwarded.set(key, value)
  }

  const query = forwarded.toString()
  return query ? `/signup?${query}` : "/signup"
}

export default function DemoLandingPage() {
  const { language } = useLanguage()
  const searchParams = useSearchParams()
  const lang = language === "tr" ? "tr" : "en"
  const copy = COPY[lang]

  const signupHref = useMemo(() => buildSignupHref(searchParams), [searchParams])

  return (
    <main className="min-h-screen bg-[#f3f3f1] text-[#1d1d1d]">
      <div className="mx-auto w-full max-w-5xl px-5 pb-20 pt-8 sm:px-8 md:pt-10">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="Vion home">
            <VionLogo variant="black" />
          </Link>
          <span className="rounded-full border border-[#d8d8d4] bg-white px-3 py-1 text-xs font-medium text-[#5f5f58]">
            Google Ads Demo
          </span>
        </header>

        <section className="mx-auto mt-14 max-w-3xl">
          <h1 className="text-balance bg-gradient-to-r from-[#f59e0b] via-[#f97316] to-[#ef4444] bg-clip-text text-3xl font-semibold leading-tight text-transparent sm:text-5xl">
            {copy.heading}
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-[#5a5a54] sm:text-lg">
            {copy.subtitle}
          </p>

          <div className="mt-8 rounded-2xl border border-[#d6d6d1] bg-[#efefec] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.05)] sm:p-5">
            <p className="mb-2 text-sm font-medium text-[#676760]">{copy.promptLabel}</p>
            <div className="min-h-[140px] rounded-xl border border-[#d3d3ce] bg-[#f7f7f5] p-4">
              <p className="text-sm text-[#8a8a84] sm:text-[17px]">{copy.promptPlaceholder}</p>

              <div className="mt-12 flex flex-wrap gap-2">
                {copy.chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-[#d4d4ce] bg-white px-3 py-1 text-xs font-medium text-[#666660]"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-7 flex">
            <Link
              href={signupHref}
              onClick={() =>
                trackCtaClick({
                  location: "demo_hero",
                  ctaLabel: "free_signup",
                  destination: signupHref,
                  language: lang,
                })
              }
            >
              <Button className="h-12 rounded-full bg-[#121212] px-7 text-sm font-semibold text-white hover:bg-[#222222] sm:h-14 sm:px-9 sm:text-base">
                {copy.cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <p className="mt-3 text-sm text-[#72726d]">{copy.trust}</p>
        </section>

        <section className="mx-auto mt-14 max-w-3xl rounded-2xl border border-[#d8d8d3] bg-white/80 p-5">
          <h2 className="mb-4 text-lg font-semibold text-[#222220]">{copy.valueTitle}</h2>
          <ul className="space-y-3 text-sm leading-relaxed text-[#4f4f48] sm:text-base">
            <li className="flex gap-3">
              <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-[#f97316]" />
              <span>{copy.values[0]}</span>
            </li>
            <li className="flex gap-3">
              <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-[#ef4444]" />
              <span>{copy.values[1]}</span>
            </li>
            <li className="flex gap-3">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#f59e0b]" />
              <span>{copy.values[2]}</span>
            </li>
          </ul>
        </section>

        <footer className="mt-10 flex items-center gap-2 text-xs text-[#76766f]">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Vion AI</span>
        </footer>
      </div>
    </main>
  )
}
