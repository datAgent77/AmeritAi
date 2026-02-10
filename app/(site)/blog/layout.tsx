import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog | Vion AI — AI ve İşletme Otomasyonu Yazıları",
  description: "Yapay zeka, chatbot teknolojileri, müşteri deneyimi ve işletme otomasyonu hakkında güncel blog yazıları. AI trendlerini takip edin.",
  alternates: {
    canonical: "https://www.getvion.com/blog",
  },
  openGraph: {
    title: "Blog | Vion AI",
    description: "AI, chatbot ve işletme otomasyonu hakkında güncel yazılar.",
    url: "https://www.getvion.com/blog",
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
