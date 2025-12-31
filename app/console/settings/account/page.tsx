"use client"

import { useState } from "react"
import { auth } from "@/lib/firebase"
import { updateEmail, sendPasswordResetEmail } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, User, Key, Mail } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"

export default function AccountSettingsPage() {
    const { t, language } = useLanguage()
    const { toast } = useToast()
    const [newEmail, setNewEmail] = useState("")
    const [isUpdatingEmail, setIsUpdatingEmail] = useState(false)
    const [isSendingReset, setIsSendingReset] = useState(false)

    const user = auth.currentUser

    const handleUpdateEmail = async () => {
        if (!user || !newEmail) return

        try {
            setIsUpdatingEmail(true)
            await updateEmail(user, newEmail)
            toast({
                title: language === 'tr' ? "Başarılı" : "Success",
                description: language === 'tr'
                    ? "E-posta adresi güncellendi."
                    : "Email address updated successfully.",
            })
            setNewEmail("")
        } catch (error: any) {
            console.error("Error updating email:", error)
            let errorMessage = language === 'tr' ? "E-posta güncellenemedi." : "Failed to update email."

            if (error.code === 'auth/requires-recent-login') {
                errorMessage = language === 'tr'
                    ? "Bu işlem için yakın zamanda giriş yapmış olmanız gerekiyor. Lütfen çıkış yapıp tekrar deneyin."
                    : "This operation requires a recent login. Please logout and login again."
            } else if (error.code === 'auth/email-already-in-use') {
                errorMessage = language === 'tr'
                    ? "Bu e-posta adresi zaten kullanımda."
                    : "This email is already in use."
            }

            toast({
                title: language === 'tr' ? "Hata" : "Error",
                description: errorMessage,
                variant: "destructive",
            })
        } finally {
            setIsUpdatingEmail(false)
        }
    }

    const handlePasswordReset = async () => {
        if (!user?.email) return

        try {
            setIsSendingReset(true)
            await sendPasswordResetEmail(auth, user.email)
            toast({
                title: language === 'tr' ? "E-posta Gönderildi" : "Email Sent",
                description: language === 'tr'
                    ? "Şifre sıfırlama e-postası adresinize gönderildi."
                    : "Password reset email has been sent to your email address.",
            })
        } catch (error) {
            console.error("Error sending reset email:", error)
            toast({
                title: language === 'tr' ? "Hata" : "Error",
                description: language === 'tr' ? "E-posta gönderilemedi." : "Failed to send reset email.",
                variant: "destructive",
            })
        } finally {
            setIsSendingReset(false)
        }
    }

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">
                    {language === 'tr' ? "Hesap Bilgileri" : "Account Settings"}
                </h2>
                <p className="text-muted-foreground">
                    {language === 'tr'
                        ? "Hesap güvenlik ve iletişim bilgilerinizi yönetin."
                        : "Manage your account security and contact information."}
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        {language === 'tr' ? "E-posta Adresi" : "Email Address"}
                    </CardTitle>
                    <CardDescription>
                        {language === 'tr'
                            ? "Giriş yapmak ve bildirim almak için kullandığınız e-posta."
                            : "The email you use to login and receive notifications."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>
                            {language === 'tr' ? "Mevcut E-posta" : "Current Email"}
                        </Label>
                        <Input value={user?.email || ""} disabled className="bg-muted" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="newEmail">
                            {language === 'tr' ? "Yeni E-posta" : "New Email"}
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                id="newEmail"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder="name@example.com"
                                type="email"
                            />
                            <Button onClick={handleUpdateEmail} disabled={isUpdatingEmail || !newEmail}>
                                {isUpdatingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {language === 'tr' ? "Güncelle" : "Update"}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {language === 'tr'
                                ? "Not: E-posta değişikliği için yeniden giriş yapmanız gerekebilir."
                                : "Note: You may need to re-login to change your email."}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        {language === 'tr' ? "Şifre ve Güvenlik" : "Password & Security"}
                    </CardTitle>
                    <CardDescription>
                        {language === 'tr'
                            ? "Şifrenizi sıfırlayın veya değiştirin."
                            : "Reset or change your password."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border p-4 bg-muted/50 flex items-center justify-between">
                        <div>
                            <div className="font-medium text-sm">
                                {language === 'tr' ? "Şifre Sıfırlama" : "Password Reset"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {language === 'tr'
                                    ? "Şifre sıfırlama bağlantısı e-posta adresinize gönderilecektir."
                                    : "A password reset link will be sent to your email address."}
                            </div>
                        </div>
                        <Button variant="outline" onClick={handlePasswordReset} disabled={isSendingReset}>
                            {isSendingReset && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {language === 'tr' ? "E-posta Gönder" : "Send Email"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
