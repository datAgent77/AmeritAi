import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fiyatlandırma | Vion AI — Esnek ve Şeffaf Planlar",
  description: "Vion AI fiyatlandırma planları. Starter, Growth, Business ve Enterprise seçenekleri ile işletmenize uygun planı seçin. 14 gün ücretsiz deneyin.",
  alternates: {
    canonical: "https://www.getvion.com/pricing",
  },
  openGraph: {
    title: "Fiyatlandırma | Vion AI",
    description: "Esnek ve şeffaf fiyatlandırma planları. 14 gün ücretsiz deneyin.",
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
