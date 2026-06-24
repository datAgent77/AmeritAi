import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://www.ameritai.com'),
  applicationName: "AmeritAI",
  title: {
    default: "AmeritAI | AI-Powered Sales & Support Chatbot for Businesses",
    template: "%s | AmeritAI"
  },
  description: "Convert website visitors into customers with AmeritAI. Intelligent chatbot for sales automation, customer support, and appointment booking. Works in 50+ languages.",
  keywords: [
    // English keywords
    "AI chatbot", "sales automation", "customer support chatbot", "AI sales assistant",
    "website chatbot", "lead generation AI", "appointment booking chatbot",
    "business automation", "conversational AI", "multilingual chatbot",
    // Turkish keywords
    "yapay zeka chatbot", "AI satış asistanı", "müşteri destek chatbot",
    "web sitesi chatbot", "satış otomasyonu", "randevu chatbot",
  ],
  authors: [{ name: "AmeritAI Team" }],
  creator: "AmeritAI",
  publisher: "AmeritAI",
  category: "business software",
  manifest: "/manifest.webmanifest",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Replace with actual Google Search Console verification code
    google: '_30_2DpjpK20QsJAjXqrMlw2k0AzdzmfX50MarS2100',
  },
  alternates: {
    canonical: 'https://www.ameritai.com',
    languages: {
      'en': 'https://www.ameritai.com',
      'tr': 'https://www.ameritai.com',
      'x-default': 'https://www.ameritai.com',
    },
  },
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: [
      { url: '/favicon.png', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "AmeritAI",
    statusBarStyle: "default",
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['tr_TR'],
    url: 'https://www.ameritai.com',
    title: 'AmeritAI | AI-Powered Sales & Support Chatbot',
    description: 'Convert website visitors into customers with AmeritAI. Intelligent chatbot for sales, support, and booking in 50+ languages.',
    siteName: 'AmeritAI',
    images: [
      {
        url: '/ameritai-og.png',
        width: 1200,
        height: 630,
        alt: 'AmeritAI - AI-Powered Business Assistant',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AmeritAI | AI-Powered Sales & Support Chatbot',
    description: 'Convert website visitors into customers. Intelligent AI chatbot for sales, support, and booking in 50+ languages.',
    images: ['/ameritai-og.png'],
  },
};

import { ConditionalAuthProvider } from "@/components/conditional-auth-provider";
import { LanguageProvider } from "@/context/LanguageContext";
import { CookieConsentProvider } from "@/context/CookieConsentContext";
import { CookieConsent } from "@/components/cookie-consent";
import { GoogleTagManager } from "@/components/google-tag-manager";
import { RouteAnalyticsTracker } from "@/components/route-analytics-tracker";
import { Toaster } from "@/components/ui/toaster"
import { PublicChatbot } from "@/components/public-chatbot"
import type { Language } from "@/lib/translations";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = cookies();
  const languageCookie = cookieStore.get("language")?.value;
  const initialLanguage: Language = languageCookie === "tr" ? "tr" : "en";

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://www.ameritai.com/#organization',
    name: 'AmeritAI',
    url: 'https://www.ameritai.com',
    logo: 'https://www.ameritai.com/vion-logo-icon-dark.png',
    description: 'AI-Powered Business Assistant for Sales and Support',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'TR'
    },
    sameAs: [
      'https://www.linkedin.com/company/vion-ai',
      'https://twitter.com/vion_ai'
    ]
  }
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://www.ameritai.com/#website',
    name: 'AmeritAI',
    url: 'https://www.ameritai.com',
    inLanguage: ['en', 'tr'],
    publisher: {
      '@id': 'https://www.ameritai.com/#organization'
    }
  }

  const softwareApplicationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AmeritAI',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      description: 'Contact AmeritAI for current plan pricing and trial details'
    },
    brand: {
      '@id': 'https://www.ameritai.com/#organization'
    },
    url: 'https://www.ameritai.com'
  }

  const jsonLd = [organizationJsonLd, websiteJsonLd, softwareApplicationJsonLd]

  return (
    <html lang={initialLanguage} suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans antialiased bg-background text-foreground" suppressHydrationWarning>
        <noscript>
          <iframe 
            src="https://www.googletagmanager.com/ns.html?id=GTM-K5ZJL5W2"
            height="0" 
            width="0" 
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
          <LanguageProvider initialLanguage={initialLanguage}>
            <ConditionalAuthProvider>
              <CookieConsentProvider>
                <CookieConsent />
                <GoogleTagManager />
                <RouteAnalyticsTracker />
                {children}
                <PublicChatbot />
                <Toaster />
              </CookieConsentProvider>
            </ConditionalAuthProvider>
          </LanguageProvider>
      </body>
    </html>
  );
}
