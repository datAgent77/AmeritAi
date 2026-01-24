"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Copy, Check } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

export default function DynamicContextSettings() {
    const { t, language } = useLanguage()
    const router = useRouter()
    const searchParams = useSearchParams()
    const { user } = useAuth()
    const { toast } = useToast()

    // Determine target user (if superadmin viewing tenant)
    const userIdParam = searchParams.get('userId')
    const targetUserId = userIdParam || user?.uid

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isEnabled, setIsEnabled] = useState(false)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        const loadSettings = async () => {
            if (!targetUserId) return

            try {
                // Fetch settings from API or Firestore
                // We use the same 'enableDynamicContext' field name as defined in modules-registry
                // Note: The registry defined 'legacyFirestoreField' as 'enableDynamicContext'
                // But for new modules we might want to stick to a cleaner structure.
                // For now, let's look for that field.

                const docRef = doc(db, "chatbots", targetUserId)
                const docSnap = await getDoc(docRef)

                if (docSnap.exists()) {
                    const data = docSnap.data()
                    setIsEnabled(data.enableDynamicContext || false)
                }
            } catch (error) {
                console.error("Error loading settings:", error)
            } finally {
                setIsLoading(false)
            }
        }

        loadSettings()
    }, [targetUserId])

    const handleSave = async () => {
        if (!targetUserId) return
        setIsSaving(true)

        try {
            await setDoc(doc(db, "chatbots", targetUserId), {
                enableDynamicContext: isEnabled
            }, { merge: true })

            // Also update user document for consistency if needed, but chatbot doc is primary for settings
            // For older modules we synced both. Let's start relying on 'chatbots' collection more.

            toast({
                title: t('settingsSaved') || "Settings Saved",
                description: t('settingsSavedDesc') || "Your changes have been saved successfully."
            })
        } catch (error) {
            console.error("Error saving settings:", error)
            toast({
                title: t('error') || "Error",
                description: t('saveFailed') || "Failed to save settings.",
                variant: "destructive"
            })
        } finally {
            setIsSaving(false)
        }
    }

    const getDynamicDataExample = () => {
        const industry = (user as any)?.industry || 'saas'
        
        switch(industry) {
            case 'ecommerce':
                return `    dynamicData: {
      orderId: "#TR-90210",          // ⚠️ ${language === 'tr' ? 'Veritabanınızdan gelen sipariş no' : 'Order ID from your DB'}
      orderStatus: "Shipped",        // ⚠️ ${language === 'tr' ? 'Sipariş durumu' : 'Order status'}
      trackingNumber: "YURTICI-123", // ⚠️ ${language === 'tr' ? 'Kargo takip no' : 'Tracking number'}
      cartValue: "1250.00"           // ⚠️ ${language === 'tr' ? 'Sepet tutarı' : 'Cart value'}
    }`
            case 'booking':
            case 'real_estate':
                return `    dynamicData: {
      reservationId: "#RES-5501",    // ⚠️ ${language === 'tr' ? 'Rezervasyon no' : 'Reservation ID'}
      checkInDate: "2024-06-15",     // ⚠️ ${language === 'tr' ? 'Giriş tarihi' : 'Check-in date'}
      paymentStatus: "Paid"          // ⚠️ ${language === 'tr' ? 'Ödeme durumu' : 'Payment status'}
    }`
            case 'healthcare':
                return `    dynamicData: {
      doctorName: "Dr. Sarah",       // ⚠️ ${language === 'tr' ? 'Doktor adı' : 'Doctor name'}
      appointmentTime: "14:30",      // ⚠️ ${language === 'tr' ? 'Randevu saati' : 'Appointment time'}
      department: "Cardiology"       // ⚠️ ${language === 'tr' ? 'Bölüm' : 'Department'}
    }`
            default: // saas and others
                return `    dynamicData: {
      activeTasks: 5,                // ⚠️ ${language === 'tr' ? 'Aktif görev sayısı (DB\'den)' : 'Active task count (from DB)'}
      nextMeeting: "14:30",          // ⚠️ ${language === 'tr' ? 'Sonraki toplantı saati' : 'Next meeting time'}
      currentPlan: "Premium"         // ⚠️ ${language === 'tr' ? 'Mevcut plan' : 'Current plan'}
    }`
        }
    }

    const copyCode = () => {
        const code = `// 1. ${language === 'tr' ? 'Kullanıcı verilerini çekin' : 'Fetch user data'}
const userData = await api.getUserProfile();

// 2. ${language === 'tr' ? 'Widget\'ı başlatın' : 'Init widget'}
window.initChatbot({
  chatbotId: "${targetUserId}",
  userContext: {
    // ...
${getDynamicDataExample()}
  }
});`
        navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (isLoading) {
        return <div className="p-8 text-center">Loading settings...</div>
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-6">
            <div className="flex items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        {language === 'tr' ? 'Dinamik Veri Bağlamı' : 'Dynamic Data Context'}
                    </h1>
                    <p className="text-muted-foreground">
                        {language === 'tr'
                            ? 'Uygulamanızdaki canlı verileri yapay zekaya aktarın.'
                            : 'Inject live data from your application into the AI.'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Settings */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {language === 'tr' ? 'Modül Durumu' : 'Module Status'}
                            </CardTitle>
                            <CardDescription>
                                {language === 'tr'
                                    ? 'Bu modülü etkinleştirerek AI\'ın gönderilen verileri okumasını sağlayın.'
                                    : 'Enable this module to allow AI to read injected data.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-zinc-50 dark:bg-zinc-900">
                                <div className="space-y-0.5">
                                    <Label className="text-base">
                                        {language === 'tr' ? 'Etkinleştir' : 'Enable'}
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        {isEnabled
                                            ? (language === 'tr' ? 'Modül şu an aktif.' : 'Module is currently active.')
                                            : (language === 'tr' ? 'Modül kapalı.' : 'Module is disabled.')}
                                    </p>
                                </div>
                                <Switch
                                    checked={isEnabled}
                                    onCheckedChange={setIsEnabled}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {language === 'tr' ? 'Nasıl Çalışır?' : 'How it works?'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                            <p>
                                {language === 'tr'
                                    ? 'Bu modül, web sitenizdeki veya uygulamanızdaki JavaScript widget koduna ekleyeceğiniz `dynamicData` nesnesini dinler.'
                                    : 'This module listens for the `dynamicData` object you inject into the JavaScript widget code on your website or app.'}
                            </p>
                            <p>
                                {language === 'tr'
                                    ? 'Kullanıcının o anki oturumuna ait özel verileri (görev sayısı, bakiye, yaklaşan randevu vb.) bu nesne içine koyarsanız, chatbot sorulduğunda bu bilgileri kullanarak cevap verir.'
                                    : 'If you place user-specific session data (task count, balance, upcoming appointments, etc.) into this object, the chatbot will use this info to answer relevant questions.'}
                            </p>
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 rounded-md border border-indigo-100 dark:border-indigo-900">
                                <strong>{language === 'tr' ? 'Güvenlik Notu:' : 'Security Note:'}</strong>
                                <br />
                                {language === 'tr'
                                    ? 'Bu veriler sadece o anki kullanıcı oturumu ile sınırlıdır ve sunucularımızda kalıcı olarak saklanmaz. Sadece konuşma esnasında bağlam (context) olarak kullanılır.'
                                    : 'This data is scoped only to the current user session and is not permanently stored on our servers. It is used solely as context during the conversation.'}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Integration Code */}
                <div className="space-y-6">
                    <Card className="bg-zinc-950 text-zinc-50 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-zinc-100">
                                {language === 'tr' ? 'Entegrasyon Kodu' : 'Integration Code'}
                            </CardTitle>
                            <CardDescription className="text-zinc-400">
                                {language === 'tr'
                                    ? 'Widget başlatma kodunuzu güncelleyin:'
                                    : 'Update your widget initialization code:'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative group">
                                <pre className="p-4 rounded-lg bg-zinc-900 overflow-x-auto text-xs font-mono text-zinc-300 border border-zinc-800">
                                    {`// 1. ${language === 'tr' ? 'Kullanıcı verilerini API\'nizden çekin' : 'Fetch user data from your API'}
const userData = await api.getUserProfile(); 

// 2. ${language === 'tr' ? 'Widget\'ı bu verilerle başlatın' : 'Initialize widget with this data'}
window.initChatbot({
  chatbotId: "${targetUserId}",
  userContext: {
    // ...
${getDynamicDataExample()}
  }
});`}
                                </pre>
                                <Button
                                    size="icon"
                                    variant="secondary"
                                    className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={copyCode}
                                >
                                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                            <p className="mt-4 text-xs text-zinc-500">
                                {language === 'tr'
                                    ? '* Örnekteki sabit değerler yerine kendi veritabanınızdaki gerçek değişkenleri (örn: userData.orderId) kullanmalısınız.'
                                    : '* You should replace the hardcoded values in the example with real variables from your database (e.g., userData.orderId).'}
                            </p>
                        </CardContent>
                    </Card>

                    <Button 
                        size="lg" 
                        className="w-full font-semibold shadow-lg shadow-indigo-500/20" 
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving 
                            ? (language === 'tr' ? 'Kaydediliyor...' : 'Saving...') 
                            : (language === 'tr' ? 'Ayarları Kaydet' : 'Save Settings')}
                    </Button>
                </div>
            </div>
        </div>
    )
}
