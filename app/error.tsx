"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, RefreshCw } from "lucide-react"

const CHUNK_RELOAD_KEY = "vion-chunk-reload-attempted"

function isChunkLoadError(error: Error & { digest?: string }) {
  const payload = `${error?.name || ""} ${error?.message || ""} ${error?.digest || ""}`
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|CSS_CHUNK_LOAD_FAILED/i.test(payload)
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("App segment error:", error)

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
    <div className="flex min-h-[60vh] items-center justify-center bg-[#f4f6f8] px-6 py-16">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Bir hata olustu
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Sayfa yuklenirken beklenmeyen bir sorun olustu. Tekrar deneyebilir veya ana
          ekrana donebilirsiniz.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            Tekrar Dene
          </button>
          <Link
            href="/console/chatbot"
            className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Panele Don
          </Link>
        </div>

        {error.digest ? (
          <p className="mt-6 text-xs text-slate-400">Hata kodu: {error.digest}</p>
        ) : null}
      </div>
    </div>
  )
}
