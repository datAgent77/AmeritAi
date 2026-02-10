import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sıkça Sorulan Sorular | Vion AI",
  description: "Vion AI hakkında en çok sorulan sorular ve yanıtları. Kurulum, fiyatlandırma, entegrasyon, güvenlik ve daha fazlası hakkında bilgi alın.",
  alternates: {
    canonical: "https://www.getvion.com/resources/faq",
  },
  openGraph: {
    title: "SSS | Vion AI",
    description: "Vion AI hakkında sıkça sorulan sorular ve yanıtları.",
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
