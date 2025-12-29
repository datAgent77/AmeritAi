"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Users, Save, Loader2, Trash2, Plus, ExternalLink, Bell } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface CustomField {
    id: string
    label: string
    type: 'text' | 'email' | 'phone' | 'select' | 'textarea'
    required: boolean
    placeholder?: string
    options?: string[]
}

export default function LeadCollectionSettingsPage() {
    const { user } = useAuth()
    const { t } = useLanguage()
    const { toast } = useToast()
    const router = useRouter()

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isActive, setIsActive] = useState(false)
    const [customFields, setCustomFields] = useState<CustomField[]>([])
    const [enableNotifications, setEnableNotifications] = useState(false)
    const [notificationEmail, setNotificationEmail] = useState("")

    useEffect(() => {
        const fetchSettings = async () => {
            if (!user) return
            setIsLoading(true)
            try {
                const response = await fetch(`/api/console/settings?chatbotId=${user.uid}`);
                if (!response.ok) throw new Error("Failed to fetch settings");
                const data = await response.json();

                setIsActive(data.enableLeadCollection || false)
                setCustomFields(data.leadCustomFields || [])
                setEnableNotifications(data.enableLeadNotifications || false)
                setNotificationEmail(data.leadNotificationEmail || user.email || "")
            } catch (error) {
                console.error("Error fetching settings:", error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchSettings()
    }, [user])

    const handleSave = async () => {
        if (!user) return
        setIsSaving(true)
        try {
            const response = await fetch("/api/console/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chatbotId: user.uid,
                    userSettings: {
                        enableLeadCollection: isActive
                    },
                    chatbotSettings: {
                        enableLeadCollection: isActive,
                        leadCustomFields: customFields,
                        enableLeadNotifications: enableNotifications,
                        leadNotificationEmail: notificationEmail
                    }
                })
            });

            if (!response.ok) throw new Error("Failed to save settings");

            toast({
                title: t('settingsSaved') || "Ayarlar Kaydedildi",
                description: t('settingsSavedDesc') || "Lead toplama ayarlarınız güncellendi."
            })
        } catch (error) {
            console.error("Error saving settings:", error)
            toast({
                title: "Error",
                description: "Failed to save settings.",
                variant: "destructive"
            })
        } finally {
            setIsSaving(false)
        }
    }

    const addCustomField = () => {
        const newField: CustomField = {
            id: 'field_' + Date.now(),
            label: '',
            type: 'text',
            required: false,
            placeholder: ''
        }
        setCustomFields(prev => [...prev, newField])
    }

    const updateCustomField = (index: number, field: keyof CustomField, value: any) => {
        setCustomFields(prev => prev.map((f, i) =>
            i === index ? { ...f, [field]: value } : f
        ))
    }

    const removeCustomField = (index: number) => {
        setCustomFields(prev => prev.filter((_, i) => i !== index))
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8 h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 animate-in fade-in duration-500">
            <div className="flex items-center space-x-2 mb-6">
                <Button variant="ghost" size="sm" onClick={() => router.push('/console/modules')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('backToModules') || "Modüllere Dön"}
                </Button>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-indigo-100 text-indigo-600">
                        <Users className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">{t('leadCollection') || "Lead Toplama"}</h2>
                        <p className="text-muted-foreground">
                            {t('leadCollectionSettingsDesc') || "Müşteri bilgilerini toplamak için form alanlarını yapılandırın."}
                        </p>
                    </div>
                </div>
                <Link href="/console/chatbot/leads">
                    <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {t('viewLeads') || "Leadleri Görüntüle"}
                    </Button>
                </Link>
            </div>

            <div className="grid gap-6 max-w-3xl">
                {/* Module Status */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('moduleStatus') || "Modül Durumu"}</CardTitle>
                        <CardDescription>
                            {t('leadCollectionStatusDesc') || "Lead toplama özelliğini aktif veya pasif yapın."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">{t('enableLeadCollection') || "Lead Toplamayı Etkinleştir"}</Label>
                                <p className="text-sm text-muted-foreground">
                                    {t('enableLeadCollectionDesc') || "Sohbet başlamadan önce kullanıcılardan iletişim bilgilerini isteyin."}
                                </p>
                            </div>
                            <Switch
                                checked={isActive}
                                onCheckedChange={setIsActive}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Notifications */}
                {isActive && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Bell className="w-5 h-5 text-indigo-600" />
                                <CardTitle>{t('notifications') || "Bildirimler"}</CardTitle>
                            </div>
                            <CardDescription>
                                {t('leadNotificationsDesc') || "Yeni lead geldiğinde email bildirimi alın."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">{t('enableEmailNotifications') || "Email Bildirimlerini Etkinleştir"}</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {t('enableEmailNotificationsDesc') || "Yeni lead kaydedildiğinde aşağıdaki adrese email gönderilir."}
                                    </p>
                                </div>
                                <Switch
                                    checked={enableNotifications}
                                    onCheckedChange={setEnableNotifications}
                                />
                            </div>

                            {enableNotifications && (
                                <div className="space-y-1.5">
                                    <Label>{t('notificationEmail') || "Bildirim Email Adresi"}</Label>
                                    <Input
                                        type="email"
                                        value={notificationEmail}
                                        onChange={(e) => setNotificationEmail(e.target.value)}
                                        placeholder={user?.email || "email@example.com"}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t('notificationEmailHint') || "Varsayılan olarak hesap emailiniz kullanılır."}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Custom Fields */}
                {isActive && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('customFields') || "Özel Alanlar"}</CardTitle>
                            <CardDescription>
                                {t('customFieldsDesc') || "Ad, E-posta, Telefon dışında ek form alanları ekleyin."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                                <strong>{t('defaultFields') || "Varsayılan Alanlar"}:</strong> Ad (zorunlu), E-posta (zorunlu), Telefon (opsiyonel)
                            </div>

                            {customFields.map((field, index) => (
                                <div key={field.id} className="flex flex-col gap-3 p-4 border rounded-lg bg-gray-50/50">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-medium">{t('field') || 'Alan'} {index + 1}</Label>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeCustomField(index)}
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">{t('fieldLabel') || 'Etiket'}</Label>
                                            <Input
                                                value={field.label}
                                                onChange={(e) => updateCustomField(index, 'label', e.target.value)}
                                                placeholder={t('fieldLabelPlaceholder') || 'ör: Firma Adı'}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">{t('fieldType') || 'Tip'}</Label>
                                            <Select
                                                value={field.type}
                                                onValueChange={(value) => updateCustomField(index, 'type', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="text">{t('typeText') || 'Metin'}</SelectItem>
                                                    <SelectItem value="email">{t('typeEmail') || 'E-posta'}</SelectItem>
                                                    <SelectItem value="phone">{t('typePhone') || 'Telefon'}</SelectItem>
                                                    <SelectItem value="textarea">{t('typeTextarea') || 'Uzun Metin'}</SelectItem>
                                                    <SelectItem value="select">{t('typeSelect') || 'Açılır Liste'}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">{t('placeholder') || 'Placeholder'}</Label>
                                        <Input
                                            value={field.placeholder || ''}
                                            onChange={(e) => updateCustomField(index, 'placeholder', e.target.value)}
                                            placeholder={t('placeholderPlaceholder') || 'İpucu metni girin...'}
                                        />
                                    </div>

                                    {field.type === 'select' && (
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">{t('dropdownOptions') || 'Seçenekler (virgülle ayırın)'}</Label>
                                            <Input
                                                value={(field.options || []).join(', ')}
                                                onChange={(e) => updateCustomField(index, 'options', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                                                placeholder={t('optionsPlaceholder') || 'Seçenek 1, Seçenek 2, Seçenek 3'}
                                            />
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={field.required}
                                            onCheckedChange={(checked) => updateCustomField(index, 'required', checked)}
                                            className="scale-90"
                                        />
                                        <Label className="text-sm">{t('required') || 'Zorunlu Alan'}</Label>
                                    </div>
                                </div>
                            ))}

                            {customFields.length < 5 && (
                                <Button variant="outline" onClick={addCustomField} className="w-full border-dashed">
                                    <Plus className="w-4 h-4 mr-2" />
                                    {t('addCustomField') || 'Özel Alan Ekle'}
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Save Button */}
                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={isSaving} size="lg">
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="w-4 h-4 mr-2" />
                        {t('saveChanges') || "Değişiklikleri Kaydet"}
                    </Button>
                </div>
            </div>
        </div>
    )
}
