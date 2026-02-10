import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ürünler & Beceriler | Vion AI",
  description: "Vion AI'ın sunduğu tüm yapay zeka becerileri: AI Satış Chatbot, Görsel Tanı, Kampanya Yöneticisi, Kişisel Alışveriş Asistanı ve daha fazlası.",
  alternates: {
    canonical: "https://www.getvion.com/products",
  },
  openGraph: {
    title: "Ürünler & Beceriler | Vion AI",
    description: "AI Satış Chatbot, Görsel Tanı, Kampanya Yöneticisi ve daha fazlası.",
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
