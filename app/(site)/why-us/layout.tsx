import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Why Choose Vion AI? | Intelligent Business Automation",
  description: "Discover why businesses trust Vion AI. From context-aware technology to seamless integration, see how we outperform traditional solutions.",
};

export default function WhyUsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
