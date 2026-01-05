"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, User } from "firebase/auth"
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

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { toast } = useToast()
  const { t, language } = useLanguage()

  // Handle social auth success
  const handleSocialAuthSuccess = async (user: User, providerId: string) => {
    try {
      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid))

      if (userDoc.exists()) {
        const userData = userDoc.data()
        if (userData.isActive === false) {
          await auth.signOut()
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
      setError(error.message || "Authentication failed")
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      // Ensure persistence is set before signing in
      await setPersistence(auth, browserLocalPersistence)
      const userCredential = await signInWithEmailAndPassword(auth, email, password)

      // Check if user is active in Firestore (wrapped in try-catch for permission errors)
      try {
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          if (userData.isActive === false) {
            await auth.signOut()
            const msg = t('accountPendingApproval')
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
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
              {error}
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
              className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 mt-8"
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
