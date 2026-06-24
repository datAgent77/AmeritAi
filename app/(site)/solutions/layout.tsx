import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Solutions — Custom AI Solutions for Your Business",
  description: "Tailored AI solutions for sales automation, customer support, appointment management, and more. See how AmeritAI solves real business problems.",
  keywords: ["AI solutions", "business AI", "sales automation solution", "AI çözümleri", "işletme yapay zeka"],
  alternates: {
    canonical: "https://www.ameritai.com/solutions",
  },
  openGraph: {
    title: "Solutions | AmeritAI",
    description: "Custom AI solutions for sales, support, and appointment management.",
    url: "https://www.ameritai.com/solutions",
  },
};

export default function SolutionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
