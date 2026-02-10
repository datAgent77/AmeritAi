import { Metadata } from "next";

export const metadata: Metadata = {
  title: "İletişim | Vion AI",
  description: "Vion AI ekibiyle iletişime geçin. Demo talep edin, teknik destek alın veya iş ortaklığı fırsatlarını değerlendirin. 7/24 size yardımcı olmaya hazırız.",
  alternates: {
    canonical: "https://www.getvion.com/contact",
  },
  openGraph: {
    title: "İletişim | Vion AI",
    description: "Vion AI ekibiyle iletişime geçin. Demo talep edin veya teknik destek alın.",
    url: "https://www.getvion.com/contact",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
