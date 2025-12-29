import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vion AI",
  description: "AI-Powered Business Assistant",
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
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
