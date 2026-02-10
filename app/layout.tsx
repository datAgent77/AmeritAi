import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.getvion.com'),
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
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: '/favicon.png',
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
import { Toaster } from "@/components/ui/toaster"
import { PublicChatbot } from "@/components/public-chatbot"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
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

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-background text-foreground`}>
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
          <LanguageProvider>
            <ConditionalAuthProvider>
              <CookieConsentProvider>
                <CookieConsent />
                <GoogleTagManager />
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
