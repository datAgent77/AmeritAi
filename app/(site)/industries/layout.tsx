import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sektörler | Vion AI — Her Sektöre Özel AI Çözümleri",
  description: "Restoran, e-ticaret, sağlık, eğitim, hukuk ve daha fazlası. Vion AI, sektörünüze özel yapay zeka chatbot çözümleri sunar. Sektörünüzü keşfedin.",
  alternates: {
    canonical: "https://www.getvion.com/industries",
  },
  openGraph: {
    title: "Sektörler | Vion AI",
    description: "Her sektöre özel AI chatbot çözümleri. Restoran, e-ticaret, sağlık ve daha fazlası.",
    url: "https://www.getvion.com/industries",
  },
};

export default function IndustriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
