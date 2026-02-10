import { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ — Frequently Asked Questions",
  description: "Everything you need to know about Vion AI. Setup, pricing, integrations, security, multi-language support, and more. Get answers instantly.",
  keywords: ["Vion AI FAQ", "chatbot FAQ", "AI chatbot help", "sıkça sorulan sorular", "chatbot yardım"],
  alternates: {
    canonical: "https://www.getvion.com/resources/faq",
  },
  openGraph: {
    title: "FAQ | Vion AI",
    description: "Frequently asked questions about Vion AI setup, pricing, and features.",
    url: "https://www.getvion.com/resources/faq",
  },
};

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
