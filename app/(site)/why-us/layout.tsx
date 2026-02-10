import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Neden Vion AI? | Rakiplerden Farkımız",
  description: "Vion AI'ı tercih etmeniz için 10 neden. Kolay kurulum, sektöre özel AI, çoklu dil desteği, gerçek zamanlı analitik ve daha fazlası. Rakiplerle karşılaştırın.",
  alternates: {
    canonical: "https://www.getvion.com/why-us",
  },
  openGraph: {
    title: "Neden Vion AI?",
    description: "Kolay kurulum, sektöre özel AI, çoklu dil desteği ve gerçek zamanlı analitik.",
    url: "https://www.getvion.com/why-us",
  },
};

export default function WhyUsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
