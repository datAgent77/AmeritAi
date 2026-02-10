import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Why Vion AI? — 10 Reasons to Choose Us",
  description: "Easy setup, industry-specific AI, multi-language support, real-time analytics, and more. See why businesses choose Vion AI over competitors.",
  keywords: ["why Vion AI", "AI chatbot comparison", "best AI chatbot", "neden Vion", "chatbot karşılaştırma"],
  alternates: {
    canonical: "https://www.getvion.com/why-us",
  },
  openGraph: {
    title: "Why Vion AI?",
    description: "Easy setup, industry-specific AI, real-time analytics, and multi-language support.",
    url: "https://www.getvion.com/why-us",
  },
};

export default function WhyUsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
