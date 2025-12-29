"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Bell, Mail, Volume2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function NotificationSettingsPage() {
    const { t } = useLanguage()
    const { user } = useAuth()
    const { toast } = useToast()

    const [soundEnabled, setSoundEnabled] = useState(true)
    const [pushEnabled, setPushEnabled] = useState(false)
    const [emailEnabled, setEmailEnabled] = useState(true)

    // Load settings
    useEffect(() => {
        const sound = localStorage.getItem('notificationSoundEnabled')
        if (sound !== null) setSoundEnabled(sound === 'true')

        // Push notification permission check
        if ('Notification' in window && Notification.permission === 'granted') {
            setPushEnabled(true)
        }
    }, [])

    const handleSoundChange = (checked: boolean) => {
        setSoundEnabled(checked)
        localStorage.setItem('notificationSoundEnabled', String(checked))
        if (checked) {
            const audio = new Audio('/sound/notification.mp3')
            audio.volume = 0.5
            audio.play().catch(e => console.log(e))
        }
    }

    const handlePushChange = async (checked: boolean) => {
        if (checked) {
            if ('Notification' in window) {
                const permission = await Notification.requestPermission()
                if (permission === 'granted') {
                    setPushEnabled(true)
                    toast({
                        title: t('success') || "Success",
                        description: t('pushNotificationsDesc') || "Push notifications enabled"
                    })
                } else {
                    setPushEnabled(false)
                    toast({
                        title: t('error') || "Error",
                        description: "Permission denied",
                        variant: "destructive"
                    })
                }
            }
        } else {
            // Cannot revoke permission programmatically, just update state logic
            setPushEnabled(false)
        }
    }

    return (
        <div className="space-y-6 max-w-6xl">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">{t('notificationSettings')}</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('soundNotifications')}
                        </CardTitle>
                        <Volume2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between mt-4">
                            <div className="space-y-1">
                                <Label htmlFor="sound-mode">{t('soundNotifications')}</Label>
                                <p className="text-xs text-muted-foreground">
                                    {t('soundNotificationsDesc')}
                                </p>
                            </div>
                            <Switch
                                id="sound-mode"
                                checked={soundEnabled}
                                onCheckedChange={handleSoundChange}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('pushNotifications')}
                        </CardTitle>
                        <Bell className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between mt-4">
                            <div className="space-y-1">
                                <Label htmlFor="push-mode">{t('pushNotifications')}</Label>
                                <p className="text-xs text-muted-foreground">
                                    {t('pushNotificationsDesc')}
                                </p>
                            </div>
                            <Switch
                                id="push-mode"
                                checked={pushEnabled}
                                onCheckedChange={handlePushChange}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('emailNotifications')}
                        </CardTitle>
                        <Mail className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between mt-4">
                            <div className="space-y-1">
                                <Label htmlFor="email-mode">{t('emailNotifications')}</Label>
                                <p className="text-xs text-muted-foreground">
                                    {t('emailNotificationsDesc')}
                                </p>
                            </div>
                            <Switch
                                id="email-mode"
                                checked={true} // Always true for now (placeholder)
                                disabled
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
