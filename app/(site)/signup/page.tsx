"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useEffect, useRef, useState } from "react"
import { createUserWithEmailAndPassword, sendEmailVerification, User } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CheckCircle2, ArrowLeft, Eye, EyeOff } from "lucide-react"
import { VionLogo } from "@/components/vion-logo"
import Image from "next/image"
import { useLanguage } from "@/context/LanguageContext"
import { LanguageSwitcher } from "@/components/language-switcher"
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons"
import { PasswordStrength, isPasswordStrong } from "@/components/auth/password-strength"
import { PhoneInput } from "@/components/auth/phone-input"
import { event as trackEvent } from "@/lib/gtag"
import { trackMarketingEvent, trackSignUp } from "@/lib/marketing-tracking"

type SignupStep = 'initial' | 'form' | 'success'

export default function SignUpForm() {
    // Step management
    const [step, setStep] = useState<SignupStep>('initial')

    // Form state
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [fullName, setFullName] = useState("")
    const [phoneNumber, setPhoneNumber] = useState("")


    // UI state
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    // Social auth state
    const [authProvider, setAuthProvider] = useState<string>('email')
    const [socialUser, setSocialUser] = useState<User | null>(null)

    const router = useRouter()
    const searchParams = useSearchParams()
    const plan = searchParams.get('plan')
    const cycle = searchParams.get('cycle')

    const { toast } = useToast()
    const { t, language } = useLanguage()
    const signupEntryTrackedRef = useRef(false)

    useEffect(() => {
        if (signupEntryTrackedRef.current) return
        signupEntryTrackedRef.current = true

        trackMarketingEvent('signup_page_view', {
            plan_id: plan || 'trial',
            billing_cycle: cycle || 'monthly',
            language
        })
    }, [plan, cycle, language])

    // Handle email submit to go to form step
    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (email) {
            setStep('form')
            trackMarketingEvent('sign_up_start', {
                method: 'email',
                language
            })
        }
    }

    // Handle social auth success
    const handleSocialAuthSuccess = async (user: User, providerId: string) => {
        setSocialUser(user)
        setAuthProvider(providerId)
        setEmail(user.email || '')
        setFullName(user.displayName || '')
        trackMarketingEvent('sign_up_start', {
            method: providerId,
            language
        })

        try {
            // Check if user exists
            const userDoc = await getDoc(doc(db, "users", user.uid))
            if (userDoc.exists()) {
                router.push("/platform")
                return
            }
        } catch (e) {
            // Proceed to form
        }

        // New user, go to form step
        setStep('form')
    }

    // Call Server-Side Registration
    const registerUserOnServer = async (user: User, additionalData: any = {}) => {
        const token = await user.getIdToken();
        const response = await fetch('/api/auth/register-user', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: user.email,
                fullName: fullName || user.displayName,
                phoneNumber,
                industry: 'ecommerce',
                authProvider,
                plan: plan || 'trial',
                billingCycle: cycle || 'monthly',
                ...additionalData
            })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Registration failed on server");
        }

        // Send admin notification
        fetch('/api/admin/notify-signup', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: user.email,
                name: fullName || user.displayName,
                company: fullName || user.displayName
            })
        }).catch(err => console.error("Notify error", err));
    }

    // Handle form submission
    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setIsLoading(true)

        try {
            let user = socialUser;
            let requiresEmailVerification = false;

            if (user) {
                // Social auth user - Register on server
                await registerUserOnServer(user);
                await auth.signOut()
            } else {
                // Email/password signup
                if (!isPasswordStrong(password)) {
                    setError(
                        language === 'tr'
                            ? 'Şifre en az 8 karakter olmalı ve harf, sayı, sembolden en az ikisini içermelidir.'
                            : 'Password must be at least 8 characters and include at least 2 of: letters, numbers, symbols.'
                    )
                    setIsLoading(false)
                    return
                }

                const userCredential = await createUserWithEmailAndPassword(auth, email, password)
                user = userCredential.user;
                await sendEmailVerification(user, {
                    url: `${window.location.origin}/login`
                });
                requiresEmailVerification = true;
                await registerUserOnServer(user, { authProvider: 'email' });
                await auth.signOut()
            }

            if (requiresEmailVerification) {
                toast({
                    title: language === 'tr' ? "Doğrulama e-postası gönderildi" : "Verification email sent",
                    description: language === 'tr'
                        ? "Giriş yapmadan önce e-posta adresinizi doğrulayın."
                        : "Please verify your email address before logging in.",
                })
            } else {
                toast({
                    title: t('success'),
                    description: t('accountCreatedRedirecting') || "Hesabınız oluşturuldu, yönlendiriliyorsunuz...",
                })
            }

            // Track Signup Event
            trackEvent({
                action: 'user_signup',
                category: 'Auth',
                label: authProvider || 'email'
            })
            trackSignUp(authProvider || 'email', language)
            trackMarketingEvent('signup_completed', {
                method: authProvider || 'email',
                plan_id: plan || 'trial',
                billing_cycle: cycle || 'monthly',
                language
            })
            trackMarketingEvent('start_trial', {
                plan_id: plan || 'trial',
                billing_cycle: cycle || 'monthly',
                method: authProvider || 'email',
                language
            })

            if (requiresEmailVerification) {
                router.push("/login?verifyEmail=1")
            } else {
                // Redirect to Onboarding
                router.push("/onboarding")
            }

        } catch (error: any) {
            console.error("Sign up error:", error)
            let errorMessage = error.message || t('failedToCreateAccount')

            if (error.code === 'auth/email-already-in-use') {
                errorMessage = language === 'tr'
                    ? "Bu e-posta adresi zaten kullanılıyor. Lütfen giriş yapın."
                    : "This email address is already in use. Please sign in instead."
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

    // Success state
    if (step === 'success') {
        return (
            <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black flex flex-col">
                <header className="flex items-center justify-between p-6">
                    <Link href="/">
                        <VionLogo variant="black" className="text-2xl dark:hidden" />
                        <VionLogo variant="white" className="text-2xl hidden dark:block" />
                    </Link>
                    <Link href="/login">
                        <Button variant="outline" size="sm">
                            {t('login')}
                        </Button>
                    </Link>
                </header>

                <main className="flex-1 flex items-center justify-center p-6">
                    <div className="w-full max-w-md text-center space-y-6">
                        <div className="flex justify-center">
                            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-bold tracking-tight">{t('applicationReceived')}</h1>
                            <p className="text-muted-foreground">
                                {t('applicationPendingMsg')}
                            </p>
                        </div>
                        <Link href="/login">
                            <Button className="w-full h-11">
                                {t('returnToLogin')}
                            </Button>
                        </Link>
                    </div>
                </main>

                <footer className="p-6 text-center text-sm text-muted-foreground">
                    © 2025 Vion. {t('landingAllRights')}
                </footer>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black flex flex-col">
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
                    <Link href="/login" className="hidden md:block">
                        <Button variant="outline" size="sm" className="whitespace-nowrap">
                            {t('login')}
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
                            {language === 'tr' ? '14 Gün Ücretsiz Deneyin' : 'Try 14 Days Free'}
                        </h1>
                        <p className="text-muted-foreground">
                            {language === 'tr' ? 'Kredi kartı gerekmez, anında erişim' : 'No credit card needed, instant access'}
                        </p>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Step: Initial - Social + Email */}
                    {step === 'initial' && (
                        <div className="space-y-6">
                            <SocialAuthButtons
                                mode="signup"
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

                            {/* Email Input */}
                            <form onSubmit={handleEmailSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">
                                        {language === 'tr' ? 'E-posta' : 'Email'}
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder={language === 'tr' ? 'ornek@email.com' : 'john@example.com'}
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="h-11"
                                    />
                                </div>
                                <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 mt-12">
                                    {language === 'tr' ? 'E-posta ile Kayıt Ol' : 'Sign up with email'}
                                </Button>
                            </form>

                            {/* Login Link */}
                            <p className="text-center text-sm text-muted-foreground">
                                {t('alreadyHaveAccount')}{" "}
                                <Link href="/login" className="text-primary hover:underline font-medium">
                                    {t('signIn')}
                                </Link>
                            </p>

                            {/* Terms */}
                            <p className="text-center text-xs text-muted-foreground">
                                {language === 'tr'
                                    ? 'Kayıt olarak '
                                    : 'You agree to our '}
                                <Link href="/terms" className="text-primary hover:underline">
                                    {language === 'tr' ? 'Kullanım Koşulları' : 'Terms of Use'}
                                </Link>
                                {language === 'tr' ? ' ve ' : ' and '}
                                <Link href="/privacy" className="text-primary hover:underline">
                                    {language === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy'}
                                </Link>
                                {language === 'tr' ? "'nı kabul etmiş olursunuz." : ''}
                            </p>
                        </div>
                    )}

                    {/* Step: Form - Full Details */}
                    {step === 'form' && (
                        <form onSubmit={handleSignUp} className="space-y-4">
                            {/* Back Button */}
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="mb-2 -ml-2"
                                onClick={() => {
                                    setStep('initial')
                                    setSocialUser(null)
                                    setAuthProvider('email')
                                }}
                            >
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                {language === 'tr' ? 'Geri' : 'Back'}
                            </Button>

                            {/* Email (read-only if set) */}
                            <div className="space-y-2">
                                <Label htmlFor="email">
                                    {language === 'tr' ? 'E-posta' : 'Email'}
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={!!socialUser}
                                    className="h-11"
                                />
                            </div>

                            {/* Password (only for email signup) */}
                            {!socialUser && (
                                <div className="space-y-2">
                                    <Label htmlFor="password">{t('password')}</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder={language === 'tr' ? 'Şifrenizi belirleyin' : 'Set your password'}
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
                                    <PasswordStrength password={password} language={language} className="mt-2" />
                                </div>
                            )}

                            {/* Full Name */}
                            <div className="space-y-2">
                                <Label htmlFor="fullName">
                                    {language === 'tr' ? 'Ad Soyad' : 'Full name'}
                                </Label>
                                <Input
                                    id="fullName"
                                    placeholder="John Smith"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="h-11"
                                />
                            </div>

                            {/* Phone Number */}
                            <div className="space-y-2">
                                <Label htmlFor="phone">
                                    {language === 'tr' ? 'Cep Telefonu' : 'Mobile phone number'}
                                </Label>
                                <PhoneInput
                                    value={phoneNumber}
                                    onChange={setPhoneNumber}
                                    defaultCountry="TR"
                                />
                            </div>


                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="w-full h-11 bg-primary hover:bg-primary/90 mt-12"
                                disabled={isLoading || (!socialUser && !isPasswordStrong(password))}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t('submitting')}
                                    </>
                                ) : (
                                    language === 'tr' ? 'Hesap Oluştur' : 'Create an account'
                                )}
                            </Button>

                            {/* Login Link */}
                            <p className="text-center text-sm text-muted-foreground">
                                {t('alreadyHaveAccount')}{" "}
                                <Link href="/login" className="text-primary hover:underline font-medium">
                                    {t('signIn')}
                                </Link>
                            </p>

                            {/* Terms */}
                            <p className="text-center text-xs text-muted-foreground">
                                {language === 'tr'
                                    ? 'Kayıt olarak '
                                    : 'You agree to our '}
                                <Link href="/terms" className="text-primary hover:underline">
                                    {language === 'tr' ? 'Kullanım Koşulları' : 'Terms of Use'}
                                </Link>
                                {language === 'tr' ? ' ve ' : ' and '}
                                <Link href="/privacy" className="text-primary hover:underline">
                                    {language === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy'}
                                </Link>
                                {language === 'tr' ? "'nı kabul etmiş olursunuz." : ''}
                            </p>
                        </form>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="p-6 text-center text-sm text-muted-foreground">
                © 2025 Vion. {t('landingAllRights')}
            </footer>
        </div>
    )
}
