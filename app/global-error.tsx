"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"

const CHUNK_RELOAD_KEY = "vion-chunk-reload-attempted"

function isChunkLoadError(error: Error & { digest?: string }) {
  const payload = `${error?.name || ""} ${error?.message || ""} ${error?.digest || ""}`
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|CSS_CHUNK_LOAD_FAILED/i.test(payload)
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global app error:", error)

    if (typeof window === "undefined" || !isChunkLoadError(error)) return

    const hasReloaded = window.sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1"
    if (!hasReloaded) {
      window.sessionStorage.setItem(CHUNK_RELOAD_KEY, "1")
      window.location.reload()
    }
  }, [error])

  const handleRetry = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(CHUNK_RELOAD_KEY)
    }
    reset()
  }

  return (
    <html lang="tr">
      <body className="m-0 bg-[#f4f6f8] font-sans text-slate-900">
        <div className="flex min-h-screen items-center justify-center px-6 py-16">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <h1 className="text-3xl font-semibold tracking-tight">
              Uygulama gecici olarak kullanilamiyor
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Beklenmeyen bir uygulama hatasi olustu. Sayfayi yenileyebilir veya ana
              ekrana donebilirsiniz.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRetry}
                className="rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Tekrar Dene
              </button>
              <Link
                href="/"
                className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Ana Sayfaya Don
              </Link>
            </div>

            {error.digest ? (
              <p className="mt-6 text-xs text-slate-400">Hata kodu: {error.digest}</p>
            ) : null}
          </div>
        </div>
      </body>
    </html>
  )
}
