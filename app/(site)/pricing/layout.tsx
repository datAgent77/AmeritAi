import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Flexible Plans for Growing Businesses",
  description: "Quote-based pricing for Vion AI. Choose from Starter, Scale, and Enterprise plans. Start with a 14-day free trial. No credit card required.",
  keywords: ["AI chatbot pricing", "chatbot plans", "SaaS pricing", "yapay zeka fiyatlandırma", "chatbot fiyat"],
  alternates: {
    canonical: "https://www.getvion.com/pricing",
  },
  openGraph: {
    title: "Pricing | Vion AI",
    description: "Flexible and transparent pricing. Start with a 14-day free trial.",
    url: "https://www.getvion.com/pricing",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
