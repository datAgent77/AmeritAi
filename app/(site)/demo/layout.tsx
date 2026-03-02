import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Live Demo — Vion AI",
  description:
    "See how Vion AI chatbot welcomes visitors, answers instantly, and converts traffic into qualified leads.",
  alternates: {
    canonical: "https://www.getvion.com/demo",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Vion AI Demo",
    description:
      "Clean demo landing page for Vion AI chatbot. Learn value fast and start for free.",
    url: "https://www.getvion.com/demo",
  },
}

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
