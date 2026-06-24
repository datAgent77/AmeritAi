import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Why AmeritAI? — 10 Reasons to Choose Us",
  description: "Easy setup, industry-specific AI, multi-language support, real-time analytics, and more. See why businesses choose AmeritAI over competitors.",
  keywords: ["why AmeritAI", "AI chatbot comparison", "best AI chatbot", "neden AmeritAI", "chatbot karşılaştırma"],
  alternates: {
    canonical: "https://www.ameritai.com/why-us",
  },
  openGraph: {
    title: "Why AmeritAI?",
    description: "Easy setup, industry-specific AI, real-time analytics, and multi-language support.",
    url: "https://www.ameritai.com/why-us",
  },
};

export default function WhyUsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
