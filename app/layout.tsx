import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.getvion.com'),
  title: {
    default: "Vion AI | AI-Powered Business Assistant",
    template: "%s | Vion AI"
  },
  description: "Transform your business with Vion AI. Automate sales, support, and booking with our intelligent, multi-lingual AI assistant.",
  keywords: ["AI assistant", "chatbot", "customer support", "sales automation", "artificial intelligence", "business automation"],
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
    url: 'https://www.getvion.com',
    title: 'Vion AI | AI-Powered Business Assistant',
    description: 'Transform your business with Vion AI. Automate sales, support, and booking with our intelligent, multi-lingual AI assistant.',
    siteName: 'Vion AI',
    images: [
      {
        url: '/vion-logo-full-dark.png', // Using existing asset
        width: 1200,
        height: 630,
        alt: 'Vion AI',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vion AI | AI-Powered Business Assistant',
    description: 'Transform your business with Vion AI. Automate sales, support, and booking with our intelligent, multi-lingual AI assistant.',
    images: ['/vion-logo-full-dark.png'],
  },
};

import { ConditionalAuthProvider } from "@/components/conditional-auth-provider";
import { LanguageProvider } from "@/context/LanguageContext";
import { CookieConsent } from "@/components/cookie-consent";
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
          <LanguageProvider>
            <ConditionalAuthProvider>
              <CookieConsent />
              {children}
              <PublicChatbot />
              <Toaster />
            </ConditionalAuthProvider>
          </LanguageProvider>
      </body>
    </html>
  );
}
