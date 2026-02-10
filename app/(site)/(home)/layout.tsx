import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vion AI | Ziyaretçiyi Müşteriye Dönüştüren Yapay Zeka",
  description: "Vion AI, web sitenize gelen ziyaretçileri karşılar, sorularını yanıtlar ve onları müşteriye dönüştürür. 7/24 çalışan AI satış asistanı ile dönüşüm oranlarınızı artırın.",
  keywords: ["AI chatbot", "yapay zeka asistan", "satış otomasyonu", "müşteri dönüşümü", "chatbot", "web sitesi chatbot", "AI sales assistant"],
  alternates: {
    canonical: "https://www.getvion.com",
  },
  openGraph: {
    title: "Vion AI | Ziyaretçiyi Müşteriye Dönüştüren Yapay Zeka",
    description: "Web sitenize gelen ziyaretçileri karşılayan, sorularını yanıtlayan ve onları müşteriye dönüştüren AI asistan.",
    url: "https://www.getvion.com",
  },
};

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
