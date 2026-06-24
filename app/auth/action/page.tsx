import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { AuthActionClient } from "./AuthActionClient"

export default function AuthActionPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-950 dark:bg-zinc-950 dark:text-white">
          <section className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col items-center justify-center text-center">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-950">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">AmeritAI</p>
          </section>
        </main>
      }
    >
      <AuthActionClient />
    </Suspense>
  )
}
