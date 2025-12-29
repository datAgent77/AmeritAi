"use client"

import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { signInWithPopup } from "firebase/auth"
import { auth, googleProvider, microsoftProvider, appleProvider } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/context/LanguageContext"

interface SocialAuthButtonsProps {
    mode: 'login' | 'signup'
    onSuccess?: (user: any, providerId: string) => void
    disabled?: boolean
}

export function SocialAuthButtons({ mode, onSuccess, disabled }: SocialAuthButtonsProps) {
    const [loadingProvider, setLoadingProvider] = useState<string | null>(null)
    const { toast } = useToast()
    const { t, language } = useLanguage()

    const handleSocialAuth = async (provider: any, providerId: string) => {
        setLoadingProvider(providerId)
        try {
            const result = await signInWithPopup(auth, provider)
            if (onSuccess) {
                onSuccess(result.user, providerId)
            }
        } catch (error: any) {
            console.error("Social auth error:", error)

            // Provide better error messages
            let errorMessage = error.message || (language === 'tr'
                ? "Kimlik doğrulama başarısız oldu. Lütfen tekrar deneyin."
                : "Failed to authenticate. Please try again.")

            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = language === 'tr'
                    ? "Pencere kapatıldı. Lütfen tekrar deneyin."
                    : "Popup was closed. Please try again."
            } else if (error.code === 'auth/account-exists-with-different-credential') {
                errorMessage = language === 'tr'
                    ? "Bu e-posta başka bir giriş yöntemiyle zaten kayıtlı."
                    : "This email is already registered with a different sign-in method."
            } else if (error.code === 'auth/operation-not-allowed') {
                errorMessage = language === 'tr'
                    ? "Bu giriş yöntemi şu anda devre dışı."
                    : "This sign-in method is currently disabled."
            }

            toast({
                title: language === 'tr' ? "Kimlik Doğrulama Hatası" : "Authentication Error",
                description: errorMessage,
                variant: "destructive",
            })
        } finally {
            setLoadingProvider(null)
        }
    }

    const actionText = mode === 'login'
        ? (language === 'tr' ? 'ile Giriş Yap' : 'Log in with')
        : (language === 'tr' ? 'ile Kayıt Ol' : 'Sign up with')

    return (
        <div className="grid gap-3">
            <Button
                variant="outline"
                className="w-full h-11 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                onClick={() => handleSocialAuth(googleProvider, 'google.com')}
                disabled={disabled || !!loadingProvider}
            >
                {loadingProvider === 'google.com' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        />
                    </svg>
                )}
                Google {actionText}
            </Button>
        </div>
    )
}
