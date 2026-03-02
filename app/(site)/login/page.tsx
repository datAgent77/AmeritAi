"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, User, sendEmailVerification } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { VionLogo } from "@/components/vion-logo"
import Image from "next/image"
import { useLanguage } from "@/context/LanguageContext"
import { LanguageSwitcher } from "@/components/language-switcher"
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons"
import { recordAuthDebug } from "@/lib/auth-debug"
import { trackMarketingEvent } from "@/lib/marketing-tracking"

function getLoginFailureReason(error: unknown): string {
  if (!error || typeof error !== "object") return "unknown_error"
  const maybeCode = "code" in error ? String((error as { code?: string }).code || "") : ""
  if (!maybeCode) return "unknown_error"
  return maybeCode.replace(/^auth\//, "")
}

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isResendingVerification, setIsResendingVerification] = useState(false)
  const [showResendVerificationButton, setShowResendVerificationButton] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { toast } = useToast()
  const { t, language } = useLanguage()

  const signOutWithDebug = async (reason: string) => {
    recordAuthDebug("login_signout_triggered", { reason })
    await auth.signOut()
    recordAuthDebug("login_signout_completed", { reason })
  }

  const sendVerificationEmailWithFallback = async (user: User) => {
    const continueUrl = `${window.location.origin}/login`

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/auth/send-verification-email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          continueUrl,
          language,
          name: user.displayName || "",
        }),
      })

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`
        try {
          const data = await response.json()
          if (data?.error) errorMessage = data.error
        } catch {
          // ignore JSON parse failures; status is enough for fallback logs
        }
        throw new Error(errorMessage)
      }

      return "custom" as const
    } catch (customError) {
      console.warn("Custom verification email send failed, falling back to Firebase:", customError)
      await sendEmailVerification(user, { url: continueUrl })
      return "firebase" as const
    }
  }

  // Handle social auth success
  const handleSocialAuthSuccess = async (user: User, providerId: string) => {
    try {
      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid))

      if (userDoc.exists()) {
        const userData = userDoc.data()
        if (userData.isActive === false) {
          await signOutWithDebug("login_social_inactive_user")
          trackMarketingEvent("login_submit_failed", {
            reason_code: "inactive_user",
            method: providerId,
            language,
          })
          setError(t('accountPendingApproval'))
          return
        }
        // User exists and is active, redirect to platform
        router.push("/console/chatbot")
      } else {
        // New user from social login - redirect to signup to complete profile
        // The signup page will detect the existing social auth and show the form step
        router.push("/signup")
      }
    } catch (error: any) {
      console.error("Social auth error:", error)
      trackMarketingEvent("login_submit_failed", {
        reason_code: getLoginFailureReason(error),
        method: providerId,
        language,
      })
      setError(error.message || "Authentication failed")
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setShowResendVerificationButton(false)

    try {
      // Ensure persistence is set before signing in
      await setPersistence(auth, browserLocalPersistence)
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      await userCredential.user.reload()

      if (!userCredential.user.emailVerified) {
        let emailVerificationBypassEnabled = false
        try {
          const userDoc = await getDoc(doc(db, "users", userCredential.user.uid))
          if (userDoc.exists()) {
            emailVerificationBypassEnabled = userDoc.data()?.emailVerificationBypass?.enabled === true
          }
        } catch (bypassCheckError) {
          console.warn("Could not check email verification bypass marker:", bypassCheckError)
        }

        if (emailVerificationBypassEnabled) {
          console.log("Login: Email verification bypass marker detected for user", userCredential.user.uid)
        } else {
          try {
            await sendVerificationEmailWithFallback(userCredential.user)
          } catch (verificationError) {
            console.warn("Could not re-send verification email:", verificationError)
          }
          await signOutWithDebug("login_email_unverified_user")

          const verifyMsg = language === 'tr'
            ? "E-posta adresinizi doğrulamadan giriş yapamazsınız. Doğrulama bağlantısını tekrar gönderdik."
            : "You must verify your email before logging in. We've sent a new verification link."
          trackMarketingEvent("login_submit_failed", {
            reason_code: "unverified_email",
            method: "email",
            language,
          })
          setError(verifyMsg)
          setShowResendVerificationButton(true)
          toast({
            title: language === 'tr' ? "E-posta doğrulaması gerekli" : "Email verification required",
            description: verifyMsg,
            variant: "destructive",
          })
          return
        }
      }

      // Check if user is active in Firestore (wrapped in try-catch for permission errors)
      try {
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          if (userData?.emailVerified !== true) {
            await setDoc(doc(db, "users", userCredential.user.uid), { emailVerified: true }, { merge: true })
          }
          if (userData.isActive === false) {
            await signOutWithDebug("login_email_inactive_user")
            const msg = t('accountPendingApproval')
            trackMarketingEvent("login_submit_failed", {
              reason_code: "inactive_user",
              method: "email",
              language,
            })
            setError(msg)
            toast({
              title: t('accountPendingTitle'),
              description: msg,
              variant: "destructive",
            })
            return
          }
        }
      } catch (firestoreError) {
        // Firestore permission error - proceed with login anyway
        console.warn("Could not check user status in Firestore:", firestoreError)
      }

      router.push("/console/chatbot")
    } catch (error: any) {
      console.error("Login error:", error)
      setShowResendVerificationButton(false)

      // Show more specific error messages
      let errorMessage = t('invalidEmailPassword')

      if (error.code === 'auth/user-not-found') {
        errorMessage = language === 'tr'
          ? 'Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.'
          : 'No user found with this email address.'
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = language === 'tr'
          ? 'Şifre hatalı. Lütfen tekrar deneyin.'
          : 'Incorrect password. Please try again.'
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = language === 'tr'
          ? 'E-posta veya şifre hatalı. Lütfen kontrol edin.'
          : 'Invalid email or password. Please check and try again.'
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = language === 'tr'
          ? 'Çok fazla başarısız deneme. Lütfen birkaç dakika bekleyin.'
          : 'Too many failed attempts. Please wait a few minutes.'
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = language === 'tr'
          ? 'Bu hesap devre dışı bırakılmış.'
          : 'This account has been disabled.'
      }

      trackMarketingEvent("login_submit_failed", {
        reason_code: getLoginFailureReason(error),
        method: "email",
        language,
      })
      setError(errorMessage)
      toast({
        title: t('error'),
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!email || !password) {
      const msg = language === 'tr'
        ? 'Lütfen e-posta ve şifre alanlarını doldurun.'
        : 'Please enter your email and password.'
      setError(msg)
      toast({
        title: language === 'tr' ? 'Eksik bilgi' : 'Missing information',
        description: msg,
        variant: 'destructive',
      })
      return
    }

    setIsResendingVerification(true)
    setError("")

    try {
      await setPersistence(auth, browserLocalPersistence)
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      await userCredential.user.reload()

      if (userCredential.user.emailVerified) {
        await signOutWithDebug("login_resend_already_verified")
        setShowResendVerificationButton(false)
        const msg = language === 'tr'
          ? 'Bu hesap zaten doğrulanmış görünüyor. Giriş yapmayı tekrar deneyin.'
          : 'This account is already verified. Please try logging in again.'
        toast({
          title: language === 'tr' ? 'Hesap doğrulanmış' : 'Account verified',
          description: msg,
        })
        return
      }

      await sendVerificationEmailWithFallback(userCredential.user)
      await signOutWithDebug("login_resend_after_send")

      const msg = language === 'tr'
        ? 'Doğrulama e-postası tekrar gönderildi. Spam klasörünü de kontrol edin.'
        : 'Verification email re-sent. Please also check your spam folder.'

      setError(msg)
      setShowResendVerificationButton(true)
      toast({
        title: language === 'tr' ? 'Doğrulama e-postası gönderildi' : 'Verification email sent',
        description: msg,
      })
    } catch (error: any) {
      console.error("Resend verification error:", error)

      let errorMessage = language === 'tr'
        ? 'Doğrulama e-postası gönderilemedi. Lütfen tekrar deneyin.'
        : 'Could not send verification email. Please try again.'

      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        errorMessage = language === 'tr'
          ? 'Şifre hatalı olduğu için doğrulama e-postası gönderilemedi.'
          : 'Verification email could not be sent because the password is incorrect.'
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = language === 'tr'
          ? 'Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.'
          : 'Too many attempts. Please try again in a few minutes.'
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = language === 'tr'
          ? 'Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.'
          : 'No user found with this email address.'
      }

      setError(errorMessage)
      toast({
        title: language === 'tr' ? 'Hata' : 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsResendingVerification(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black flex flex-col">
      {/* Header */}
      {/* Header */}
      <header className="flex items-center justify-between p-4 md:p-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative w-8 h-8">
            <Image src="/vion-logo-icon-dark.png" alt="Vion" fill className="object-contain dark:hidden" />
            <Image src="/vion-logo-icon-white.png" alt="Vion" fill className="object-contain hidden dark:block" />
          </div>
          <span className="font-bold text-xl tracking-tight">Vion</span>
        </Link>
        <div className="flex items-center gap-2 md:gap-3">
          <LanguageSwitcher />
          <Link href="/signup" className="hidden md:block">
            <Button variant="outline" size="sm" className="whitespace-nowrap">
              {language === 'tr' ? '14 Gün Ücretsiz Dene' : 'Try 14 Days Free'}
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {language === 'tr' ? 'Tekrar Hoşgeldiniz' : 'Welcome back'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'tr' ? 'Hesabınıza giriş yapın' : 'Log in to your account'}
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="space-y-3">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
              {showResendVerificationButton && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10 border-zinc-700/60 dark:border-zinc-700 hover:bg-zinc-900/40"
                  onClick={handleResendVerification}
                  disabled={isLoading || isResendingVerification}
                >
                  {isResendingVerification ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {language === 'tr' ? 'Gönderiliyor...' : 'Sending...'}
                    </>
                  ) : (
                    language === 'tr' ? 'Doğrulama E-postasını Tekrar Gönder' : 'Resend Verification Email'
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Social Auth Buttons */}
          <SocialAuthButtons
            mode="login"
            onSuccess={handleSocialAuthSuccess}
            disabled={isLoading}
          />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-black px-2 text-muted-foreground">
                {language === 'tr' ? 'veya' : 'or'}
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                {language === 'tr' ? 'E-posta' : 'Email'}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@admin.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t('password')}</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  {t('forgotPassword')}
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={language === 'tr' ? '12 karakter veya daha fazla' : '12 characters or more'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 mt-12"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('loggingIn')}
                </>
              ) : (
                language === 'tr' ? 'E-posta ile Giriş Yap' : 'Log in with email'
              )}
            </Button>
          </form>

          {/* Signup Link */}
          <p className="text-center text-sm text-muted-foreground">
            {t('dontHaveAccount')}{" "}
            <Link href="/signup" className="text-primary hover:underline font-medium">
              {t('signUp')}
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-sm text-muted-foreground">
        © 2025 Vion. {t('landingAllRights')}
      </footer>
    </div>
  )
}
