"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect, Suspense } from "react"
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { LanguageSwitcher } from "@/components/language-switcher"
import { VionLogo } from "@/components/vion-logo"
import { PasswordStrength, isPasswordStrong } from "@/components/auth/password-strength"

function ResetPasswordContent() {
    const searchParams = useSearchParams()
    const oobCode = searchParams.get('oobCode')

    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isVerifying, setIsVerifying] = useState(true)
    const [isSuccess, setIsSuccess] = useState(false)
    const [email, setEmail] = useState("")
    const [error, setError] = useState("")

    const router = useRouter()
    const { toast } = useToast()
    const { t, language } = useLanguage()

    useEffect(() => {
        const verifyCode = async () => {
            if (!oobCode) {
                setError(language === 'tr' ? 'Geçersiz veya süresi dolmuş link.' : 'Invalid or expired link.')
                setIsVerifying(false)
                return
            }

            try {
                const userEmail = await verifyPasswordResetCode(auth, oobCode)
                setEmail(userEmail)
            } catch (error: any) {
                console.error("Verify code error:", error)
                setError(language === 'tr'
                    ? 'Bu şifre sıfırlama linki geçersiz veya süresi dolmuş.'
                    : 'This password reset link is invalid or expired.')
            } finally {
                setIsVerifying(false)
            }
        }

        verifyCode()
    }, [oobCode, language])

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (password !== confirmPassword) {
            setError(language === 'tr' ? 'Şifreler eşleşmiyor.' : 'Passwords do not match.')
            return
        }

        if (!isPasswordStrong(password)) {
            setError(
                language === 'tr'
                    ? 'Şifre en az 8 karakter olmalı ve harf, sayı, sembolden en az ikisini içermelidir.'
                    : 'Password must be at least 8 characters and include at least 2 of: letters, numbers, symbols.'
            )
            return
        }

        setIsLoading(true)

        try {
            await confirmPasswordReset(auth, oobCode!, password)
            setIsSuccess(true)
            toast({
                title: language === 'tr' ? 'Başarılı!' : 'Success!',
                description: language === 'tr' ? 'Şifreniz başarıyla güncellendi.' : 'Your password has been updated.',
            })
        } catch (error: any) {
            console.error("Reset password error:", error)
            setError(error.message || (language === 'tr' ? 'Bir hata oluştu.' : 'An error occurred.'))
            toast({
                title: t('error'),
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    // Loading state
    if (isVerifying) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // Success state
    if (isSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black flex flex-col">
                <header className="flex items-center justify-between p-6">
                    <Link href="/">
                        <VionLogo variant="black" className="text-2xl dark:hidden" />
                        <VionLogo variant="white" className="text-2xl hidden dark:block" />
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
                            <h1 className="text-3xl font-bold tracking-tight">
                                {language === 'tr' ? 'Şifre Güncellendi!' : 'Password Updated!'}
                            </h1>
                            <p className="text-muted-foreground">
                                {language === 'tr'
                                    ? 'Şifreniz başarıyla güncellendi. Şimdi giriş yapabilirsiniz.'
                                    : 'Your password has been updated. You can now log in.'}
                            </p>
                        </div>
                        <Link href="/login">
                            <Button className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
                                {language === 'tr' ? 'Giriş Yap' : 'Log In'}
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

    // Error state (invalid/expired link)
    if (error && !email) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black flex flex-col">
                <header className="flex items-center justify-between p-6">
                    <Link href="/">
                        <VionLogo variant="black" className="text-2xl dark:hidden" />
                        <VionLogo variant="white" className="text-2xl hidden dark:block" />
                    </Link>
                </header>

                <main className="flex-1 flex items-center justify-center p-6">
                    <div className="w-full max-w-md text-center space-y-6">
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-600 dark:text-red-400">
                            {error}
                        </div>
                        <Link href="/forgot-password">
                            <Button className="w-full h-11">
                                {language === 'tr' ? 'Yeni Şifre Sıfırlama Linki Al' : 'Get New Reset Link'}
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
            <header className="flex items-center justify-between p-6">
                <Link href="/">
                    <VionLogo variant="black" className="text-2xl dark:hidden" />
                    <VionLogo variant="white" className="text-2xl hidden dark:block" />
                </Link>
                <LanguageSwitcher />
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-md space-y-8">
                    {/* Title */}
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight">
                            {language === 'tr' ? 'Yeni Şifre Belirle' : 'Set New Password'}
                        </h1>
                        <p className="text-muted-foreground">
                            {email}
                        </p>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">
                                {language === 'tr' ? 'Yeni Şifre' : 'New Password'}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder={language === 'tr' ? 'Yeni şifrenizi girin' : 'Enter your new password'}
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

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">
                                {language === 'tr' ? 'Şifre Tekrar' : 'Confirm Password'}
                            </Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder={language === 'tr' ? 'Şifrenizi tekrar girin' : 'Confirm your new password'}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="h-11"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                            disabled={isLoading || !isPasswordStrong(password)}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {language === 'tr' ? 'Kaydediliyor...' : 'Saving...'}
                                </>
                            ) : (
                                language === 'tr' ? 'Şifreyi Güncelle' : 'Update Password'
                            )}
                        </Button>
                    </form>
                </div>
            </main>

            {/* Footer */}
            <footer className="p-6 text-center text-sm text-muted-foreground">
                © 2025 Vion. {t('landingAllRights')}
            </footer>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    )
}
