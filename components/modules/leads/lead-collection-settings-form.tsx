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
import { Save, Loader2, Trash2, Plus, ExternalLink, Bell } from "lucide-react"
import Link from "next/link"

interface CustomField {
    id: string
    label: string
    type: 'text' | 'email' | 'phone' | 'select' | 'textarea'
    required: boolean
    placeholder?: string
    options?: string[]
}

interface LeadCollectionSettingsFormProps {
    targetUserId: string
    isSuperAdmin?: boolean
}

export function LeadCollectionSettingsForm({ targetUserId, isSuperAdmin = false }: LeadCollectionSettingsFormProps) {
    const { user } = useAuth()
    const { t } = useLanguage()
    const { toast } = useToast()

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [enableInitialLead, setEnableInitialLead] = useState(false)
    const [enableInChatLead, setEnableInChatLead] = useState(false)
    const [customFields, setCustomFields] = useState<CustomField[]>([])
    // Raw string state for select options (to allow typing commas)
    const [optionsInputs, setOptionsInputs] = useState<Record<string, string>>({})
    const [enableNotifications, setEnableNotifications] = useState(false)
    const [notificationEmail, setNotificationEmail] = useState("")

    // Form Customization
    const [formTitle, setFormTitle] = useState("Hoş Geldiniz")
    const [formSubtitle, setFormSubtitle] = useState("Lütfen bilgilerinizi girerek sohbete başlayın.")
    const [nameLabel, setNameLabel] = useState("Ad Soyad")
    const [namePlaceholder, setNamePlaceholder] = useState("Ad Soyad")
    const [emailLabel, setEmailLabel] = useState("E-posta")
    const [emailPlaceholder, setEmailPlaceholder] = useState("E-posta")
    const [phoneLabel, setPhoneLabel] = useState("Telefon")
    const [phonePlaceholder, setPhonePlaceholder] = useState("Telefon (Opsiyonel)")
    const [submitButtonText, setSubmitButtonText] = useState("Sohbete Başla")

    // Default Field Configuration
    const [nameEnabled, setNameEnabled] = useState(true)
    const [emailEnabled, setEmailEnabled] = useState(true)
    const [phoneEnabled, setPhoneEnabled] = useState(true)
    const [nameRequired, setNameRequired] = useState(true)
    const [emailRequired, setEmailRequired] = useState(true)
    const [phoneRequired, setPhoneRequired] = useState(false)

    useEffect(() => {
        const fetchSettings = async () => {
            if (!targetUserId) return
            setIsLoading(true)
            try {
                const response = await fetch(`/api/console/settings?chatbotId=${targetUserId}`);
                if (!response.ok) throw new Error("Failed to fetch settings");
                const data = await response.json();

                setEnableInitialLead(data.enableInitialLeadCollection ?? data.enableLeadCollection ?? false)
                setEnableInChatLead(data.enableInChatLeadCollection ?? false)
                const fields = data.leadCustomFields || []
                setCustomFields(fields)
                // Initialize optionsInputs from loaded data
                const inputs: Record<string, string> = {}
                fields.forEach((f: CustomField) => {
                    if (f.options && f.options.length > 0) {
                        inputs[f.id] = f.options.join(', ')
                    }
                })
                setOptionsInputs(inputs)
                setEnableNotifications(data.enableLeadNotifications || false)
                setNotificationEmail(data.leadNotificationEmail || "")

                // Form Customization
                if (data.leadFormConfig) {
                    setFormTitle(data.leadFormConfig.title || "Hoş Geldiniz")
                    setFormSubtitle(data.leadFormConfig.subtitle || "Lütfen bilgilerinizi girerek sohbete başlayın.")
                    setNameLabel(data.leadFormConfig.nameLabel || "Ad Soyad")
                    setNamePlaceholder(data.leadFormConfig.namePlaceholder || "Ad Soyad")
                    setEmailLabel(data.leadFormConfig.emailLabel || "E-posta")
                    setEmailPlaceholder(data.leadFormConfig.emailPlaceholder || "E-posta")
                    setPhoneLabel(data.leadFormConfig.phoneLabel || "Telefon (Opsiyonel)")
                    setPhonePlaceholder(data.leadFormConfig.phonePlaceholder || "Telefon (Opsiyonel)")
                    setSubmitButtonText(data.leadFormConfig.submitButtonText || "Sohbete Başla")

                    // Default Fields Config
                    setNameEnabled(data.leadFormConfig.nameEnabled !== false)
                    setEmailEnabled(data.leadFormConfig.emailEnabled !== false)
                    setPhoneEnabled(data.leadFormConfig.phoneEnabled !== false)
                    setNameRequired(data.leadFormConfig.nameRequired !== false)
                    setEmailRequired(data.leadFormConfig.emailRequired !== false)
                    setPhoneRequired(data.leadFormConfig.phoneRequired === true)
                }
            } catch (error) {
                console.error("Error fetching settings:", error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchSettings()
    }, [targetUserId])

    const handleSave = async () => {
        if (!user || !targetUserId) return
        setIsSaving(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/console/settings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    chatbotId: targetUserId,
                    userSettings: {
                        enableLeadCollection: enableInitialLead || enableInChatLead
                    },
                    chatbotSettings: {
                        enableLeadCollection: enableInitialLead || enableInChatLead,
                        enableInitialLeadCollection: enableInitialLead,
                        enableInChatLeadCollection: enableInChatLead,
                        leadCustomFields: customFields,
                        enableLeadNotifications: enableNotifications,
                        leadNotificationEmail: notificationEmail,
                        leadFormConfig: {
                            title: formTitle,
                            subtitle: formSubtitle,
                            nameLabel: nameLabel,
                            namePlaceholder: namePlaceholder,
                            emailLabel: emailLabel,
                            emailPlaceholder: emailPlaceholder,
                            phoneLabel: phoneLabel,
                            phonePlaceholder: phonePlaceholder,
                            submitButtonText: submitButtonText,
                            nameEnabled,
                            emailEnabled,
                            phoneEnabled,
                            nameRequired,
                            emailRequired,
                            phoneRequired
                        }
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
        const fieldId = 'field_' + Date.now()
        const newField: CustomField = {
            id: fieldId,
            label: '',
            type: 'text',
            required: false,
            placeholder: ''
        }
        setCustomFields(prev => [...prev, newField])
        setOptionsInputs(prev => ({ ...prev, [fieldId]: '' }))
    }

    const updateCustomField = (index: number, field: keyof CustomField, value: any) => {
        setCustomFields(prev => prev.map((f, i) =>
            i === index ? { ...f, [field]: value } : f
        ))
    }

    const removeCustomField = (index: number) => {
        const fieldToRemove = customFields[index]
        setCustomFields(prev => prev.filter((_, i) => i !== index))
        if (fieldToRemove) {
            setOptionsInputs(prev => {
                const newInputs = { ...prev }
                delete newInputs[fieldToRemove.id]
                return newInputs
            })
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8 h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const leadsLink = isSuperAdmin
        ? `/admin/tenant/${targetUserId}/chatbot/leads`
        : "/console/chatbot/leads"

    return (
        <div className="flex-1 space-y-8 p-8 pt-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">{t('leadCollection') || "Potansiyel Müşteri Toplama"}</h2>
                        <p className="text-muted-foreground">
                            {t('leadCollectionSettingsDesc') || "Müşteri bilgilerini toplamak için form alanlarını yapılandırın."}
                        </p>
                    </div>
                </div>
                <Link href={leadsLink}>
                    <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {t('viewLeads') || "Potansiyel Müşterileri Gör"}
                    </Button>
                </Link>
            </div>

            <div className="grid gap-6 max-w-3xl">
                {/* Lead Collection Toggles */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('moduleStatus') || "Modül Durumu"}</CardTitle>
                        <CardDescription>
                            {t('leadCollectionStatusDesc') || "Potansiyel müşteri toplama yöntemlerini ayrı ayrı yapılandırın."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Initial Lead Collection */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">{t('enableInitialLeadCollection') || "Başlangıç Lead Toplama"}</Label>
                                <p className="text-sm text-muted-foreground">
                                    {t('enableInitialLeadCollectionDesc') || "Sohbet başlamadan önce form göster."}
                                </p>
                            </div>
                            <Switch
                                checked={enableInitialLead}
                                onCheckedChange={setEnableInitialLead}
                            />
                        </div>

                        {/* In-Chat Lead Collection */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">{t('enableInChatLeadCollection') || "Konuşma İçi Lead Toplama"}</Label>
                                <p className="text-sm text-muted-foreground">
                                    {t('enableInChatLeadCollectionDesc') || "Kullanıcı 2 mesaj gönderdikten sonra iletişim bilgisi iste."}
                                </p>
                            </div>
                            <Switch
                                checked={enableInChatLead}
                                onCheckedChange={setEnableInChatLead}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Form Customization */}
                {(enableInitialLead || enableInChatLead) && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('leadFormCustomization') || "Form Özelleştirme"}</CardTitle>
                            <CardDescription>
                                {t('leadFormCustomizationDesc') || "Başlangıç lead formunun görünümünü özelleştirin."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>{t('welcomeTitle') || "Hoşgeldin Başlığı"}</Label>
                                    <Input
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                        placeholder="Hoş Geldiniz"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>{t('submitButtonText') || "Buton Metni"}</Label>
                                    <Input
                                        value={submitButtonText}
                                        onChange={(e) => setSubmitButtonText(e.target.value)}
                                        placeholder="Sohbete Başla"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>{t('welcomeSubtitle') || "Alt Mesaj"}</Label>
                                <Input
                                    value={formSubtitle}
                                    onChange={(e) => setFormSubtitle(e.target.value)}
                                    placeholder="Lütfen bilgilerinizi girerek sohbete başlayın."
                                />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Notifications */}
                {(enableInitialLead || enableInChatLead) && (
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
                {(enableInitialLead || enableInChatLead) && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('customFields') || "Özel Alanlar"}</CardTitle>
                            <CardDescription>
                                {t('customFieldsDesc') || "Ad, E-posta ve Telefon dışında ek form alanları ekleyin."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Default Fields - Displayed vertically like custom fields */}

                            {/* Name Field */}
                            {nameEnabled && (
                                <div className="flex flex-col gap-3 p-4 border rounded-lg bg-gray-50/50">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-medium">{t('nameField') || "Ad Alanı"}</Label>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={nameRequired}
                                                onCheckedChange={setNameRequired}
                                                className="scale-90"
                                            />
                                            <Label className="text-xs text-muted-foreground mr-2">{t('required') || "Zorunlu"}</Label>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setNameEnabled(false)}
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">{t('fieldLabel') || 'Etiket'}</Label>
                                        <Input
                                            value={nameLabel}
                                            onChange={(e) => setNameLabel(e.target.value)}
                                            placeholder="Ad Soyad"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">{t('placeholder') || 'Placeholder'}</Label>
                                        <Input
                                            value={namePlaceholder}
                                            onChange={(e) => setNamePlaceholder(e.target.value)}
                                            placeholder="Ad Soyad"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Email Field */}
                            {emailEnabled && (
                                <div className="flex flex-col gap-3 p-4 border rounded-lg bg-gray-50/50">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-medium">{t('emailField') || "Email Alanı"}</Label>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={emailRequired}
                                                onCheckedChange={setEmailRequired}
                                                className="scale-90"
                                            />
                                            <Label className="text-xs text-muted-foreground mr-2">{t('required') || "Zorunlu"}</Label>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setEmailEnabled(false)}
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">{t('fieldLabel') || 'Etiket'}</Label>
                                        <Input
                                            value={emailLabel}
                                            onChange={(e) => setEmailLabel(e.target.value)}
                                            placeholder="E-posta"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">{t('placeholder') || 'Placeholder'}</Label>
                                        <Input
                                            value={emailPlaceholder}
                                            onChange={(e) => setEmailPlaceholder(e.target.value)}
                                            placeholder="E-posta"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Phone Field */}
                            {phoneEnabled && (
                                <div className="flex flex-col gap-3 p-4 border rounded-lg bg-gray-50/50">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-medium">{t('phoneField') || "Telefon Alanı"}</Label>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={phoneRequired}
                                                onCheckedChange={setPhoneRequired}
                                                className="scale-90"
                                            />
                                            <Label className="text-xs text-muted-foreground mr-2">{t('required') || "Zorunlu"}</Label>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setPhoneEnabled(false)}
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">{t('fieldLabel') || 'Etiket'}</Label>
                                        <Input
                                            value={phoneLabel}
                                            onChange={(e) => setPhoneLabel(e.target.value)}
                                            placeholder="Telefon (Opsiyonel)"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">{t('placeholder') || 'Placeholder'}</Label>
                                        <Input
                                            value={phonePlaceholder}
                                            onChange={(e) => setPhonePlaceholder(e.target.value)}
                                            placeholder="Telefon (Opsiyonel)"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Additional/Custom Fields */}
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
                                                value={optionsInputs[field.id] ?? (field.options || []).join(', ')}
                                                onChange={(e) => {
                                                    // Store raw input value to allow typing commas
                                                    setOptionsInputs(prev => ({ ...prev, [field.id]: e.target.value }))
                                                }}
                                                onBlur={(e) => {
                                                    // Parse and save on blur
                                                    const parsed = e.target.value.split(',').map(s => s.trim()).filter(s => s)
                                                    updateCustomField(index, 'options', parsed)
                                                }}
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

                            {(!nameEnabled || !emailEnabled || !phoneEnabled) && (
                                <div className="space-y-2 pt-2">
                                    <Label className="text-sm font-medium text-muted-foreground">{t('addRemovedFields') || "Kaldırılan Alanları Ekle"}</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {!nameEnabled && (
                                            <Button variant="outline" size="sm" onClick={() => setNameEnabled(true)} className="gap-2">
                                                <Plus className="w-3.5 h-3.5" />
                                                {t('nameField') || "Ad Alanı"}
                                            </Button>
                                        )}
                                        {!emailEnabled && (
                                            <Button variant="outline" size="sm" onClick={() => setEmailEnabled(true)} className="gap-2">
                                                <Plus className="w-3.5 h-3.5" />
                                                {t('emailField') || "Email Alanı"}
                                            </Button>
                                        )}
                                        {!phoneEnabled && (
                                            <Button variant="outline" size="sm" onClick={() => setPhoneEnabled(true)} className="gap-2">
                                                <Plus className="w-3.5 h-3.5" />
                                                {t('phoneField') || "Telefon Alanı"}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {customFields.length < 5 && (
                                <Button variant="outline" onClick={addCustomField} className="w-full border-dashed mt-2">
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
        </div >
    )
}
