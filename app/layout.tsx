import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.getvion.com'),
  applicationName: "Vion AI",
  title: {
    default: "Vion AI | AI-Powered Sales & Support Chatbot for Businesses",
    template: "%s | Vion AI"
  },
  description: "Convert website visitors into customers with Vion AI. Intelligent chatbot for sales automation, customer support, and appointment booking. Works in 50+ languages.",
  keywords: [
    // English keywords
    "AI chatbot", "sales automation", "customer support chatbot", "AI sales assistant",
    "website chatbot", "lead generation AI", "appointment booking chatbot",
    "business automation", "conversational AI", "multilingual chatbot",
    // Turkish keywords
    "yapay zeka chatbot", "AI satış asistanı", "müşteri destek chatbot",
    "web sitesi chatbot", "satış otomasyonu", "randevu chatbot",
  ],
  authors: [{ name: "Vion AI Team" }],
  creator: "Vion AI",
  publisher: "Vion AI",
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
    canonical: 'https://www.getvion.com',
    languages: {
      'en': 'https://www.getvion.com',
      'tr': 'https://www.getvion.com',
      'x-default': 'https://www.getvion.com',
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
    title: "Vion AI",
    statusBarStyle: "default",
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['tr_TR'],
    url: 'https://www.getvion.com',
    title: 'Vion AI | AI-Powered Sales & Support Chatbot',
    description: 'Convert website visitors into customers with Vion AI. Intelligent chatbot for sales, support, and booking in 50+ languages.',
    siteName: 'Vion AI',
    images: [
      {
        url: '/vion-logo-full-dark.png',
        width: 1200,
        height: 630,
        alt: 'Vion AI - AI-Powered Business Assistant',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vion AI | AI-Powered Sales & Support Chatbot',
    description: 'Convert website visitors into customers. Intelligent AI chatbot for sales, support, and booking in 50+ languages.',
    images: ['/vion-logo-full-dark.png'],
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
    '@id': 'https://www.getvion.com/#organization',
    name: 'Vion AI',
    url: 'https://www.getvion.com',
    logo: 'https://www.getvion.com/vion-logo-icon-dark.png',
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
    '@id': 'https://www.getvion.com/#website',
    name: 'Vion AI',
    url: 'https://www.getvion.com',
    inLanguage: ['en', 'tr'],
    publisher: {
      '@id': 'https://www.getvion.com/#organization'
    }
  }

  const softwareApplicationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Vion AI',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      description: 'Contact Vion AI for current plan pricing and trial details'
    },
    brand: {
      '@id': 'https://www.getvion.com/#organization'
    },
    url: 'https://www.getvion.com'
  }

  const jsonLd = [organizationJsonLd, websiteJsonLd, softwareApplicationJsonLd]

  return (
    <html lang={initialLanguage} suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.className} antialiased bg-background text-foreground`} suppressHydrationWarning>
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
