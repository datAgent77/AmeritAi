import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Çözümler | Vion AI — İşletmenize Özel AI Çözümleri",
  description: "Vion AI ile işletmenize özel yapay zeka çözümleri. Satış otomasyonu, müşteri desteği, randevu yönetimi ve daha fazlası için AI destekli çözümler.",
  alternates: {
    canonical: "https://www.getvion.com/solutions",
  },
  openGraph: {
    title: "Çözümler | Vion AI",
    description: "İşletmenize özel AI çözümleri: satış otomasyonu, müşteri desteği ve randevu yönetimi.",
    url: "https://www.getvion.com/solutions",
  },
};

export default function SolutionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
