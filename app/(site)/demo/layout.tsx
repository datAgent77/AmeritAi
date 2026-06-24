import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Live Demo — AmeritAI",
  description:
    "See how AmeritAI chatbot welcomes visitors, answers instantly, and converts traffic into qualified leads.",
  alternates: {
    canonical: "https://www.ameritai.com/demo",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "AmeritAI Demo",
    description:
      "Clean demo landing page for AmeritAI chatbot. Learn value fast and start for free.",
    url: "https://www.ameritai.com/demo",
  },
}

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
