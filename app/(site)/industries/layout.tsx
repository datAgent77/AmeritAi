import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Industries — AI Chatbot Solutions for Every Sector",
  description: "Custom AI chatbot solutions for restaurants, e-commerce, healthcare, education, law firms, real estate, and more. See how Vion AI transforms your industry.",
  keywords: ["restaurant chatbot", "e-commerce chatbot", "healthcare AI", "education chatbot", "sektörel chatbot", "restoran chatbot"],
  alternates: {
    canonical: "https://www.getvion.com/industries",
  },
  openGraph: {
    title: "Industries | Vion AI",
    description: "Custom AI chatbot solutions for every industry. Restaurant, e-commerce, healthcare and more.",
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
