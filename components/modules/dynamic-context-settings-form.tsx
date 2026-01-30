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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Plus, Trash2 } from "lucide-react"

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
    const [activeTab, setActiveTab] = useState('js')
    
    // No-Code Selectors State
    const [integrationMode, setIntegrationMode] = useState<'code' | 'nocode'>('code')
    const [selectors, setSelectors] = useState<{ id: string, key: string, selector: string }[]>([
        { id: '1', key: 'balance', selector: '#user-balance' }
    ])

    useEffect(() => {
        const loadSettings = async () => {
            if (!targetUserId) return

            try {
                // Fetch settings from API or Firestore
                const docRef = doc(db, "chatbots", targetUserId)
                const docSnap = await getDoc(docRef)

                if (docSnap.exists()) {
                    const data = docSnap.data()
                    setIsEnabled(data.enableDynamicContext || false)
                    
                    if (data.dynamicContextSelectors) {
                        setSelectors(data.dynamicContextSelectors)
                    }
                    if (data.dynamicContextMode) {
                        setIntegrationMode(data.dynamicContextMode)
                    } else {
                        // Default to code if no selectors exist, or nocode if they do
                        if (data.dynamicContextSelectors && data.dynamicContextSelectors.length > 0) {
                            setIntegrationMode('nocode')
                        }
                    }
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
                enableDynamicContext: isEnabled,
                dynamicContextSelectors: selectors,
                dynamicContextMode: integrationMode
            }, { merge: true })

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
    const addSelector = () => {
        setSelectors([...selectors, { id: Date.now().toString(), key: '', selector: '' }])
    }

    const removeSelector = (id: string) => {
        setSelectors(selectors.filter(s => s.id !== id))
    }

    const updateSelector = (id: string, field: 'key' | 'selector', value: string) => {
        setSelectors(selectors.map(s => s.id === id ? { ...s, [field]: value } : s))
    }

    const getCodeExample = () => {
        if (activeTab === 'js') {
            return `// ${language === 'tr' ? '1. Sitenizin herhangi bir yerinde:' : '1. Anywhere in your site:'}
var currentUser = {
  name: "Ahmet Yılmaz",
  balance: "1,250 TL",
  plan: "Premium" 
};

// ${language === 'tr' ? '2. Widget\'a veriyi "itmek" için:' : '2. To "push" data to the widget:'}
if (window.UserexWidget) {
  window.UserexWidget.setContext({
    name: currentUser.name,   // "Ahmet Yılmaz"
    balance: currentUser.balance, // "1,250 TL"
    plan: currentUser.plan    // "Premium"
  });
}`
        }
        if (activeTab === 'react') {
            return `// components/Layout.js or App.tsx
import { useEffect } from 'react';

export default function RootLayout({ user }) {
  
  useEffect(() => {
    // ${language === 'tr' ? 'Kullanıcı verisi her değiştiğinde çalışır' : 'Runs whenever user data changes'}
    if (user && window.UserexWidget) {
      window.UserexWidget.setContext({
        name: user.name,
        credits: user.credits,
        lastOrder: user.lastOrderId
      });
    }
  }, [user]); // Dependency array

  return <div>{/* Your App */}</div>;
}`
        }
        if (activeTab === 'vue') {
            return `// App.vue
<script setup>
import { watch } from 'vue';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();

// ${language === 'tr' ? 'Store değiştiğinde widget\'ı güncelle' : 'Update widget when store changes'}
watch(() => userStore.userData, (newData) => {
  if (window.UserexWidget) {
    window.UserexWidget.setContext({
      name: newData.name,
      role: newData.role
    });
  }
}, { deep: true });
</script>`
        }
        if (activeTab === 'gtm') {
            return `<!-- Google Tag Manager / Custom HTML Tag -->
<script>
  (function() {
    // ${language === 'tr' ? 'DataLayer\'dan verileri al' : 'Get data from DataLayer'}
    var userName = {{DLV - User Name}} || "Vion Guest";
    var userPlan = {{DLV - User Plan}} || "Free";

    // ${language === 'tr' ? 'Widget yüklendikten sonra gönder' : 'Send after widget loads'}
    var interval = setInterval(function() {
      if (window.UserexWidget) {
        window.UserexWidget.setContext({
          name: userName,
          plan: userPlan
        });
        clearInterval(interval);
      }
    }, 1000);
  })();
</script>`
        }
        return ''
    }

    const copyCode = () => {
        navigator.clipboard.writeText(getCodeExample())
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (isLoading) {
        return <div className="p-8 text-center">Loading settings...</div>
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
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

                {/* Enable/Disable Toggle - Moved to Header */}
                <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-900 px-4 py-2 rounded-full border border-zinc-200 dark:border-zinc-800">
                     <span className={`text-sm font-medium ${isEnabled ? 'text-green-600 dark:text-green-400' : 'text-zinc-500'}`}>
                        {isEnabled 
                             ? (language === 'tr' ? 'Modül Aktif' : 'Module Active') 
                             : (language === 'tr' ? 'Modül Pasif' : 'Module Inactive')}
                     </span>
                     <Switch
                        checked={isEnabled}
                        onCheckedChange={setIsEnabled}
                    />
                </div>
            </div>

            <div className="space-y-8">
                {/* 1. How It Works */}
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {language === 'tr' ? 'Nasıl Çalışır?' : 'How it works?'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                        <p>
                            {language === 'tr'
                                ? 'Bu modül, web sitenizden veya uygulamanızdan gelen verileri (Kullanıcı adı, Bakiye, Üyelik Tipi vb.) yapay zekaya aktarmanızı sağlar. Bu işlem için veritabanı bağlantısı gerekmez.'
                                : 'This module allows you to inject live data (Username, Balance, Subscription Type etc.) from your website or app into the AI. No database connection is required.'}
                        </p>
                        
                        <div className="grid gap-2">
                            <h4 className="font-medium text-foreground text-xs uppercase tracking-wider">
                                {language === 'tr' ? 'Nasıl Kullanılır?' : 'How to Use?'}
                            </h4>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>
                                    {language === 'tr' 
                                        ? 'Sitenizin kodlarına `window.UserexWidget.setContext({...})` fonksiyonunu ekleyin.'
                                        : 'Add `window.UserexWidget.setContext({...})` function to your website code.'}
                                </li>
                                <li>
                                    {language === 'tr'
                                        ? 'Fonksiyon içine o anki kullanıcının bilgilerini değişken olarak verin.'
                                        : 'Pass the current user\'s information as variables inside the function.'}
                                </li>
                                    <li>
                                    {language === 'tr'
                                        ? 'Sayfa yenilenmeden veri değişirse (örn: sepet güncellendi) fonksiyonu tekrar çağırın.'
                                        : 'Call the function again if data changes without page reload (e.g. cart updated).'}
                                </li>
                            </ul>
                        </div>

                        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 rounded-md border border-indigo-100 dark:border-indigo-900 border-l-4 border-l-indigo-500">
                            <strong className="flex items-center gap-2">
                                <span className="text-lg">🔒</span>
                                {language === 'tr' ? 'Güvenlik & Gizlilik' : 'Security & Privacy'}
                            </strong>
                            <p className="mt-2 text-xs opacity-90">
                                {language === 'tr'
                                    ? 'Bu veriler "Push" (İtme) yöntemiyle çalışır. Vion AI veritabanınıza erişmez, sadece sizin gönderdiğiniz metni okur. Veriler sunucularımızda kalıcı olarak saklanmaz.'
                                    : 'This data works via "Push" method. Vion AI does not access your database, it only reads the text you send. Data is not permanently stored on our servers.'}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Configuration Section */}
                <div className="space-y-6">
                    <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg w-full sm:w-fit">
                        <button
                            onClick={() => setIntegrationMode('code')}
                            className={`px-6 py-2 text-sm font-medium rounded-md transition-all ${
                                integrationMode === 'code'
                                    ? 'bg-white dark:bg-zinc-800 shadow text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {language === 'tr' ? 'Kod Entegrasyonu' : 'Code Integration'}
                        </button>
                        <button
                            onClick={() => setIntegrationMode('nocode')}
                            className={`px-6 py-2 text-sm font-medium rounded-md transition-all ${
                                integrationMode === 'nocode'
                                    ? 'bg-white dark:bg-zinc-800 shadow text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {language === 'tr' ? 'Seçici Modu (No-Code)' : 'Selector Mode (No-Code)'}
                        </button>
                    </div>

                    {integrationMode === 'code' ? (
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
                                <div className="space-y-4">
                                    {/* Language Selector */}
                                    <div className="w-full sm:w-[250px]">
                                        <Select value={activeTab} onValueChange={setActiveTab}>
                                            <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-zinc-300">
                                                <SelectValue placeholder="Select language" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="js">JavaScript / HTML</SelectItem>
                                                <SelectItem value="react">React / Next.js</SelectItem>
                                                <SelectItem value="vue">Vue.js</SelectItem>
                                                <SelectItem value="gtm">Google Tag Manager</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Code Display */}
                                    <div className="relative group">
                                        <div className="absolute top-0 right-0 p-2 text-[10px] text-zinc-500 font-mono opacity-50">
                                            EXAMPLE
                                        </div>
                                        <pre className="p-4 rounded-lg bg-zinc-950 overflow-x-auto text-xs font-mono text-zinc-300 border border-zinc-800 shadow-inner h-[280px] scrollbar-thin scrollbar-thumb-zinc-800">
    {getCodeExample()}
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
                                </div>

                                <p className="mt-4 text-xs text-zinc-500">
                                    {language === 'tr'
                                        ? '* Not: `setContext` fonksiyonuna gönderdiğiniz anahtar isimleri (örn: "balance") AI tarafından otomatik tanınır.'
                                        : '* Note: The key names you pass to `setContext` (e.g. "balance") are automatically recognized by the AI.'}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    {language === 'tr' ? 'CSS Seçiciler' : 'CSS Selectors'}
                                </CardTitle>
                                <CardDescription>
                                    {language === 'tr'
                                        ? 'Sayfadaki elementleri takip ederek verileri otomatik çekin.'
                                        : 'Automatically extract data by tracking elements on the page.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>
                                                    {language === 'tr' ? 'Değişken Adı (Key)' : 'Variable Name (Key)'}
                                                </TableHead>
                                                <TableHead>
                                                    {language === 'tr' ? 'CSS Seçici (Selector)' : 'CSS Selector'}
                                                </TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectors.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>
                                                        <Input
                                                            value={item.key}
                                                            onChange={(e) => updateSelector(item.id, 'key', e.target.value)}
                                                            placeholder="e.g. balance"
                                                            className="h-8"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            value={item.selector}
                                                            onChange={(e) => updateSelector(item.id, 'selector', e.target.value)}
                                                            placeholder="e.g. #user-balance"
                                                            className="h-8 font-mono text-xs"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                                            onClick={() => removeSelector(item.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {selectors.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground text-sm">
                                                        {language === 'tr' ? 'Henüz seçici eklenmedi.' : 'No selectors added yet.'}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full border-dashed"
                                    onClick={addSelector}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    {language === 'tr' ? 'Yeni Seçici Ekle' : 'Add New Selector'}
                                </Button>
                                
                                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 rounded-md text-xs border border-blue-100 dark:border-blue-900">
                                    <strong>{language === 'tr' ? 'İpucu:' : 'Tip:'}</strong>{' '}
                                    {language === 'tr' 
                                        ? 'Veriler bu elementler değiştikçe anlık olarak güncellenir (MutationObserver ile).'
                                        : 'Data updates instantly when these elements change (via MutationObserver).'}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="flex justify-end pt-6 border-t">
                        <Button 
                            size="lg" 
                            className="font-semibold shadow-lg shadow-indigo-500/20 w-full sm:w-auto" 
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
        </div>
    )
}
