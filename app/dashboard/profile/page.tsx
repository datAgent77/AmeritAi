"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { db, auth } from "@/lib/firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { sendPasswordResetEmail } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLanguage } from "@/context/LanguageContext"

export default function ProfilePage() {
    const { user } = useAuth()
    const { toast } = useToast()
    const { t } = useLanguage()
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    // Form states
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [phone, setPhone] = useState("")
    const [companyName, setCompanyName] = useState("")
    const [companyAddress, setCompanyAddress] = useState("")
    const [companyWebsite, setCompanyWebsite] = useState("")

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return
            try {
                const docRef = doc(db, "users", user.uid)
                const docSnap = await getDoc(docRef)
                if (docSnap.exists()) {
                    const data = docSnap.data()
                    setFirstName(data.firstName || "")
                    setLastName(data.lastName || "")
                    setPhone(data.phone || "")
                    setCompanyName(data.companyName || "")
                    setCompanyAddress(data.companyAddress || "")
                    setCompanyWebsite(data.companyWebsite || "")
                }
            } catch (error) {
                console.error("Error fetching profile:", error)
                toast({
                    title: "Error",
                    description: t('failedToLoadProfile'),
                    variant: "destructive",
                })
            } finally {
                setIsLoading(false)
            }
        }
        fetchProfile()
    }, [user, toast, t])

    const handleSave = async () => {
        if (!user) return
        setIsSaving(true)
        try {
            await updateDoc(doc(db, "users", user.uid), {
                firstName,
                lastName,
                phone,
                companyName,
                companyAddress,
                companyWebsite,
            })
            toast({
                title: "Success",
                description: t('profileUpdated'),
            })
        } catch (error) {
            console.error("Error updating profile:", error)
            toast({
                title: "Error",
                description: t('failedToUpdateProfile'),
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handlePasswordReset = async () => {
        if (!user?.email) return
        try {
            await sendPasswordResetEmail(auth, user.email)
            toast({
                title: t('emailSent'),
                description: t('resetEmailSent'),
            })
        } catch (error: any) {
            console.error("Password reset error:", error)
            toast({
                title: "Error",
                description: error.message || "Failed to send reset email.",
                variant: "destructive",
            })
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto py-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">{t('profileSettings')}</h2>
                <p className="text-muted-foreground">{t('profileDescription')}</p>
            </div>

            <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8">
                    <TabsTrigger value="personal">{t('personalInfo')}</TabsTrigger>
                    <TabsTrigger value="company">{t('companyInfo')}</TabsTrigger>
                    <TabsTrigger value="security">{t('security')}</TabsTrigger>
                </TabsList>

                <TabsContent value="personal">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('personalInformation')}</CardTitle>
                            <CardDescription>{t('updatePersonalDetails')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">{t('firstName')}</Label>
                                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">{t('lastName')}</Label>
                                    <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">{t('email')}</Label>
                                <Input id="email" value={user?.email || ""} disabled />
                                <p className="text-xs text-muted-foreground">{t('emailCannotBeChanged')}</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">{t('phoneNumber')}</Label>
                                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 8900" />
                            </div>
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t('saveChanges')}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="company">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('companyInformation')}</CardTitle>
                            <CardDescription>{t('companyDetails')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="companyName">{t('companyName')}</Label>
                                <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="companyAddress">{t('address')}</Label>
                                <Input id="companyAddress" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="companyWebsite">{t('website')}</Label>
                                <Input id="companyWebsite" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} placeholder="https://example.com" />
                            </div>
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t('saveChanges')}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('securitySettings')}</CardTitle>
                            <CardDescription>{t('manageSecurity')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>{t('password')}</Label>
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-medium">{t('changePassword')}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {t('resetPasswordDescription')}
                                        </p>
                                    </div>
                                    <Button variant="outline" onClick={handlePasswordReset}>
                                        {t('sendResetEmail')}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
