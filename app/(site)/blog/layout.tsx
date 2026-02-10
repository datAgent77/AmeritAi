import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog — AI, Chatbots & Business Automation Insights",
  description: "Latest articles on artificial intelligence, chatbot technology, customer experience, and business automation. Stay ahead with Vion AI's expert content.",
  keywords: ["AI blog", "chatbot articles", "business automation blog", "yapay zeka blog", "chatbot yazıları"],
  alternates: {
    canonical: "https://www.getvion.com/blog",
  },
  openGraph: {
    title: "Blog | Vion AI",
    description: "Expert content on AI, chatbots, and business automation.",
    url: "https://www.getvion.com/blog",
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
