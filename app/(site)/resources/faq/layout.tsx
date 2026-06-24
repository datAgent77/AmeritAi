import { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ — Frequently Asked Questions",
  description: "Everything you need to know about AmeritAI. Setup, pricing, integrations, security, multi-language support, and more. Get answers instantly.",
  keywords: ["AmeritAI FAQ", "chatbot FAQ", "AI chatbot help", "sıkça sorulan sorular", "chatbot yardım"],
  alternates: {
    canonical: "https://www.ameritai.com/resources/faq",
  },
  openGraph: {
    title: "FAQ | AmeritAI",
    description: "Frequently asked questions about AmeritAI setup, pricing, and features.",
    url: "https://www.ameritai.com/resources/faq",
  },
};

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
