import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vion AI",
  description: "AI-Powered Business Assistant",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: '/favicon.png',
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
  return (
    <html lang="en" suppressHydrationWarning style={{ backgroundColor: '#000000' }}>
      <body className={`${inter.className} antialiased bg-black`}>
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
