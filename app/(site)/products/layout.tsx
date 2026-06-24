import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Products & Skills — AI Modules for Your Business",
  description: "Explore AmeritAI's powerful skill modules: AI Sales Chatbot, Visual Diagnosis, Campaign Manager, Personal Shopper, Restaurant Menu AI, and more.",
  keywords: ["AI chatbot modules", "visual diagnosis AI", "campaign manager chatbot", "personal shopper AI", "AI beceriler", "ürünler"],
  alternates: {
    canonical: "https://www.ameritai.com/products",
  },
  openGraph: {
    title: "Products & Skills | AmeritAI",
    description: "AI Sales Chatbot, Visual Diagnosis, Campaign Manager and more.",
    url: "https://www.ameritai.com/products",
  },
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
