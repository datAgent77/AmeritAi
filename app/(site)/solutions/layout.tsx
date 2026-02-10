import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Solutions — Custom AI Solutions for Your Business",
  description: "Tailored AI solutions for sales automation, customer support, appointment management, and more. See how Vion AI solves real business problems.",
  keywords: ["AI solutions", "business AI", "sales automation solution", "AI çözümleri", "işletme yapay zeka"],
  alternates: {
    canonical: "https://www.getvion.com/solutions",
  },
  openGraph: {
    title: "Solutions | Vion AI",
    description: "Custom AI solutions for sales, support, and appointment management.",
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
