import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog — AI, Chatbots & Business Automation Insights",
  description: "Latest articles on artificial intelligence, chatbot technology, customer experience, and business automation. Stay ahead with AmeritAI's expert content.",
  keywords: ["AI blog", "chatbot articles", "business automation blog", "yapay zeka blog", "chatbot yazıları"],
  alternates: {
    canonical: "https://www.ameritai.com/blog",
  },
  openGraph: {
    title: "Blog | AmeritAI",
    description: "Expert content on AI, chatbots, and business automation.",
    url: "https://www.ameritai.com/blog",
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
