import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Products & Skills — AI Modules for Your Business",
  description: "Explore Vion AI's powerful skill modules: AI Sales Chatbot, Visual Diagnosis, Campaign Manager, Personal Shopper, Restaurant Menu AI, and more.",
  keywords: ["AI chatbot modules", "visual diagnosis AI", "campaign manager chatbot", "personal shopper AI", "AI beceriler", "ürünler"],
  alternates: {
    canonical: "https://www.getvion.com/products",
  },
  openGraph: {
    title: "Products & Skills | Vion AI",
    description: "AI Sales Chatbot, Visual Diagnosis, Campaign Manager and more.",
    url: "https://www.getvion.com/products",
  },
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
