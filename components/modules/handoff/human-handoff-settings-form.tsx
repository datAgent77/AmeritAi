"use client"

import { useEffect, useState } from "react"
import { Loader2, Save, Users } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { DEFAULT_HUMAN_HANDOFF_BUSINESS_DAYS, type HumanHandoffBusinessDayCode } from "@/lib/human-handoff"

interface HumanHandoffSettingsFormProps {
    targetUserId: string
}

type HandoffState = {
    enabled: boolean
    notificationEmail: string
    notifyEmail: boolean
    notifyInApp: boolean
    triggerOnUserRequest: boolean
    triggerOnAssistantHandoff: boolean
    customWaitMessage: string
    notifyWhatsApp: boolean
    whatsappNumber: string
    notifyInstagram: boolean
    instagramAccountId: string
    businessHoursEnabled: boolean
    businessHoursStart: string
    businessHoursEnd: string
    businessHoursTimezone: string
    businessDays: HumanHandoffBusinessDayCode[]
}

const DAY_OPTIONS: Array<{ code: HumanHandoffBusinessDayCode; label: string }> = [
    { code: "Mon", label: "Pazartesi" },
    { code: "Tue", label: "Salı" },
    { code: "Wed", label: "Çarşamba" },
    { code: "Thu", label: "Perşembe" },
    { code: "Fri", label: "Cuma" },
    { code: "Sat", label: "Cumartesi" },
    { code: "Sun", label: "Pazar" },
]

const DEFAULT_STATE: HandoffState = {
    enabled: false,
    notificationEmail: "",
    notifyEmail: true,
    notifyInApp: true,
    triggerOnUserRequest: true,
    triggerOnAssistantHandoff: true,
    customWaitMessage: "",
    notifyWhatsApp: false,
    whatsappNumber: "",
    notifyInstagram: false,
    instagramAccountId: "",
    businessHoursEnabled: false,
    businessHoursStart: "09:00",
    businessHoursEnd: "18:00",
    businessHoursTimezone: "UTC",
    businessDays: DEFAULT_HUMAN_HANDOFF_BUSINESS_DAYS,
}

export function HumanHandoffSettingsForm({ targetUserId }: HumanHandoffSettingsFormProps) {
    const { user, role } = useAuth()
    const isSuperAdmin = role === 'SUPER_ADMIN' || role === 'AGENCY_ADMIN';
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [state, setState] = useState<HandoffState>(DEFAULT_STATE)

    useEffect(() => {
        const load = async () => {
            if (!user?.uid) return
            setIsLoading(true)
            try {
                const token = await user.getIdToken()
                const response = await fetch(`/api/console/settings?chatbotId=${targetUserId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                const data = response.ok ? await response.json() : {}

                setState({
                    enabled: data.enableHumanHandoff === true,
                    notificationEmail: typeof data.humanHandoffSettings?.notificationEmail === "string" ? data.humanHandoffSettings.notificationEmail : "",
                    notifyEmail: data.humanHandoffSettings?.notifyEmail !== false,
                    notifyInApp: data.humanHandoffSettings?.notifyInApp !== false,
                    triggerOnUserRequest: data.humanHandoffSettings?.triggerOnUserRequest !== false,
                    triggerOnAssistantHandoff: data.humanHandoffSettings?.triggerOnAssistantHandoff !== false,
                    customWaitMessage: typeof data.humanHandoffSettings?.customWaitMessage === "string" ? data.humanHandoffSettings.customWaitMessage : "",
                    notifyWhatsApp: data.humanHandoffSettings?.notifyWhatsApp === true,
                    whatsappNumber: typeof data.humanHandoffSettings?.whatsappNumber === "string" ? data.humanHandoffSettings.whatsappNumber : "",
                    notifyInstagram: data.humanHandoffSettings?.notifyInstagram === true,
                    instagramAccountId: typeof data.humanHandoffSettings?.instagramAccountId === "string" ? data.humanHandoffSettings.instagramAccountId : "",
                    businessHoursEnabled: data.humanHandoffSettings?.businessHoursEnabled === true || data.enableBusinessHours === true,
                    businessHoursStart: typeof data.humanHandoffSettings?.businessHoursStart === "string" && data.humanHandoffSettings.businessHoursStart
                        ? data.humanHandoffSettings.businessHoursStart
                        : (typeof data.businessHoursStart === "string" && data.businessHoursStart ? data.businessHoursStart : "09:00"),
                    businessHoursEnd: typeof data.humanHandoffSettings?.businessHoursEnd === "string" && data.humanHandoffSettings.businessHoursEnd
                        ? data.humanHandoffSettings.businessHoursEnd
                        : (typeof data.businessHoursEnd === "string" && data.businessHoursEnd ? data.businessHoursEnd : "18:00"),
                    businessHoursTimezone: typeof data.humanHandoffSettings?.businessHoursTimezone === "string" && data.humanHandoffSettings.businessHoursTimezone
                        ? data.humanHandoffSettings.businessHoursTimezone
                        : (typeof data.timezone === "string" && data.timezone ? data.timezone : "UTC"),
                    businessDays: Array.isArray(data.humanHandoffSettings?.businessDays) && data.humanHandoffSettings.businessDays.length > 0
                        ? data.humanHandoffSettings.businessDays.filter((value: unknown): value is HumanHandoffBusinessDayCode => DAY_OPTIONS.some((day) => day.code === value))
                        : DEFAULT_HUMAN_HANDOFF_BUSINESS_DAYS,
                })
            } catch (error) {
                console.error("Failed to load handoff settings:", error)
                toast({
                    title: "Hata",
                    description: "Musteri temsilcisi ayarlari yuklenemedi.",
                    variant: "destructive",
                })
            } finally {
                setIsLoading(false)
            }
        }

        load()
    }, [targetUserId, toast, user])

    const saveSettings = async () => {
        if (!user?.uid) return
        setIsSaving(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/console/settings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    chatbotId: targetUserId,
                    userSettings: {
                        enableHumanHandoff: state.enabled,
                        humanHandoffSettings: {
                            notificationEmail: state.notificationEmail,
                            notifyEmail: state.notifyEmail,
                            notifyInApp: state.notifyInApp,
                            triggerOnUserRequest: state.triggerOnUserRequest,
                            triggerOnAssistantHandoff: state.triggerOnAssistantHandoff,
                            customWaitMessage: state.customWaitMessage,
                            notifyWhatsApp: state.notifyWhatsApp,
                            whatsappNumber: state.whatsappNumber,
                            notifyInstagram: state.notifyInstagram,
                            instagramAccountId: state.instagramAccountId,
                            businessHoursEnabled: state.businessHoursEnabled,
                            businessHoursStart: state.businessHoursStart,
                            businessHoursEnd: state.businessHoursEnd,
                            businessHoursTimezone: state.businessHoursTimezone,
                            businessDays: state.businessDays,
                        },
                    },
                    chatbotSettings: {
                        enableHumanHandoff: state.enabled,
                        humanHandoffSettings: {
                            notificationEmail: state.notificationEmail,
                            notifyEmail: state.notifyEmail,
                            notifyInApp: state.notifyInApp,
                            triggerOnUserRequest: state.triggerOnUserRequest,
                            triggerOnAssistantHandoff: state.triggerOnAssistantHandoff,
                            customWaitMessage: state.customWaitMessage,
                            notifyWhatsApp: state.notifyWhatsApp,
                            whatsappNumber: state.whatsappNumber,
                            notifyInstagram: state.notifyInstagram,
                            instagramAccountId: state.instagramAccountId,
                            businessHoursEnabled: state.businessHoursEnabled,
                            businessHoursStart: state.businessHoursStart,
                            businessHoursEnd: state.businessHoursEnd,
                            businessHoursTimezone: state.businessHoursTimezone,
                            businessDays: state.businessDays,
                        },
                    },
                }),
            })

            if (!response.ok) throw new Error("Save failed")

            toast({
                title: "Kaydedildi",
                description: "Musteri temsilcisine aktarma ayarlari guncellendi.",
            })
        } catch (error) {
            console.error("Failed to save handoff settings:", error)
            toast({
                title: "Hata",
                description: "Ayarlar kaydedilemedi.",
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex min-h-[300px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight">Musteri Temsilcisine Aktarma</h1>
                </div>
                <p className="max-w-3xl text-sm text-muted-foreground">
                    Kullanici acikca temsilci istediginde veya assistant handoff tetiklediginde callback kaydi olusturur, tenant ekibine bildirim gonderir.
                </p>
            </div>

            {isSuperAdmin && (
                <Card>
                    <CardHeader>
                        <CardTitle>Modul durumu</CardTitle>
                        <CardDescription>Varsayilan olarak kapali gelir, tum paketlerde acilabilir.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between gap-4">
                        <div>
                            <Label htmlFor="handoff-enabled" className="text-base font-medium">Musteri temsilcisine aktarmayi aktif et</Label>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Aktif oldugunda callback kaydi, e-posta ve uygulama ici bildirim uretebilir.
                            </p>
                        </div>
                        <Switch
                            id="handoff-enabled"
                            checked={state.enabled}
                            onCheckedChange={(checked) => setState((prev) => ({ ...prev, enabled: checked }))}
                        />
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Bekleme Mesajı</CardTitle>
                    <CardDescription>
                        Kullanıcı canlı desteğe aktarıldığında chat ekranında görünecek olan bilgilendirme mesajı.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Label htmlFor="custom-wait-message">Özel Bekleme Mesajı</Label>
                        <Textarea
                            id="custom-wait-message"
                            value={state.customWaitMessage}
                            onChange={(event) => setState((prev) => ({ ...prev, customWaitMessage: event.target.value }))}
                            placeholder="Örn: Talebinizi aldık, ekibimiz birazdan sizinle iletişime geçecek."
                            className="min-h-[100px]"
                        />
                        <p className="text-sm text-muted-foreground">Boş bırakılırsa sistemin varsayılan standart mesajı gösterilir.</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Mesai Saatleri</CardTitle>
                    <CardDescription>
                        Temsilciye aktarma talebi geldiğinde mesai saati dışında olup olmadığını kontrol et.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="flex items-center justify-between rounded-xl border p-4">
                        <div>
                            <Label htmlFor="handoff-business-hours" className="text-base font-medium">Mesai saati kontrolü</Label>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Aktif olduğunda widget, temsilci taleplerinde mesai dışı bilgisini kullanıcıya söyler.
                            </p>
                        </div>
                        <Switch
                            id="handoff-business-hours"
                            checked={state.businessHoursEnabled}
                            onCheckedChange={(checked) => setState((prev) => ({ ...prev, businessHoursEnabled: checked }))}
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="handoff-business-start">Başlangıç</Label>
                            <Input
                                id="handoff-business-start"
                                type="time"
                                value={state.businessHoursStart}
                                onChange={(event) => setState((prev) => ({ ...prev, businessHoursStart: event.target.value }))}
                                disabled={!state.businessHoursEnabled}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="handoff-business-end">Bitiş</Label>
                            <Input
                                id="handoff-business-end"
                                type="time"
                                value={state.businessHoursEnd}
                                onChange={(event) => setState((prev) => ({ ...prev, businessHoursEnd: event.target.value }))}
                                disabled={!state.businessHoursEnabled}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="handoff-business-timezone">Saat Dilimi</Label>
                            <Input
                                id="handoff-business-timezone"
                                value={state.businessHoursTimezone}
                                onChange={(event) => setState((prev) => ({ ...prev, businessHoursTimezone: event.target.value }))}
                                placeholder="Europe/Istanbul"
                                disabled={!state.businessHoursEnabled}
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label>Aktif Günler</Label>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {DAY_OPTIONS.map((day) => {
                                const checked = state.businessDays.includes(day.code)
                                return (
                                    <label key={day.code} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${state.businessHoursEnabled ? "cursor-pointer" : "opacity-60"}`}>
                                        <Checkbox
                                            checked={checked}
                                            disabled={!state.businessHoursEnabled}
                                            onCheckedChange={(nextChecked) => {
                                                setState((prev) => ({
                                                    ...prev,
                                                    businessDays: nextChecked
                                                        ? [...prev.businessDays, day.code]
                                                        : prev.businessDays.filter((value) => value !== day.code),
                                                }))
                                            }}
                                        />
                                        <span className="text-sm">{day.label}</span>
                                    </label>
                                )
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Bildirim ayarlari</CardTitle>
                    <CardDescription>
                        E-posta belirtilmezse Omni escalation email, lead notification email veya tenant e-postasi sirayla fallback olarak kullanilir.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="handoff-email">Bildirim e-postasi</Label>
                        <Input
                            id="handoff-email"
                            value={state.notificationEmail}
                            onChange={(event) => setState((prev) => ({ ...prev, notificationEmail: event.target.value }))}
                            placeholder="destek@firma.com"
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="flex items-center justify-between rounded-xl border p-4">
                            <div>
                                <Label htmlFor="notify-email">E-posta bildirimi</Label>
                                <p className="mt-1 text-sm text-muted-foreground">Callback olustugunda e-posta gonder.</p>
                            </div>
                            <Switch
                                id="notify-email"
                                checked={state.notifyEmail}
                                onCheckedChange={(checked) => setState((prev) => ({ ...prev, notifyEmail: checked }))}
                            />
                        </div>

                        <div className="flex items-center justify-between rounded-xl border p-4">
                            <div>
                                <Label htmlFor="notify-inapp">Uygulama ici bildirim</Label>
                                <p className="mt-1 text-sm text-muted-foreground">Tenant panelinde okunabilir bildirim olustur.</p>
                            </div>
                            <Switch
                                id="notify-inapp"
                                checked={state.notifyInApp}
                                onCheckedChange={(checked) => setState((prev) => ({ ...prev, notifyInApp: checked }))}
                            />
                        </div>

                        <div className="flex items-center justify-between rounded-xl border p-4">
                            <div>
                                <Label htmlFor="trigger-user">Kullanici temsilci isterse</Label>
                                <p className="mt-1 text-sm text-muted-foreground">Acik temsilci taleplerini otomatik yakala.</p>
                            </div>
                            <Switch
                                id="trigger-user"
                                checked={state.triggerOnUserRequest}
                                onCheckedChange={(checked) => setState((prev) => ({ ...prev, triggerOnUserRequest: checked }))}
                            />
                        </div>

                        <div className="flex items-center justify-between rounded-xl border p-4">
                            <div>
                                <Label htmlFor="trigger-assistant">Assistant escalation</Label>
                                <p className="mt-1 text-sm text-muted-foreground">Guided veya assistant handoff aksiyonlarini isle.</p>
                            </div>
                            <Switch
                                id="trigger-assistant"
                                checked={state.triggerOnAssistantHandoff}
                                onCheckedChange={(checked) => setState((prev) => ({ ...prev, triggerOnAssistantHandoff: checked }))}
                            />
                        </div>
                    </div>

                    <div className="mt-6 border-t pt-6 grid gap-4 md:grid-cols-2">
                        <div className="flex flex-col gap-4 rounded-xl border p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label htmlFor="notify-wa">WhatsApp Bildirimi</Label>
                                    <p className="mt-1 text-sm text-muted-foreground">Aktarım taleplerini WhatsApp&apos;a linkli bildirim olarak gönder.</p>
                                </div>
                                <Switch
                                    id="notify-wa"
                                    checked={state.notifyWhatsApp}
                                    onCheckedChange={(checked) => setState((prev) => ({ ...prev, notifyWhatsApp: checked }))}
                                />
                            </div>
                            {state.notifyWhatsApp && (
                                <Input
                                    placeholder="WhatsApp Numaranız (+90...)"
                                    value={state.whatsappNumber}
                                    onChange={(event) => setState((prev) => ({ ...prev, whatsappNumber: event.target.value }))}
                                />
                            )}
                        </div>

                        <div className="flex flex-col gap-4 rounded-xl border p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label htmlFor="notify-ig">Instagram Bildirimi</Label>
                                    <p className="mt-1 text-sm text-muted-foreground">Aktarım taleplerini Instagram DM olarak gönder.</p>
                                </div>
                                <Switch
                                    id="notify-ig"
                                    checked={state.notifyInstagram}
                                    onCheckedChange={(checked) => setState((prev) => ({ ...prev, notifyInstagram: checked }))}
                                />
                            </div>
                            {state.notifyInstagram && (
                                <Input
                                    placeholder="Instagram Kullanıcı Adı/ID"
                                    value={state.instagramAccountId}
                                    onChange={(event) => setState((prev) => ({ ...prev, instagramAccountId: event.target.value }))}
                                />
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={saveSettings} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Kaydet
                </Button>
            </div>
        </div>
    )
}
