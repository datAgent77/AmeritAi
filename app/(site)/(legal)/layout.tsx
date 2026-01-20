import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-4xl px-6">
          {children}
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
