import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI-Powered Sales Chatbot That Converts Visitors to Customers",
  description: "AmeritAI welcomes your website visitors, answers their questions, and converts them into paying customers. No coding required. Works in 50+ languages. Start your 14-day free trial.",
  keywords: ["AI sales chatbot", "visitor conversion", "website chatbot", "lead generation", "yapay zeka satış asistanı", "ziyaretçi dönüşümü"],
  alternates: {
    canonical: "https://www.ameritai.com",
  },
  openGraph: {
    title: "AmeritAI | The AI That Converts Visitors to Customers",
    description: "Welcome visitors, answer questions, and convert them into customers. No coding required.",
    url: "https://www.ameritai.com",
    locale: "en_US",
    alternateLocale: ["tr_TR"],
  },
};

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
