import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us — Get a Demo or Support",
  description: "Get in touch with the Vion AI team. Request a live demo, get technical support, or explore partnership opportunities. We're here to help.",
  alternates: {
    canonical: "https://www.getvion.com/contact",
  },
  openGraph: {
    title: "Contact Vion AI",
    description: "Request a demo, get support, or explore partnerships.",
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
