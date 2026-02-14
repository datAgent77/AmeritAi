"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Save, AlertTriangle } from "lucide-react"
import { useParams } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function TenantAccountSettingsPage() {
    const { user } = useAuth()
    const { t } = useLanguage()
    const { toast } = useToast()
    const params = useParams()
    const tenantUserId = params.userId as string

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [email, setEmail] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    useEffect(() => {
        const fetchUserData = async () => {
            if (!tenantUserId || !user) return
            setIsLoading(true)
            try {
                // We use the settings API to get current data, including email if returned
                // Or we can assume we don't know the password but we can see the email.
                // The settings API usually returns config, but we need User object.
                // Let's force fetch via admin/users endpoint filtering or check if we can get single user.
                // Actually, the settings API `/api/console/settings?chatbotId=...` returns merged data.
                // Let's check if it returns 'email'. If not, we might need another way or just let it be blank.
                // Usually `api/console/settings` returns the user doc content, which includes email.

                const token = await user.getIdToken()
                const response = await fetch(`/api/console/settings?chatbotId=${tenantUserId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })
                if (!response.ok) throw new Error("Failed to fetch user data")
                const data = await response.json()
                if (data.email) {
                    setEmail(data.email)
                }
            } catch (error) {
                console.error("Error fetching user data:", error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchUserData()
    }, [tenantUserId, user])

    const handleSave = async () => {
        if (!user) return

        // Validations
        if (newPassword && newPassword.length < 6) {
            toast({
                title: "Error",
                description: t('passwordTooShort') || "Şifre en az 6 karakter olmalıdır.",
                variant: "destructive"
            })
            return
        }
        if (newPassword && newPassword !== confirmPassword) {
            toast({
                title: "Error",
                description: t('passwordsDoNotMatch') || "Şifreler eşleşmiyor.",
                variant: "destructive"
            })
            return
        }

        setIsSaving(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/admin/update-user", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    targetUserId: tenantUserId,
                    email: email, // Always send email (it might be unchanged but we send it)
                    password: newPassword || undefined
                })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || "Failed to update account")
            }

            toast({
                title: t('success') || "Başarılı",
                description: t('accountUpdated') || "Hesap bilgileri güncellendi.",
            })

            // Clear password fields
            setNewPassword("")
            setConfirmPassword("")

        } catch (error: any) {
            console.error("Error updating account:", error)
            toast({
                title: "Error",
                description: error.message || "Failed to update account.",
                variant: "destructive"
            })
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8 h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="max-w-2xl space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">{t('accountSettings') || "Hesap Ayarları"}</h2>
                <p className="text-muted-foreground">
                    {t('accountSettingsDesc') || "Kullanıcının giriş bilgilerini yönetin."}
                </p>
            </div>

            <Alert variant="destructive" className="bg-amber-50 text-amber-900 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle>{t('warning') || "Dikkat"}</AlertTitle>
                <AlertDescription>
                    {t('adminAccountWarning') || "Burada yaptığınız değişiklikler kullanıcının panele giriş bilgilerini doğrudan etkiler. E-posta adresini değiştirirseniz kullanıcının yeni adresle giriş yapması gerekecektir."}
                </AlertDescription>
            </Alert>

            <Card>
                <CardHeader>
                    <CardTitle>{t('credentials') || "Kimlik Bilgileri"}</CardTitle>
                    <CardDescription>
                        {t('credentialsDesc') || "E-posta adresi ve şifre değişikliği."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">{t('email') || "E-posta Adresi"}</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="user@example.com"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">{t('newPassword') || "Yeni Şifre"}</Label>
                            <Input
                                id="password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder={t('leaveBlankToKeep') || "Değiştirmek istemiyorsanız boş bırakın"}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">{t('confirmPassword') || "Şifre Tekrar"}</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder={t('confirmPasswordPlaceholder') || "Şifreyi tekrar girin"}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Save className="w-4 h-4 mr-2" />
                            {t('saveChanges') || "Değişiklikleri Kaydet"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
