import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vion AI Pricing | Flexible Plans for Growing Businesses",
  description: "Explore Vion AI pricing plans. Choose the perfect solution for your business with our scalable and transparent pricing models.",
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
