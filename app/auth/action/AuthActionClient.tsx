"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { applyActionCode } from "firebase/auth"
import { Loader2 } from "lucide-react"
import { auth } from "@/lib/firebase"

type VerificationState = "loading" | "success" | "error"

function isTurkishLanguage(language: string | null): boolean {
  return language?.toLowerCase().startsWith("tr") === true
}

function getSafeRedirectPath(rawContinueUrl: string | null, status: "success" | "error"): string {
  const fallbackUrl = new URL("/login", window.location.origin)

  try {
    const candidateUrl = rawContinueUrl
      ? new URL(rawContinueUrl, window.location.origin)
      : fallbackUrl

    if (candidateUrl.origin !== window.location.origin) {
      fallbackUrl.searchParams.set("verified", status)
      return `${fallbackUrl.pathname}${fallbackUrl.search}${fallbackUrl.hash}`
    }

    candidateUrl.searchParams.set("verified", status)
    return `${candidateUrl.pathname}${candidateUrl.search}${candidateUrl.hash}`
  } catch {
    fallbackUrl.searchParams.set("verified", status)
    return `${fallbackUrl.pathname}${fallbackUrl.search}${fallbackUrl.hash}`
  }
}

export function AuthActionClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = useState<VerificationState>("loading")

  const copy = useMemo(() => {
    const isTr = isTurkishLanguage(searchParams.get("lang"))

    return {
      title: isTr ? "E-posta doğrulanıyor" : "Verifying email",
      description: isTr
        ? "Hesabınız doğrulanıyor. Birkaç saniye içinde giriş ekranına yönlendirileceksiniz."
        : "We are verifying your account. You will be redirected to sign in in a few seconds.",
      successTitle: isTr ? "E-posta doğrulandı" : "Email verified",
      successDescription: isTr
        ? "Giriş ekranına yönlendiriliyorsunuz."
        : "Redirecting you to sign in.",
      errorTitle: isTr ? "Doğrulama bağlantısı geçersiz" : "Verification link is invalid",
      errorDescription: isTr
        ? "Bağlantı süresi dolmuş olabilir. Giriş ekranından yeni doğrulama e-postası isteyebilirsiniz."
        : "The link may have expired. You can request a new verification email from the sign-in page.",
    }
  }, [searchParams])

  useEffect(() => {
    const mode = searchParams.get("mode")
    const oobCode = searchParams.get("oobCode")
    const continueUrl = searchParams.get("continueUrl")

    if (mode !== "verifyEmail" || !oobCode) {
      setState("error")
      router.replace(getSafeRedirectPath(continueUrl, "error"))
      return
    }

    let isMounted = true

    const verifyEmail = async () => {
      try {
        await applyActionCode(auth, oobCode)
        await auth.currentUser?.reload()

        if (!isMounted) return
        setState("success")
        router.replace(getSafeRedirectPath(continueUrl, "success"))
      } catch (error) {
        console.error("Email verification action failed:", error)

        if (!isMounted) return
        setState("error")
        router.replace(getSafeRedirectPath(continueUrl, "error"))
      }
    }

    void verifyEmail()

    return () => {
      isMounted = false
    }
  }, [router, searchParams])

  const isError = state === "error"
  const isSuccess = state === "success"

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-950 dark:bg-zinc-950 dark:text-white">
      <section className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col items-center justify-center text-center">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-950">
          {state === "loading" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <span className="text-lg font-semibold">{isSuccess ? "✓" : "!"}</span>
          )}
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">AmeritAI</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          {isSuccess ? copy.successTitle : isError ? copy.errorTitle : copy.title}
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          {isSuccess ? copy.successDescription : isError ? copy.errorDescription : copy.description}
        </p>
      </section>
    </main>
  )
}
