"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { LanguageSwitcher } from "@/components/language-switcher"
import { VionLogo } from "@/components/vion-logo"

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isEmailSent, setIsEmailSent] = useState(false)
    const { toast } = useToast()
    const { t, language } = useLanguage()

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            await sendPasswordResetEmail(auth, email)
            setIsEmailSent(true)
            toast({
                title: t('emailSent'),
                description: t('resetEmailSent'),
            })
        } catch (error: any) {
            console.error("Reset password error:", error)
            toast({
                title: t('error'),
                description: error.message || t('failedToLoadProfile'),
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    // Success state
    if (isEmailSent) {
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
                            <h1 className="text-3xl font-bold tracking-tight">{t('emailSent')}</h1>
                            <p className="text-muted-foreground">
                                {t('resetEmailSent')} <span className="font-medium text-foreground">{email}</span>
                            </p>
                        </div>
                        <Link href="/login">
                            <Button className="w-full h-11">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                {t('backToLogin')}
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
                <div className="flex items-center gap-3">
                    <LanguageSwitcher />
                    <Link href="/login">
                        <Button variant="outline" size="sm">
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
                            {language === 'tr' ? 'Şifremi Unuttum' : 'Forgot Password'}
                        </h1>
                        <p className="text-muted-foreground">
                            {language === 'tr'
                                ? 'Şifrenizi sıfırlamak için e-posta adresinizi girin'
                                : 'Enter your email address to reset your password'}
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">
                                {language === 'tr' ? 'E-posta' : 'Email'}
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="ornek@email.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-11"
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {language === 'tr' ? 'Gönderiliyor...' : 'Sending...'}
                                </>
                            ) : (
                                language === 'tr' ? 'Şifre Sıfırlama E-postası Gönder' : 'Send Reset Email'
                            )}
                        </Button>
                    </form>

                    {/* Back to Login Link */}
                    <p className="text-center text-sm text-muted-foreground">
                        <Link href="/login" className="text-primary hover:underline font-medium inline-flex items-center">
                            <ArrowLeft className="mr-1 h-4 w-4" />
                            {language === 'tr' ? 'Giriş sayfasına dön' : 'Back to login'}
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
