import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us — Get a Demo or Support",
  description: "Get in touch with the AmeritAI team. Request a live demo, get technical support, or explore partnership opportunities. We're here to help.",
  alternates: {
    canonical: "https://www.ameritai.com/contact",
  },
  openGraph: {
    title: "Contact AmeritAI",
    description: "Request a demo, get support, or explore partnerships.",
    url: "https://www.ameritai.com/contact",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
